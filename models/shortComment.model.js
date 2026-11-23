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
      refPath: "userModel",
      required: true,
      index: true
    },

    userModel: {
      type: String,
      required: true,
      enum: ["User", "Admin"],
      default: "User"
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
