import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
// import { resolveProduct } from "../services/productResolver.service.js";
import { purchasableItemsMap } from "../services/purchasableItemsMap.js";

/* ===============================
   1️⃣ CREATE ORDER
================================ */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, itemId } = req.body;

    // const item = await resolveProduct(itemType, itemId);
    // if (!item) {
    //   return res.status(404).json({ message: "Item not found" });
    // }

    // const amount = item.price; // course.price

    const config = purchasableItemsMap[itemType];
    if (!config) return res.status(400).json({ message: "Invalid item type" });

    const item = await config.model.findById(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item[config.priceTypeField] === "free") {
      return res.status(400).json({ message: "This item is free. Use free enroll API." });
    }

    const amount = item[config.priceField];

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "rcpt_" + Date.now()
    });

    // 🔥 DB me create karo (full response save)
    const payment = await Payment.create({
      user: userId,
      itemType,
      itemId,
      amount,
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
    return res.status(500).json({ message: "Order creation failed" });
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

    // 🔥 THEN mark payment success
    payment.status = "success";
    payment.razorpay.payment = req.body;
    payment.razorpay.status = "captured";
    await payment.save();


    return res.json({
      success: true,
      message: "Payment successful & recorded"
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};
