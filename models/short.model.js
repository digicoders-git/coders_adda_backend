import mongoose from "mongoose";

const shortSchema = new mongoose.Schema(
  {
    instructorName: {
      type: String,
      required: true,
      trim: true
    },

    caption: {
      type: String,
      required: true
    },

    video: {
      url: { type: String, required: true },
      public_id: { type: String, required: true }
    },

    // ===== COUNTER CACHE (FAST COUNTS) =====
    totalLikes: {
      type: Number,
      default: 0
    },

    totalComments: {
      type: Number,
      default: 0
    },

    totalShares: {
      type: Number,
      default: 0
    },

    // ===== STATUS =====
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Short", shortSchema);
