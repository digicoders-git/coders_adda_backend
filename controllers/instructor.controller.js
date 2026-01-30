import Instructor from "../models/instructor.model.js";

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

    const instructor = await Instructor.create({
      fullName,
      email,
      password, // plain text
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
    if (password !== undefined) instructor.password = password;
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
