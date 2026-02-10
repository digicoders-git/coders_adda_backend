import mongoose from "mongoose";

const attemptUserSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true
    },
    marks: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    duration: { type: Number, default: 0 },
    answers: [{
      questionId: { type: String },
      selectedOption: { type: String, enum: ["a", "b", "c", "d"] }
    }],
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("AttemptUser", attemptUserSchema);
