import express from "express"
import { RegistrationUser,activateUser, loginUser, logoutUser } from "../controllers/user.controller.ts"
import {isAuthenticated} from "../middleware/auth.ts"

const router = express.Router()

router.post('/registartion',RegistrationUser)
router.post('/activate-user',activateUser)
router.post('/login',loginUser)
router.post('/logout',isAuthenticated,logoutUser)

export default router