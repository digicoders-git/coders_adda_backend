import mongoose from "mongoose";

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
      type: Boolean,
      default: true
    },
    questionTopicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestionTopic",
      required: true
    },
    totalQuestions: { type: Number, default: 0 },
    attempts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttemptUser"
      }
    ],
    certificateTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuizCertificateTemplate"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", quizSchema);
