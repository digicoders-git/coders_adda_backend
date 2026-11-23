import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
      default: 5,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    image: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    displayPlatform: {
      type: String,
      enum: ["both", "app", "website", "none"],
      default: "both",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
