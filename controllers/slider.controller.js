import Slider from "../models/slider.model.js";
import cloudinary from "../config/cloudinary.js";

/* ================= CREATE SLIDER ================= */
export const createSlider = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "sliders"
    });

    const slider = await Slider.create({
      image: {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      }
    });

    res.status(201).json({
      message: "Slider created successfully",
      data: slider
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= UPDATE SLIDER ================= */
export const updateSlider = async (req, res) => {
  try {
    const { id } = req.params;

    const slider = await Slider.findById(id);
    if (!slider) {
      return res.status(404).json({ message: "Slider not found" });
    }

    if (req.file) {
      // delete old image from cloudinary
      if (slider.image?.public_id) {
        await cloudinary.uploader.destroy(slider.image.public_id);
      }

      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "sliders"
      });

      slider.image = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      };
    }

    await slider.save();

    res.json({
      message: "Slider updated successfully",
      data: slider
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= DELETE SLIDER ================= */
export const deleteSlider = async (req, res) => {
  try {
    const { id } = req.params;

    const slider = await Slider.findById(id);
    if (!slider) {
      return res.status(404).json({ message: "Slider not found" });
    }

    // delete image from cloudinary
    if (slider.image?.public_id) {
      await cloudinary.uploader.destroy(slider.image.public_id);
    }

    await slider.deleteOne();

    res.json({ message: "Slider deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET ALL SLIDERS ================= */
export const getAllSliders = async (req, res) => {
  try {
    const { isActive, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const sliders = await Slider.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Slider.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: sliders
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= TOGGLE SLIDER STATUS ================= */
export const toggleSliderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const slider = await Slider.findById(id);
    if (!slider) {
      return res.status(404).json({ message: "Slider not found" });
    }

    slider.isActive = !slider.isActive; // toggle true/false
    await slider.save();

    res.json({
      message: "Slider status updated successfully",
      data: {
        _id: slider._id,
        isActive: slider.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
