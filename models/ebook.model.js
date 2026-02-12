import mongoose from "mongoose";

const ebookSchema = new mongoose.Schema({

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EbooksCategory",
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  authorName: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String
  },

  // ================= PRICING =================
  priceType: {
    type: String,
    enum: ["free", "paid"],
    default: "free"
  },

  price: {
    type: Number,
    default: 0
  },

  // ================= PDF =================
  pdf: {
    url: String,
    public_id: String
  },

  // ================= IMAGE =================
  image: {
    url: String,
    public_id: String
  },

  // ================= STATUS =================
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

const Ebook = mongoose.model("Ebook", ebookSchema);
export default Ebook;