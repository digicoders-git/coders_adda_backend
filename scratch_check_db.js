import mongoose from "mongoose";
import dotenv from "dotenv";
import CourseCategory from "./models/courseCategory.model.js";

dotenv.config();

const checkCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
        
        const categories = await CourseCategory.find();
        console.log("Categories found:", categories.length);
        
        categories.forEach(cat => {
            console.log(`- ${cat.name}: image field =`, cat.image);
        });
        
        await mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
};

checkCategories();
