import EbooksCategory from "../models/ebooksCategory.model.js";
import Ebook from "../models/ebook.model.js";

/* ================= CREATE ================= */
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const exist = await EbooksCategory.findOne({ name });
    if (exist) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await EbooksCategory.create({ name });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= UPDATE ================= */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const category = await EbooksCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name) category.name = name;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: "Category updated successfully",
      data: category
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= DELETE ================= */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await EbooksCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.deleteOne();

    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET SINGLE ================= */
export const getSingleCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await EbooksCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET ALL WITH SEARCH + FILTER + PAGINATION ================= */
export const getAllCategories = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, isActive } = req.query;

    let filter = {};

    // Search by name
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    // Filter by active/inactive
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const total = await EbooksCategory.countDocuments(filter);

    // Calculate counts for status filter
    const [countAll, countActive, countInactive] = await Promise.all([
      EbooksCategory.countDocuments({}),
      EbooksCategory.countDocuments({ isActive: true }),
      EbooksCategory.countDocuments({ isActive: false }),
    ]);

    const categories = await EbooksCategory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      total,
      countAll,
      countActive,
      countInactive,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: categories
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET CATEGORIES WITH EBOOK COUNT ================= */
export const getCategoriesWithBookCount = async (req, res) => {
  try {
    const { priceType } = req.query;

    let ebookMatch = { isActive: true };
    if (priceType) {
      ebookMatch.priceType = priceType;
    }

    const categoriesWithCounts = await EbooksCategory.aggregate([
      {
        $lookup: {
          from: "ebooks", // Collection name for Ebook model
          let: { catId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$category", "$$catId"] },
                ...ebookMatch
              }
            }
          ],
          as: "ebooks"
        }
      },
      {
        $project: {
          name: 1,
          isActive: 1,
          ebookCount: { $size: "$ebooks" }
        }
      },
      {
        $match: {
          ebookCount: { $gt: 0 } // Filter out categories that have no ebooks matching the criteria
        }
      },
      {
        $sort: { ebookCount: -1 }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Categories with ebook count fetched successfully",
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

/* ================= GET EBOOKS BY CATEGORY NAME ================= */
export const getEbooksByCategoryName = async (req, res) => {
  try {
    const { categoryName } = req.query;

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Find the category first
    const category = await EbooksCategory.findOne({
      name: { $regex: `^${categoryName}$`, $options: "i" }
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Find ebooks matching the category ID
    // Note: Ebook is already imported at the top of this file
    const ebooks = await Ebook.find({ category: category._id, isActive: true })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: `Ebooks for category '${category.name}' fetched successfully`,
      total: ebooks.length,
      data: ebooks
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
