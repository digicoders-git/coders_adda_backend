import express from "express";
import {
  getJobEnrollmentStats,
  getAllJobEnrollments,
  getJobStudents
} from "../controllers/adminJobEnrollment.controller.js";

const router = express.Router();

router.get("/stats", getJobEnrollmentStats);
router.get("/all", getAllJobEnrollments);
router.get("/:jobId/students", getJobStudents);

export default router;
