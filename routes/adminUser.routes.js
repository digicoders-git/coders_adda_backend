import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus
} from "../controllers/adminUser.controller.js";
import upload from "../middleware/multer.js";

const adminUserRoutes = express.Router();

adminUserRoutes.get("/get", getAllUsers);
adminUserRoutes.get("/get/:id", getUserById);
adminUserRoutes.put("/update/:id", upload.single("profilePicture"), updateUser);
adminUserRoutes.delete("/delete/:id", deleteUser);
adminUserRoutes.patch("/toggle-status/:id", toggleUserStatus);

export default adminUserRoutes;
