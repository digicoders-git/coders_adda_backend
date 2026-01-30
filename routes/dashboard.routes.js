import express from "express";
import { getStats } from "../controllers/dashboard.controller.js";

const dashboardRoutes = express.Router();

dashboardRoutes.get("/stats", getStats);

export default dashboardRoutes;
