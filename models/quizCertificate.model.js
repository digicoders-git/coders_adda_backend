import mongoose from "mongoose";

const quizCertificateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true
  },

  certificateUrl: {
    type: String, // URL/Path to the generated PDF or just a flag if generated on the fly
    required: true
  },

  certificateId: {
    type: String,
    unique: true,
    required: true
  },

  issuedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model("QuizCertificate", quizCertificateSchema);
