import express from "express";
import { updateProgressREST } from "../controllers/progress.controller.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.post("/update", userAuth, updateProgressREST);

export default router;
