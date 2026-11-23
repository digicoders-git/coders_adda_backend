import mongoose from "mongoose";

const freeDownloadSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    authorName: {
      type: String,
      default: "Admin",
      trim: true,
    },
    file: {
      url: String,
      localUrl: String,
      public_id: String,
      fileName: String,
      fileSize: String,
      fileType: String,
    },
    thumbnail: {
      url: String,
      localUrl: String,
      public_id: String,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const FreeDownload = mongoose.model("FreeDownload", freeDownloadSchema);
export default FreeDownload;
