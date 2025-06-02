import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { ExamService } from '../services/examService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const initializeExamSocket = (io: Server, examService: ExamService) => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    socket.on('startExam', async (data: { examId: string }) => {
      if (!socket.userId || !Types.ObjectId.isValid(data.examId)) {
        socket.emit('error', { message: 'Invalid user or examId' });
        return;
      }

      // After the check, TypeScript knows socket.userId is string
      const userId: string = socket.userId;

      const response = await examService.startExam(data.examId, userId);
      if (response.success && response.data) {
        const exam = await examService.findExamById(data.examId);
        if (exam) {
          socket.join(`exam:${data.examId}:${userId}`);
          socket.emit('examStarted', response.data);

          // Set up auto-submission timer
          setTimeout(async () => {
            const startTime = await examService.getExamStartTime(data.examId, userId);
            if (startTime) {
              const currentTime = new Date();
              const elapsedMinutes = (currentTime.getTime() - new Date(startTime).getTime()) / 1000 / 60;
              if (elapsedMinutes >= exam.duration) {
                const response = await examService.submitExam(data.examId, userId, [], true);
                io.to(`exam:${data.examId}:${userId}`).emit('examAutoSubmitted', response);
              }
            }
          }, exam.duration * 60 * 1000);
        } else {
          socket.emit('error', { message: 'Exam not found' });
        }
      } else {
        socket.emit('error', response);
      }
    });

    socket.on('submitExam', async (data: { examId: string; answers: { questionId: string; selectedAnswerIndex: number }[] }) => {
      if (!socket.userId || !Types.ObjectId.isValid(data.examId)) {
        socket.emit('error', { message: 'Invalid user or examId' });
        return;
      }

      // After the check, TypeScript knows socket.userId is string
      const userId: string = socket.userId;

      const response = await examService.submitExam(data.examId, userId, data.answers);
      socket.emit('examSubmitted', response);
      socket.leave(`exam:${data.examId}:${userId}`);
    });
  });
};