import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserDoc } from "../interfaces/IUser";
import { AdminDoc } from "../interfaces/IAdmin"; // Import AdminDoc

dotenv.config();

const secret = process.env.JWT_SECRET!;

// Define an interface for the payload to ensure type safety
interface TokenPayload {
  id: string;
  role: string;
  email: string;
}

// Generate JWT token with id, role, and email
export const generateToken = (user: UserDoc | AdminDoc): string => {
  console.log('reached jwt');
  const payload: TokenPayload = {
    id: user._id.toString(), // Convert ObjectId to string if needed
    role: user.role || "Student", // Default to "Student" if role is undefined (though Admin will always have "Admin")
    email: user.email,
  };
  return jwt.sign(payload, secret, { expiresIn: "1d" });
};

// Generate refresh token with id, role, and email
export const generateRefreshToken = (user: UserDoc | AdminDoc): string => {
  const payload: TokenPayload = {
    id: user._id.toString(), // Convert ObjectId to string if needed
    role: user.role || "Student", // Default to "Student" if role is undefined
    email: user.email,
  };
  return jwt.sign(payload, secret, { expiresIn: "7d" });
};

// Verify token and return the decoded payload
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, secret) as TokenPayload;
};