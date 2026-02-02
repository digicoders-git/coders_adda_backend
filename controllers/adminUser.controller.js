import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

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
        path: 'purchaseSubscriptions',
        populate: [
          { path: 'includedCourses' },
          { path: 'includedEbooks' }
        ]
      })
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
        path: 'purchaseSubscriptions',
        populate: [
          { path: 'includedCourses' },
          { path: 'includedEbooks' }
        ]
      });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
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

    if (purchaseSubscriptions !== undefined) user.purchaseSubscriptions = purchaseSubscriptions;
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
