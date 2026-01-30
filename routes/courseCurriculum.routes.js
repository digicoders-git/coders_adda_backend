import express from "express";
import {
  createTopic,
  getAllTopics,
  getTopicsByCourse,
  updateTopic,
  deleteTopic,
  getTopicById
} from "../controllers/courseCurriculum.controller.js";

const CourseCurriculumRoute = express.Router();

CourseCurriculumRoute.post("/create", createTopic);
CourseCurriculumRoute.get("/get", getAllTopics);
CourseCurriculumRoute.get("/get/by-course/:courseId", getTopicsByCourse);
CourseCurriculumRoute.put("/update/:id", updateTopic);
CourseCurriculumRoute.delete("/delete/:id", deleteTopic);
CourseCurriculumRoute.get("/get/:id", getTopicById);

export default CourseCurriculumRoute;
