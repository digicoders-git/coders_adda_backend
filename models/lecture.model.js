import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({

  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },

  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CourseCurriculum", // topic id
    required: true
  },

  srNo: {
    type: Number,
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  duration: {
    type: String, // "10 min", "1:20:30"
    required: true
  },

  description: {
    type: String
  },

  privacy: {
    type: String,
    enum: ["free", "locked"],
    default: "locked"
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // ================= MEDIA =================
  video: {
    url: String,
    public_id: String
  },

  thumbnail: {
    url: String,
    public_id: String
  },

  resource: {
    url: String,
    public_id: String
  }

}, { timestamps: true });

const Lecture = mongoose.model("Lecture", lectureSchema);
export default Lecture;
