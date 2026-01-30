import mongoose from "mongoose";

const shortCommentSchema = new mongoose.Schema(
  {
    shortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Short",
      required: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // later replace with your real user model
      required: true,
      index: true
    },

    commentText: {
      type: String,
      required: true,
      trim: true
    },

    // null = main comment, otherwise reply to that comment
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShortComment",
      default: null
    },

    // true = admin reply, false = user comment
    isAdminReply: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("ShortComment", shortCommentSchema);
