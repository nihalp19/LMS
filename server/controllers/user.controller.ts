import { Request, Response, NextFunction } from "express"
import userModel, { IUser } from "../models/user.models.ts"
import ErrorHandler from "../utils/ErrorHandler.ts"
import { catchAsyncError } from "../middleware/catchAsyncError.ts"
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import dotenv from "dotenv"
dotenv.config()
import ejs from "ejs"
import path from "path"
import sendMail from "../sendMails.ts";
import { fileURLToPath } from 'url';
import { sendToken } from "../utils/jwt.ts"
import { redis } from "../utils/redis.ts";
import { accessTokenOptions, refreshTokenOptions } from "../utils/jwt.ts";
import { getUserId } from "../services/user.services.ts"
import cloudinary from "../utils/cloudinary.ts"


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


interface IRegistrationBody {
    name: string,
    email: string,
    password: string,
    avatar?: string
}

export const RegistrationUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body

        const isEmailExist = await userModel.findOne({ email })
        if (isEmailExist) {
            return next(new ErrorHandler("Email already exist", 400))
        }

        const user: IRegistrationBody = {
            name,
            email,
            password
        }

        const activationToken = createActivationToken(user)
        const activationCode = activationToken.activationcode
        const data = { user: { name: user.name }, activationCode }
        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data)


        try {
            await sendMail({
                email: user.email,
                subject: "Activate your account",
                template: "activation-mail.ejs",
                data,
            })

            res.status(201).json({
                success: true,
                message: `Please check your email : ${user.email} to activate your account`,
                activationToken: activationToken.token
            })

        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))
        }

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

interface IActivationToken {
    token: string,
    activationcode: string
}

export const createActivationToken = (user: any): IActivationToken => {
    const activationcode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign({ user, activationcode }, process.env.ACTIVATION_SECRET as string, {
        expiresIn: "5m"
    })

    return { token, activationcode }
}

interface IActivationRequest {
    activation_token: string,
    activation_code: string
}

export const activateUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code } = req.body as IActivationRequest;



        const newUser: { user: IUser; activationcode: string } = jwt.verify(activation_token, process.env.ACTIVATION_SECRET as string) as { user: IUser, activationcode: string }


        if (newUser.activationcode !== activation_code) {
            return next(new ErrorHandler("Invalid activation code", 400))
        }

        const { name, email, password } = newUser.user
        const existUser = await userModel.findOne({ email })

        if (existUser) {
            return next(new ErrorHandler("Emaik already exist", 400))
        }

        const user = await userModel.create({
            name,
            email,
            password
        })

        res.status(200).json({
            success: true
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

interface ILoginRequest {
    email: string,
    password: string
}

export const loginUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as ILoginRequest

        if (!email || !password) {
            return next(new ErrorHandler("Please enter email and password", 400))
        }

        const user = await userModel.findOne({ email }).select("+password")

        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 400))
        }

        const isPasswordMatched = await user.comparePassword(password);

        if (!isPasswordMatched) {
            return next(new ErrorHandler("Invalid email pr password", 400))
        }

        sendToken(user, 200, res)

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})


export const logoutUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("access_token", "", { maxAge: 1 })
        res.cookie("refresh_token", "", { maxAge: 1 })


        res.status(200).json({
            success: true,
            message: "Logout successfully"
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


export const updateAccessToken = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies.refresh_token as string
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload

        const message = 'Cloud not refresh token'
        if (!decoded) {
            return next(new ErrorHandler(message, 400))
        }

        const session = await redis.get(decoded.id as string)
        if (!session) {
            return next(new ErrorHandler(message, 400))
        }

        const user = session as IUser;

        const accessToken = jwt.sign(
            { id: user._id },
            process.env.ACCESS_TOKEN || "default_access_secret",  // Provide a fallback
            { expiresIn: "5m" }
        );

        const refreshToken = jwt.sign(
            { id: user._id },
            process.env.REFRESH_TOKEN || "default_refresh_secret",
            { expiresIn: "3d" }
        );


        res.cookie("access_token", accessToken, accessTokenOptions)

        res.cookie("refresh_token", refreshToken, refreshTokenOptions)

        req.user = user

        res.status(200).json({
            status: "success",
            accessToken
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


export const getUserInfo = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id as string
        getUserId(userId, res)
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


interface ISocialAuthBody {
    email: string,
    name: string;
    avatar: string
}

export const socialAuth = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, avatar } = req.body;

        const user = await userModel.findOne({ email })

        if (!user) {
            const newUser = await userModel.create({ email, name, avatar })

            sendToken(newUser, 200, res)
        } else {
            sendToken(user, 200, res);
        }

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

interface IUpdateUserInfo {
    name?: string;
    email?: string;
}

export const updateUserInfo = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body as IUpdateUserInfo

        const userId = req.user?._id as string
        const user = await userModel.findById(userId)

        if (email && user) {
            const isEmailExist = await userModel.findOne({ email })
            if (isEmailExist) {
                return next(new ErrorHandler("Email already exist", 400))
            }
            user.email = email
        }

        if (name && user) {
            user.name = name;
        }

        await user?.save()

        await redis.set(userId, JSON.stringify(user))

        res.status(201).json({
            success: true,
            user
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


interface IUpdateUserInfo {
    oldPassword: string;
    newPassword: string;
}

export const updatePassword = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { oldPassword, newPassword } = req.body as IUpdateUserInfo

        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler("Please enter new and old password", 400))
        }

        const user = await userModel.findById(req.user?._id).select("+password")

        if (user?.password === undefined) {
            return next(new ErrorHandler("Invalid user", 400))
        }

        const isPasswordMatch = await user?.comparePassword(oldPassword)

        if (!isPasswordMatch) {
            return next(new ErrorHandler("Invalid or password", 400))
        }

        user.password = newPassword
        await user.save()

        await redis.set(user?._id as string, JSON.stringify(user))

        res.status(200).json({
            success: true,
            message: "password is updated"
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

interface IUpdateProfilePicture {
    avatar: string
}

export const updateProfilePicture = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body as IUpdateProfilePicture

        const userId = req.user?._id

        const user = await userModel.findById(userId)

        if (avatar && user) {
            if (user?.avatar?.public_id) {
                await cloudinary.uploader.destroy(user?.avatar?.public_id)
                const myCloud = await cloudinary.uploader.upload(avatar, {
                    folder: "avatars",
                    width: "150"
                })

                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
            } else {
                const myCloud = await cloudinary.uploader.upload(avatar, {
                    folder: "avatars",
                    width: "150"
                })

                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }

            }
        }

        await user?.save()
        await redis.set(userId as string,JSON.stringify(user))

        res.status(200).json({
            sucess : true,
            user
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


