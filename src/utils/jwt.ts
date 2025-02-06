import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const secret = process.env.JWT_SECRET!;

export const generateToken = (payload: unknown) => {
    console.log('reached jwt');
    
    return jwt.sign({ payload: payload },secret,{expiresIn: "1d"});
};

export const generateRefreshToken = (payload: unknown) => { 
    return jwt.sign({ payload: payload },secret,{expiresIn: "7d"});
};

export const verifyToken = (token: string) => {
    return  jwt.verify(token, secret);
}

