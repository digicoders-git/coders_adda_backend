import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const debugComments = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    const ShortComment = mongoose.model("ShortComment", new mongoose.Schema({}, { strict: false }));
    const comment = await ShortComment.findById("698470a5e3394d86d97bab53").lean();
    console.log("MAIN COMMENT:", JSON.stringify(comment, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

debugComments();
