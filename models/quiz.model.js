import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    validate: (v) => Array.isArray(v) && v.length === 4
  },
  correctOption: { type: Number, required: true } // Index 0-3
});

const attemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  marks: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  duration: { type: Number, default: 0 },
  answers: [{
    questionId: { type: String },
    selectedOption: { type: Number }
  }],
  submittedAt: { type: Date, default: Date.now }
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    quizCode: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, required: true }, // in minutes
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advance"],
      default: "Beginner"
    },
    points: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["Active", "Disable"],
      default: "Active"
    },
    questions: [questionSchema],
    totalQuestions: { type: Number, default: 0 },
    attempts: {
      type: [attemptSchema],
      default: []
    }
  },
  { timestamps: true }
);



export default mongoose.model("Quiz", quizSchema);
