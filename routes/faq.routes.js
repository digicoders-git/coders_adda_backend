import express from "express";
import {
  addFaq,
  getFaqs,
  updateFaq,
  deleteFaq,
} from "../controllers/faq.controller.js";
import verifyAdminToken from "../middleware/verifyAdminToken.js";

const router = express.Router();

// Public route (Frontend/App will use this)
router.get("/", getFaqs);

// Protected Admin Routes
router.post("/add", verifyAdminToken, addFaq);
router.put("/update/:id", verifyAdminToken, updateFaq);
router.delete("/delete/:id", verifyAdminToken, deleteFaq);

export default router;
