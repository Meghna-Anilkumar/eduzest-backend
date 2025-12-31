// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
// import { AuthRequest } from "../interfaces/AuthRequest";
// import dotenv from "dotenv";
// import { Cookie } from "../utils/Enum";

// dotenv.config();

// const secret = process.env.JWT_SECRET!;

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


//             const decoded = jwt.verify(token, secret) as TokenPayload;
//             console.log("Decoded Token:", decoded);

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
//   return (req: AuthRequest, res: Response, next: NextFunction): void => {
//     try {
//       const token = req.cookies[Cookie.userJWT];
      
//       if (!token) {
//         console.log("No user token found");
//         res.status(401).json({ message: "Unauthorized: No token provided" });
//         return; 
//       }

//       const decoded = jwt.verify(token, secret) as TokenPayload;
//       console.log("Decoded User Token:", decoded);
      
//       req.user = {
//         id: decoded.id,
//         role: decoded.role,
//         email: decoded.email,
//       };

//       if (requiredRole && req.user.role !== requiredRole) {
//         res.status(403).json({ message: "Forbidden: Insufficient permissions" });
//         return; 
//       }

//       next(); 
      
//     } catch (error) {
//       if (error instanceof jwt.TokenExpiredError) {
//         res.status(401).json({
//           message: "Token expired. Please use the refresh token to obtain a new access token.",
//         });
//         return;
//       }
      
//       console.error("JWT Verification Error:", error);
//       res.status(401).json({ message: "Unauthorized: Invalid token" });
//       return; 
//     }
//   };
// };



import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { Status } from "../utils/enums";
import { MESSAGE_CONSTANTS } from "../constants/message_constants";
import { Cookie } from "../utils/Enum";

interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
        email: string;
    };
}


export const authenticateUser = (requiredRole?: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const token = req.cookies[Cookie.userJWT];

            if (!token) {
                return res.status(Status.UN_AUTHORISED).json({
                    success: false,
                    message: MESSAGE_CONSTANTS.UNAUTHORIZED
                });
            }

            const payload = verifyAccessToken(token);
            req.user = payload;

            if (requiredRole && payload.role !== requiredRole) {
                return res.status(Status.FORBIDDEN).json({
                    success: false,
                    message: "Access denied. Insufficient permissions."
                });
            }

            next();
        } catch (error) {
            return res.status(Status.UN_AUTHORISED).json({
                success: false,
                message: "Invalid or expired token"
            });
        }
    };
};


export const authenticateAdmin = () => authenticateUser("Admin");
export const authenticateInstructor = () => authenticateUser("Instructor");
export const authenticateStudent = () => authenticateUser("Student");
export const authenticateAny = () => authenticateUser(); 