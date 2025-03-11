import {app} from "./app.js"
import dotenv from "dotenv"
dotenv.config()



app.listen(process.env.PORT,() => {
    console.log(`SERVER IS STARTED ON PORT ${process.env.PORT}`)
})