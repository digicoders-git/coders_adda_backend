import express from "express";
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  toggleQuizStatus
} from "../controllers/quiz.controller.js";
import {
  createQuestionTopic,
  getAllQuestionTopics,
  getQuestionTopicById,
  updateQuestionTopic,
  deleteQuestionTopic,
  toggleTopicStatus
} from "../controllers/questionTopic.controller.js";
import {
  createAttempt,
  getAttemptsByQuiz,
  getAttemptsByUser,
  getMyAttempts,
  exportQuizReportExcel,
  exportUserQuizResultPDF
} from "../controllers/attemptUser.controller.js";

import {
  saveQuizCertificateTemplate,
  getQuizCertificateTemplate,
  getAllQuizCertificateTemplates,
  deleteQuizCertificateTemplate,
  toggleQuizCertificateTemplateStatus,
  issueQuizCertificateManual,
  getMyQuizCertificates
} from "../controllers/quizCertificateTemplate.controller.js";

import userAuth from "../middleware/userAuth.js";
import verifyAdminToken from "../middleware/verifyAdminToken.js";
import quizCertUpload from "../middleware/quizCertificateMulter.js";

const router = express.Router();

/* Quiz Routes */
router.post("/create", verifyAdminToken, createQuiz);
router.get("/get", getAllQuizzes);
router.get("/get/:id", getQuizById);
router.put("/update/:id", verifyAdminToken, updateQuiz);
router.delete("/delete/:id", verifyAdminToken, deleteQuiz);
router.patch("/toggle-status/:id", verifyAdminToken, toggleQuizStatus);

/* Question Topic Routes */
router.post("/topic/create", verifyAdminToken, createQuestionTopic);
router.get("/topic/all", verifyAdminToken, getAllQuestionTopics);
router.get("/topic/get/:id", verifyAdminToken, getQuestionTopicById);
router.put("/topic/update/:id", verifyAdminToken, updateQuestionTopic);
router.delete("/topic/delete/:id", verifyAdminToken, deleteQuestionTopic);
router.patch("/topic/toggle-status/:id", verifyAdminToken, toggleTopicStatus);

/* Attempt Routes */
router.post("/attempt/submit", userAuth, createAttempt);
router.get("/my-quiz", userAuth, getMyAttempts);
router.get("/attempt/quiz/:quizId", verifyAdminToken, getAttemptsByQuiz);
router.get("/attempt/user/:studentId", verifyAdminToken, getAttemptsByUser);

/* Export Routes */
router.get("/export/report/:quizId", verifyAdminToken, exportQuizReportExcel);
router.get("/export/result/:quizId/:studentId", verifyAdminToken, exportUserQuizResultPDF);

/* Quiz Certificate Template Routes */
router.post("/certificate/template/save", verifyAdminToken, quizCertUpload.single("certificateImage"), saveQuizCertificateTemplate);
router.get("/certificate/template/all", verifyAdminToken, getAllQuizCertificateTemplates);
router.get("/certificate/template/get/:quizId", verifyAdminToken, getQuizCertificateTemplate);
router.delete("/certificate/template/delete/:id", verifyAdminToken, deleteQuizCertificateTemplate);
router.patch("/certificate/template/toggle-status/:id", verifyAdminToken, toggleQuizCertificateTemplateStatus);
router.post("/certificate/issue", userAuth, issueQuizCertificateManual);
router.get("/certificate/my-certificates", userAuth, getMyQuizCertificates);

export default router;
