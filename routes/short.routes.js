import express from "express";
import upload from "../middleware/multer.js";
import {
  createShort,
  updateShort,
  deleteShort,
  getAllShorts,
  getActiveShorts,
  toggleShortStatus
} from "../controllers/short.controller.js";

const shortRoute = express.Router();

// Admin routes
shortRoute.post("/create", upload.single("video"), createShort);
shortRoute.get("/get", getAllShorts);
shortRoute.put("/update/:id", upload.single("video"), updateShort);
shortRoute.delete("/delete/:id", deleteShort);
shortRoute.patch("/toggle-status/:id", toggleShortStatus);

// App route
shortRoute.get("/get-active", getActiveShorts);

export default shortRoute;
