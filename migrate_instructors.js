import mongoose from "mongoose";
import dotenv from "dotenv";
import Instructor from "./models/instructor.model.js";
import bcrypt from "bcryptjs";

dotenv.config();

const migrateInstructors = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const instructors = await Instructor.find({});
    console.log(`Found ${instructors.length} instructors.`);

    let migratedCount = 0;

    for (const ins of instructors) {
      if (!ins.password.startsWith("$2")) {
        console.log(`Hashing password for ${ins.email}...`);
        const hashedPassword = await bcrypt.hash(ins.password, 10);
        ins.password = hashedPassword;
        await ins.save();
        migratedCount++;
      }
    }

    console.log(`Migration completed. ${migratedCount} instructors migrated.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

migrateInstructors();
