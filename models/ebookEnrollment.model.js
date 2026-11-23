import mongoose from "mongoose";

const ebookEnrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    ebook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ebook",
      required: true
    },

    paymentId: {
      type: String
    },

    pricePaid: {
      type: Number,
      default: 0
    },

    enrolledAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// 1 user + 1 ebook = only once
ebookEnrollmentSchema.index({ user: 1, ebook: 1 }, { unique: true });

export default mongoose.model("EbookEnrollment", ebookEnrollmentSchema);
