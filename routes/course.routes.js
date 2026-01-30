import express from "express";
import upload from "../middleware/multer.js";
import {
  createCourse,
  getAllCourses,
  getSingleCourse,
  updateCourse,
  deleteCourse,
  toggleCourseStatus
} from "../controllers/course.controller.js";

const courseRoute = express.Router();

// thumbnail + promoVideo upload
courseRoute.post(
  "/create",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "promoVideo", maxCount: 1 }
  ]),
  createCourse
);

courseRoute.get("/get", getAllCourses);
courseRoute.get("/get/:id", getSingleCourse);

courseRoute.put(
  "/update/:id",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "promoVideo", maxCount: 1 }
  ]),
  updateCourse
);

courseRoute.delete("/delete/:id", deleteCourse);
courseRoute.patch("/toggle-status/:id", toggleCourseStatus);


export default courseRoute;
