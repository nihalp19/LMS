import express from "express"
import { RegistrationUser,activateUser, getUserInfo, loginUser, logoutUser, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo } from "../controllers/user.controller.ts"
import {isAuthenticated,authorization} from "../middleware/auth.ts"

const router = express.Router()

router.post('/registartion',RegistrationUser)
router.post('/activate-user',activateUser)
router.post('/login',loginUser)
router.post('/logout',isAuthenticated,authorization("admin"),logoutUser)
router.get("/refresh",updateAccessToken)
router.get("/me",isAuthenticated,getUserInfo)
router.post("/social-auth",socialAuth)
router.put("/update-user-info",isAuthenticated,updateUserInfo)
router.put("/update-user-password",isAuthenticated,updatePassword)
router.put("/update-user-avatar",isAuthenticated,updateProfilePicture)

export default router


