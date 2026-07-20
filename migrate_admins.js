import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./models/admin.model.js";
import bcrypt from "bcryptjs";

dotenv.config();

const migrateAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const admins = await Admin.find({});
    console.log(`Found ${admins.length} admins.`);

    let migratedCount = 0;

    for (const adm of admins) {
      if (!adm.password.startsWith("$2")) {
        console.log(`Hashing password for ${adm.email}...`);
        const hashedPassword = await bcrypt.hash(adm.password, 10);
        adm.password = hashedPassword;
        await adm.save();
        migratedCount++;
      }
    }

    console.log(`Migration completed. ${migratedCount} admins migrated.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

migrateAdmins();
