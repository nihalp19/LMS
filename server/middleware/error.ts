import ErrorHandler from "../utils/ErrorHandler.ts";
import { Request, NextFunction, Response } from "express"


const MiddlewareError = (err: any, req: Request, res: Response,next : NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal server error'

    //wring mongodb id error
    if (err.name === 'CastError') {
        const message = `Resource not found,Invalid : ${err.path}`;
        err = new ErrorHandler(message, 400);
    }


    //duplicate key error
    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler(message, 400);
    }

    //wrong jwt error
    if (err.name === "JsonWebTokenError") {
        const message = `Json web Token is invalid,try again`;
        err = new ErrorHandler(message, 400);
    }
    //jwt expired
    if (err.name === 'TokenExpiredError') {
        const message = 'Json web Token is expired,try again'
        err = new ErrorHandler(message, 400)
    }


    //res to client
    res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });

}

export default MiddlewareError;
