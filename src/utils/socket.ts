import { Server, Socket } from 'socket.io';
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

export const initializeSocket = (server: HttpServer): Server => {
  console.log('[Socket] Initializing Socket.IO server');
  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  console.log('[Socket] Setting up dependencies');
  const redisService = new RedisService();
  const chatRepository = new ChatRepository();
  const userRepository = new UserRepository();
  const courseRepository = new CourseRepository();
  const enrollmentRepository = new EnrollmentRepository(redisService);
  const chatService = new ChatService(chatRepository, userRepository, courseRepository, enrollmentRepository);

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
    });


    socket.on('leaveCourse', (courseId: string) => {
      console.log('[Socket] LeaveCourse event received:', courseId);
      if (!socket.userId || !Types.ObjectId.isValid(courseId)) {
        console.error('[Socket] Invalid user or courseId:', { userId: socket.userId, courseId });
        socket.emit('error', { message: 'Invalid user or courseId' });
        return;
      }
    
      socket.leave(courseId);
      console.log('[Socket] User left course:', courseId);
      socket.emit('left', { courseId, message: 'Left course chat' });
    });

    socket.on('getMessages', async (data: { courseId: string; page: number; limit: number }) => {
      console.log('[Socket] GetMessages event received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.courseId)) {
        console.error('[Socket] Invalid user or courseId:', { userId: socket.userId, courseId: data.courseId });
        socket.emit('error', { message: 'Invalid user or courseId' });
        return;
      }

      const response: IResponse = await chatService.getMessages(data.courseId, data.page, data.limit);
      console.log('[Socket] GetMessages response:', response);
      socket.emit('messages', response);
    });

    socket.on('sendMessage', async (data: { courseId: string; message: string }) => {
      console.log('[Socket] SendMessage event received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.courseId)) {
        console.error('[Socket] Invalid user or courseId:', { userId: socket.userId, courseId: data.courseId });
        socket.emit('error', { message: 'Invalid user or courseId' });
        return;
      }
    
      const response: IResponse = await chatService.sendMessage(socket.userId, data.courseId, data.message);
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
        console.log('[Socket] Populated message:', JSON.stringify(message, null, 2));
        io.to(data.courseId).emit('newMessage', message);
      } else {
        console.error('[Socket] Message not found after saving:', chatData._id);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] User disconnected:', socket.id);
    });
  });

  console.log('[Socket] Socket.IO server initialized');
  return io;
};