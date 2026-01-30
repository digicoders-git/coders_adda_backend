import express from "express";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getSingleCategory,
  getAllCategories
} from "../controllers/ebooksCategory.controller.js";

const ebooksCategoryRoute = express.Router();

ebooksCategoryRoute.post("/create", createCategory);
ebooksCategoryRoute.get("/get", getAllCategories);
ebooksCategoryRoute.get("/get/:id", getSingleCategory);
ebooksCategoryRoute.put("/update/:id", updateCategory);
ebooksCategoryRoute.delete("/delete/:id", deleteCategory);

export default ebooksCategoryRoute;