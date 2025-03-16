// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken"; // No need for JwtPayload import since we define TokenPayload
// import { AuthRequest } from "../interfaces/AuthRequest";
// import dotenv from "dotenv";

// dotenv.config();

// const secret = process.env.JWT_SECRET!;

// // Define the expected token payload structure
// interface TokenPayload {
//     id: string;
//     role: string;
//     email: string;
//     iat?: number;
//     exp?: number;
// }

// export const authenticateAdmin = (requiredRole?: string) => {
//     return (req: AuthRequest, res: Response, next: NextFunction): void => {
//         try {
//             let token = req.cookies.adminJWT;

//             if (!token) {
//                 console.log("No token found");
//                 res.status(401).json({ message: "Unauthorized: No token provided" });
//                 return;
//             }

//             // Verify and decode the token directly as TokenPayload
//             const decoded = jwt.verify(token, secret) as TokenPayload;
//             console.log("Decoded Token:", decoded);

//             // Assign the decoded payload to req.user
//             req.user = {
//                 id: decoded.id,
//                 role: decoded.role,
//                 email: decoded.email
//             };
//             console.log("User in Request:", req.user);

//             if (requiredRole && req.user.role !== requiredRole) {
//                 res.status(403).json({ message: "Forbidden: Insufficient permissions" });
//                 return;
//             }

//             next();
//         } catch (error) {
//             console.error("JWT Verification Error:", error);
//             res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
//         }
//     };
// };

// export const authenticateUser = (requiredRole?: string) => {
//     return (req: AuthRequest, res: Response, next: NextFunction): void => {
//         try {
//             let token = req.cookies["userJWT"];

//             if (!token) {
//                 console.log("No user token found");
//                 res.status(401).json({ message: "Unauthorized: No user token provided" });
//                 return;
//             }

//             // Verify and decode the token directly as TokenPayload
//             const decoded = jwt.verify(token, secret) as TokenPayload;
//             console.log("Decoded User Token:", decoded);

//             // Assign the decoded payload to req.user
//             req.user = {
//                 id: decoded.id,
//                 role: decoded.role,
//                 email: decoded.email
//             };
//             console.log("User in Request:", req.user);

//             if (requiredRole && req.user.role !== requiredRole) {
//                 res.status(403).json({ message: "Forbidden: Insufficient permissions" });
//                 return;
//             }

//             next();
//         } catch (error) {
//             console.error("JWT Verification Error:", error);
//             res.status(401).json({ message: "Unauthorized: Invalid or expired user token" });
//         }
//     };
// };



import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../interfaces/AuthRequest";
import dotenv from "dotenv";
import { UserRepository } from "../repositories/userRepository";

dotenv.config();

const secret = process.env.JWT_SECRET!;
const userRepository = new UserRepository();

interface TokenPayload {
    id: string;
    role: string;
    email: string;
    iat?: number;
    exp?: number;
}

export const authenticateUser = (requiredRole?: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        console.log(`[Middleware] authenticateUser triggered for ${req.method} ${req.path}`); 
        try {
            let token = req.cookies["userJWT"];
            console.log("[Middleware] Token:", token ? "Present" : "Missing");

            if (!token) {
                console.log("[Middleware] No user token found");
                res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
                return;
            }

            const decoded = jwt.verify(token, secret) as TokenPayload;
            console.log("[Middleware] Decoded User Token:", decoded);

            const isBlocked = await userRepository.isUserBlocked(decoded.email);
            console.log(`[Middleware] Checking block status for ${decoded.email}: isBlocked = ${isBlocked}`);

            if (isBlocked) {
                console.log(`[Middleware] User ${decoded.email} is blocked, clearing cookie and logging out`);
                res.clearCookie("userJWT", {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    path: "/",
                });
                res.status(403).json({
                    success: false,
                    message: "Your account has been blocked. You have been logged out.",
                    logout: true,
                });
                return;
            }

            req.user = {
                id: decoded.id,
                role: decoded.role,
                email: decoded.email,
            };
            console.log("[Middleware] User in Request:", req.user);

            if (requiredRole && req.user.role !== requiredRole) {
                console.log("[Middleware] Role mismatch");
                res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
                return;
            }

            next();
        } catch (error) {
            console.error("[Middleware] JWT Verification Error:", error);
            res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired user token" });
        }
    };
};


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
                email: decoded.email,
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