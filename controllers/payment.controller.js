import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import Coupon from "../models/coupon.model.js";
// import { resolveProduct } from "../services/productResolver.service.js";
import { purchasableItemsMap } from "../services/purchasableItemsMap.js";
import { calculateInstructorEarning } from "../utils/earningHandler.js";

/* ===============================
   1️⃣ CREATE ORDER
================================ */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, itemId, couponCode } = req.body;

    const config = purchasableItemsMap[itemType];
    if (!config) return res.status(400).json({ message: "Invalid item type" });

    const item = await config.model.findById(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item[config.priceTypeField] === "free") {
      return res.status(400).json({ message: "This item is free. Use free enroll API." });
    }

    const amount = item[config.priceField];

    // 🔥 Coupon Logic Injection
    let finalAmount = amount;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

      if (!coupon) {
        return res.status(400).json({ message: "Invalid or inactive coupon" });
      }

      if (coupon.validTill && new Date(coupon.validTill) < new Date()) {
        return res.status(400).json({ message: "Coupon expired" });
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({ message: "Coupon limit reached" });
      }

      if (amount < coupon.minPurchaseAmount) {
        return res.status(400).json({ message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required for this coupon` });
      }

      discountAmount = (amount * coupon.discountPercent) / 100;

      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }

      finalAmount = Math.max(0, amount - discountAmount);
      appliedCoupon = coupon;
    }

    const order = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100), // Ensuring it's an integer
      currency: "INR",
      receipt: "rcpt_" + Date.now()
    });

    // 🔥 DB me create karo (full response save)
    const payment = await Payment.create({
      user: userId,
      itemType,
      itemId,
      amount: finalAmount, // Save actual amount user paid
      coupon: appliedCoupon ? {
        code: appliedCoupon.code,
        discountAmount: discountAmount
      } : undefined,
      razorpay: {
        order: order,
        status: "created"
      },
      status: "created"
    });

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error("Create order error:", err);
    const statusCode = err.statusCode || 500;
    const message = err.error?.description || err.message || "Order creation failed";
    return res.status(statusCode).json({ success: false, message });
  }
};

/* ===============================
   2️⃣ VERIFY PAYMENT
================================ */
export const verifyPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const payment = await Payment.findOne({ "razorpay.order.id": razorpay_order_id });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    // 🔐 Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // ❌ FAILED PAYMENT
      payment.status = "failed";
      payment.razorpay.payment = req.body;
      payment.razorpay.status = "failed";
      payment.failureReason = "Signature mismatch";
      await payment.save();

      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // ✅ SUCCESS PAYMENT
    payment.status = "success";
    payment.razorpay.payment = req.body;
    payment.razorpay.status = "captured";
    await payment.save();

    // ✅ ONLY COURSE CASE me user schema update hoga
    // if (payment.itemType === "course") {
    //   await User.findByIdAndUpdate(userId, {
    //     $addToSet: { purchaseCourses: payment.itemId }
    //   });
    // }

    // const user = await User.findById(userId);

    // const config = purchasableItemsMap[payment.itemType];
    // if (!config) throw new Error("Invalid item type");

    // await config.unlock(user, payment.itemId);
    // await user.save();

    const user = await User.findById(userId);

    const config = purchasableItemsMap[payment.itemType];
    if (!config) throw new Error("Invalid item type");

    // 🔥 FIRST unlock user
    await config.unlock(user, payment.itemId);
    await user.save();

    payment.status = "success";
    payment.razorpay.payment = req.body;
    payment.razorpay.status = "captured";
    await payment.save();

    // 🔥 Calculate Instructor Earning
    if (payment.itemType === "course") {
      await calculateInstructorEarning(payment.itemId, payment.amount);
    }

    // 🔥 Increment Coupon Usage Count
    if (payment.coupon?.code) {
      await Coupon.findOneAndUpdate(
        { code: payment.coupon.code.toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
    }


    return res.json({
      success: true,
      message: "Payment successful & recorded"
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};

/* ===============================
   3️⃣ RECORD PAYMENT FAILURE
================================ */
export const recordPaymentFailure = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, error_description, error_reason } = req.body;

    const payment = await Payment.findOne({ "razorpay.order.id": razorpay_order_id });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    payment.status = "failed";
    payment.razorpay.status = "failed";
    payment.razorpay.payment = { id: razorpay_payment_id, error: req.body };
    payment.failureReason = error_description || error_reason || "Payment Cancelled / Failed";

    await payment.save();

    return res.json({ success: true, message: "Failure recorded" });
  } catch (err) {
    console.error("Record failure error:", err);
    return res.status(500).json({ message: "Failed to record payment failure" });
  }
};

/* ===============================
   4️⃣ WALLET PAYMENT
================================ */
export const payWithWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, itemId, couponCode } = req.body;

    const config = purchasableItemsMap[itemType];
    if (!config) return res.status(400).json({ success: false, message: "Invalid item type" });

    const item = await config.model.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const amount = item[config.priceField];

    // 🔥 Coupon Logic
    let finalAmount = amount;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

      if (!coupon) {
        return res.status(400).json({ success: false, message: "Invalid or inactive coupon" });
      }

      if (coupon.validTill && new Date(coupon.validTill) < new Date()) {
        return res.status(400).json({ success: false, message: "Coupon expired" });
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({ success: false, message: "Coupon limit reached" });
      }

      if (amount < coupon.minPurchaseAmount) {
        return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required` });
      }

      discountAmount = (amount * coupon.discountPercent) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }

      finalAmount = Math.max(0, amount - discountAmount);
      appliedCoupon = coupon;
    }

    const user = await User.findById(userId);

    // Already purchased/unlocked check
    if (itemType === "course" && user.purchaseCourses.includes(itemId)) {
      return res.status(400).json({ success: false, message: "You are already enrolled in this course." });
    }
    if (itemType === "ebook" && user.purchaseEbooks.includes(itemId)) {
      return res.status(400).json({ success: false, message: "You already own this E-Book." });
    }
    if ((itemType === "job" || itemType === "jobV2" || itemType === "jobV3") && user.purchaseJobs.includes(itemId)) {
      return res.status(400).json({ success: false, message: "You have already unlocked this job." });
    }
    if (itemType === "subscription" && user.purchaseSubscriptions.some(sub => sub.subscription.toString() === itemId.toString())) {
      return res.status(400).json({ success: false, message: "You already have this subscription active." });
    }

    // 🔥 Check Balance
    if (user.walletBalance < finalAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance."
      });
    }

    // 🔥 Deduct Balance
    user.walletBalance -= finalAmount;

    // 🔥 Unlock Item
    await config.unlock(user, itemId);
    await user.save();

    // 🔥 Create Payment Record
    await Payment.create({
      user: userId,
      itemType,
      itemId,
      amount: finalAmount,
      paymentMethod: "wallet",
      status: "success",
      coupon: appliedCoupon ? {
        code: appliedCoupon.code,
        discountAmount: discountAmount
      } : undefined
    });

    // 🔥 Increment Coupon Count
    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      await appliedCoupon.save();
    }

    // 🔥 Calculate Instructor Earning
    if (itemType === "course") {
      await calculateInstructorEarning(itemId, amount);
    }

    return res.json({
      success: true,
      message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} purchased successfully using wallet balance.`,
      newBalance: user.walletBalance
    });

  } catch (error) {
    console.error("Wallet payment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
