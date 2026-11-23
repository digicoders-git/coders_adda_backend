import mongoose from 'mongoose';
import readline from 'readline';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from './models/admin.model.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Database');

    const name = await askQuestion('Enter Admin Name: ');
    const email = await askQuestion('Enter Admin Email: ');
    const password = await askQuestion('Enter Admin Password: ');

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('❌ Admin with this email already exists!');
      rl.close();
      mongoose.disconnect();
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
      name,
      email,
      password: hashedPassword
    });

    await admin.save();
    console.log('🎉 Admin created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    rl.close();
    mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

createAdmin();
