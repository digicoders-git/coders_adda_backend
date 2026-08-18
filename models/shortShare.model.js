import mongoose from "mongoose";

const shortShareSchema = new mongoose.Schema(
  {
    shortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Short",
      required: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: "User"  // ❌ abhi User model nahi hai
      required: false,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("ShortShare", shortShareSchema);
