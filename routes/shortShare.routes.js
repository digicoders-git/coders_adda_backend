import express from "express";
import optionalUserAuth from "../middleware/optionalUserAuth.js";
import {
  addShare,
  getSharesByShort
} from "../controllers/shortShare.controller.js";

const shortShareRoute = express.Router();

// User shares a short
shortShareRoute.post("/add/:shortId", optionalUserAuth, addShare);

// Admin: see who shared this short
shortShareRoute.get("/get/:shortId", getSharesByShort);

export default shortShareRoute;
