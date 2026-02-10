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

const certificateTemplateSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      unique: true
    },
    certificateName: {
      type: String,
      required: true,
      trim: true
    },
    certificateImage: {
      type: String, // cloudinary image URL
      required: true
    },
    studentName: {
      type: textFieldSchema,
      required: true
    },
    courseName: {
      type: textFieldSchema,
    },
    certificateId: {
      type: textFieldSchema,
    },
    collegeName: {
      type: textFieldSchema,
    },
    issueDate: {
      type: textFieldSchema,
    },
    height: {
      type: String,
      required: true
    },
    width: {
      type: String,
      required: true
    },
    sampleTexts: {
      studentName: { type: String, default: "Abhay" },
      courseName: { type: String, default: "Course Name" },
      certificateId: { type: String, default: "dct-2026" },
      collegeName: { type: String, default: "MMIT Kushinagar" },
      issueDate: { type: String, default: "27/01/2026" },
    },
    status: {
      type: Boolean,
      default: true
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "CertificateTemplate",
  certificateTemplateSchema
);
