import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },

  discountPercent: {
    type: Number,
    required: true
  },

  maxDiscountAmount: {
    type: Number // optional (limit cap)
  },

  minPurchaseAmount: {
    type: Number,
    default: 0
  },

  usageLimit: {
    type: Number // optional
  },

  usedCount: {
    type: Number,
    default: 0
  },

  usedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  validTill: {
    type: Date
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

export default mongoose.model("Coupon", couponSchema);
