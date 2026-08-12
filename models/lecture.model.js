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
  },

  description: {
    type: String
  },

  privacy: {
    type: String,
    enum: ["free", "locked"],
    default: "locked"
  },

  price: {
    type: Number,
    default: 0,
    min: 0
  },

  isActive: {
    type: Boolean,
    default: true
  },

  contentType: {
    type: String,
    enum: ["video", "pdf", "live", "youtube_zoom", "webinar", "test", "subjective_test"],
    default: "video"
  },

  liveUrl: {
    type: String
  },

  liveStatus: {
    type: String,
    enum: ["scheduled", "live", "ended"],
    default: "scheduled"
  },

  scheduledAt: {
    type: Date
  },

  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz"
  },

  // ================= MEDIA =================
  video: {
    url: String, // Cloudinary
    localUrl: String, // Backend
    public_id: String
  },


  thumbnail: {
    url: String, // Cloudinary
    localUrl: String, // Backend
    public_id: String
  },


  resource: {
    url: String, // Cloudinary
    localUrl: String, // Backend
    public_id: String
  }


}, { timestamps: true });

const Lecture = mongoose.model("Lecture", lectureSchema);
export default Lecture;
