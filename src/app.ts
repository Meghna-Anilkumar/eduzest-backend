import express, { Request, Response } from "express";
import { responseLogger } from "./middlewares/logger";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import userRouter from "./routes/userRoutes";
import adminRouter from "./routes/adminRoutes";
import cookieParser from "cookie-parser";


dotenv.config();

const app = express();


app.use(express.json());
app.use(morgan('tiny'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(responseLogger); 


app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);


app.use("/", userRouter);
app.use("/admin", adminRouter);




app.all("*", (req: Request, res: Response) => {
  console.log('server end point is not found')
  res.status(404).json({
    status: false,
    message: 'The requested URL not found on this server'
  })
})


export default app;
