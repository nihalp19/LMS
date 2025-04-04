import {Response } from "express"
import CourseModel from "../models/course.models.ts"
import { catchAsyncError } from "../middleware/catchAsyncError.ts"


export const createCourse = catchAsyncError(async (data: any, res: Response) => {
    const course = await CourseModel.create(data)

    res.status(201).json({
        success: true,
        course
    })
})