import mongoose from "mongoose";

const ambassadorApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  collegeName: {
    type: String,
    required: true
  },
  courseStream: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminComment: {
    type: String,
    default: ""
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referralCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export default mongoose.model("AmbassadorApplication", ambassadorApplicationSchema);
