import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  // Mobile login ke liye
  mobile: {
    type: String,
    required: true,
    unique: true
  },

  // Google login ke liye
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    lowercase: true
  },
  name: {
    type: String
  },
  picture: {
    type: String
  },

  // Mobile verification status
  isMobileVerified: {
    type: Boolean,
    default: false
  },

  // Login method
  loginMethod: {
    type: String,
    enum: ['mobile', 'google'],
    required: true
  },

  // Profile
  // name:{
  //   type:String,
  //   default:""
  // },
  // email:{
  //   type:String,
  //   default:""
  // },
  about: {
    type: String,
    default: ""
  },
  socialLinks: [
    {
      type: String,
      default: ""
    }
  ],
  profilePicture: {
    url: { type: String, default: "" },
    public_id: { type: String, default: "" }
  },

  // Student Details
  college: {
    type: String,
    default: ""
  },
  course: {
    type: String,
    default: ""
  },
  semester: {
    type: String,
    default: ""
  },
  technology: [{
    type: String,
    default: ""
  }],
  skills: [
    {
      type: String,
      default: ""
    }
  ],

  purchaseCourses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }
  ],
  purchaseEbooks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ebook" }],
  purchaseJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  purchaseSubscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subscription" }],


  // Active

  isActive: {
    type: Boolean,
    default: true
  },
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User