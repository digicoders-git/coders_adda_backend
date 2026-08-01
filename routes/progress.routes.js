import express from "express";
import { updateProgressREST } from "../controllers/progress.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.post("/update", verifyToken, updateProgressREST);

export default router;
