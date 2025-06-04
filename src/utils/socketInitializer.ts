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

export const initializeSocketServer = (server: HttpServer): IOServer => {
  console.log('[SocketInitializer] Setting up Socket.IO server and dependencies');

  // Initialize dependencies
  const enrollmentRepository = new EnrollmentRepository(redisService);
  const examRepository = new ExamRepository(redisService);
  const examService = new ExamService(examRepository, enrollmentRepository, redisService);
  const notificationRepository = new NotificationRepository();

  // Initialize Socket.IO server
  const io = new IOServer(server, {
    cors: {
      origin: process.env.ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Pass io to NotificationService
  const notificationService = new NotificationService(notificationRepository, enrollmentRepository, io);

  // Initialize main Socket.IO server
  initializeSocket(io, notificationService);

  // Initialize exam-specific socket handlers
  initializeExamSocket(io, examService);

  console.log('[SocketInitializer] Socket.IO server fully initialized');
  return io;
};