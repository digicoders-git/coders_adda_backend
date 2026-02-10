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
import verifyInstructorToken from "../middleware/verifyInstructorToken.js";

const instructorRoute = express.Router();

instructorRoute.post("/login", loginInstructor);
instructorRoute.post("/create", createInstructor);
instructorRoute.get("/get", getAllInstructors);
instructorRoute.get("/get/:id", getSingleInstructor);
instructorRoute.put("/update/:id", updateInstructor);
instructorRoute.delete("/delete/:id", deleteInstructor);
instructorRoute.get("/profile", verifyInstructorToken, getInstructorProfile);
instructorRoute.get("/stats", verifyInstructorToken, getInstructorDashboardStats);

export default instructorRoute;
