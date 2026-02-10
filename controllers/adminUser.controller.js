import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import Subscription from "../models/subscription.model.js";
import SubscriptionPurchase from "../models/subscriptionPurchase.model.js";
import Lecture from "../models/lecture.model.js";
import UserProgress from "../models/UserProgress.js";
import Payment from "../models/payment.model.js";
import { purchasableItemsMap } from "../services/purchasableItemsMap.js";

// Helper: Parse duration string ("10 min", "1:20:30", "05:20") into seconds
const parseDuration = (hms) => {
  if (!hms) return 0;
  if (typeof hms !== "string") return 0;
  const time = hms.toLowerCase();
  if (time.includes("min")) return (parseInt(time) || 0) * 60;
  const a = time.split(':');
  let seconds = 0;
  if (a.length === 3) seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
  else if (a.length === 2) seconds = (+a[0]) * 60 + (+a[1]);
  else seconds = parseInt(time) || 0;
  return seconds;
};

/* ================= GET ALL USERS (SEARCH + FILTER + PAGINATION) ================= */
export const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      isActive,
      college,
      course,
      semester,
      page = 1,
      limit = 10,
      sort = "newest"
    } = req.query;

    let filter = {};

    // Global Searching
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { college: { $regex: search, $options: "i" } },
        { course: { $regex: search, $options: "i" } },
        { about: { $regex: search, $options: "i" } },
      ];
    }

    // Proper Filtering
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (college) {
      filter.college = { $regex: college, $options: "i" };
    }

    if (course) {
      filter.course = { $regex: course, $options: "i" };
    }

    if (semester) {
      filter.semester = { $regex: semester, $options: "i" };
    }

    const skip = (page - 1) * limit;

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === "oldest") {
      sortOptions = { createdAt: 1 };
    } else if (sort === "name_asc") {
      sortOptions = { name: 1 };
    } else if (sort === "name_desc") {
      sortOptions = { name: -1 };
    }

    const total = await User.countDocuments(filter);

    // Population of all data
    const data = await User.find(filter)
      .populate({
        path: 'purchaseCourses',
        populate: [
          { path: 'instructor' },
          { path: 'category' }
        ]
      })
      .populate({
        path: 'purchaseEbooks',
        populate: { path: 'category' }
      })
      .populate('purchaseJobs')
      .populate({
        path: 'purchaseSubscriptions.subscription',
        populate: [
          { path: 'includedCourses' },
          { path: 'includedEbooks' }
        ]
      })
      .populate("referredBy", "name referralCode")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET SINGLE USER ================= */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .populate({
        path: 'purchaseCourses',
        populate: [
          { path: 'instructor' },
          { path: 'category' }
        ]
      })
      .populate({
        path: 'purchaseEbooks',
        populate: { path: 'category' }
      })
      .populate('purchaseJobs')
      .populate({
        path: 'purchaseSubscriptions.subscription',
        populate: [
          { path: 'includedCourses' },
          { path: 'includedEbooks' }
        ]
      })
      .populate("referredBy", "name referralCode")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Attach progress to each course (Watched Time Based)
    let totalProgress = 0;
    let totalWatchedSeconds = 0;
    let completedCoursesCount = 0;
    let ongoingCoursesCount = 0;

    const coursesWithProgress = await Promise.all((user.purchaseCourses || []).map(async (course) => {
      const lectures = await Lecture.find({ course: course._id }).select("duration").lean();
      const totalDuration = lectures.reduce((acc, l) => acc + parseDuration(l.duration), 0);

      const userProgressDocs = await UserProgress.find({
        user: user._id,
        course: course._id
      }).select("watchedSeconds").lean();

      const watched = userProgressDocs.reduce((acc, doc) => acc + (doc.watchedSeconds || 0), 0);
      const progress = totalDuration > 0 ? Math.round(Math.min(100, (watched / totalDuration) * 100)) : 0;

      totalProgress += progress;
      totalWatchedSeconds += watched;

      if (progress === 100) completedCoursesCount++;
      else if (progress > 0) ongoingCoursesCount++;

      return { ...course, progressPercentage: progress };
    }));

    user.purchaseCourses = coursesWithProgress;

    // Fetch Quiz Certificates
    const QuizCertificate = (await import("../models/quizCertificate.model.js")).default;
    const quizCertificates = await QuizCertificate.find({ user: id }).populate("quiz", "title quizCode").lean();

    // Student Stats Calculation
    const totalCourses = user.purchaseCourses.length;
    const avgProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;
    const learningHours = Math.round(totalWatchedSeconds / 3600);

    user.studentDetails = {
      completedCourses: completedCoursesCount,
      ongoingCourses: ongoingCoursesCount,
      learningHours: learningHours,
      progress: avgProgress,
      createdAt: user.createdAt
    };

    user.quizCertificates = quizCertificates;

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET USER TRANSACTIONS ================= */
export const getUserTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const payments = await Payment.find({ user: id }).sort({ createdAt: -1 });

    const transactions = await Promise.all(payments.map(async (payment) => {
      const config = purchasableItemsMap[payment.itemType];
      let itemName = "Unknown Item";
      if (payment.itemType === "referral_reward") {
        const referredUser = await User.findById(payment.itemId).select("name");
        itemName = `Referral Reward: ${referredUser?.name || "New User"}`;
      } else if (config) {
        const item = await config.model.findById(payment.itemId).select("title name jobTitle planType");
        itemName = item?.title || item?.name || item?.jobTitle || item?.planType || "Deleted Item";
      }
      return {
        ...payment.toObject(),
        itemName
      };
    }));

    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= UPDATE USER ================= */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      mobile,
      college,
      course,
      semester,
      technology,
      skills,
      about,
      isActive,
      purchaseSubscriptions,
      purchaseCourses,
      purchaseEbooks,
      purchaseJobs
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (college !== undefined) user.college = college;
    if (course !== undefined) user.course = course;
    if (semester !== undefined) user.semester = semester;
    if (technology !== undefined) user.technology = Array.isArray(technology) ? technology : technology.split(',').map(s => s.trim());
    if (skills !== undefined) user.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    if (about !== undefined) user.about = about;
    if (isActive !== undefined) user.isActive = isActive === "true" || isActive === true;

    if (purchaseSubscriptions !== undefined && Array.isArray(purchaseSubscriptions)) {
      const processedSubs = [];
      for (const item of purchaseSubscriptions) {
        // If existing valid object with dates
        if (typeof item === 'object' && item.subscription && item.endDate) {
          processedSubs.push(item);
        }
        // If string ID or simple object (New Subscription)
        else {
          const subId = typeof item === 'string' ? item : (item.subscription || item._id);
          if (subId) {
            const subPlan = await Subscription.findById(subId);
            if (subPlan) {
              const durationInMonths = parseInt(subPlan.duration) || 1;
              const startDate = new Date();
              const endDate = new Date(startDate);
              endDate.setMonth(endDate.getMonth() + durationInMonths);

              processedSubs.push({
                subscription: subId,
                startDate,
                endDate
              });

              // 🔥 Also create a record in SubscriptionPurchase for the "Source of Truth"
              await SubscriptionPurchase.create({
                user: id,
                subscription: subId,
                planType: subPlan.planType,
                duration: subPlan.duration,
                pricePaid: subPlan.price,
                pricingType: subPlan.planPricingType,
                startDate,
                endDate,
                status: "active"
              });
            }
          }
        }
      }
      user.purchaseSubscriptions = processedSubs;
    }
    if (purchaseCourses !== undefined) user.purchaseCourses = purchaseCourses;
    if (purchaseEbooks !== undefined) user.purchaseEbooks = purchaseEbooks;
    if (purchaseJobs !== undefined) user.purchaseJobs = purchaseJobs;

    if (req.file) {
      if (user.profilePicture?.public_id) {
        await cloudinary.uploader.destroy(user.profilePicture.public_id);
      }
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "users/profile_pictures"
      });
      user.profilePicture = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      };
      fs.unlinkSync(req.file.path);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= DELETE USER ================= */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.profilePicture?.public_id) {
      await cloudinary.uploader.destroy(user.profilePicture.public_id);
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= TOGGLE STATUS ================= */
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      isActive: user.isActive
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
