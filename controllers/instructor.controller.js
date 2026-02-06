import Instructor from "../models/instructor.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../config/token.js";

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
      instructorc
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
