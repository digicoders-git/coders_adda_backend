import Blog from "../models/blog.model.js";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3900";

/* ================= CREATE ================= */
export const createBlog = async (req, res) => {
  try {
    const { title, description, displayPlatform, status } = req.body;

    let image = {};
    if (req.file) {
      const localUrl = `${BASE_URL}/uploads/blogs/${req.file.filename}`;
      image = {
        url: localUrl,
        localUrl: localUrl,
        public_id: req.file.filename
      };
    }

    const blog = await Blog.create({
      title,
      description,
      image,
      displayPlatform: displayPlatform || "both",
      isActive: status === "Active" || status === true || status === "true" ? true : false
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET ALL ================= */
export const getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive, displayPlatform, targetPlatform } = req.query;
    let filter = {};

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    if (targetPlatform === "website") {
      filter.displayPlatform = { $in: ["both", "website"] };
    } else if (targetPlatform === "app") {
      filter.displayPlatform = { $in: ["both", "app"] };
    } else if (displayPlatform) {
      filter.displayPlatform = displayPlatform;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    const blogs = await Blog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Blog.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      data: blogs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET SINGLE ================= */
export const getSingleBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    return res.status(200).json({ success: true, data: blog });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ================= UPDATE ================= */
export const updateBlog = async (req, res) => {
  try {
    const { title, description, status } = req.body;
    let blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    let updateData = {
      title,
      description,
      isActive: status === "Active"
    };

    if (req.file) {
      // Delete old local file if exists
      if (blog.image?.public_id) {
        const oldPath = path.resolve("uploads/blogs", blog.image.public_id);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const localUrl = `${BASE_URL}/uploads/blogs/${req.file.filename}`;
      updateData.image = {
        url: localUrl,
        localUrl: localUrl,
        public_id: req.file.filename
      };
    }

    blog = await Blog.findByIdAndUpdate(req.params.id, updateData, { new: true });

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= DELETE ================= */
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    if (blog.image?.public_id) {
      const imagePath = path.resolve("uploads/blogs", blog.image.public_id);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await Blog.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

/* ================= TOGGLE STATUS ================= */
export const toggleBlogStatus = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: "NotFound" });

    blog.isActive = !blog.isActive;
    await blog.save();

    return res.status(200).json({ success: true, isActive: blog.isActive });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
