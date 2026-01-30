import express from "express";
import userAuth from "../middleware/userAuth.js";
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";
import { freeEnroll } from "../controllers/enroll.controller.js";

const paymentRoute = express.Router();

paymentRoute.post("/create-order", userAuth, createOrder);
paymentRoute.post("/verify", userAuth, verifyPayment);
paymentRoute.post("/free", userAuth, freeEnroll);

export default paymentRoute;
