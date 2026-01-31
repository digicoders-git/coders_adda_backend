import express from "express";
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  toggleQuizStatus
} from "../controllers/quiz.controller.js";

const router = express.Router();

router.post("/create", createQuiz);
router.get("/get", getAllQuizzes);
router.get("/get/:id", getQuizById);
router.put("/update/:id", updateQuiz);
router.delete("/delete/:id", deleteQuiz);
router.patch("/toggle-status/:id", toggleQuizStatus);

export default router;
