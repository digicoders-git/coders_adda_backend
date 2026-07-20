import express from "express";
import upload from "../middleware/multer.js";
import {
  createEbook,
  getAllEbooks,
  getSingleEbook,
  updateEbook,
  deleteEbook
} from "../controllers/ebook.controller.js";

const ebookRoute = express.Router();

ebookRoute.post("/create", upload.fields([{ name: "image", maxCount: 1 }, { name: "pdf", maxCount: 1 }]), createEbook);
ebookRoute.get("/get", getAllEbooks);
ebookRoute.get("/get/:id", getSingleEbook);
ebookRoute.put("/update/:id", upload.fields([{ name: "image", maxCount: 1 }, { name: "pdf", maxCount: 1 }]), updateEbook);
ebookRoute.delete("/delete/:id", deleteEbook);

export default ebookRoute;
