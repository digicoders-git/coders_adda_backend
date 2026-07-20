import mongoose from "mongoose";

const shortLikeSchema = new mongoose.Schema(
  {
    shortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Short",
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or Student / whatever your user model name is
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// 🚫 1 user can like a short only once
shortLikeSchema.index({ shortId: 1, userId: 1 }, { unique: true });

export default mongoose.model("ShortLike", shortLikeSchema);
