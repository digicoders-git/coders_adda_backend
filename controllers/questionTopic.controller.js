import QuestionTopic from "../models/questionTopic.model.js";

export const createQuestionTopic = async (req, res) => {
  try {
    const { topicName, questions } = req.body;
    const topic = await QuestionTopic.create({ topicName, questions });
    res.status(201).json({
      success: true,
      message: "Question Topic created successfully",
      data: topic
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getAllQuestionTopics = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status } = req.query;

    let filter = {};
    if (search) {
      filter.topicName = { $regex: search, $options: "i" };
    }

    if (status !== undefined && status !== "") {
      filter.status = status === "true";
    }

    const skip = (page - 1) * limit;
    const total = await QuestionTopic.countDocuments(filter);
    const topics = await QuestionTopic.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: topics,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const toggleTopicStatus = async (req, res) => {
  try {
    const topic = await QuestionTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });

    topic.status = !topic.status;
    await topic.save();

    res.json({
      success: true,
      message: `Topic status updated to ${topic.status ? "Active" : "Disabled"}`,
      data: topic
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const getQuestionTopicById = async (req, res) => {
  try {
    const topic = await QuestionTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
    res.json({ success: true, data: topic });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const updateQuestionTopic = async (req, res) => {
  try {
    const topic = await QuestionTopic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
    res.json({ success: true, message: "Topic updated", data: topic });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const deleteQuestionTopic = async (req, res) => {
  try {
    const topic = await QuestionTopic.findByIdAndDelete(req.params.id);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
    res.json({ success: true, message: "Topic deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
