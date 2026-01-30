import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  addComment,
  replyToComment,
  getCommentsByShort,
  deleteComment
} from "../controllers/shortComment.controller.js";

const shortCommentRoutes = express.Router();

// User adds comment
shortCommentRoutes.post("/add/:shortId", userAuth, addComment);

// Admin replies to comment
shortCommentRoutes.post("/reply/:commentId", userAuth, replyToComment);

// Get all comments of a short
shortCommentRoutes.get("/get/:shortId", getCommentsByShort);

// Delete comment (user or admin)
shortCommentRoutes.delete("/delete/:commentId", userAuth, deleteComment);

export default shortCommentRoutes;
