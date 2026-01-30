import express from "express";
import {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory
} from "../controllers/courseCategory.controller.js";

const CourseCategoryRoutes = express.Router();

CourseCategoryRoutes.post("/create", createCategory);
CourseCategoryRoutes.get("/get", getAllCategories);
CourseCategoryRoutes.get("/get/:id", getSingleCategory);
CourseCategoryRoutes.put("/update/:id", updateCategory);
CourseCategoryRoutes.delete("/delete/:id", deleteCategory);

export default CourseCategoryRoutes;
