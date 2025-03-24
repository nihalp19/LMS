import { Request, Response, NextFunction } from "express"
import dotenv from "dotenv"
dotenv.config()
import ErrorHandler from "../utils/ErrorHandler.ts"
import { catchAsyncError } from "./catchAsyncError.ts"
import jwt, { JwtPayload } from "jsonwebtoken"
import { redis } from "../utils/redis.ts"
import { IUser } from "../models/user.models.ts"

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

export const isAuthenticated = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token;

    if (!access_token) {
        return next(new ErrorHandler("Please login to access this resource", 400))
    }

    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload

    if (!decoded) {
        return next(new ErrorHandler("access token is not valid", 400))
    }

    const user = await redis.get(decoded.id);


    if (!user) {
        return next(new ErrorHandler("User not found", 400));
    }

    req.user = user as IUser;
    next();

})


export const authorization = (...roles : string[]) => {
    return (req:Request,res:Response,next:NextFunction) => {
        if(!roles.includes(req.user?.role || '')){
            return next(new ErrorHandler(`Role ${req.user?.role} is not allowed to access this resource`,403))
        }
        next()
    }
}