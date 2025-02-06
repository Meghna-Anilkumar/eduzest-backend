import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import userRouter from "./routes/userRoutes";


dotenv.config();

const app = express();


app.use(express.json());
app.use(morgan('tiny'))


app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);


app.use("/", userRouter);


// app.get('/',(req,res)=>{
//   res.json('hiiiii')
// })


app.all("*", (req: Request, res: Response) => {
  console.log('server end point is not found')
  res.status(404).json({
    status: false,
    message: 'The requested URL not found on this server'
  })
})


export default app;
