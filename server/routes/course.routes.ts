import express from "express"
import { uploadCourse } from "../controllers/course.controllers.ts"
import {isAuthenticated,authorization} from "../middleware/auth.ts"

const router = express.Router()

router.post("/create-course",isAuthenticated,authorization("admin"),uploadCourse)
router.put("/edit-course/:id",isAuthenticated,authorization("admin"),uploadCourse)


export default router
