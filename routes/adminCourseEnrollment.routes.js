import express from "express";
import {
  getCourseEnrollmentStats,
  getAllCoursesEnrollments,
  getCourseStudents,
  toggleCourseAccess,
  resetCourseProgress,
  getCourseAnalytics
} from "../controllers/adminCourseEnrollment.controller.js";

const router = express.Router();

router.get("/stats", getCourseEnrollmentStats);
router.get("/all", getAllCoursesEnrollments);
router.get("/:courseId/students", getCourseStudents);
router.get("/:courseId/analytics", getCourseAnalytics);
router.patch("/toggle-access", toggleCourseAccess);
router.post("/reset-progress", resetCourseProgress);

export default router;
