import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const verifyUsers = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);

    // Check main comment user
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
    const targetUserId = "695f732ea84f319bad8635b4";
    const user = await User.findById(targetUserId).lean();

    if (user) {
      console.log("USER FOUND:", user.name);
    } else {
      console.log("USER NOT FOUND IN DB!");
    }

    // Also check if userModel: "User" is set for that comment
    const ShortComment = mongoose.model("ShortComment", new mongoose.Schema({}, { strict: false }));
    const comment = await ShortComment.findById("698470a5e3394d86d97bab53").lean();
    console.log("COMMENT STATE:", { id: comment._id, userModel: comment.userModel });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

verifyUsers();
