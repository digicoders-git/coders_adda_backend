import mongoose from "mongoose";

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    quizCode: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['Quiz', 'Test'], default: 'Quiz' },
    startSmsSent: { type: Boolean, default: false },
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null
    },
    scheduledStartTime: { type: Date },
    selectedQuestions: [{ type: mongoose.Schema.Types.ObjectId }],
    customQuestions: [
      {
        question: { type: String, required: true },
        options: {
          a: { type: String, required: true },
          b: { type: String, required: true },
          c: { type: String, required: true },
          d: { type: String, required: true }
        },
        correctAnswer: {
          type: String,
          required: true,
          enum: ["a", "b", "c", "d"]
        }
      }
    ],
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
