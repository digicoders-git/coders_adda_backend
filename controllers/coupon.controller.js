import Coupon from "../models/coupon.model.js";

/* ===============================
   1️⃣ CREATE COUPON (Admin)
================================ */
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountPercent,
      maxDiscountAmount,
      minPurchaseAmount,
      usageLimit,
      validTill
    } = req.body;

    if (!code || !discountPercent) {
      return res.status(400).json({ success: false, message: "Code and discount percent are required" });
    }

    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountPercent,
      maxDiscountAmount,
      minPurchaseAmount,
      usageLimit,
      validTill
    });

    res.status(201).json({ success: true, message: "Coupon created successfully", coupon });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   2️⃣ GET SINGLE COUPON (Admin)
================================ */
export const getSingleCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   3️⃣ UPDATE COUPON (Admin)
================================ */
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discountPercent,
      maxDiscountAmount,
      minPurchaseAmount,
      usageLimit,
      validTill,
      isActive
    } = req.body;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    if (code) coupon.code = code.toUpperCase();
    if (discountPercent !== undefined) coupon.discountPercent = discountPercent;
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
    if (minPurchaseAmount !== undefined) coupon.minPurchaseAmount = minPurchaseAmount;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (validTill !== undefined) coupon.validTill = validTill;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    res.json({ success: true, message: "Coupon updated successfully", coupon });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   4️⃣ GET ALL COUPONS (Admin)
================================ */
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   3️⃣ DELETE COUPON (Admin)
================================ */
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   4️⃣ VALIDATE COUPON (Public/User)
================================ */
export const validateCoupon = async (req, res) => {
  try {
    const { code, amount } = req.body;

    if (!code) return res.status(400).json({ success: false, message: "Coupon code is required" });

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid or inactive coupon code" });
    }

    if (coupon.validTill && new Date(coupon.validTill) < new Date()) {
      return res.status(400).json({ success: false, message: "Coupon has expired" });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    }

    if (amount && amount < coupon.minPurchaseAmount) {
      return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required for this coupon` });
    }

    let discountAmount = (amount * coupon.discountPercent) / 100;
    if (coupon.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }

    res.json({
      success: true,
      message: "Coupon is valid",
      discountPercent: coupon.discountPercent,
      discountAmount: discountAmount,
      finalAmount: amount - discountAmount
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
