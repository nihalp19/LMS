import {Request,Response,NextFunction} from "express"
import userModel,{IUser} from "../models/user.models.ts"
import ErrorHandler from "../utils/ErrorHandler.ts"
import {catchAsyncError} from "../middleware/catchAsyncError.ts"
import jwt, { Secret } from "jsonwebtoken";
import dotenv from "dotenv"
dotenv.config()
import ejs from "ejs"
import path from "path"
import sendMail from "../sendMails.ts";
import { fileURLToPath } from 'url';
import {sendToken} from "../utils/jwt.ts"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


interface IRegistrationBody{
    name : string,
    email : string,
    password : string,
    avatar ?: string 
}

export const RegistrationUser = catchAsyncError(async(req:Request,res : Response,next : NextFunction) => {
    try {
        const {name,email,password} = req.body

        const isEmailExist = await userModel.findOne({email})
        if(isEmailExist){
            return next(new ErrorHandler("Email already exist",400))
        }

        const user : IRegistrationBody = {
            name,
            email,
            password
        }

        const activationToken = createActivationToken(user)
        const activationCode = activationToken.activationcode
        const data = {user : {name:user.name},activationCode}
        const html = await ejs.renderFile(path.join(__dirname,"../mails/activation-mail.ejs"),data)


        try {
            await sendMail({
                email : user.email,
                subject: "Activate your account",
                template : "activation-mail.ejs",
                data,
            })

            res.status(201).json({
                success : true,
                message : `Please check your email : ${user.email} to activate your account`,
                activationToken : activationToken.token
            })

        } catch (error : any) {
            return next(new ErrorHandler(error.message,400))
        }

    } catch (error :any) {
        return next(new ErrorHandler(error.message,400))
    }
})

interface IActivationToken{
    token : string,
    activationcode : string
}

export const createActivationToken = (user:any) : IActivationToken  => {
    const activationcode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign({user,activationcode},process.env.ACTIVATION_SECRET as string,{
        expiresIn : "5m"
    })

    return {token,activationcode}
}

interface IActivationRequest {
    activation_token : string,
    activation_code : string
}

export const activateUser = catchAsyncError(async(req:Request,res:Response,next:NextFunction) => {
    try {
        const {activation_token,activation_code} = req.body as IActivationRequest;

        

        const newUser : {user : IUser;activationcode:string} = jwt.verify(activation_token,process.env.ACTIVATION_SECRET as string) as {user : IUser,activationcode:string}

        
        if(newUser.activationcode !== activation_code){
            return next(new ErrorHandler("Invalid activation code",400))
        }

        const {name,email,password} = newUser.user
        const existUser = await userModel.findOne({email})

        if(existUser){
            return next(new ErrorHandler("Emaik already exist",400))
        }

        const user = await userModel.create({
            name,
            email,
            password
        })

        res.status(200).json({
            success : true
        })

    } catch (error:any) {
        return next(new ErrorHandler(error.message,400))
    }
})

interface ILoginRequest {
    email : string,
    password : string
}

export const loginUser = catchAsyncError(async(req:Request,res:Response,next : NextFunction) => {
    try {
        const {email,password} = req.body as ILoginRequest

        if(!email || !password){
            return next(new ErrorHandler("Please enter email and password",400))
        }

        const user = await userModel.findOne({email}).select("+password")

        if(!user){
            return next(new ErrorHandler("Invalid email or password",400))
        }

        const isPasswordMatched = await user.comparePassword(password);

        if (!isPasswordMatched) {
            return next(new ErrorHandler("Invalid email pr password",400))
        }

        sendToken(user,200,res)

    } catch (error:any) {
        return next(new ErrorHandler(error.message,400));
    }
})


export const logoutUser = catchAsyncError(async(req:Request,res:Response,next:NextFunction) => {
    try{
        res.cookie("access_token","",{maxAge : 1})
        res.cookie("refresh_token","",{maxAge : 1})

        res.status(200).json({
            success : true,
            message : "Logout successfully"
        })

    }catch(error : any){
        return next(new ErrorHandler(error.message,400))
    }
})


