import Lecture from "../models/lecture.model.js";
import CourseCurriculum from "../models/courseCurriculum.model.js";
import mongoose from "mongoose";

/* ================= CREATE ONE TOPIC ================= */
export const createTopic = async (req, res) => {
  try {
    const { course, topic } = req.body;

    if (!course || !topic) {
      return res.status(400).json({ message: "Course and topic are required" });
    }

    // Optional: prevent duplicate topic for same course
    const exist = await CourseCurriculum.findOne({ course, topic });
    if (exist) {
      return res.status(400).json({ message: "Topic already exists for this course" });
    }

    const data = await CourseCurriculum.create({
      course,
      topic
    });

    return res.status(201).json({
      success: true,
      message: "Topic created successfully",
      data
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET ALL TOPICS (WITH FILTER & PAGINATION) ================= */
export const getAllTopics = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, courseId = "", isActive } = req.query;

    let query = {};
    if (search) {
      query.topic = { $regex: search, $options: "i" };
    }
    if (courseId) {
      query.course = new mongoose.Types.ObjectId(courseId);
    }
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Build aggregation pipeline for counts and data
    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },
      {
        $lookup: {
          from: "lectures",
          localField: "_id",
          foreignField: "topic",
          as: "lectures"
        }
      },
      {
        $project: {
          _id: 1,
          topic: 1,
          isActive: 1,
          createdAt: 1,
          course: { _id: 1, title: 1 },
          lectureCount: { $size: "$lectures" }
        }
      }
    ];

    const data = await CourseCurriculum.aggregate(pipeline);
    const total = await CourseCurriculum.countDocuments(query);

    // Status counts
    let statusQuery = { ...query };
    delete statusQuery.isActive;
    const [activeCount, inactiveCount] = await Promise.all([
      CourseCurriculum.countDocuments({ ...statusQuery, isActive: true }),
      CourseCurriculum.countDocuments({ ...statusQuery, isActive: false })
    ]);

    return res.status(200).json({
      success: true,
      data,
      total,
      activeCount,
      inactiveCount,
      page: parseInt(page),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error("GetAllTopics Error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET TOPICS BY COURSE ================= */
export const getTopicsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const data = await CourseCurriculum.find({ course: courseId })
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      total: data.length,
      data
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= UPDATE ONE TOPIC ================= */
export const updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { topic, isActive } = req.body;

    const data = await CourseCurriculum.findById(id);
    if (!data) {
      return res.status(404).json({ message: "Topic not found" });
    }

    if (topic !== undefined) data.topic = topic;
    if (isActive !== undefined) data.isActive = isActive;

    await data.save();

    return res.status(200).json({
      success: true,
      message: "Topic updated successfully",
      data
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= DELETE ONE TOPIC ================= */
export const deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await CourseCurriculum.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Topic not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Topic deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET SINGLE TOPIC BY ID ================= */
export const getTopicById = async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await CourseCurriculum.findById(id)
      .populate("course", "title");

    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    return res.status(200).json({
      success: true,
      data: topic
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};
