import User from "../models/user.model.js";
import CourseCurriculum from "../models/courseCurriculum.model.js";
import Lecture from "../models/lecture.model.js";

export const getMyLibrary = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select("purchaseCourses purchaseEbooks purchaseSubscriptions purchaseJobs")
      // ========== COURSES ==========
      .populate({
        path: "purchaseCourses",
        select: "title thumbnail priceType price technology badge isActive instructor category",
        populate: [
          { path: "instructor", select: "name profilePicture" },
          { path: "category", select: "name" }
        ]
      })
      // ========== EBOOKS ==========
      .populate({
        path: "purchaseEbooks",
        select: "title authorName priceType price pdf isActive"
      })
      // ========== JOBS ==========
      .populate({
        path: "purchaseJobs",
        select: "jobTitle companyName location salaryPackage requiredExperience workType isActive"
      })
      // ========== SUBSCRIPTIONS ==========
      .populate({
        path: "purchaseSubscriptions.subscription",
        populate: [
          {
            path: "includedCourses",
            select: "title thumbnail priceType price technology badge isActive instructor category",
            populate: [
              { path: "instructor", select: "name profilePicture" },
              { path: "category", select: "name" }
            ]
          },
          {
            path: "includedEbooks",
            select: "title authorName priceType price pdf isActive"
          }
        ]
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const now = new Date();

    // Using Maps to deduplicate and manage sources
    const coursesMap = new Map(); // id -> item
    const ebooksMap = new Map();  // id -> item
    const jobsMap = new Map();    // id -> item

    // 1. Process Direct Purchases (Priority)
    user.purchaseCourses.forEach(course => {
      if (course && course.isActive) {
        coursesMap.set(course._id.toString(), { ...course.toObject(), source: "from purchase" });
      }
    });

    user.purchaseEbooks.forEach(ebook => {
      if (ebook && ebook.isActive) {
        ebooksMap.set(ebook._id.toString(), { ...ebook.toObject(), source: "from purchase" });
      }
    });

    user.purchaseJobs.forEach(job => {
      if (job && job.isActive) {
        jobsMap.set(job._id.toString(), { ...job.toObject(), source: "from purchase" });
      }
    });

    // 2. Process active subscriptions (Only if not already in map)
    const activeSubscriptions = (user.purchaseSubscriptions || []).filter(
      subItem => subItem.subscription && (!subItem.endDate || new Date(subItem.endDate) > now)
    );

    activeSubscriptions.forEach(subItem => {
      const sub = subItem.subscription;

      // Included Courses
      sub.includedCourses?.forEach(course => {
        if (course && course.isActive && !coursesMap.has(course._id.toString())) {
          coursesMap.set(course._id.toString(), { ...course.toObject(), source: "from subscription" });
        }
      });

      // Included Ebooks
      sub.includedEbooks?.forEach(ebook => {
        if (ebook && ebook.isActive && !ebooksMap.has(ebook._id.toString())) {
          ebooksMap.set(ebook._id.toString(), { ...ebook.toObject(), source: "from subscription" });
        }
      });
    });

    // 3. ENHANCE COURSES WITH NESTED CONTENT (CURRICULUM)
    const enhancedCourses = await Promise.all(
      Array.from(coursesMap.values()).map(async (course) => {
        // 1. Fetch Topics
        const topics = await CourseCurriculum.find({
          course: course._id,
          isActive: true
        }).sort({ createdAt: 1 });

        // 2. Fetch Lectures per topic
        const topicsWithLectures = await Promise.all(
          topics.map(async (topic) => {
            const lectures = await Lecture.find({
              course: course._id,
              topic: topic._id,
              isActive: true
            }).sort({ srNo: 1 });

            return {
              ...topic.toObject(),
              lectures
            };
          })
        );

        return {
          ...course,
          curriculum: topicsWithLectures
        };
      })
    );

    // 4. Assemble final data with categorical split
    const finalData = {
      courses: { free: [], paid: [] },
      ebooks: { free: [], paid: [] },
      jobs: Array.from(jobsMap.values())
    };

    enhancedCourses.forEach(course => {
      if (course.priceType === "free") finalData.courses.free.push(course);
      else finalData.courses.paid.push(course);
    });

    ebooksMap.forEach(ebook => {
      if (ebook.priceType === "free") finalData.ebooks.free.push(ebook);
      else finalData.ebooks.paid.push(ebook);
    });

    // Optional: Deduplicate by _id if needed, but the user asked for source "purchase" vs "subscription"
    // so maybe they want both to show if they overlap?
    // Following user exactly.

    return res.json({
      success: true,
      data: finalData
    });
  } catch (error) {
    console.error("Get my library error:", error);
    return res.status(500).json({ message: "Failed to load library" });
  }
};
