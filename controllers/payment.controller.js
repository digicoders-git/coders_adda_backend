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
    const { itemType, itemId } = req.body;

    const config = purchasableItemsMap[itemType];
    if (!config) return res.status(400).json({ success: false, message: "Invalid item type" });

    const item = await config.model.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const amount = item[config.priceField];

    const user = await User.findById(userId);

    // 🔥 Check Balance
    if (user.walletBalance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance. Please refer more friends or earn rewards."
      });
    }

    // 🔥 Deduct Balance
    user.walletBalance -= amount;

    // 🔥 Unlock Item
    await config.unlock(user, itemId);
    await user.save();

    // 🔥 Create Payment Record
    await Payment.create({
      user: userId,
      itemType,
      itemId,
      amount,
      paymentMethod: "wallet",
      status: "success"
    });

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
