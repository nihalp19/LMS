import userModel from "../models/user.models.ts"
import { Response } from "express"

export const getUserId = async (id: string, res: Response) => {
    const user = await userModel.findById(id)
    res.status(201).json({
        success: true,
        user,
    })
}