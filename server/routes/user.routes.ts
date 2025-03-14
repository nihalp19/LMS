import express from "express"
import { RegistrationUser } from "../controllers/user.controller.ts"

const router = express.Router()

router.post('/registartion',RegistrationUser)

export default router