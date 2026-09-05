import mongoose from "mongoose";

const lecturePurchaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  lecture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lecture",
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentId: {
    type: String
  },
  orderId: {
    type: String
  }
}, { timestamps: true });

lecturePurchaseSchema.index({ user: 1, lecture: 1 }, { unique: true });

const LecturePurchase = mongoose.model("LecturePurchase", lecturePurchaseSchema);
export default LecturePurchase;
