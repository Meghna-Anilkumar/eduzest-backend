import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../interfaces/AuthRequest";
import dotenv from "dotenv";
import { Cookie } from "../utils/Enum";

dotenv.config();

const secret = process.env.JWT_SECRET!;

interface TokenPayload {
    id: string;
    role: string;
    email: string;
    iat?: number;
    exp?: number;
}

export const authenticateAdmin = (requiredRole?: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        try {
            let token = req.cookies.adminJWT;

            if (!token) {
                console.log("No token found");
                res.status(401).json({ message: "Unauthorized: No token provided" });
                return;
            }


            const decoded = jwt.verify(token, secret) as TokenPayload;
            console.log("Decoded Token:", decoded);

            req.user = {
                id: decoded.id,
                role: decoded.role,
                email: decoded.email
            };
            console.log("User in Request:", req.user);

            if (requiredRole && req.user.role !== requiredRole) {
                res.status(403).json({ message: "Forbidden: Insufficient permissions" });
                return;
            }

            next();
        } catch (error) {
            console.error("JWT Verification Error:", error);
            res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
        }
    };
};


export const authenticateUser = (requiredRole?: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        try {
            const token = req.cookies[Cookie.userJWT];

            if (!token) {
                console.log("No user token found");
                res.status(401).json({ message: "Unauthorized: No token provided" });
            }

            const decoded = jwt.verify(token, secret) as TokenPayload;
            console.log("Decoded User Token:", decoded);

            req.user = {
                id: decoded.id,
                role: decoded.role,
                email: decoded.email,
            };

            if (requiredRole && req.user.role !== requiredRole) {
                res.status(403).json({ message: "Forbidden: Insufficient permissions" });
            }

            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                res.status(401).json({
                    message: "Token expired. Please use the refresh token to obtain a new access token.",
                });
            }
            console.error("JWT Verification Error:", error);
            res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
    };
};


