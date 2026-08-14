import express from "express";
import {
  createCoupon,
  getAllCoupons,
  deleteCoupon,
  validateCoupon,
  getSingleCoupon,
  updateCoupon,
  getActiveCoupons
} from "../controllers/coupon.controller.js";

import userAuth from "../middleware/userAuth.js";

const couponRoutes = express.Router();

// Public routes (used by app to validate before purchase)
couponRoutes.post("/validate", userAuth, validateCoupon);
couponRoutes.get("/get-active", getActiveCoupons);

// Admin routes
couponRoutes.post("/create", createCoupon);
couponRoutes.get("/get", getAllCoupons);
couponRoutes.get("/get/:id", getSingleCoupon);
couponRoutes.put("/update/:id", updateCoupon);
couponRoutes.delete("/delete/:id", deleteCoupon);

export default couponRoutes;
