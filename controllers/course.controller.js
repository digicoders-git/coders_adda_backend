import Course from "../models/course.model.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import CourseCurriculum from "../models/courseCurriculum.model.js";
import Lecture from "../models/lecture.model.js";
import CourseCategory from "../models/courseCategory.model.js";
import Instructor from "../models/instructor.model.js";

/* ================= CREATE COURSE ================= */
export const createCourse = async (req, res) => {
  try {
    const {
      title,
      instructor,
      category,
      technology,
      description,
      priceForInstructor,
      whatYouWillLearn,
      faqs,
      reviews,
      priceType,
      price,
      badge,
      displayPlatform,
      duration,
      isActive

    } = req.body;

    if (!title || !instructor || !category || !technology || !description) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload Thumbnail
    let thumbnailData = { url: "", localUrl: "", public_id: "" };
    const thumbnailFile = req.files?.thumbnail?.[0] || req.files?.image?.[0];
    if (thumbnailFile) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const localUrl = `${baseUrl}/uploads/courses/thumbnails/${thumbnailFile.filename}`;
      
      const result = await cloudinary.uploader.upload(thumbnailFile.path, {
        folder: "courses/thumbnails",
        resource_type: "image"
      });

      thumbnailData = {
        url: result.secure_url,
        localUrl: localUrl,
        public_id: result.public_id
      };
    }

    // Upload Promo Video
    let videoData = { url: "", localUrl: "", public_id: "" };
    const videoFile = req.files?.promoVideo?.[0] || req.files?.video?.[0];
    if (videoFile) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const localUrl = `${baseUrl}/uploads/courses/videos/${videoFile.filename}`;

      const result = await cloudinary.uploader.upload(videoFile.path, {
        folder: "courses/videos",
        resource_type: "video"
      });

      videoData = {
        url: result.secure_url,
        localUrl: localUrl,
        public_id: result.public_id
      };
    }


    if (!mongoose.Types.ObjectId.isValid(instructor)) {
      return res.status(400).json({ message: "Invalid instructor ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const course = await Course.create({
      title,
      instructor,
      category,
      technology,
      description,
      priceForInstructor: Number(priceForInstructor) || 15,
      priceType,
      price: priceType === "free" ? 0 : (Number(price) || 0),
      badge,
      displayPlatform: displayPlatform || "both",
      duration: req.body.duration || duration,

      whatYouWillLearn: safeJsonParse(whatYouWillLearn),

      faqs: safeJsonParse(faqs),
      reviews: safeJsonParse(reviews),
      isActive: isActive !== undefined ? isActive === "true" : true,
      thumbnail: thumbnailData,
      promoVideo: videoData
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET ALL COURSES ================= */
/* ================= SEARCH + FILTER + PAGINATION ================= */
/* ================= GET ALL COURSES ================= */
/* ================= SEARCH + FILTER + PAGINATION ================= */
export const getAllCourses = async (req, res) => {
  try {
    const {
      search,
      category,
      instructor,
      technology,
      isActive,
      priceType,   // ✅ new
      badge,       // ✅ new
      displayPlatform,
      targetPlatform, // 'website' or 'app'
      page = 1,
      limit = 10
    } = req.query;

    let filter = {};

    // 🎯 Filter by displayPlatform / targetPlatform
    if (targetPlatform === "website") {
      filter.displayPlatform = { $in: ["both", "website"] };
    } else if (targetPlatform === "app") {
      filter.displayPlatform = { $in: ["both", "app"] };
    } else if (displayPlatform) {
      filter.displayPlatform = displayPlatform;
    }

    // 🔍 Global Search across Course, Instructor, and Category
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };

      // Find matching instructors & categories first to include them in search
      const [matchingInstructors, matchingCategories] = await Promise.all([
        mongoose.model("Instructor").find({ fullName: searchRegex }).select("_id"),
        mongoose.model("courseCategory").find({ name: searchRegex }).select("_id")
      ]);

      filter.$or = [
        { title: searchRegex },
        { technology: searchRegex },
        { description: searchRegex },
        { instructor: { $in: matchingInstructors.map(ins => ins._id) } },
        { category: { $in: matchingCategories.map(cat => cat._id) } }
      ];
    }

    // 🎯 Filters
    if (category) filter.category = category;
    if (instructor) filter.instructor = instructor;
    if (technology) filter.technology = { $regex: technology, $options: "i" };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // 🆕 New filters
    if (priceType) filter.priceType = priceType;   // free / paid
    if (badge) filter.badge = badge;               // normal / top / popular / trending

    const skip = (page - 1) * limit;

    const User = mongoose.model("User");
    const rawCourses = await Course.find(filter)
      .populate("instructor", "fullName role profilePicture")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const data = await Promise.all(
      rawCourses.map(async (c) => {
        const studentCount = await User.countDocuments({ purchaseCourses: c._id });
        return {
          ...c,
          duration: c.duration || "",
          totalStudents: studentCount || 0,
          studentsCount: studentCount || 0
        };
      })
    );

    const total = await Course.countDocuments(filter);

    // Get status counts for the current filter (excluding isActive from filter)
    let statusFilter = { ...filter };
    delete statusFilter.isActive;

    const [activeCount, inactiveCount] = await Promise.all([
      Course.countDocuments({ ...statusFilter, isActive: true }),
      Course.countDocuments({ ...statusFilter, isActive: false })
    ]);

    return res.status(200).json({
      success: true,
      total,
      activeCount,
      inactiveCount,
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

/* ================= GET CATEGORIES WITH COURSE COUNT ================= */
export const getCategoriesWithCourseCount = async (req, res) => {
  try {
    const categories = await CourseCategory.find({ isActive: true });

    const counts = await Course.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    const data = categories.map(cat => {
      const countObj = counts.find(c => c._id && c._id.toString() === cat._id.toString());
      return {
        _id: cat._id,
        name: cat.name,
        courseCount: countObj ? countObj.count : 0
      };
    });

    return res.status(200).json({
      success: true,
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



/* ================= GET SINGLE COURSE ================= */
export const getSingleCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }
    const course = await Course.findById(id)
      .populate("instructor", "fullName email role profilePicture")
      .populate("category", "name")
      .populate("certificateTemplate");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Fetch Curriculum Topics
    const topics = await CourseCurriculum.find({ course: id }).sort({ createdAt: 1 });

    // Fetch All Lectures for this course
    const lectures = await Lecture.find({ course: id }).sort({ srNo: 1 });

    // Build Structured Curriculum
    const structuredCurriculum = topics.map(topic => {
      // Find lectures belonging to this topic
      const topicLectures = lectures.filter(l => l.topic && l.topic.toString() === topic._id.toString());

      return {
        _id: topic._id,
        title: topic.topic, // Frontend expects .title, backend has .topic
        isActive: topic.isActive,
        lessons: topicLectures.map(l => ({
          _id: l._id,
          title: l.title,
          duration: l.duration,
          lectureSrNo: l.srNo, // Frontend expects .lectureSrNo
          isLocked: l.privacy === "locked", // Map privacy to isLocked
          pdfUrl: l.resource?.url || "", // Map resource to pdfUrl
          videoUrl: l.video?.url || "",
          thumbnailUrl: l.thumbnail?.url || "",
          isActive: l.isActive,
          status: l.isActive ? "Active" : "Disabled",
          description: l.description
        }))
      };
    });

    const studentCount = await mongoose.model("User").countDocuments({ purchaseCourses: id });

    let avgRating = 0;
    if (course.reviews && course.reviews.length > 0) {
      const sum = course.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      avgRating = parseFloat((sum / course.reviews.length).toFixed(1));
    }

    return res.status(200).json({
      success: true,
      data: {
        ...course.toObject(),
        curriculum: structuredCurriculum,
        totalStudents: studentCount || 0,
        studentsCount: studentCount || 0,
        rating: avgRating
      }
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Helper for safe JSON parsing
const safeJsonParse = (data, defaultValue = []) => {
  if (!data || data === "undefined" || data === "null") return defaultValue;
  try {
    const parsed = JSON.parse(data);
    return (parsed === null || parsed === undefined) ? defaultValue : parsed;
  } catch (error) {
    console.error("JSON Parse Error:", error);
    return defaultValue;
  }
};

/* ================= UPDATE COURSE ================= */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const {
      title,
      instructor,
      category,
      technology,
      description,
      priceForInstructor,
      whatYouWillLearn,
      faqs,
      reviews,
      isActive,
      priceType,
      price,
      badge,
      displayPlatform,
      duration,
      certificateTemplate
    } = req.body;

    if (title !== undefined) course.title = title;
    if (displayPlatform !== undefined) course.displayPlatform = displayPlatform;
    if (instructor !== undefined && instructor !== null) {
      const instructorId = (instructor && typeof instructor === "object") ? instructor._id : instructor;
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return res.status(400).json({ message: "Invalid instructor ID" });
      }
      course.instructor = instructorId;
    }
    if (category !== undefined && category !== null) {
      const categoryId = (category && typeof category === "object") ? category._id : category;
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      course.category = categoryId;
    }
    if (technology !== undefined) course.technology = technology;
    if (description !== undefined) course.description = description;
    if (priceForInstructor !== undefined) course.priceForInstructor = Number(priceForInstructor) || 0;
    if (isActive !== undefined) course.isActive = isActive === "true" || isActive === true;
    if (priceType !== undefined) course.priceType = priceType;
    if (price !== undefined) course.price = Number(price) || 0;
    if (badge !== undefined) course.badge = badge;
    if (req.body.duration !== undefined) {
      course.duration = String(req.body.duration);
    }




    if (certificateTemplate !== undefined) {
      if (certificateTemplate && !mongoose.Types.ObjectId.isValid(certificateTemplate)) {
        return res.status(400).json({ message: "Invalid certificate template ID" });
      }
      course.certificateTemplate = certificateTemplate || null;
    }


    if (whatYouWillLearn !== undefined) course.whatYouWillLearn = safeJsonParse(whatYouWillLearn, course.whatYouWillLearn);
    if (faqs !== undefined) course.faqs = safeJsonParse(faqs, course.faqs);
    if (reviews !== undefined) course.reviews = safeJsonParse(reviews, course.reviews);

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Update Thumbnail
    const thumbnailFile = req.files?.thumbnail?.[0] || req.files?.image?.[0];
    if (thumbnailFile) {
      // Remove old from Cloudinary
      if (course.thumbnail?.public_id) {
        await cloudinary.uploader.destroy(course.thumbnail.public_id, { resource_type: "image" }).catch(e => console.error("Cloudinary delete error:", e));
      }

      const result = await cloudinary.uploader.upload(thumbnailFile.path, {
        folder: "courses/thumbnails",
        resource_type: "image"
      });

      course.thumbnail = {
        url: result.secure_url,
        localUrl: `${baseUrl}/uploads/courses/thumbnails/${thumbnailFile.filename}`,
        public_id: result.public_id
      };
    }

    // Update Promo Video
    const videoFile = req.files?.promoVideo?.[0] || req.files?.video?.[0];
    if (videoFile) {
      // Remove old from Cloudinary
      if (course.promoVideo?.public_id) {
        await cloudinary.uploader.destroy(course.promoVideo.public_id, { resource_type: "video" }).catch(e => console.error("Cloudinary delete error:", e));
      }

      const result = await cloudinary.uploader.upload(videoFile.path, {
        folder: "courses/videos",
        resource_type: "video"
      });

      course.promoVideo = {
        url: result.secure_url,
        localUrl: `${baseUrl}/uploads/courses/videos/${videoFile.filename}`,
        public_id: result.public_id
      };
    }


    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course
    });

  } catch (error) {
    console.error("Update Course Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= DELETE COURSE ================= */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Delete from cloudinary
    /* if (course.thumbnail?.public_id) {
      await cloudinary.uploader.destroy(course.thumbnail.public_id);
    }
    if (course.promoVideo?.public_id) {
      await cloudinary.uploader.destroy(course.promoVideo.public_id, {
        resource_type: "video"
      });
    } */

    await Course.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= TOGGLE COURSE STATUS ================= */
export const toggleCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.isActive = !course.isActive;
    await course.save();

    return res.status(200).json({
      success: true,
      message: `Course ${course.isActive ? "Activated" : "Deactivated"} successfully`,
      isActive: course.isActive
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET INSTRUCTOR COURSES ================= */
export const getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.instructor?.id;

    if (!instructorId) {
      return res.status(400).json({ message: "Instructor ID not found in token" });
    }

    // Convert to ObjectId if valid, else keep as string (fallback)
    const instructorObjectId = mongoose.Types.ObjectId.isValid(instructorId)
      ? new mongoose.Types.ObjectId(instructorId)
      : null;

    const query = {
      $or: [
        { instructor: instructorId },
        ...(instructorObjectId ? [{ instructor: instructorObjectId }] : [])
      ]
    };

    const rawCourses = await Course.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .lean();

    const User = mongoose.model("User");
    const courses = await Promise.all(
      rawCourses.map(async (c) => {
        const studentCount = await User.countDocuments({ purchaseCourses: c._id });

        let displayDuration = c.duration;
        if (!displayDuration || displayDuration.trim() === "" || displayDuration.toUpperCase() === "N/A") {
          const lectures = await Lecture.find({ course: c._id }).select("duration");
          if (lectures.length > 0) {
            displayDuration = `${lectures.length} Lectures`;
          } else {
            displayDuration = "Self-Paced";
          }
        }

        return {
          ...c,
          duration: displayDuration,
          totalStudents: studentCount || 0,
          studentsCount: studentCount || 0
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Instructor courses fetched successfully",
      data: courses
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= ADD COURSE REVIEW ================= */
export const addCourseReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentName, comment, rating } = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.reviews.push({
      studentName: studentName || "Anonymous",
      comment: comment || "",
      rating: Number(rating) || 5,
      createdAt: new Date(),
      isApproved: false
    });

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Review added successfully"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= TOGGLE COURSE REVIEW STATUS ================= */
export const toggleCourseReviewStatus = async (req, res) => {
  try {
    const { courseId, reviewId } = req.params;
    
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const review = course.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    review.isApproved = !review.isApproved;
    await course.save();

    return res.status(200).json({
      success: true,
      message: `Review ${review.isApproved ? "Approved" : "Disapproved"} successfully`,
      isApproved: review.isApproved
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};
