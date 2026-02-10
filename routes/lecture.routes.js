import express from "express";
import upload from "../middleware/multer.js";
import {
  createLecture,
  getAllLectures,
  getLecturesByCourse,
  getSingleLecture,
  updateLecture,
  deleteLecture
} from "../controllers/lecture.controller.js";

const lectureRoute = express.Router();

lectureRoute.post(
  "/create",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "resource", maxCount: 1 }
  ]),
  createLecture
);

lectureRoute.get("/get", getAllLectures);
lectureRoute.get("/get/by-course/:courseId", getLecturesByCourse);
lectureRoute.get("/get/:id", getSingleLecture);

lectureRoute.patch(
  "/update/:id",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "resource", maxCount: 1 }
  ]),
  updateLecture
);

lectureRoute.delete("/delete/:id", deleteLecture);

export default lectureRoute;
