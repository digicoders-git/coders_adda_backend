import mongoose from "mongoose";

const subscriptionPurchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    planType: String,
    duration: String,
    pricePaid: {
      type: Number,
      required: true,
    },
    pricingType: {
      type: String,
      enum: ["free", "paid"],
      default: "paid",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    paymentId: String,
    orderId: String,
    notes: String,
  },
  { timestamps: true }
);

// Index for faster queries
subscriptionPurchaseSchema.index({ subscription: 1, status: 1 });
subscriptionPurchaseSchema.index({ user: 1 });

const SubscriptionPurchase = mongoose.model(
  "SubscriptionPurchase",
  subscriptionPurchaseSchema
);

export default SubscriptionPurchase;
