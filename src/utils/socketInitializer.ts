import { Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { initializeSocket } from './socket';
import { initializeExamSocket } from './socketExamHandler';
import { ExamService } from '../services/examService';
import { ExamRepository } from '../repositories/examRepository';
import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { redisService } from '../services/redisService';
import { NotificationService } from '../services/notificationService';
import { NotificationRepository } from '../repositories/notificationRepository';
import { CourseRepository } from '../repositories/courseRepository';
import { SubscriptionRepository } from '../repositories/subscriptionRepository';

export const initializeSocketServer = (server: HttpServer): IOServer => {
  console.log('[SocketInitializer] Setting up Socket.IO server and dependencies');

  const enrollmentRepository = new EnrollmentRepository(redisService);
  const examRepository = new ExamRepository(redisService);
  const notificationRepository = new NotificationRepository();
  const courseRepository = new CourseRepository()
  const subscriptionRepository = new SubscriptionRepository()


  const io = new IOServer(server, {
    cors: {
      origin: process.env.ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const notificationService = new NotificationService(notificationRepository, enrollmentRepository, io);
  const examService = new ExamService(examRepository, enrollmentRepository, redisService, notificationService, courseRepository, subscriptionRepository);


  initializeSocket(io, notificationService);

  initializeExamSocket(io, examService);

  console.log('[SocketInitializer] Socket.IO server fully initialized');
  return io;
};