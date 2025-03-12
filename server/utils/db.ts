import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

const dbUrl:string =  process.env.MONGODB_URI || '';


const connectDB = async() => {
    try {
        await mongoose.connect(dbUrl).then((data:any) => {
            console.log("MONGODB CONNETED")
        })
    } catch (error:any) {
        console.log(error.message)
        setTimeout(connectDB,5000)
    }
}

export default connectDB