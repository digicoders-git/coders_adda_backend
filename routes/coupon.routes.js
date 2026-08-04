import express from "express";
import {
  createCoupon,
  getAllCoupons,
  deleteCoupon,
  validateCoupon,
  getSingleCoupon,
  updateCoupon
} from "../controllers/coupon.controller.js";

const couponRoutes = express.Router();

// Public routes (used by app to validate before purchase)
couponRoutes.post("/validate", validateCoupon);

// Admin routes
couponRoutes.post("/create", createCoupon);
couponRoutes.get("/get", getAllCoupons);
couponRoutes.get("/get/:id", getSingleCoupon);
couponRoutes.put("/update/:id", updateCoupon);
couponRoutes.delete("/delete/:id", deleteCoupon);

export default couponRoutes;
