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
      const isEnrolled = await enrollmentRepository.findByUserAndCourse(socket.userId, courseId);
      console.log('[Socket] Authorization check:', { isInstructor, isEnrolled });
      if (!isInstructor && !isEnrolled) {
        console.error('[Socket] Not authorized:', socket.userId);
        socket.emit('error', { message: 'Not authorized to join this course chat' });
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
            ...enrollments.map(e => e.userId.toString())
          ];
          await emitChatGroupMetadataUpdate(data.courseId, userIds);
        }
      } else {
        console.error('[Socket] Message not found after saving:', chatData._id);
      }
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