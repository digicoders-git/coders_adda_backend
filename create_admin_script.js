import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./models/admin.model.js";
import bcrypt from "bcryptjs";
import readline from "readline";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createAdmin = async () => {
  try {
    console.log("\x1b[36m%s\x1b[0m", "--- Create New Admin ---");
    
    const name = await question("Enter Name: ");
    const email = await question("Enter Email: ");
    const password = await question("Enter Password: ");

    if (!name || !email || !password) {
      console.log("\x1b[31m%s\x1b[0m", "Error: All fields (Name, Email, Password) are required.");
      rl.close();
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("\x1b[32m%s\x1b[0m", "✅ Connected to Database");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log("\x1b[31m%s\x1b[0m", `Error: Admin with email ${email} already exists.`);
      rl.close();
      mongoose.disconnect();
      process.exit(1);
    }

    // Hash Password
    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Admin
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
    });

    await newAdmin.save();
    console.log("\x1b[32m%s\x1b[0m", `🚀 Admin '${name}' (${email}) created successfully!`);
    
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "❌ Error creating admin:", error.message);
    rl.close();
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    process.exit(1);
  }
};

createAdmin();
