import Quiz from "../models/quiz.model.js";
import QuestionTopic from "../models/questionTopic.model.js";

/* ================= CREATE QUIZ ================= */
export const createQuiz = async (req, res) => {
  try {
    const {
      title,
      quizCode,
      description,
      duration,
      level,
      points,
      status,
      questionTopicId,
      selectedQuestions,
      customQuestions,
    } = req.body;

    // Check if questionTopic exists and get question count
    const topic = await QuestionTopic.findById(questionTopicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Question Topic not found"
      });
    }

    const quiz = await Quiz.create({
      title,
      quizCode,
      description,
      duration,
      level,
      points,
      status: status !== undefined ? status : true,
      questionTopicId,
      selectedQuestions: selectedQuestions || [],
      customQuestions: customQuestions || [],
      totalQuestions:
        (selectedQuestions && selectedQuestions.length > 0
          ? selectedQuestions.length
          : topic.questions.length) + (customQuestions ? customQuestions.length : 0),
    });

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= GET ALL QUIZZES ================= */
export const getAllQuizzes = async (req, res) => {
  try {
    const { search, level, status, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { quizCode: { $regex: search, $options: "i" } }
      ];
    }

    if (level) {
      filter.level = level;
    }

    if (status !== undefined && status !== "") {
      filter.status = status === "true" || status === true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Quiz.countDocuments(filter);

    const quizzes = await Quiz.find(filter)
      .populate("questionTopicId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: quizzes,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        currentPage: parseInt(page),
        limit: parseInt(limit)
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

/* ================= GET QUIZ BY ID ================= */
export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id)
      .populate("questionTopicId")
      .populate("attempts")
      .populate("certificateTemplate");

    // Convert to plain object to modify questions
    let quizData = quiz.toObject();

    if (
      quizData.selectedQuestions &&
      quizData.selectedQuestions.length > 0 &&
      quizData.questionTopicId
    ) {
      const selectedIds = quizData.selectedQuestions.map((sq) => sq.toString());
      quizData.questionTopicId.questions =
        quizData.questionTopicId.questions.filter((q) =>
          selectedIds.includes(q._id.toString()),
        );
    }

    res.json({
      success: true,
      data: quizData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= UPDATE QUIZ ================= */
export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.selectedQuestions || updateData.customQuestions) {
      const selectedCount = updateData.selectedQuestions
        ? updateData.selectedQuestions.length
        : 0;
      const customCount = updateData.customQuestions
        ? updateData.customQuestions.length
        : 0;
      updateData.totalQuestions = selectedCount + customCount;
    } else if (updateData.questionTopicId) {
      const topic = await QuestionTopic.findById(updateData.questionTopicId);
      if (topic) {
        updateData.totalQuestions = topic.questions.length;
        // If topic changes but selectedQuestions not provided, default to all questions
        updateData.selectedQuestions = topic.questions.map((q) => q._id);
      }
    }

    const quiz = await Quiz.findByIdAndUpdate(id, updateData, { new: true }).populate("questionTopicId");

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    res.json({
      success: true,
      message: "Quiz updated successfully",
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= TOGGLE QUIZ STATUS ================= */
export const toggleQuizStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    quiz.status = !quiz.status;
    await quiz.save();

    res.json({
      success: true,
      message: `Quiz status updated to ${quiz.status ? "Active" : "Disabled"}`,
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= DELETE QUIZ ================= */
export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findByIdAndDelete(id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    res.json({
      success: true,
      message: "Quiz deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
