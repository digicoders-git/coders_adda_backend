import express from "express";
import { 
  updateProgressREST, 
  getProgressByCourseREST,
  getRecentProgress
} from "../controllers/progress.controller.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.post("/update", userAuth, updateProgressREST);

// GET progress for a specific course
router.get("/:courseId", userAuth, getProgressByCourseREST);

// GET most recent incomplete progress
router.get("/recent/watching", userAuth, getRecentProgress);

export default router;
