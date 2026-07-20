import mongoose from "mongoose";
import dotenv from "dotenv";
import Instructor from "./models/instructor.model.js";

dotenv.config();

const checkInstructors = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const instructors = await Instructor.find({});
    console.log(`Found ${instructors.length} instructors:`);
    instructors.forEach(ins => {
      const isHashed = ins.password.startsWith("$2"); // bcrypt hashes usually start with $2a$ or $2b$
      console.log(`- ${ins.fullName} (${ins.email}): Password is ${isHashed ? "HASHED" : "PLAIN TEXT"} | isActive: ${ins.isActive}`);
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkInstructors();
