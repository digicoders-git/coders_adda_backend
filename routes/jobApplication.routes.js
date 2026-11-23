import express from "express";
import {
  applyForJob,
  getMyApplications,
  withdrawApplication,
  getAllApplications,
  getApplicationDetails,
  updateApplicationStatus,
  getDashboardStats
} from "../controllers/jobApplication.controller.js";
import userAuth from "../middleware/userAuth.js";
import verifyAdminToken from "../middleware/verifyAdminToken.js";
import upload from "../middleware/multer.js";

const jobApplicationRoute = express.Router();

// ================= USER ROUTES =================
// Apply for a job (Requires resume upload)
jobApplicationRoute.post("/apply", userAuth, upload.single("resume"), applyForJob);

// Get user's own applications
jobApplicationRoute.get("/my-applications", userAuth, getMyApplications);

// Withdraw application
jobApplicationRoute.delete("/withdraw/:id", userAuth, withdrawApplication);

// ================= ADMIN ROUTES =================
// Get all applications (with search, filter, pagination)
jobApplicationRoute.get("/admin/all", verifyAdminToken, getAllApplications);

// Get dashboard stats
jobApplicationRoute.get("/admin/stats", verifyAdminToken, getDashboardStats);

// Get single application details
jobApplicationRoute.get("/admin/:id", verifyAdminToken, getApplicationDetails);

// Update application status & HR notes
jobApplicationRoute.put("/admin/update-status/:id", verifyAdminToken, updateApplicationStatus);

export default jobApplicationRoute;
