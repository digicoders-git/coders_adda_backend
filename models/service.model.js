import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      default: "",
      trim: true
    },
    badge: {
      type: String,
      default: "",
      trim: true
    },
    features: {
      type: [String],
      default: []
    },
    icon: {
      url: { type: String, default: "" },
      localUrl: { type: String, default: "" },
      public_id: { type: String, default: "" }
    },
    displayPlatform: {
      type: String,
      enum: ["both", "app", "website", "none"],
      default: "both"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);
