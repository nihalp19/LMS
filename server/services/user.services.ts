import { Response } from "express"
import { redis } from "../utils/redis.ts"

export const getUserId = async (id: string, res: Response) => {
    const user = await redis.get(id)

    if (user) {
        res.status(201).json({
            success: true,
            user,
        })
    }
}