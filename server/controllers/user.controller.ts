import {Request,Response,NextFunction} from "express"
import userModel,{IUser} from "../models/user.models"
import ErrorHandler from "../utils/ErrorHandler"
import {catchAsyncError} from "../middleware/catchAsyncError"
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
dotenv.config()
import ejs from "ejs"
import path from "path"

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
            
        } catch (error) {
            
        }

    } catch (error) {
        
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

