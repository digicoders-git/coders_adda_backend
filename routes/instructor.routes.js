import express from "express";
import {
  createInstructor,
  getAllInstructors,
  getSingleInstructor,
  updateInstructor,
  deleteInstructor
} from "../controllers/instructor.controller.js";

const instructorRoute = express.Router();

instructorRoute.post("/create", createInstructor);
instructorRoute.get("/get", getAllInstructors);
instructorRoute.get("/get/:id", getSingleInstructor);
instructorRoute.put("/update/:id", updateInstructor);
instructorRoute.delete("/delete/:id", deleteInstructor);

export default instructorRoute;
