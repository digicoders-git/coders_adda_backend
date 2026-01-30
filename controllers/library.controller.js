import User from "../models/user.model.js";

export const getMyLibrary = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select("purchaseCourses purchaseEbooks")
      // ========== COURSES ==========
      .populate({
        path: "purchaseCourses",
        select: "title thumbnail priceType price technology badge isActive"
      })
      // ========== EBOOKS ==========
      .populate({
        path: "purchaseEbooks",
        select: "title authorName priceType price pdf isActive"
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ---------------- SPLIT COURSES ----------------
    const freeCourses = [];
    const paidCourses = [];

    for (const course of user.purchaseCourses) {
      if (!course || !course.isActive) continue;

      if (course.priceType === "free") {
        freeCourses.push(course);
      } else {
        paidCourses.push(course);
      }
    }

    // ---------------- SPLIT EBOOKS ----------------
    const freeEbooks = [];
    const paidEbooks = [];

    for (const ebook of user.purchaseEbooks) {
      if (!ebook || !ebook.isActive) continue;

      if (ebook.priceType === "free") {
        freeEbooks.push(ebook);
      } else {
        paidEbooks.push(ebook);
      }
    }

    return res.json({
      success: true,
      data: {
        courses: {
          free: freeCourses,
          paid: paidCourses
        },
        ebooks: {
          free: freeEbooks,
          paid: paidEbooks
        }
      }
    });
  } catch (error) {
    console.error("Get my library error:", error);
    return res.status(500).json({ message: "Failed to load library" });
  }
};
