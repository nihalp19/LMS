import express from "express"
import { addQuestion, getAllCourses, getCourseByUser, getSingleCourse, uploadCourse } from "../controllers/course.controllers.ts"
import { isAuthenticated, authorization } from "../middleware/auth.ts"

const router = express.Router()

router.post("/create-course", isAuthenticated, authorization("admin"), uploadCourse)
router.put("/edit-course/:id", isAuthenticated, authorization("admin"), uploadCourse)
router.get("/get-course/:id", getSingleCourse)
router.get("/get-courses", getAllCourses)

router.get("/get-course-content/:id",isAuthenticated,getCourseByUser)
router.put("/add-question",isAuthenticated,addQuestion)


export default router
