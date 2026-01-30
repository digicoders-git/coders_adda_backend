import CourseCurriculum from "../models/courseCurriculum.model.js";

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

/* ================= GET ALL TOPICS (OPTIONAL) ================= */
export const getAllTopics = async (req, res) => {
  try {
    const data = await CourseCurriculum.find()
      .populate("course", "title");

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
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
