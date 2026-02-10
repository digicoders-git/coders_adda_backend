import Slider from "../models/slider.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import path from "path";

/* ================= CREATE SLIDER ================= */
export const createSlider = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    /* const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "sliders"
    }); */
    const baseUrl = process.env.BASE_URL;
    const imageUrl = `${baseUrl}/uploads/sliders/${req.file.filename}`;

    const slider = await Slider.create({
      image: {
        url: imageUrl,
        public_id: req.file.filename
      }
    });

    res.status(201).json({
      success: true,
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
      // delete old image
      if (slider.image?.public_id) {
        /* await cloudinary.uploader.destroy(slider.image.public_id); */
        const oldFilePath = path.join("uploads/sliders", slider.image.public_id);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      /* const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "sliders"
      }); */

      const baseUrl = process.env.BASE_URL;
      const imageUrl = `${baseUrl}/uploads/sliders/${req.file.filename}`;

      slider.image = {
        url: imageUrl,
        public_id: req.file.filename
      };
    }

    await slider.save();

    res.json({
      success: true,
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

    // delete image locally
    if (slider.image?.public_id) {
      /* await cloudinary.uploader.destroy(slider.image.public_id); */
      const filePath = path.join("uploads/sliders", slider.image.public_id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await slider.deleteOne();

    res.json({ success: true, message: "Slider deleted successfully" });
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
      success: true,
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
