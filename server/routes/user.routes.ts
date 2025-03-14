import express from "express"
import { RegistrationUser,activateUser } from "../controllers/user.controller.ts"

const router = express.Router()

router.post('/registartion',RegistrationUser)
router.post('/activate-user',activateUser)

export default router