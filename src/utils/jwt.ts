import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserDoc } from "../interfaces/IUser";
import { AdminDoc } from "../interfaces/IAdmin"; 

dotenv.config();

const secret = process.env.JWT_SECRET!;


interface TokenPayload {
  id: string;
  role: string;
  email: string;
}


export const generateToken = (user: UserDoc | AdminDoc): string => {
  console.log('reached jwt');
  const payload: TokenPayload = {
    id: user._id.toString(), 
    role: user.role || "Student", 
    email: user.email,
  };
  return jwt.sign(payload, secret, { expiresIn: "1d" });
};


export const generateRefreshToken = (user: UserDoc | AdminDoc): string => {
  const payload: TokenPayload = {
    id: user._id.toString(), 
    role: user.role || "Student",
    email: user.email,
  };
  return jwt.sign(payload, secret, { expiresIn: "7d" });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, secret) as TokenPayload;
};