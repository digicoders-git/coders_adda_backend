import express from "express";
import {
  createInstructor,
  getAllInstructors,
  getSingleInstructor,
  updateInstructor,
  deleteInstructor,
  loginInstructor,
  getInstructorProfile,
  getInstructorDashboardStats
} from "../controllers/instructor.controller.js";
import { getCourseStudents } from "../controllers/adminCourseEnrollment.controller.js";
import verifyInstructorToken from "../middleware/verifyInstructorToken.js";
import upload from "../middleware/multer.js";

const instructorRoute = express.Router();

instructorRoute.post("/login", loginInstructor);
instructorRoute.post("/create", upload.single("profilePicture"), createInstructor);
instructorRoute.get("/get", getAllInstructors);
instructorRoute.get("/get/:id", getSingleInstructor);
instructorRoute.put("/update/:id", upload.single("profilePicture"), updateInstructor);
instructorRoute.delete("/delete/:id", deleteInstructor);
instructorRoute.get("/profile", verifyInstructorToken, getInstructorProfile);
instructorRoute.get("/stats", verifyInstructorToken, getInstructorDashboardStats);
instructorRoute.get("/course/:courseId/students", verifyInstructorToken, getCourseStudents);

export default instructorRoute;
