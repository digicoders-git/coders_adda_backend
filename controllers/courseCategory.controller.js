import CourseCategory from "../models/courseCategory.model.js";

/* ================= CREATE ================= */
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const exist = await CourseCategory.findOne({ name });
    if (exist) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await CourseCategory.create({ name });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET ALL ================= */
export const getAllCategories = async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 10 } = req.query;

    // Build filter object
    let filter = {};

    // 🔍 Search by name
    if (search) {
      filter.name = { $regex: search, $options: "i" }; // case-insensitive
    }

    // ✅ Filter by active/inactive
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const data = await CourseCategory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await CourseCategory.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
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


/* ================= GET SINGLE ================= */
export const getSingleCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await CourseCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= UPDATE ================= */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const category = await CourseCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name !== undefined) category.name = name;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= DELETE ================= */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await CourseCategory.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      deleted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
