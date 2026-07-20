import Review from "../models/review.model.js";
import fs from "fs";
import path from "path";

/* ================= CREATE ================= */
export const createReview = async (req, res) => {
  try {
    const { name, role, rating, description, status } = req.body;

    let image = {};
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      image = {
        url: `${baseUrl}/uploads/reviews/${req.file.filename}`,
        public_id: req.file.filename
      };
    }

    const review = await Review.create({
      name,
      role,
      rating,
      description,
      image,
      isActive: status === "Active"
    });

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      review
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET ALL ================= */
export const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } }
      ];
    }

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Review.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      data: reviews
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET SINGLE ================= */
export const getSingleReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    return res.status(200).json({ success: true, data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ================= UPDATE ================= */
export const updateReview = async (req, res) => {
  try {
    const { name, role, rating, description, status } = req.body;
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    let updateData = {
      name,
      role,
      rating,
      description,
      isActive: status === "Active"
    };

    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      updateData.image = {
        url: `${baseUrl}/uploads/reviews/${req.file.filename}`,
        public_id: req.file.filename
      };

      // Delete old image if exists
      if (review.image?.public_id) {
        const oldPath = path.resolve("uploads/reviews", review.image.public_id);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    review = await Review.findByIdAndUpdate(req.params.id, updateData, { new: true });

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= DELETE ================= */
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (review.image?.public_id) {
      const imagePath = path.resolve("uploads/reviews", review.image.public_id);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await Review.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

/* ================= TOGGLE STATUS ================= */
export const toggleReviewStatus = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "NotFound" });

    review.isActive = !review.isActive;
    await review.save();

    return res.status(200).json({ success: true, isActive: review.isActive });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
