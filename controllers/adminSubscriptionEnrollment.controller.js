import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import SubscriptionPurchase from "../models/subscriptionPurchase.model.js";
import mongoose from "mongoose";

/* ================= GET ALL ENROLLMENTS (WITH FILTERS) ================= */
export const getSubscriptionEnrollments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      planId,
      startDate,
      endDate,
      paymentType
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();

    let query = {};

    // Filter by Plan ID
    if (planId) {
      query.subscription = planId;
    }

    // Filter by Status
    if (status) {
      query.status = status;
    }

    // Filter by Payment Type
    if (paymentType) {
      query.pricingType = paymentType;
    }

    // Filter by Date Range
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const total = await SubscriptionPurchase.countDocuments(query);
    const enrollments = await SubscriptionPurchase.find(query)
      .populate({
        path: "user",
        select: "name email mobile profilePicture",
        match: search ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { mobile: { $regex: search, $options: "i" } }
          ]
        } : {}
      })
      .populate("subscription")
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Filter out enrollments where user didn't match the search (if search was provided)
    const filteredEnrollments = search
      ? enrollments.filter(e => e.user !== null)
      : enrollments;

    const formattedData = filteredEnrollments.map(e => {
      const remainingDays = Math.ceil((new Date(e.endDate) - now) / (1000 * 60 * 60 * 24));
      return {
        _id: e.user?._id,
        name: e.user?.name,
        email: e.user?.email,
        mobile: e.user?.mobile,
        profilePicture: e.user?.profilePicture,
        enrollmentId: e._id,
        planId: e.subscription?._id,
        planType: e.planType,
        duration: e.duration,
        pricePaid: e.pricePaid,
        pricingType: e.pricingType,
        startDate: e.startDate,
        endDate: e.endDate,
        status: e.status,
        remainingDays: remainingDays > 0 ? remainingDays : 0
      };
    });

    res.json({
      success: true,
      total: search ? formattedData.length : total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((search ? formattedData.length : total) / limit),
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET SUBSCRIPTION STATS ================= */
export const getSubscriptionStats = async (req, res) => {
  try {
    const totalEnrolled = await SubscriptionPurchase.countDocuments();
    const activeCount = await SubscriptionPurchase.countDocuments({ status: "active" });
    const expiredCount = await SubscriptionPurchase.countDocuments({ status: "expired" });
    const cancelledCount = await SubscriptionPurchase.countDocuments({ status: "cancelled" });

    const revenueResult = await SubscriptionPurchase.aggregate([
      { $match: { pricingType: "paid" } },
      { $group: { _id: null, total: { $sum: "$pricePaid" } } }
    ]);

    const popularPlanResult = await SubscriptionPurchase.aggregate([
      { $group: { _id: "$planType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    res.json({
      success: true,
      data: {
        totalEnrolled,
        activeCount,
        expiredCount,
        cancelledCount,
        totalRevenue: revenueResult[0]?.total || 0,
        topPlan: popularPlanResult[0]?._id || "N/A"
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= EXTEND SUBSCRIPTION ================= */
export const extendSubscription = async (req, res) => {
  try {
    const { enrollmentId, months } = req.body;

    if (!enrollmentId || !months) {
      return res.status(400).json({ message: "enrollmentId and months are required" });
    }

    const enrollment = await SubscriptionPurchase.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    const currentEndDate = new Date(enrollment.endDate);
    const newBaseDate = currentEndDate > new Date() ? currentEndDate : new Date();

    const newEndDate = new Date(newBaseDate);
    newEndDate.setMonth(newEndDate.getMonth() + Number(months));

    enrollment.endDate = newEndDate;
    enrollment.status = newEndDate > new Date() ? "active" : "expired";
    await enrollment.save();

    res.json({
      success: true,
      message: `Subscription extended by ${months} month(s)`,
      newEndDate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= CANCEL SUBSCRIPTION ================= */
export const cancelSubscription = async (req, res) => {
  try {
    const { enrollmentId } = req.body;

    const enrollment = await SubscriptionPurchase.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    enrollment.status = "cancelled";
    await enrollment.save();

    res.json({ success: true, message: "Subscription cancelled successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET STUDENTS BY SUBSCRIPTION (FOR SIDEBAR) ================= */
export const getStudentsBySubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const enrollments = await SubscriptionPurchase.find({
      subscription: subscriptionId,
      status: "active"
    })
      .populate({
        path: "user",
        select: "name email mobile profilePicture isActive"
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
