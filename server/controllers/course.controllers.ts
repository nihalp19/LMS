import {NextFunction,Request,Response} from "express"
import {catchAsyncError} from "../middleware/catchAsyncError.ts"
import ErrorHandler from "../utils/ErrorHandler.ts"
import cloudinary from "../utils/cloudinary.ts"
import { createCourse } from "../services/courses.services.ts"
import CourseModel from "../models/course.models.ts"



export const uploadCourse = catchAsyncError(async(req:Request,res:Response,next:NextFunction) => {
    try {
        const data = req.body
        const thumbnail = data.thumbnail;
        if(thumbnail){
            const myCLoud = await cloudinary.uploader.upload(thumbnail,{
                folder : "courses"
            })

            data.thumbnail = {
                public_id : myCLoud.public_id,
                url : myCLoud.secure_url
            }
        }

        createCourse(data,res,next)

    } catch (error:any) {
        return next(new ErrorHandler(error.message,400))
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


export const getSingleCourse = catchAsyncError(async(req:Request,res:Response,next: NextFunction) => {
    try {
        const course = await CourseModel.findById(req.params.id).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")

        res.status(200).json({
            success : true,
            course
        })

    } catch (error : any) {
        return next(new ErrorHandler(error.message,500))        
    }
})


export const getAllCourses = catchAsyncError(async(req:Request,res:Response,next:NextFunction) => {
    try {
        const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")

        res.status(200).json({
            success : true,
            courses,
        })

    } catch (error :any) {
       return next(new ErrorHandler(error.message,500)) 
    }
})