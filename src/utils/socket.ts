import { Server, Socket, RemoteSocket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Types } from 'mongoose';
import ChatService from '../services/chatService';
import ChatRepository from '../repositories/chatRepository';
import UserRepository from '../repositories/userRepository';
import { CourseRepository } from '../repositories/courseRepository';
import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { RedisService } from '../services/redisService';
import { IChat } from '../interfaces/IChat';
import { IResponse } from '../interfaces/IResponse';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface OnlineUser {
  userId: string;
  name: string;
  role: 'Student' | 'Instructor' | 'Admin';
}

interface Participant {
  userId: string;
  name: string;
  role: 'instructor' | 'student';
  profilePic?: string | null;
  isChatBlocked: boolean;
}

export const initializeSocket = (server: HttpServer): Server => {
  console.log('[Socket] Initializing Socket.IO server');
  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  console.log('[Socket] Setting up dependencies');
  const redisService = new RedisService();
  const enrollmentRepository = new EnrollmentRepository(redisService);
  const chatRepository = new ChatRepository(enrollmentRepository);
  const userRepository = new UserRepository();
  const courseRepository = new CourseRepository();
  const chatService = new ChatService(chatRepository, userRepository, courseRepository, enrollmentRepository);

  const updateOnlineUsers = async (courseId: string) => {
    const sockets = await io.in(courseId).fetchSockets() as RemoteSocket<any, any>[];
    const userIds = [...new Set(
      sockets
        .map((socket) => (socket as unknown as AuthenticatedSocket).userId)
        .filter((id): id is string => !!id)
    )];
    const users = await Promise.all(
      userIds.map(async (userId) => {
        const user = await userRepository.findById(userId);
        return user
          ? {
              userId,
              name: user.name,
              role: user.role as 'Student' | 'Instructor' | 'Admin',
            }
          : null;
      })
    );
    const onlineUsers: OnlineUser[] = users.filter((user): user is OnlineUser => user !== null);
    io.to(courseId).emit('onlineUsers', onlineUsers);
    await redisService.set(`onlineUsers:${courseId}`, JSON.stringify(onlineUsers), 3600);
  };

  const emitChatGroupMetadataUpdate = async (courseId: string, userIds: string[]) => {
    for (const userId of userIds) {
      const response = await chatService.getChatGroupMetadata(userId, [courseId]);
      if (response.success && response.data) {
        io.to(userId).emit('chatGroupMetadataUpdate', response.data);
      }
    }
  };

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('[Socket] A user connected:', socket.id);

    socket.on('authenticate', async (data: { userId: string }) => {
      console.log('[Socket] Authenticate event received:', data);
      if (!Types.ObjectId.isValid(data.userId)) {
        console.error('[Socket] Invalid userId:', data.userId);
        socket.emit('error', { message: 'Invalid userId' });
        socket.disconnect();
        return;
      }

      const user = await userRepository.findById(data.userId);
      console.log('[Socket] User lookup result:', user ? 'Found' : 'Not found');
      if (!user) {
        console.error('[Socket] User not found:', data.userId);
        socket.emit('error', { message: 'User not found' });
        socket.disconnect();
        return;
      }

      socket.userId = data.userId;
      socket.join(data.userId);
      console.log('[Socket] Authentication successful for user:', data.userId);
      socket.emit('authenticated', { message: 'Authentication successful' });
    });

    socket.on('joinCourse', async (courseId: string) => {
      console.log('[Socket] JoinCourse event received:', courseId);
      if (!socket.userId || !Types.ObjectId.isValid(courseId)) {
        console.error('[Socket] Invalid user or courseId:', { userId: socket.userId, courseId });
        socket.emit('error', { message: 'Invalid user or courseId' });
        return;
      }

      const course = await courseRepository.findById(courseId);
      console.log('[Socket] Course lookup result:', course ? 'Found' : 'Not found');
      if (!course) {
        console.error('[Socket] Course not found:', courseId);
        socket.emit('error', { message: 'Course not found' });
        return;
      }

      const isInstructor = course.instructorRef.toString() === socket.userId;
      const enrollment = await enrollmentRepository.findByUserAndCourse(socket.userId, courseId);
      console.log('[Socket] Authorization check:', { isInstructor, isEnrolled: !!enrollment });
      if (!isInstructor && !enrollment) {
        console.error('[Socket] Not authorized:', socket.userId);
        socket.emit('error', { message: 'Not authorized to join this course chat' });
        return;
      }

      if (enrollment && enrollment.isChatBlocked) {
        console.error('[Socket] User is blocked from chat:', socket.userId);
        socket.emit('error', { message: 'You are blocked from this course chat' });
        return;
      }

      socket.join(courseId);
      console.log('[Socket] User joined course:', courseId);
      socket.emit('joined', { courseId, message: 'Joined course chat' });

      await chatRepository.markMessagesAsRead(socket.userId, courseId);
      await emitChatGroupMetadataUpdate(courseId, [socket.userId]);

      await updateOnlineUsers(courseId);
    });

    socket.on('leaveCourse', async (courseId: string) => {
      console.log('[Socket] LeaveCourse event received:', courseId);
      if (!socket.userId || !Types.ObjectId.isValid(courseId)) {
        console.error('[Socket] Invalid user or courseId:', { userId: socket.userId, courseId });
        socket.emit('error', { message: 'Invalid user or courseId' });
        return;
      }

      socket.leave(courseId);
      console.log('[Socket] User left course:', courseId);
      socket.emit('left', { courseId, message: 'Left course chat' });

      await updateOnlineUsers(courseId);
    });

    socket.on('getMessages', async (data: { courseId: string; page: number; limit: number }) => {
      console.log('[Socket] GetMessages event received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.courseId)) {
        console.error('[Socket] Invalid user or courseId:', { userId: socket.userId, courseId: data.courseId });
        socket.emit('error', { message: 'Invalid user or courseId' });
        return;
      }

      const enrollment = await enrollmentRepository.findByUserAndCourse(socket.userId, data.courseId);
      if (enrollment && enrollment.isChatBlocked) {
        console.error('[Socket] User is blocked from chat:', socket.userId);
        socket.emit('error', { message: 'You are blocked from this course chat' });
        return;
      }

      const response: IResponse = await chatService.getMessages(data.courseId, data.page, data.limit, socket.userId);
      console.log('[Socket] GetMessages response:', response);
      socket.emit('messages', response);
    });

    socket.on('sendMessage', async (data: { courseId: string; message: string; replyTo?: string }) => {
      console.log('[Socket] SendMessage event received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.courseId)) {
        console.error('[Socket] Invalid user or courseId:', { userId: socket.userId, courseId: data.courseId });
        socket.emit('error', { message: 'Invalid user or courseId' });
        return;
      }

      const enrollment = await enrollmentRepository.findByUserAndCourse(socket.userId, data.courseId);
      if (enrollment && enrollment.isChatBlocked) {
        console.error('[Socket] User is blocked from chat:', socket.userId);
        socket.emit('error', { message: 'You are blocked from this course chat' });
        return;
      }

      const response: IResponse = await chatService.sendMessage(socket.userId, data.courseId, data.message, data.replyTo);
      console.log('[Socket] SendMessage response:', response);
      if (!response.success || !response.data) {
        console.error('[Socket] SendMessage failed:', response.message);
        socket.emit('error', { message: response.message });
        return;
      }

      const chatData = response.data as IChat;
      const message = await chatRepository.findById(chatData._id.toString());
      if (message) {
        await message.populate('senderId', 'name role profile.profilePic');
        await message.populate({
          path: 'replyTo',
          populate: { path: 'senderId', select: 'name role profile.profilePic' }
        });
        console.log('[Socket] Populated message:', JSON.stringify(message, null, 2));
        io.to(data.courseId).emit('newMessage', message);

        const course = await courseRepository.findById(data.courseId);
        if (course) {
          const enrollments = await enrollmentRepository.findByCourseId(data.courseId);
          const userIds = [
            course.instructorRef.toString(),
            ...enrollments
              .filter((e) => !e.isChatBlocked)
              .map((e) => e.userId.toString())
          ];
          await emitChatGroupMetadataUpdate(data.courseId, userIds);
        }
      } else {
        console.error('[Socket] Message not found after saving:', chatData._id);
      }
    });

    socket.on('getParticipants', async (data: { courseId: string }) => {
      console.log('[Socket] GetParticipants event received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.courseId)) {
        console.error('[Socket] Invalid user or courseId:', { userId: socket.userId, courseId: data.courseId });
        socket.emit('error', { message: 'Invalid user or courseId' });
        return;
      }

      const course = await courseRepository.findById(data.courseId);
      if (!course) {
        console.error('[Socket] Course not found:', data.courseId);
        socket.emit('participants', { success: false, message: 'Course not found' });
        return;
      }

      const isInstructor = course.instructorRef.toString() === socket.userId;
      const enrollment = await enrollmentRepository.findByUserAndCourse(socket.userId, data.courseId);
      if (!isInstructor && !enrollment) {
        console.error('[Socket] Not authorized:', socket.userId);
        socket.emit('participants', { success: false, message: 'Not authorized to view participants' });
        return;
      }

      if (enrollment && enrollment.isChatBlocked) {
        console.error('[Socket] User is blocked from chat:', socket.userId);
        socket.emit('participants', { success: false, message: 'You are blocked from this course chat' });
        return;
      }

      const instructor = await userRepository.findById(course.instructorRef.toString());
      const participants: Participant[] = [];

      if (instructor) {
        participants.push({
          userId: instructor._id.toString(),
          name: instructor.name,
          role: 'instructor',
          profilePic: instructor.profile?.profilePic || null,
          isChatBlocked: false,
        });
      }

      const enrollments = await enrollmentRepository.findByCourseId(data.courseId);
      const studentIds = enrollments.map((e) => e.userId.toString());

      for (const userId of studentIds) {
        const user = await userRepository.findById(userId);
        const enrollment = enrollments.find((e) => e.userId.toString() === userId);
        if (user && enrollment) {
          participants.push({
            userId: user._id.toString(),
            name: user.name,
            role: 'student',
            profilePic: user.profile?.profilePic || null,
            isChatBlocked: enrollment.isChatBlocked,
          });
        }
      }

      console.log('[Socket] Sending participants:', participants);
      socket.emit('participants', { success: true, data: participants });
    });

    socket.on('blockFromChat', async (data: { courseId: string; userId: string }) => {
      console.log('[Socket] BlockFromChat event received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.courseId) || !Types.ObjectId.isValid(data.userId)) {
        console.error('[Socket] Invalid user, courseId, or target userId:', {
          userId: socket.userId,
          courseId: data.courseId,
          targetUserId: data.userId,
        });
        socket.emit('error', { message: 'Invalid user, courseId, or target userId' });
        return;
      }

      const course = await courseRepository.findById(data.courseId);
      if (!course) {
        console.error('[Socket] Course not found:', data.courseId);
        socket.emit('error', { message: 'Course not found' });
        return;
      }

      const isInstructor = course.instructorRef.toString() === socket.userId;
      if (!isInstructor) {
        console.error('[Socket] Not authorized to block users:', socket.userId);
        socket.emit('error', { message: 'Only instructors can block users from chat' });
        return;
      }

      const enrollment = await enrollmentRepository.findByUserAndCourse(data.userId, data.courseId);
      if (!enrollment) {
        console.error('[Socket] User not enrolled:', data.userId);
        socket.emit('error', { message: 'User is not enrolled in this course' });
        return;
      }

      if (enrollment.isChatBlocked) {
        console.log('[Socket] User already blocked:', data.userId);
        socket.emit('blockFromChatResult', { success: true, message: 'User is already blocked' });
        return;
      }

      await enrollmentRepository.blockFromChat(data.userId, data.courseId);
      console.log('[Socket] User blocked from chat:', data.userId);

      const sockets = await io.in(data.courseId).fetchSockets() as RemoteSocket<any, any>[];
      const targetSocket = sockets.find(
        (s) => (s as unknown as AuthenticatedSocket).userId === data.userId
      );
      if (targetSocket) {
        targetSocket.leave(data.courseId);
        targetSocket.emit('blockedFromChat', { courseId: data.courseId, message: 'You have been blocked from this course chat' });
      }

      io.to(data.courseId).emit('participantBlocked', { userId: data.userId });
      await updateOnlineUsers(data.courseId);
      socket.emit('blockFromChatResult', { success: true, message: 'User blocked from chat' });
    });

    socket.on('unblockFromChat', async (data: { courseId: string; userId: string }) => {
      console.log('[Socket] UnblockFromChat event received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.courseId) || !Types.ObjectId.isValid(data.userId)) {
        console.error('[Socket] Invalid user, courseId, or target userId:', {
          userId: socket.userId,
          courseId: data.courseId,
          targetUserId: data.userId,
        });
        socket.emit('error', { message: 'Invalid user, courseId, or target userId' });
        return;
      }

      const course = await courseRepository.findById(data.courseId);
      if (!course) {
        console.error('[Socket] Course not found:', data.courseId);
        socket.emit('error', { message: 'Course not found' });
        return;
      }

      const isInstructor = course.instructorRef.toString() === socket.userId;
      if (!isInstructor) {
        console.error('[Socket] Not authorized to unblock users:', socket.userId);
        socket.emit('error', { message: 'Only instructors can unblock users from chat' });
        return;
      }

      const enrollment = await enrollmentRepository.findByUserAndCourse(data.userId, data.courseId);
      if (!enrollment) {
        console.error('[Socket] User not enrolled:', data.userId);
        socket.emit('error', { message: 'User is not enrolled in this course' });
        return;
      }

      if (!enrollment.isChatBlocked) {
        console.log('[Socket] User is not blocked:', data.userId);
        socket.emit('unblockFromChatResult', { success: true, message: 'User is not blocked' });
        return;
      }

      await enrollmentRepository.unblockFromChat(data.userId, data.courseId);
      console.log('[Socket] User unblocked from chat:', data.userId);

      io.to(data.userId).emit('unblockedFromChat', { courseId: data.courseId, message: 'You have been unblocked from this course chat' });
      io.to(data.courseId).emit('participantUnblocked', { userId: data.userId });
      socket.emit('unblockFromChatResult', { success: true, message: 'User unblocked from chat' });
    });

    socket.on('disconnect', async () => {
      console.log('[Socket] User disconnected:', socket.id);
      const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id && room !== socket.userId);
      for (const room of rooms) {
        await updateOnlineUsers(room);
      }
    });
  });

  console.log('[Socket] Socket.IO server initialized');
  return io;
};