import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    itemType: {
      type: String,
      enum: ["course", "ebook", "job", "subscription"],
      required: true
    },

    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    amount: { type: Number, required: true },

    // 🔥 Razorpay ka poora response
    razorpay: {
      order: { type: Object },        // create order response
      payment: { type: Object },      // payment success/fail response
      webhook: { type: Object },      // future use
      status: { type: String }
    },

    status: {
      type: String,
      enum: ["created", "success", "failed"],
      default: "created"
    },

    failureReason: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
