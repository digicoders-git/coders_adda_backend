import express from "express";
import userAuth from "../middleware/userAuth.js";
import verifyAdminToken from "../middleware/verifyAdminToken.js";
import {
  applyForAmbassador,
  getAmbassadorStatus,
  adminGetApplications,
  adminApproveApplication,
  adminRejectApplication,
  adminUpdateConfig,
  adminGetConfig,
  adminGetReferredUsers
} from "../controllers/ambassador.controller.js";

const router = express.Router();

// User Routes
router.post("/apply", userAuth, applyForAmbassador);
router.get("/status", userAuth, getAmbassadorStatus);

// Admin Routes
router.get("/admin/applications", verifyAdminToken, adminGetApplications);
router.patch("/admin/approve/:id", verifyAdminToken, adminApproveApplication);
router.patch("/admin/reject/:id", verifyAdminToken, adminRejectApplication);
router.get("/admin/config", verifyAdminToken, adminGetConfig);
router.post("/admin/config", verifyAdminToken, adminUpdateConfig);
router.get("/admin/referred-users/:userId", verifyAdminToken, adminGetReferredUsers);

export default router;
