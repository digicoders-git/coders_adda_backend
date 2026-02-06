import Payment from "../models/payment.model.js";
import Course from "../models/course.model.js";
import Ebook from "../models/ebook.model.js";
import Job from "../models/job.model.js";
import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
import CourseCategory from "../models/courseCategory.model.js";
import mongoose from "mongoose";

/* ================= SECTION 1: Get Global Sales Stats ================= */
export const getSalesDashboardData = async (req, res) => {
  try {
    const { chartFilter = "monthly" } = req.query;

    // 1. Lifetime Stats
    const lifetimeStats = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: "$itemType",
          totalRevenue: { $sum: "$amount" },
          totalSales: { $sum: 1 }
        }
      }
    ]);

    const statsMap = {
      totalRevenue: 0,
      totalSalesCount: 0,
      course: 0,
      ebook: 0,
      job: 0,
      subscription: 0
    };

    lifetimeStats.forEach(stat => {
      statsMap[stat._id] = stat.totalRevenue;
      statsMap.totalRevenue += stat.totalRevenue;
      statsMap.totalSalesCount += stat.totalSales;
    });

    // 2. Chart Data (Trends)
    let daysBack = 30;
    if (chartFilter === "weekly") daysBack = 90;
    if (chartFilter === "monthly") daysBack = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const formatMap = {
      daily: "%Y-%m-%d",
      weekly: "%Y-%U",
      monthly: "%Y-%m"
    };
    const format = formatMap[chartFilter] || "%Y-%m-%d";

    const trends = await Payment.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: "success" } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: format, date: "$createdAt" } },
            type: "$itemType"
          },
          amount: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        lifetime: statsMap,
        trends: trends
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SECTION 2: Get Item Specific Detailed Sales ================= */
export const getItemSalesData = async (req, res) => {
  try {
    const { itemType, chartFilter = "daily" } = req.query;

    if (!itemType) {
      return res.status(400).json({ success: false, message: "itemType is required" });
    }

    // 1. Total Items Count
    let totalItems = 0;
    if (itemType === "course") totalItems = await Course.countDocuments();
    else if (itemType === "ebook") totalItems = await Ebook.countDocuments();
    else if (itemType === "job") totalItems = await Job.countDocuments();
    else if (itemType === "subscription") totalItems = await Subscription.countDocuments();

    // 2. Period Revenue & Students
    let daysBack = 1; // Default for daily
    if (chartFilter === "weekly") daysBack = 7;
    if (chartFilter === "monthly") daysBack = 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const periodStats = await Payment.aggregate([
      {
        $match: {
          itemType,
          status: "success",
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$amount" },
          students: { $addToSet: "$user" }
        }
      }
    ]);

    const stats = {
      totalItems,
      periodRevenue: periodStats[0]?.revenue || 0,
      periodStudents: periodStats[0]?.students?.length || 0
    };

    // 3. Trends
    let chartDaysBack = 30;
    if (chartFilter === "weekly") chartDaysBack = 90;
    if (chartFilter === "monthly") chartDaysBack = 365;

    const chartStartDate = new Date();
    chartStartDate.setDate(chartStartDate.getDate() - chartDaysBack);

    const formatMap = {
      daily: "%Y-%m-%d",
      weekly: "%Y-%U",
      monthly: "%Y-%m"
    };
    const format = formatMap[chartFilter] || "%Y-%m-%d";

    const trends = await Payment.aggregate([
      {
        $match: {
          itemType,
          status: "success",
          createdAt: { $gte: chartStartDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: format, date: "$createdAt" } },
          amount: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 4. Distribution logic
    let distribution = [];
    if (itemType === "course" || itemType === "ebook") {
      const model = itemType === "course" ? Course : Ebook;
      const categoryModel = CourseCategory;

      distribution = await Payment.aggregate([
        { $match: { itemType, status: "success" } },
        {
          $lookup: {
            from: model.collection.name,
            localField: "itemId",
            foreignField: "_id",
            as: "itemDetails"
          }
        },
        { $unwind: "$itemDetails" },
        {
          $lookup: {
            from: categoryModel.collection.name,
            localField: "itemDetails.category",
            foreignField: "_id",
            as: "categoryDetails"
          }
        },
        { $unwind: "$categoryDetails" },
        {
          $group: {
            _id: "$categoryDetails.name",
            value: { $sum: "$amount" }
          }
        }
      ]);
    } else if (itemType === "job") {
      distribution = await Payment.aggregate([
        { $match: { itemType, status: "success" } },
        {
          $lookup: {
            from: Job.collection.name,
            localField: "itemId",
            foreignField: "_id",
            as: "itemDetails"
          }
        },
        { $unwind: "$itemDetails" },
        {
          $group: {
            _id: "$itemDetails.jobCategory",
            value: { $sum: "$amount" }
          }
        }
      ]);
    } else if (itemType === "subscription") {
      distribution = await Payment.aggregate([
        { $match: { itemType, status: "success" } },
        {
          $lookup: {
            from: Subscription.collection.name,
            localField: "itemId",
            foreignField: "_id",
            as: "itemDetails"
          }
        },
        { $unwind: "$itemDetails" },
        {
          $group: {
            _id: "$itemDetails.planType",
            value: { $sum: "$amount" }
          }
        }
      ]);
    }

    // 5. Success Transactions (limit 50)
    const successTransactions = await Payment.find({ itemType, status: "success" })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("user", "name mobile profilePicture")
      .lean();

    for (let txn of successTransactions) {
      if (itemType === "course") {
        const c = await Course.findById(txn.itemId).select("title badge");
        txn.itemDetails = c;
      } else if (itemType === "ebook") {
        const e = await Ebook.findById(txn.itemId).select("title authorName");
        txn.itemDetails = e;
      } else if (itemType === "job") {
        const j = await Job.findById(txn.itemId).select("jobTitle companyName");
        txn.itemDetails = { title: j?.jobTitle, companyName: j?.companyName };
      } else if (itemType === "subscription") {
        const s = await Subscription.findById(txn.itemId).select("planType duration");
        txn.itemDetails = { title: s?.planType, duration: s?.duration };
      }
    }

    // 6. Failed Transactions (limit 50)
    const failedTransactions = await Payment.find({ itemType, status: "failed" })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("user", "name mobile")
      .lean();

    for (let txn of failedTransactions) {
      if (itemType === "course") {
        const c = await Course.findById(txn.itemId).select("title");
        txn.itemDetails = c;
      } else if (itemType === "ebook") {
        const e = await Ebook.findById(txn.itemId).select("title");
        txn.itemDetails = e;
      } else if (itemType === "job") {
        const j = await Job.findById(txn.itemId).select("jobTitle");
        txn.itemDetails = { title: j?.jobTitle };
      } else if (itemType === "subscription") {
        const s = await Subscription.findById(txn.itemId).select("planType");
        txn.itemDetails = { title: s?.planType };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        stats,
        trends,
        distribution,
        successTransactions,
        failedTransactions
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
