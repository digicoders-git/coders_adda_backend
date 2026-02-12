import QuestionTopic from "../models/questionTopic.model.js";
import mongoose from "mongoose";

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

/* ================= QUESTION SPECIFIC CRUD ================= */

export const addQuestion = async (req, res) => {
  try {
    const { id } = req.params; // Topic ID

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Topic ID" });
    }

    const topic = await QuestionTopic.findByIdAndUpdate(
      id,
      { $push: { questions: req.body } },
      { new: true }
    );
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
    res.status(201).json({ success: true, message: "Question added", data: topic.questions[topic.questions.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { topicId, questionId } = req.params;
    const { question, options, correctAnswer } = req.body;

    if (!mongoose.Types.ObjectId.isValid(topicId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ success: false, message: "Invalid Topic or Question ID" });
    }

    const topic = await QuestionTopic.findOneAndUpdate(
      { _id: topicId, "questions._id": questionId },
      {
        $set: {
          "questions.$.question": question,
          "questions.$.options": options,
          "questions.$.correctAnswer": correctAnswer
        }
      },
      { new: true }
    );

    if (!topic) return res.status(404).json({ success: false, message: "Question or Topic not found" });

    // Find the updated question in the topic's questions array
    const updatedQuestion = topic.questions.id(questionId);

    res.json({ success: true, message: "Question updated", data: updatedQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { topicId, questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(topicId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ success: false, message: "Invalid Topic or Question ID" });
    }

    const topic = await QuestionTopic.findByIdAndUpdate(
      topicId,
      { $pull: { questions: { _id: questionId } } },
      { new: true }
    );
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
    res.json({ success: true, message: "Question deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
