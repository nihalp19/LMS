import {app} from "./app.js"
import dotenv from "dotenv"
import connectDb from "./utils/db.ts"
dotenv.config()



app.listen(process.env.PORT,() => {
    console.log(`SERVER IS STARTED ON PORT ${process.env.PORT}`)
    connectDb()
})