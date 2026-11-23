import Job from "../models/job.model.js";
import JobEnrollment from "../models/jobEnrollment.model.js";
import mongoose from "mongoose";

/* ================= SECTION 1: Get Global Stats for Job Enrollments ================= */
export const getJobEnrollmentStats = async (req, res) => {
  try {
    // 1. Total Students who unlocked any job
    const uniqueUsers = await JobEnrollment.distinct("user");
    const totalEnrolledStudents = uniqueUsers.length;

    // 2. Total Jobs Unlocked (Total sales)
    const totalJobsSold = await JobEnrollment.countDocuments();

    // 3. Most Popular Job
    const popularAggregation = await JobEnrollment.aggregate([
      { $group: { _id: "$job", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    let mostPopularJob = "N/A";
    if (popularAggregation.length > 0) {
      const popular = await Job.findById(popularAggregation[0]._id);
      mostPopularJob = popular ? popular.jobTitle : "N/A";
    }

    // 4. Total Revenue from Jobs
    const revenueAggregation = await JobEnrollment.aggregate([
      { $group: { _id: null, total: { $sum: "$pricePaid" } } }
    ]);
    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        totalEnrolledStudents,
        totalJobsSold,
        mostPopularJob,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SECTION 2: Get All Jobs with Enrollment Info ================= */
export const getAllJobEnrollments = async (req, res) => {
  try {
    const { search, workType, location } = req.query;

    let query = {};
    if (search) query.jobTitle = { $regex: search, $options: "i" };
    if (workType && workType !== "all") query.workType = workType;
    if (location && location !== "all") query.location = location;

    const jobs = await Job.find(query).lean();

    const jobEnrollmentDetails = await Promise.all(
      jobs.map(async (job) => {
        const enrollments = await JobEnrollment.find({ job: job._id });
        const enrolledStudents = enrollments.length;
        const revenue = enrollments.reduce((sum, e) => sum + (e.pricePaid || 0), 0);

        return {
          ...job,
          jobLocation: job.location, // Map for frontend convenience
          jobType: job.workType,     // Map for frontend convenience
          enrolledStudents,
          revenue
        };
      })
    );

    res.status(200).json({ success: true, data: jobEnrollmentDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SECTION 3: Get Students for a Specific Job ================= */
export const getJobStudents = async (req, res) => {
  try {
    const { jobId } = req.params;
    const jid = new mongoose.Types.ObjectId(jobId);

    const enrollments = await JobEnrollment.find({ job: jid })
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
