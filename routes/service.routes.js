import express from "express";
import {
  createService,
  getAllServices,
  getSingleService,
  updateService,
  deleteService,
  toggleServiceStatus
} from "../controllers/service.controller.js";
import upload from "../middleware/multer.js";

const serviceRoutes = express.Router();

serviceRoutes.post("/create", upload.single("icon"), createService);
serviceRoutes.get("/get", getAllServices);
serviceRoutes.get("/get/:id", getSingleService);
serviceRoutes.put("/update/:id", upload.single("icon"), updateService);
serviceRoutes.delete("/delete/:id", deleteService);
serviceRoutes.patch("/toggle-status/:id", toggleServiceStatus);

export default serviceRoutes;
