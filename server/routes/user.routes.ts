import express from "express"
import { RegistrationUser,activateUser, loginUser, logoutUser } from "../controllers/user.controller.ts"

const router = express.Router()

router.post('/registartion',RegistrationUser)
router.post('/activate-user',activateUser)
router.post('/login',loginUser)
router.post('/logout',logoutUser)

export default router