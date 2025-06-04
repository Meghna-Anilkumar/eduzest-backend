import { Server as HttpServer } from 'http';
import { initializeSocket } from './socket';
import { initializeExamSocket } from './socketExamHandler';
import { ExamService } from '../services/examService';
import { ExamRepository } from '../repositories/examRepository';
import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { RedisService } from '../services/redisService';

export const initializeSocketServer = (server: HttpServer) => {
  console.log('[SocketInitializer] Setting up Socket.IO server and dependencies');


  const redisService = new RedisService();
  const enrollmentRepository = new EnrollmentRepository(redisService);
  const examRepository = new ExamRepository(redisService);
  const examService = new ExamService(examRepository, enrollmentRepository, redisService);


  const io = initializeSocket(server);

  initializeExamSocket(io, examService);

  console.log('[SocketInitializer] Socket.IO server fully initialized');
  return io;
};