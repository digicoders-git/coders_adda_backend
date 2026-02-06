import express from "express";
import { getSalesDashboardData, getItemSalesData } from "../controllers/adminSales.controller.js";
import verifyAdminToken from "../middleware/verifyAdminToken.js";

const router = express.Router();

router.get("/dashboard-data", verifyAdminToken, getSalesDashboardData);
router.get("/item-data", verifyAdminToken, getItemSalesData);

export default router;
