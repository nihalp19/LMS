import { NextFunction, Request, Response } from "express"
import { catchAsyncError } from "../middleware/catchAsyncError.ts"
import ErrorHandler from "../utils/ErrorHandler.ts"
import cloudinary from "../utils/cloudinary.ts"
import { createCourse } from "../services/courses.services.ts"
import CourseModel from "../models/course.models.ts"
import { redis } from "../utils/redis.ts"
import mongoose, { Error } from "mongoose"
import path from "path"
import ejs from "ejs"
import sendMail from "../sendMails.ts"


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

        if (isCacheExist) {
            const courses = isCacheExist

            res.status(200).json({
                success: true,
                courses,
            })
        } else {
            const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")

            await redis.set("allCourses", JSON.stringify(courses))

            res.status(200).json({
                success: true,
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


export const getCourseByUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user?.courses

        const courseId = req.params.id

        const courseExits = userCourseList?.find((course: any) => course._id === courseId)

        if (!courseExits) {
            return next(new ErrorHandler("you are not eligible to access this course", 404))
        }

        const course = await CourseModel.findById(courseId)

        const content = course?.courseData

        res.status(200).json({
            success: true,
            content
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})


interface IAddQuestionData {
    question: string,
    courseId: string,
    contentId: string
}


export const addQuestion = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question, courseId, contentId }: IAddQuestionData = req.body

        const course = await CourseModel.findById(courseId)

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid content id", 400))
        }


        const courseContent = course?.courseData.find((item: any) => item._id.equals(contentId))

        const newQuestion: any = {
            user: req.user,
            question,
            questionReplies: []
        }

        courseContent?.questions.push(newQuestion)

        await course?.save()
        res.status(200).json({
            success: true,
            course
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})


interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}


export const addAnswer = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { answer, courseId, contentId, questionId }: IAddAnswerData = req.body

        const course = await CourseModel.findById(courseId)

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid content id", 400))
        }

        const courseContent = course?.courseData.find((item: any) => item._id.equals(contentId))


        if (!courseContent) {
            return next(new ErrorHandler("Invalid content id", 400))
        }

        const question = courseContent?.questions?.find((item: any) => item._id.equals(questionId))


        if (!question) {
            return next(new ErrorHandler("Invalid question id", 400))
        }

        const newAnswer: any = {
            user: req.user,
            answer
        }

        question.questionReplies.push(newAnswer)

        await course?.save()

        if (req.user?._id === question.user._id) {

        } else {
            const data = {
                name: question.user.name,
                title: courseContent.title
            }
            const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data)

            try {
                await sendMail({
                    email: question.user.email,
                    subject: "Question Reply",
                    template: "question-reply.ejs",
                    data
                })
            } catch (error: any) {
                return next(new ErrorHandler(error.message, 500))
            }
        }



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})


interface IAddReviewData {
    review: string;
    courseId: string;
    rating: number;
    userId: string
}


export const addReview = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user?.courses

        const courseId = req.params.id

        const courseExits = userCourseList?.some((course: any) => course._id.toString() === courseId.toString())

        if (!courseExits) {
            return next(new ErrorHandler("Your are not eligible to access this course", 404))
        }

        const course = await CourseModel.findById(courseId)

        const { review, rating } = req.body as IAddReviewData

        const reviewData: any = {
            user: req.user,
            comment: review,
            rating
        }

        course?.reviews.push(reviewData)

        let avg = 0

        course?.reviews.forEach((rev: any) => {
            avg += rev.rating
        })

        if (course) {
            course.ratings = avg / course?.reviews.length
        }

        const notification = {
            title : "New Review Received",
            message : `${req.user?.name} has given review in ${course?.name}`
        }

        res.status(200).json({
            success : true,
            course
        })

    } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
    }
})

interface IAddReviewData {
    comment : string,
    courseId : string,
    reviewId: string,
}


export const addReplyToReview = catchAsyncError(async(req:Request,res:Response,next:NextFunction) => {

    try {
        
        const {comment,courseId,reviewId} = req.body as IAddReviewData

        const course = await CourseModel.findById(courseId)

        if(!course){
            return next(new ErrorHandler("course not found",404))
        }

        const review = course?.reviews?.find((rev:any) => rev._id.toString() === reviewId)


        if(!review){
           return next(new ErrorHandler("Review not found",404))
        }

        const replyData :any = {
            user : req.user,
            comment
        }
       
        if(!review.commentReplies){
            review.commentReplies = []
        }

        review.commentReplies?.push(replyData)
        await course?.save()

        res.status(200).json({
            success:true,
            course
        })

    } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
    }

})