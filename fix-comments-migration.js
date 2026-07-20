import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const fixComments = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Connected to DB");

    // Try raw collection update
    const result = await mongoose.connection.collection("shortcomments").updateMany(
      { userModel: { $exists: false } },
      { $set: { userModel: "User" } }
    );

    console.log(`Updated ${result.modifiedCount} comments in 'shortcomments' collection`);
    process.exit(0);
  } catch (error) {
    console.error("Error fixing comments:", error);
    process.exit(1);
  }
};

fixComments();
