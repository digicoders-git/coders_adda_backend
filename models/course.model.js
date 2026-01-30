import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({

  // ================= BASIC INFO =================
  title: {
    type: String,
    required: true,
    trim: true
  },

  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Instructor",   // 👈 Instructor schema se link
    required: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "courseCategory",  // 👈 Category schema se link
    required: true
  },

  technology: {
    type: String,   // "MERN", "React", "Python"
    required: true
  },

  description: {
    type: String,
    required: true
  },

  priceForInstructor: {
    type: Number,
    default: 15
  },

  // ================= WHAT YOU WILL LEARN =================
  whatYouWillLearn: [
    {
      type: String   // "Build real projects", "Deploy apps"
    }
  ],

  // ================= MEDIA =================
  thumbnail: {
    url: { type: String },
    public_id: { type: String }
  },

  promoVideo: {
    url: { type: String },
    public_id: { type: String }
  },

  // ================= FAQ =================
  faqs: [
    {
      question: { type: String },
      answer: { type: String }
    }
  ],

  // ================= REVIEWS =================
  reviews: [
    {
      studentName: { type: String },
      comment: { type: String },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
    // ================= PRICING =================
  priceType: {
    type: String,
    enum: ["free", "paid"],
    default: "free"
  },

  price: {
    type: Number,
    default: 0
  },

  // ================= COURSE BADGE =================
  badge: {
    type: String,
    enum: ["normal", "top", "popular", "trending"],
    default: "normal"
  },


  // ================= COURSE STATUS =================
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

const Course = mongoose.model("Course", courseSchema);
export default Course;
