import express from "express";
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSingleSubscription,
  getAllSubscriptions,
  toggleSubscriptionStatus
} from "../controllers/subscription.controller.js";

import {
  getSubscriptionEnrollments,
  getSubscriptionStats,
  extendSubscription,
  cancelSubscription,
  getStudentsBySubscription
} from "../controllers/adminSubscriptionEnrollment.controller.js";

const subscriptionRoute = express.Router();

// Plan Management
subscriptionRoute.post("/create", createSubscription);
subscriptionRoute.get("/get", getAllSubscriptions);
subscriptionRoute.get("/get/:id", getSingleSubscription);
subscriptionRoute.put("/update/:id", updateSubscription);
subscriptionRoute.delete("/delete/:id", deleteSubscription);
subscriptionRoute.patch("/toggle-status/:id", toggleSubscriptionStatus); // active/inactive

// Enrollment Management (Admin)
subscriptionRoute.get("/enrollments", getSubscriptionEnrollments);
subscriptionRoute.get("/stats", getSubscriptionStats);
subscriptionRoute.patch("/extend", extendSubscription);
subscriptionRoute.patch("/cancel", cancelSubscription);
subscriptionRoute.get("/students/:subscriptionId", getStudentsBySubscription);

export default subscriptionRoute;
