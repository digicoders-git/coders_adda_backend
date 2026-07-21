import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
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
        type: String, // Cloudinary
      },
      localUrl: {
        type: String, // Local Server
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

export default mongoose.model("Blog", blogSchema);
