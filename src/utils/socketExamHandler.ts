import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { ExamService } from '../services/examService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface ExamProgress {
  answers?: { questionId: string; selectedAnswerIndex: number }[];
  startTime?: string;
  isSubmitted?: boolean;
}

interface ExamProgressResponse {
  success: boolean;
  data?: ExamProgress;
  message?: string;
}

interface ExamAnswer {
  questionId: string;
  selectedAnswerIndex: number;
}

interface StartExamData {
  examId: string;
}

interface SubmitExamData {
  examId: string;
  answers: ExamAnswer[];
}

interface SaveExamProgressData {
  examId: string;
  answers: ExamAnswer[];
  startTime: string;
}

export const initializeExamSocket = (io: Server, examService: ExamService) => {
  // Store timeout references to allow cancellation
  const timeouts = new Map<string, NodeJS.Timeout>();

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('[Socket] New connection', socket.id);

    socket.on('testConnection', (data: unknown) => {
      console.log('[Socket] Test connection received', data);
      socket.emit('testResponse', { message: 'Socket is connected' });
    });

    socket.on('startExam', async (data: StartExamData) => {
      console.log('[Socket] startExam received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.examId)) {
        console.log('[Socket] Invalid user or examId:', { userId: socket.userId, examId: data.examId });
        socket.emit('error', { message: 'Invalid user or examId' });
        return;
      }

      const userId: string = socket.userId;
      const examKey = `exam:${data.examId}:${userId}`;

      try {
        const response = await examService.startExam(data.examId, userId);
        console.log('[Socket] startExam response:', response);
        if (response.success && response.data) {
          const exam = await examService.findExamById(data.examId);
          if (exam) {
            socket.join(examKey);
            console.log('[Socket] Emitting examStarted:', response.data);
            socket.emit('examStarted', response.data);

            // Clear any existing timeout for this exam and user
            if (timeouts.has(examKey)) {
              const existingTimeout = timeouts.get(examKey);
              if (existingTimeout) {
                clearTimeout(existingTimeout);
              }
              timeouts.delete(examKey);
            }

            // Set new timeout for auto-submission
            const timeout = setTimeout(async () => {
              console.log('[Socket] Auto-submission triggered for:', { examId: data.examId, userId });
              try {
                const progressResponse = await examService.getExamProgress(data.examId, userId) as ExamProgressResponse;
                console.log('[Socket] Progress response for auto-submission:', progressResponse);
                const answers = progressResponse.success && progressResponse.data?.answers 
                  ? progressResponse.data.answers 
                  : [];
                console.log('[Socket] Auto-submitting with answers:', answers);
                const submitResponse = await examService.submitExam(data.examId, userId, answers, true);
                console.log('[Socket] Auto-submit response:', submitResponse);
                io.to(examKey).emit('examAutoSubmitted', submitResponse);
                timeouts.delete(examKey); // Clean up timeout
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                console.error('[Socket] Auto-submission error:', errorMessage);
                socket.emit('error', { message: 'Failed to auto-submit exam' });
              }
            }, exam.duration * 60 * 1000);

            timeouts.set(examKey, timeout);
            console.log('[Socket] Auto-submission timeout set for:', { examKey, duration: exam.duration });
          } else {
            console.log('[Socket] Exam not found:', data.examId);
            socket.emit('error', { message: 'Exam not found' });
          }
        } else {
          console.log('[Socket] startExam failed:', response);
          socket.emit('error', response);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[Socket] startExam error:', errorMessage);
        socket.emit('error', { message: 'Server error while starting exam' });
      }
    });

    socket.on('submitExam', async (data: SubmitExamData) => {
      console.log('[Socket] submitExam received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.examId)) {
        socket.emit('error', { message: 'Invalid user or examId' });
        return;
      }

      const userId: string = socket.userId;
      const examKey = `exam:${data.examId}:${userId}`;

      // Clear auto-submission timeout on manual submission
      if (timeouts.has(examKey)) {
        const existingTimeout = timeouts.get(examKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        timeouts.delete(examKey);
        console.log('[Socket] Cleared auto-submission timeout for:', examKey);
      }

      const response = await examService.submitExam(data.examId, userId, data.answers);
      socket.emit('examSubmitted', response);
      socket.leave(examKey);
    });

    socket.on('saveExamProgress', async (data: SaveExamProgressData) => {
      console.log('[Socket] saveExamProgress received:', data);
      if (!socket.userId || !Types.ObjectId.isValid(data.examId)) {
        socket.emit('error', { message: 'Invalid user or examId' });
        return;
      }

      const response = await examService.saveExamProgress(data.examId, socket.userId, data.answers);
      if (!response.success) {
        socket.emit('error', { message: response.message });
      } else {
        socket.emit('progressSaved', response);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] User disconnected:', socket.id);
      // Optionally, keep timeouts running for auto-submission even after disconnect
    });
  });
};