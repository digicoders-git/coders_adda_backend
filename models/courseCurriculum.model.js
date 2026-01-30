import mongoose from "mongoose";

const courseCurriculumSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },

  topic: {
    type: String,
    required: true,
    trim: true
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

const CourseCurriculum = mongoose.model("CourseCurriculum", courseCurriculumSchema);
export default CourseCurriculum;
