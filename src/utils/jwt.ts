import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserDoc } from "../interfaces/IUser";
import { AdminDoc } from "../interfaces/IAdmin";

dotenv.config();

const accessTokenSecret = process.env.JWT_SECRET!;
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;


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
  return jwt.sign(payload, accessTokenSecret, { expiresIn: "1d" });
};


export const generateRefreshToken = (user: UserDoc | AdminDoc): string => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    role: user.role || "Student",
    email: user.email,
  };
  return jwt.sign(payload, refreshTokenSecret, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, accessTokenSecret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, refreshTokenSecret) as TokenPayload;
};