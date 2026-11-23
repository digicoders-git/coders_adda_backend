import express from "express";
import upload from "../middleware/multer.js";
import {
  createFreeDownload,
  getAllFreeDownloads,
  getSingleFreeDownload,
  updateFreeDownload,
  deleteFreeDownload,
  trackDownload,
} from "../controllers/freeDownload.controller.js";

const freeDownloadRoute = express.Router();

const uploadFields = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
  { name: "image", maxCount: 1 },
]);

freeDownloadRoute.post("/create", uploadFields, createFreeDownload);
freeDownloadRoute.get("/get", getAllFreeDownloads);
freeDownloadRoute.get("/get/:id", getSingleFreeDownload);
freeDownloadRoute.put("/update/:id", uploadFields, updateFreeDownload);
freeDownloadRoute.delete("/delete/:id", deleteFreeDownload);
freeDownloadRoute.post("/track/:id", trackDownload);

export default freeDownloadRoute;
