import express from "express";
import {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  toggleReviewStatus
} from "../controllers/review.controller.js";
import upload from "../middleware/multer.js";

const reviewRoutes = express.Router();

reviewRoutes.post("/create", upload.single("image"), createReview);
reviewRoutes.get("/get", getAllReviews);
reviewRoutes.get("/get/:id", getSingleReview);
reviewRoutes.put("/update/:id", upload.single("image"), updateReview);
reviewRoutes.delete("/delete/:id", deleteReview);
reviewRoutes.patch("/toggle-status/:id", toggleReviewStatus);

export default reviewRoutes;
