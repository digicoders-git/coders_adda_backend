import CourseCategory from "../models/courseCategory.model.js";
import cloudinary from "../config/cloudinary.js";


/* ================= CREATE ================= */
export const createCategory = async (req, res) => {
  try {
    const { name, description, displayPlatform, status } = req.body;
    let image = {};

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const exist = await CourseCategory.findOne({ name });
    if (exist) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Handle Image upload
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const localUrl = `${baseUrl}/uploads/${req.file.filename}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "course_categories",
        resource_type: "image"
      });

      image = {
        url: result.secure_url,
        localUrl: localUrl,
        public_id: result.public_id
      };
    }


    const category = await CourseCategory.create({ 
      name, 
      description,
      image,
      displayPlatform: displayPlatform || "both",
      isActive: status === "Active" || status === true || status === "true" ? true : false
    });

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
    const { search, isActive, displayPlatform, targetPlatform, page = 1, limit = 10 } = req.query;

    // Build filter object
    let filter = {};

    // 🔍 Search by name
    if (search) {
      filter.name = { $regex: search, $options: "i" }; // case-insensitive
    }

    // ✅ Filter by targetPlatform / displayPlatform
    if (targetPlatform === "website") {
      filter.displayPlatform = { $in: ["both", "website"] };
    } else if (targetPlatform === "app") {
      filter.displayPlatform = { $in: ["both", "app"] };
    } else if (displayPlatform) {
      filter.displayPlatform = displayPlatform;
    }

    // ✅ Filter by active/inactive
    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
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
    const { name, isActive, description } = req.body;

    const category = await CourseCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name !== undefined) category.name = name;
    if (isActive !== undefined) category.isActive = isActive;
    if (description !== undefined) category.description = description;

    // Handle Image Update
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const localUrl = `${baseUrl}/uploads/${req.file.filename}`;

      // Remove old from Cloudinary
      if (category.image?.public_id) {
        await cloudinary.uploader.destroy(category.image.public_id).catch(e => console.error(e));
      }

      // Upload new
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "course_categories",
        resource_type: "image"
      });

      category.image = {
        url: result.secure_url,
        localUrl: localUrl,
        public_id: result.public_id
      };
    }


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

/* ================= GET CATEGORIES WITH COURSE COUNT ================= */
export const getCategoriesWithCourseCount = async (req, res) => {
  try {
    const { priceType } = req.query;

    let courseMatch = { isActive: true };
    if (priceType) {
      courseMatch.priceType = priceType;
    }

    const categoriesWithCounts = await CourseCategory.aggregate([
      {
        $lookup: {
          from: "courses",
          let: { catId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$category", "$$catId"] },
                ...courseMatch
              }
            }
          ],
          as: "courses"
        }
      },
      {
        $project: {
          name: 1,
          isActive: 1,
          courseCount: { $size: "$courses" }
        }
      },
      {
        $match: {
          courseCount: { $gt: 0 } // Filter out categories that have no courses matching the criteria
        }
      },
      {
        $sort: { courseCount: -1 }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Categories with course count fetched successfully",
      data: categoriesWithCounts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET COURSES BY CATEGORY NAME ================= */
export const getCoursesByCategoryName = async (req, res) => {
  try {
    const { categoryName } = req.query;

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Find the category first
    const category = await CourseCategory.findOne({
      name: { $regex: `^${categoryName}$`, $options: "i" }
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Find courses matching the category ID
    // Importing Course model directly might be safer if already imported in other controllers
    const Course = (await import("../models/course.model.js")).default;
    const courses = await Course.find({ category: category._id, isActive: true })
      .populate("instructor", "fullName role")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: `Courses for category '${category.name}' fetched successfully`,
      total: courses.length,
      data: courses
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
