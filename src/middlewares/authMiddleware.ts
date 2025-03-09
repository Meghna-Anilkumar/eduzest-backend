import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthRequest } from "../interfaces/AuthRequest";
import dotenv from "dotenv";

dotenv.config();

const secret = process.env.JWT_SECRET!;

export const authenticateAdmin = (requiredRole?: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        try {
           
            let token = req.cookies.adminJWT;

            if (!token) {
                console.log("No token found"); 
                res.status(401).json({ message: "Unauthorized: No token provided" });
                return;
            }

            const decoded = jwt.verify(token, secret) as JwtPayload;
            console.log("Decoded Token:", decoded);

            if (typeof decoded === "string" || !decoded.payload) {
                res.status(401).json({ message: "Unauthorized: Invalid token" });
                return;
            }

            req.user = decoded.payload as { id: string; role: string; email: string };
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
            let token = req.cookies["userJWT"] 

            if (!token) {
                console.log("No user token found");
                res.status(401).json({ message: "Unauthorized: No user token provided" });
                return;
            }

            const decoded = jwt.verify(token, secret) as JwtPayload;
            console.log("Decoded User Token:", decoded);

            if (typeof decoded === "string" || !decoded.payload) {
                res.status(401).json({ message: "Unauthorized: Invalid user token" });
                return;
            }

            req.user = decoded.payload as { id: string; role: string; email: string };
            console.log("User in Request:", req.user);

            if (requiredRole && req.user.role !== requiredRole) {
                res.status(403).json({ message: "Forbidden: Insufficient permissions" });
                return;
            }

            next();
        } catch (error) {
            console.error("JWT Verification Error:", error);
            res.status(401).json({ message: "Unauthorized: Invalid or expired user token" });
        }
    };
};
