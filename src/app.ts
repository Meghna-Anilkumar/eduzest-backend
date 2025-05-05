import express, { Request, Response } from "express";
import { responseLogger } from "./middlewares/logger";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import userRouter from "./routes/userRoutes";
import adminRouter from "./routes/adminRoutes";
import instructorRouter from "./routes/instructorRoutes";
import cookieParser from "cookie-parser";
import studentRouter from "./routes/studentRoutes";
import { initializeSocket } from "./utils/socket";
import { createServer } from "http";

dotenv.config();

const app = express();
const httpServer = createServer(app);

console.log('[App] Initializing Socket.IO');
initializeSocket(httpServer);

console.log('[App] Setting up middleware');
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(responseLogger);
app.use(
  cors({
    origin: process.env.ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

console.log('[App] Mounting routes');
app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/instructor", instructorRouter);
app.use("/student", studentRouter);

console.log('[App] Setting up catch-all route');
app.all("*", (req: Request, res: Response) => {
  console.log('[App] Catch-all route hit:', req.originalUrl);
  res.status(404).json({
    status: false,
    message: 'The requested URL not found on this server'
  });
});

export { app, httpServer };