import express from "express";
import { toggleLike, checkUserLiked } from "../controllers/shortLike.controller.js";
import userAuth from "../middleware/userAuth.js"; // or whatever your auth middleware is

const shortLikeRoutes = express.Router();

// Like / Unlike
shortLikeRoutes.post("/toggle/:shortId", userAuth, toggleLike);

// Check liked or not
shortLikeRoutes.get("/check/:shortId", userAuth, checkUserLiked);

export default shortLikeRoutes;
