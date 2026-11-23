import express from "express";
import {
  getEbookEnrollmentStats,
  getAllEbookEnrollments,
  getEbookStudents
} from "../controllers/adminEbookEnrollment.controller.js";

const router = express.Router();

router.get("/stats", getEbookEnrollmentStats);
router.get("/all", getAllEbookEnrollments);
router.get("/:ebookId/students", getEbookStudents);

export default router;
