import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../interfaces/AuthRequest";
import dotenv from "dotenv";
import { Cookie } from "../interfaces/IEnums";

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

// export const authenticateUser = (requiredRole?: string) => {
//     return (req: AuthRequest, res: Response, next: NextFunction): void => {
//         try {
//             let token = req.cookies["userJWT"];

//             if (!token) {
//                 console.log("No user token found");
//                 res.status(401).json({ message: "Unauthorized: No user token provided" });
//                 return;
//             }


//             const decoded = jwt.verify(token, secret) as TokenPayload;
//             console.log("Decoded User Token:", decoded);


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



// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
// import { AuthRequest } from "../interfaces/AuthRequest";
// import dotenv from "dotenv";
// import { UserRepository } from "../repositories/userRepository";

// dotenv.config();

// const secret = process.env.JWT_SECRET!;
// const userRepository = new UserRepository();

// interface TokenPayload {
//     id: string;
//     role: string;
//     email: string;
//     iat?: number;
//     exp?: number;
// }

// export const authenticateUser = (requiredRole?: string) => {
//     return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
//         console.log(`[Middleware] authenticateUser triggered for ${req.method} ${req.path}`);
//         try {
//             let token = req.cookies["userJWT"];
//             console.log("[Middleware] Token:", token ? "Present" : "Missing");

//             if (!token) {
//                 console.log("[Middleware] No user token found");
//                 res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
//                 return;
//             }

//             const decoded = jwt.verify(token, secret) as TokenPayload;
//             console.log("[Middleware] Decoded User Token:", decoded);

//             const isBlocked = await userRepository.isUserBlocked(decoded.email);
//             console.log(`[Middleware] Checking block status for ${decoded.email}: isBlocked = ${isBlocked}`);

//             if (isBlocked) {
//                 console.log(`[Middleware] User ${decoded.email} is blocked, clearing cookie and logging out`);
//                 res.clearCookie("userJWT", {
//                     httpOnly: true,
//                     secure: process.env.NODE_ENV === "production",
//                     path: "/",
//                 });
//                 res.status(403).json({
//                     success: false,
//                     message: "Your account has been blocked. You have been logged out.",
//                     logout: true,
//                 });
//                 return;
//             }

//             req.user = {
//                 id: decoded.id,
//                 role: decoded.role,
//                 email: decoded.email,
//             };
//             console.log("[Middleware] User in Request:", req.user);

//             if (requiredRole && req.user.role !== requiredRole) {
//                 console.log("[Middleware] Role mismatch");
//                 res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
//                 return;
//             }

//             next();
//         } catch (error) {
//             console.error("[Middleware] JWT Verification Error:", error);
//             res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired user token" });
//         }
//     };
// };


// export const authenticateAdmin = (requiredRole?: string) => {
//     return (req: AuthRequest, res: Response, next: NextFunction): void => {
//         try {
//             let token = req.cookies.adminJWT;

//             if (!token) {
//                 console.log("No token found");
//                 res.status(401).json({ message: "Unauthorized: No token provided" });
//                 return;
//             }

//             const decoded = jwt.verify(token, secret) as TokenPayload;
//             console.log("Decoded Token:", decoded);

//             req.user = {
//                 id: decoded.id,
//                 role: decoded.role,
//                 email: decoded.email,
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