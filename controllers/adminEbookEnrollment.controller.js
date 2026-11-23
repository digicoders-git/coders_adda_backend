import Ebook from "../models/ebook.model.js";
import EbookEnrollment from "../models/ebookEnrollment.model.js";
import mongoose from "mongoose";

/* ================= SECTION 1: Get Global Stats for Ebook Enrollments ================= */
export const getEbookEnrollmentStats = async (req, res) => {
  try {
    // 1. Total Enrolled Students (Count all unique users in EbookEnrollment)
    const uniqueUsers = await EbookEnrollment.distinct("user");
    const totalEnrolledStudents = uniqueUsers.length;

    // 2. Total Ebooks Sold/Enrolled
    const totalEbooksSold = await EbookEnrollment.countDocuments();

    // 3. Most Popular Ebook
    const popularAggregation = await EbookEnrollment.aggregate([
      { $group: { _id: "$ebook", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    let mostPopularEbook = "N/A";
    if (popularAggregation.length > 0) {
      const popular = await Ebook.findById(popularAggregation[0]._id);
      mostPopularEbook = popular ? popular.title : "N/A";
    }

    // 4. Total Revenue from Ebooks
    const revenueAggregation = await EbookEnrollment.aggregate([
      { $group: { _id: null, total: { $sum: "$pricePaid" } } }
    ]);
    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        totalEnrolledStudents,
        totalEbooksSold,
        mostPopularEbook,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SECTION 2: Get All Ebooks with Enrollment Info ================= */
export const getAllEbookEnrollments = async (req, res) => {
  try {
    const { search, categoryId, priceType } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { authorName: { $regex: search, $options: "i" } }
      ];
    }

    if (categoryId && categoryId !== "all") {
      try {
        query.category = new mongoose.Types.ObjectId(categoryId);
      } catch (err) {
        // If it's not a valid ObjectId, skip filtering by category
        console.error("Invalid categoryId:", categoryId);
      }
    }

    if (priceType && priceType !== "all") query.priceType = priceType;

    const ebooks = await Ebook.find(query).populate("category", "name").lean();

    const ebookEnrollmentDetails = await Promise.all(
      ebooks.map(async (ebook) => {
        const enrollments = await EbookEnrollment.find({ ebook: ebook._id });
        const enrolledStudents = enrollments.length;
        const revenue = enrollments.reduce((sum, e) => sum + (e.pricePaid || 0), 0);

        return {
          ...ebook,
          enrolledStudents,
          revenue
        };
      })
    );

    res.status(200).json({ success: true, data: ebookEnrollmentDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SECTION 3: Get Students for a Specific Ebook ================= */
export const getEbookStudents = async (req, res) => {
  try {
    const { ebookId } = req.params;
    const eid = new mongoose.Types.ObjectId(ebookId);

    const enrollments = await EbookEnrollment.find({ ebook: eid })
      .populate("user", "name email mobile profilePicture isActive")
      .lean();

    const students = enrollments.map((e) => {
      if (!e.user) return null;
      return {
        ...e.user,
        enrolledAt: e.enrolledAt || e.createdAt,
        pricePaid: e.pricePaid
      };
    }).filter(s => s !== null);

    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
