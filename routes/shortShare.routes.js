import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  addShare,
  getSharesByShort
} from "../controllers/shortShare.controller.js";

const shortShareRoute = express.Router();

// User shares a short
shortShareRoute.post("/add/:shortId", userAuth, addShare);

// Admin: see who shared this short
shortShareRoute.get("/get/:shortId", getSharesByShort);

export default shortShareRoute;
