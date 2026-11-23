import express from "express";
import {
  createBlog,
  getAllBlogs,
  getSingleBlog,
  updateBlog,
  deleteBlog,
  toggleBlogStatus
} from "../controllers/blog.controller.js";
import upload from "../middleware/multer.js";

const blogRoutes = express.Router();

blogRoutes.post("/create", upload.single("image"), createBlog);
blogRoutes.get("/get", getAllBlogs);
blogRoutes.get("/get/:id", getSingleBlog);
blogRoutes.put("/update/:id", upload.single("image"), updateBlog);
blogRoutes.delete("/delete/:id", deleteBlog);
blogRoutes.patch("/toggle-status/:id", toggleBlogStatus);

export default blogRoutes;
