import express from "express";
import userAuth from "../middleware/userAuth.js";
import verifyAdminToken from "../middleware/verifyAdminToken.js";
import {
  addComment,
  replyToComment,
  getCommentsByShort,
  getLatestComments,
  deleteComment
} from "../controllers/shortComment.controller.js";

const shortCommentRoutes = express.Router();

// Admin: Get latest 5 comments for dashboard
shortCommentRoutes.get("/latest", getLatestComments);

// User adds comment
shortCommentRoutes.post("/add/:shortId", userAuth, addComment);

// Admin replies to comment (From Dashboard)
shortCommentRoutes.post("/reply/:commentId", verifyAdminToken, replyToComment);

// User replies to comment (From Website/App)
shortCommentRoutes.post("/user-reply/:commentId", userAuth, replyToComment);

// Get all comments of a short
shortCommentRoutes.get("/get/:shortId", getCommentsByShort);

// Delete comment (User - only own)
shortCommentRoutes.delete("/delete/:commentId", userAuth, deleteComment);

// Delete comment (Admin - any)
shortCommentRoutes.delete("/admin/delete/:commentId", verifyAdminToken, deleteComment);

export default shortCommentRoutes;
