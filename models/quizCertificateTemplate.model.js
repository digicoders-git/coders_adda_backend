import mongoose from "mongoose";

const textFieldSchema = new mongoose.Schema(
  {
    fontFamily: { type: String, default: "Inter" },
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
    fontSize: { type: String, default: "30px" },
    textColor: { type: String, default: "#000000" },
    verticalPosition: { type: String, default: "400" },
    horizontalPosition: { type: String, default: "600" },
    status: { type: Boolean, default: true },
  },
  { _id: false }
);

const quizCertificateTemplateSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      unique: true
    },
    certificateName: {
      type: String,
      required: true,
      trim: true
    },
    certificateImage: {
      type: String, // Local path /uploads/...
      required: true
    },
    studentName: { type: textFieldSchema },
    quizName: { type: textFieldSchema },
    quizCode: { type: textFieldSchema },
    userMobile: { type: textFieldSchema },
    collegeName: { type: textFieldSchema },
    totalScore: { type: textFieldSchema },
    certificateId: { type: textFieldSchema },
    issueDate: { type: textFieldSchema },
    height: {
      type: String,
      required: true
    },
    width: {
      type: String,
      required: true
    },
    sampleTexts: {
      studentName: { type: String, default: "John Doe" },
      quizName: { type: String, default: "PHP Certification" },
      quizCode: { type: String, default: "PHP101" },
      userMobile: { type: String, default: "9876543210" },
      collegeName: { type: String, default: "CodersAdda Academy" },
      totalScore: { type: String, default: "45 / 50" },
      certificateId: { type: String, default: "QC-123456" },
      issueDate: { type: String, default: "10/02/2026" },
    },
    status: {
      type: Boolean,
      default: true
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "QuizCertificateTemplate",
  quizCertificateTemplateSchema
);
