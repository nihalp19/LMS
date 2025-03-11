import express, { NextFunction, Request, Response } from "express"
import dotenv from "dotenv"
export const app = express()
import cors from "cors"
import cookieParse from "cookie-parser"
dotenv.config()

app.use(express.json({ limit: "50mb" }))
app.use(cookieParse())
app.use(cors({
    origin: process.env.ORIGIN
}))


app.get("/", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: "BACKEND IS RUNNING"
    })
})

app.all('*',(req:Request,res:Response,next:NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statCode = 404;
    next(err)
})