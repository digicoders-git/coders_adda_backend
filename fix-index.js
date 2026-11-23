import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const fixIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/CodersAdda");
    console.log("✅ Database Connected");
    
    const collection = mongoose.connection.db.collection('users');
    
    // Purane index ko delete karo
    console.log("⏳ Dropping old email_1 index...");
    await collection.dropIndex("email_1");
    
    console.log("✨ Success! Purana index delete ho gaya.");
    console.log("Ab aap server restart kijiye, naya index automatically ban jayega.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error dropping index:", error.message);
    console.log("Tip: Agar index pehle se delete ho chuka hai, to ye error dikhayega.");
    process.exit(1);
  }
};

fixIndex();