import { NextFunction, Request, Response } from "express"
import { catchAsyncError } from "../middleware/catchAsyncError.ts"
import ErrorHandler from "../utils/ErrorHandler.ts"
import cloudinary from "../utils/cloudinary.ts"
import { createCourse } from "../services/courses.services.ts"
import CourseModel from "../models/course.models.ts"
import { redis } from "../utils/redis.ts"


export const uploadCourse = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const myCLoud = await cloudinary.uploader.upload(thumbnail, {
                folder: "courses"
            })

            data.thumbnail = {
                public_id: myCLoud.public_id,
                url: myCLoud.secure_url
            }
        }

        createCourse(data, res, next)

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

export const editCourse = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params.id;
        const data = req.body;

        // Find existing course
        let course = await CourseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler("Course not found", 404));
        }

        // Update course with new data
        course = await CourseModel.findByIdAndUpdate(courseId, { $set: data }, { new: true, upsert: false });

        res.status(200).json({
            success: true,
            message: "Course updated successfully",
            course
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


export const getSingleCourse = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params.id;
        const isCacheExist = await redis.get(courseId);

        if (isCacheExist) {
            return res.status(200).json({
                success: true,
                course: isCacheExist, // Assuming cached data is stringified JSON
            });
        } else {
            const course = await CourseModel.findById(courseId)
                .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");

            await redis.set(courseId, JSON.stringify(course))

            return res.status(200).json({
                success: true,
                course,
            });
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


export const getAllCourses = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {


        const isCacheExist = await redis.get("allCourses")

        if(isCacheExist){
            const courses = isCacheExist
            
            res.status(200).json({
                success : true,
                courses,
            })
        }else{
            const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")

            await redis.set("allCourses",JSON.stringify(courses))

            res.status(200).json({
                success : true,
                courses
            })
        }

        const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")

        res.status(200).json({
            success: true,
            courses,
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})


export const getCourseByUser = catchAsyncError(async(req:Request,res:Response,next:NextFunction) => {
    try {
        const userCourseList = req.user?.courses

        const courseId = req.params.id

        const courseExits = userCourseList?.find((course:any) => course._id === courseId)

        if(!courseExits){
            return next(new ErrorHandler("you are not eligible to access this course",404))
        }

        const course = await CourseModel.findById(courseId)

        const content = course?.courseData

        res.status(200).json({
            success : true,
            content
        })

    } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
    }
})