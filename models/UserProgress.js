import mongoose from "mongoose";

const userProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },

    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseCurriculum",
      required: true
    },

    lecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: true
    },

    // how many seconds user watched
    watchedSeconds: {
      type: Number,
      default: 0
    },

    // lecture total duration in seconds (app will send)
    durationSeconds: {
      type: Number,
      required: true
    },

    // if lecture completed (>=90% rule will be applied in app)
    isCompleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// 1 user + 1 lecture = only one row
userProgressSchema.index({ user: 1, lecture: 1 }, { unique: true });

const UserProgress = mongoose.model("UserProgress", userProgressSchema);
export default UserProgress;
