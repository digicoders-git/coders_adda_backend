import mongoose from "mongoose";

const sliderSchema = new mongoose.Schema(
  {
    image: {
      url: { type: String, required: true },
      public_id: { type: String, required: true }
    },
    isActive: {
      type: Boolean,
      default: true // true = show, false = hide
    }
  },
  { timestamps: true }
);

export default mongoose.model("Slider", sliderSchema);
