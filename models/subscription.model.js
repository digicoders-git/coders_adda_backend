import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    planType: {
      type: String,
      required: true,
      trim: true
    },

    duration: {
      type: String, // "1 Month", "3 Months", "1 Year"
      required: true
    },

    planPricingType: {
  type: String,
  enum: ["free", "paid"],
  required: true,
  default: "free"
},

price: {
  type: Number,
  default: 0
},


    freeJobs: {
      type: Number,
      default: 0,
      min: 0
    },

    planStatus: {
      type: Boolean, // true = active, false = inactive
      default: true
    },

    planBenefits: [
      {
        type: String,
        trim: true
      }
    ],

    includedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
      }
    ],

    includedEbooks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ebook"
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);
