import express from "express";
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSingleSubscription,
  getAllSubscriptions,
  toggleSubscriptionStatus
} from "../controllers/subscription.controller.js";

const subscriptionRoute = express.Router();

subscriptionRoute.post("/create", createSubscription);
subscriptionRoute.get("/get", getAllSubscriptions);
subscriptionRoute.get("/get/:id", getSingleSubscription);
subscriptionRoute.put("/update/:id", updateSubscription);
subscriptionRoute.delete("/delete/:id", deleteSubscription);

subscriptionRoute.patch("/toggle-status/:id", toggleSubscriptionStatus); // active/inactive

export default subscriptionRoute;
