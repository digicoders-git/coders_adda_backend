import User from "../models/user.model.js";
import Course from "../models/course.model.js";
import Ebook from "../models/ebook.model.js";
import Job from "../models/job.model.js";
import Subscription from "../models/subscription.model.js";
import Short from "../models/short.model.js";
import ShortComment from "../models/shortComment.model.js";
import Payment from "../models/payment.model.js";

// Helper to calculate percentage growth
const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const growth = ((current - previous) / previous) * 100;
  return `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}%`;
};

// Helper to get date ranges
const getDateRanges = () => {
  const today = new Date();

  // Set to beginning of today
  today.setHours(0, 0, 0, 0);

  const last30Days = new Date(today);
  last30Days.setDate(today.getDate() - 30);

  // Last month ranges
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  return { today, last30Days, lastMonthStart, lastMonthEnd };
};

export const getStats = async (req, res) => {
  try {
    const { today, last30Days } = getDateRanges();

    const stats = {
      users: { total: 0, growth: '0%' },
      courses: { total: 0, growth: '0%' },
      ebooks: { total: 0, growth: '0%' },
      jobs: { total: 0, growth: '0%' },
      subscriptions: { total: 0, growth: '0%' }
    };

    // 1. Basic Stats (Total + Growth)
    const models = [
      { model: User, name: 'users' },
      { model: Course, name: 'courses' },
      { model: Ebook, name: 'ebooks' },
      { model: Job, name: 'jobs' },
      { model: Subscription, name: 'subscriptions' }
    ];

    await Promise.allSettled(models.map(async ({ model, name }) => {
      try {
        const total = await model.countDocuments();
        const newCount = await model.countDocuments({ createdAt: { $gte: last30Days } });
        const previousCount = total - newCount;
        stats[name] = {
          total,
          growth: calculateGrowth(newCount, previousCount)
        };
      } catch (err) {
        console.error(`Error fetching stats for ${name}:`, err.message);
      }
    }));

    // 2. Sales Data (Graph) - Last 6 Months & Last 7 Days
    let dailySales = [], weeklySales = [], monthlySales = [];

    try {
      const getSalesData = async (interval, daysBack) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        startDate.setHours(0, 0, 0, 0);

        return await Payment.aggregate([
          { $match: { createdAt: { $gte: startDate }, status: "success" } },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: interval === 'day' ? "%Y-%m-%d" : "%Y-%U", date: "$createdAt" } },
                type: "$itemType"
              },
              total: { $sum: 1 }, // Count of sales
              amount: { $sum: "$amount" } // Revenue
            }
          },
          { $sort: { "_id.date": 1 } }
        ]);
      };

      const salesResults = await Promise.allSettled([
        getSalesData('day', 7),
        getSalesData('week', 35),
        getSalesData('month', 180)
      ]);

      dailySales = salesResults[0].status === 'fulfilled' ? salesResults[0].value : [];
      weeklySales = salesResults[1].status === 'fulfilled' ? salesResults[1].value : [];
      monthlySales = salesResults[2].status === 'fulfilled' ? salesResults[2].value : [];

    } catch (err) {
      console.error("Error fetching sales data:", err.message);
    }

    // 3. Trending Shorts
    let trendingShorts = [];
    try {
      trendingShorts = await Short.find({ isActive: true })
        .sort({ totalLikes: -1 })
        .limit(6);
    } catch (err) {
      console.error("Error fetching trending shorts:", err.message);
    }

    // 4. Recent Comments
    let recentComments = [];
    try {
      recentComments = await ShortComment.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name profilePicture'); // Updated to userId based on model schema
      // If userId was used in schema
    } catch (err) {
      console.error("Error fetching recent comments:", err.message);
    }

    return res.status(200).json({
      success: true,
      stats,
      sales: {
        daily: dailySales,
        weekly: weeklySales,
        monthly: monthlySales
      },
      trendingShorts,
      recentComments
    });

  } catch (error) {
    console.error("Dashboard Stats Global Error:", error);
    // Even if fatal error, try to return proper JSON structure to avoid frontend crash
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
      stats: {},
      sales: { daily: [], weekly: [], monthly: [] },
      trendingShorts: [],
      recentComments: []
    });
  }
};
