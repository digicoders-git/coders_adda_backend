import express from "express";
import userAuth from "../middleware/userAuth.js";
import { createOrder, verifyPayment, recordPaymentFailure, payWithWallet } from "../controllers/payment.controller.js";
import { freeEnroll } from "../controllers/enroll.controller.js";

const paymentRoute = express.Router();

paymentRoute.post("/create-order", userAuth, createOrder);
paymentRoute.post("/verify", userAuth, verifyPayment);
paymentRoute.post("/record-failure", userAuth, recordPaymentFailure);
paymentRoute.post("/free", userAuth, freeEnroll);
paymentRoute.post("/wallet-pay", userAuth, payWithWallet);

export default paymentRoute;
