import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config()

const db_url = process.env.DB_URL

export const db = async () => {
    try {
        await mongoose.connect(db_url)
        console.log("✅ Database connected successfully")
    } catch (error) {
        console.log("❌ Database connection error:", error)
    }
}