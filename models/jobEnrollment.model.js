import mongoose from "mongoose";

const jobEnrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    pricePaid: {
      type: Number,
      default: 0
    },
    paymentId: {
      type: String
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Ensure a user can only "enroll" in a job once
jobEnrollmentSchema.index({ user: 1, job: 1 }, { unique: true });

export default mongoose.model("JobEnrollment", jobEnrollmentSchema);
