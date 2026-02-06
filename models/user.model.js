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
    lowercase: true,
    unique: true,
    sparse: true
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
  purchaseSubscriptions: [
    {
      subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
        required: true
      },
      startDate: {
        type: Date,
        default: Date.now
      },
      endDate: {
        type: Date,
        required: true
      }
    }
  ],


  // Active

  isActive: {
    type: Boolean,
    default: true
  },

  // Referral & Ambassador Program
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  isAmbassador: {
    type: Boolean,
    default: false
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralCount: {
    type: Number,
    default: 0
  },
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User