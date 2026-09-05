import express from "express";
import upload from "../middleware/multer.js";
import optionalUserAuth from "../middleware/optionalUserAuth.js";
import userAuth from "../middleware/userAuth.js";
import {
  createLecture,
  getAllLectures,
  getLecturesByCourse,
  getLecturesByTopic,
  getSingleLecture,
  updateLecture,
  deleteLecture,
  checkLecturePurchase
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
lectureRoute.get("/get/by-topic/:topicId", optionalUserAuth, getLecturesByTopic);
lectureRoute.get("/get/:id", optionalUserAuth, getSingleLecture);
lectureRoute.get("/check-purchase/:lectureId", userAuth, checkLecturePurchase);

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
