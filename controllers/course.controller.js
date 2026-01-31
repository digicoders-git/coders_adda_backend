import Course from "../models/course.model.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import CourseCurriculum from "../models/courseCurriculum.model.js";
import Lecture from "../models/lecture.model.js";

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
      priceType,
      price,
      badge
    } = req.body;

    if (!title || !instructor || !category || !technology || !description) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload Thumbnail
    let thumbnailData = { url: "", public_id: "" };
    if (req.files?.thumbnail) {
      const img = await cloudinary.uploader.upload(req.files.thumbnail[0].path, {
        folder: "courses/thumbnails"
      });
      thumbnailData = {
        url: img.secure_url,
        public_id: img.public_id
      };
      fs.unlinkSync(req.files.thumbnail[0].path);
    }

    // Upload Promo Video
    let videoData = { url: "", public_id: "" };
    if (req.files?.promoVideo) {
      const vid = await cloudinary.uploader.upload(req.files.promoVideo[0].path, {
        folder: "courses/videos",
        resource_type: "video"
      });
      videoData = {
        url: vid.secure_url,
        public_id: vid.public_id
      };
      fs.unlinkSync(req.files.promoVideo[0].path);
    }

    const course = await Course.create({
      title,
      instructor,
      category,
      technology,
      description,
      priceForInstructor,
      priceType,
      price,
      badge,
      whatYouWillLearn: whatYouWillLearn ? JSON.parse(whatYouWillLearn) : [],
      faqs: faqs ? JSON.parse(faqs) : [],
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
      page = 1,
      limit = 10
    } = req.query;

    let filter = {};

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

    const data = await Course.find(filter)
      .populate("instructor", "fullName role")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Course.countDocuments(filter);

    return res.status(200).json({
      success: true,
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



/* ================= GET SINGLE COURSE ================= */
export const getSingleCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id)
      .populate("instructor", "fullName email role")
      .populate("category", "name");

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
          status: l.isActive ? "Active" : "Disabled",
          description: l.description
        }))
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        ...course.toObject(),
        curriculum: structuredCurriculum
      }
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= UPDATE COURSE ================= */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

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
      isActive,
      priceType,
      price,
      badge
    } = req.body;


    if (title !== undefined) course.title = title;
    if (instructor !== undefined) course.instructor = instructor;
    if (category !== undefined) course.category = category;
    if (technology !== undefined) course.technology = technology;
    if (description !== undefined) course.description = description;
    if (priceForInstructor !== undefined) course.priceForInstructor = priceForInstructor;
    if (isActive !== undefined) course.isActive = isActive;
    if (priceType !== undefined) course.priceType = priceType;
    if (price !== undefined) course.price = price;
    if (badge !== undefined) course.badge = badge;


    if (whatYouWillLearn) course.whatYouWillLearn = JSON.parse(whatYouWillLearn);
    if (faqs) course.faqs = JSON.parse(faqs);

    // Update Thumbnail
    if (req.files?.thumbnail) {
      if (course.thumbnail?.public_id) {
        await cloudinary.uploader.destroy(course.thumbnail.public_id);
      }
      const img = await cloudinary.uploader.upload(req.files.thumbnail[0].path, {
        folder: "courses/thumbnails"
      });
      course.thumbnail = {
        url: img.secure_url,
        public_id: img.public_id
      };
      fs.unlinkSync(req.files.thumbnail[0].path);
    }

    // Update Video
    if (req.files?.promoVideo) {
      if (course.promoVideo?.public_id) {
        await cloudinary.uploader.destroy(course.promoVideo.public_id, {
          resource_type: "video"
        });
      }
      const vid = await cloudinary.uploader.upload(req.files.promoVideo[0].path, {
        folder: "courses/videos",
        resource_type: "video"
      });
      course.promoVideo = {
        url: vid.secure_url,
        public_id: vid.public_id
      };
      fs.unlinkSync(req.files.promoVideo[0].path);
    }

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course
    });

  } catch (error) {
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

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Delete from cloudinary
    if (course.thumbnail?.public_id) {
      await cloudinary.uploader.destroy(course.thumbnail.public_id);
    }
    if (course.promoVideo?.public_id) {
      await cloudinary.uploader.destroy(course.promoVideo.public_id, {
        resource_type: "video"
      });
    }

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
