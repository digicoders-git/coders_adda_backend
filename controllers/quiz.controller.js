import Quiz from "../models/quiz.model.js";

/* ================= CREATE QUIZ ================= */
export const createQuiz = async (req, res) => {
  try {
    const { title, quizCode, description, duration, level, points, status, questions } = req.body;

    const quiz = await Quiz.create({
      title,
      quizCode,
      description,
      duration,
      level,
      points,
      status,
      questions,
      totalQuestions: questions ? questions.length : 0
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
    const { search, level } = req.query;

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

    const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: quizzes
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
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    res.json({
      success: true,
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

/* ================= UPDATE QUIZ ================= */
export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const quiz = await Quiz.findByIdAndUpdate(id, updateData, { new: true });

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    // Force recalculate totalQuestions if questions changed (though schema pre-save handles it on save(), findByIdAndUpdate might bypass unless we set options, but simpler ensuring manual check if needed, or rely on schema if using find+save. Here findByIdAndUpdate is direct)
    // Actually, pre-save middleware is NOT triggered by findByIdAndUpdate. 
    // Let's rely on client sending correct data or manual update.
    if (updateData.questions) {
      quiz.totalQuestions = updateData.questions.length;
      await quiz.save();
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

/* ================= TOGGLE QUIZ STATUS ================= */
export const toggleQuizStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    quiz.status = quiz.status === "Active" ? "Disable" : "Active";
    await quiz.save();

    res.json({
      success: true,
      message: "Quiz status updated",
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
