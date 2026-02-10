import Instructor from "../models/instructor.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../config/token.js";
import Course from "../models/course.model.js";
import Payment from "../models/payment.model.js";
import mongoose from "mongoose";

/* ================= CREATE ================= */
export const createInstructor = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exist = await Instructor.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: "Instructor already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const instructor = await Instructor.create({
      fullName,
      email,
      password: hashedPassword,
      role
    });

    return res.status(201).json({
      success: true,
      message: "Instructor created successfully",
      instructor
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET ALL ================= */
export const getAllInstructors = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, isActive } = req.query;

    let filter = {};

    // 🔍 Search in multiple fields
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
        { instructorId: { $regex: search, $options: "i" } }
      ];
    }

    // ✅ Filter by active/inactive
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const data = await Instructor.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Instructor.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Instructors fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      data
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};


/* ================= GET SINGLE ================= */
export const getSingleInstructor = async (req, res) => {
  try {
    const { id } = req.params;

    const instructor = await Instructor.findById(id);
    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    return res.status(200).json({
      success: true,
      instructor
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= UPDATE ================= */
export const updateInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, role, isActive } = req.body;

    const instructor = await Instructor.findById(id);
    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    if (fullName !== undefined) instructor.fullName = fullName;
    if (email !== undefined) instructor.email = email;
    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      instructor.password = hashedPassword;
    }
    if (role !== undefined) instructor.role = role;
    if (isActive !== undefined) instructor.isActive = isActive;

    await instructor.save();

    return res.status(200).json({
      success: true,
      message: "Instructor updated successfully",
      instructor
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= DELETE ================= */
export const deleteInstructor = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Instructor.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Instructor deleted successfully",
      deleted
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= LOGIN ================= */
export const loginInstructor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const instructor = await Instructor.findOne({ email });
    if (!instructor) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!instructor.isActive) {
      return res.status(403).json({ message: "Account is deactivated. Please contact admin." });
    }

    const isMatch = await bcrypt.compare(password, instructor.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(instructor._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      instructor: {
        id: instructor._id,
        fullName: instructor.fullName,
        email: instructor.email,
        role: instructor.role,
        instructorId: instructor.instructorId
      }
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET PROFILE/EARNINGS ================= */
export const getInstructorProfile = async (req, res) => {
  try {
    const instructorId = req.instructor.id;

    const instructor = await Instructor.findById(instructorId)
      .populate({
        path: "courseEarnings.course",
        select: "title thumbnail price priceType"
      })
      .select("-password");

    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    return res.status(200).json({
      success: true,
      instructor
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET DASHBOARD STATS ================= */
export const getInstructorDashboardStats = async (req, res) => {
  try {
    const instructorId = new mongoose.Types.ObjectId(req.instructor.id);

    // 1. Get instructor profile for basic stats
    const instructor = await Instructor.findById(instructorId).populate("courseEarnings.course");
    if (!instructor) return res.status(404).json({ message: "Instructor not found" });

    // 2. Fundamental Stats
    const totalCourses = await Course.countDocuments({ instructor: instructorId });
    const activeCourses = await Course.countDocuments({ instructor: instructorId, isActive: true });

    // Calculate total students (sum of salesCount across all assigned courses)
    const totalStudents = instructor.courseEarnings.reduce((acc, curr) => acc + (curr.salesCount || 0), 0);
    const totalEarnings = instructor.totalEarnings || 0;

    // 3. Sales Trend (Last 6 Months)
    const instructorCourses = await Course.find({ instructor: instructorId }).select("_id");
    const courseIds = instructorCourses.map(c => c._id);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const salesTrend = await Payment.aggregate([
      {
        $match: {
          itemId: { $in: courseIds },
          itemType: "course",
          status: "success",
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          amount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 4. Course Performance Distribution (Revenue per Course)
    const courseDistribution = instructor.courseEarnings.map(ce => ({
      name: ce.course?.title || "Unknown Course",
      revenue: ce.totalRevenue || 0,
      earnings: ce.earnedAmount || 0,
      sales: ce.salesCount || 0
    })).filter(c => c.revenue > 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalCourses,
        activeCourses,
        totalStudents,
        totalEarnings
      },
      salesTrend,
      courseDistribution
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
