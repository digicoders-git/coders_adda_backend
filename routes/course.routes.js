import express from "express";
import upload from "../middleware/multer.js";
import {
  createCourse,
  getAllCourses,
  getSingleCourse,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
  getInstructorCourses,
  getCategoriesWithCourseCount,
  addCourseReview,
  toggleCourseReviewStatus
} from "../controllers/course.controller.js";
import verifyInstructorToken from "../middleware/verifyInstructorToken.js";

const courseRoute = express.Router();

courseRoute.get("/categories-with-count", getCategoriesWithCourseCount);
courseRoute.get("/instructor/my-courses", verifyInstructorToken, getInstructorCourses);

// thumbnail + promoVideo upload
courseRoute.post(
  "/create",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "promoVideo", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "instructorImage", maxCount: 1 }
  ]),
  createCourse
);

courseRoute.get("/get", getAllCourses);
courseRoute.get("/get/:id", getSingleCourse);

courseRoute.put(
  "/update/:id",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "promoVideo", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "instructorImage", maxCount: 1 }
  ]),
  updateCourse
);
courseRoute.patch(
  "/update/:id",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "promoVideo", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "instructorImage", maxCount: 1 }
  ]),
  updateCourse
);

courseRoute.delete("/delete/:id", deleteCourse);
courseRoute.patch("/toggle-status/:id", toggleCourseStatus);
courseRoute.post("/add-review/:id", addCourseReview);
courseRoute.patch("/toggle-review-status/:courseId/:reviewId", toggleCourseReviewStatus);

export default courseRoute;
