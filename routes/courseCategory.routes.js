import express from "express";
import {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
  getCategoriesWithCourseCount,
  getCoursesByCategoryName
} from "../controllers/courseCategory.controller.js";
import upload from "../middleware/multer.js";


const CourseCategoryRoutes = express.Router();

CourseCategoryRoutes.post(
  "/create",
  upload.single("image"),
  createCategory
);
CourseCategoryRoutes.get("/get", getAllCategories);
CourseCategoryRoutes.get("/course-count", getCategoriesWithCourseCount);
CourseCategoryRoutes.get("/get-by-name", getCoursesByCategoryName);
CourseCategoryRoutes.get("/get/:id", getSingleCategory);
CourseCategoryRoutes.put(
  "/update/:id",
  upload.single("image"),
  updateCategory
);
CourseCategoryRoutes.patch(
  "/update/:id",
  upload.single("image"),
  updateCategory
);
CourseCategoryRoutes.delete("/delete/:id", deleteCategory);

export default CourseCategoryRoutes;
