import express from "express";
import upload from "../middleware/multer.js";
import {
  createSlider,
  updateSlider,
  deleteSlider,
  getAllSliders,
  toggleSliderStatus
} from "../controllers/slider.controller.js";

const sliderRoute = express.Router();

sliderRoute.post("/create", upload.single("image"), createSlider);
sliderRoute.get("/get", getAllSliders);
sliderRoute.put("/update/:id", upload.single("image"), updateSlider);
sliderRoute.delete("/delete/:id", deleteSlider);
sliderRoute.patch("/toggle-status/:id", toggleSliderStatus);

export default sliderRoute;
