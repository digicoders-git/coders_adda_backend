import express from 'express'
import { getAllUsers, getMyWallet, getProfile, googleLogin, requestMobileOtp, verifyMobileOtp, updateUserIsActive, updateUserProfile } from '../controllers/user.controller.js';
import userAuth from '../middleware/userAuth.js';
import upload from "../middleware/multer.js";
import { getMyLibrary } from '../controllers/library.controller.js';


const userRoute = express.Router();
// Mobile OTP Login
userRoute.post('/request-otp', requestMobileOtp);
userRoute.post('/verify-otp', verifyMobileOtp);

// Google Login
userRoute.post('/google-login', googleLogin);

// Get All Users (Admin)
userRoute.get('/', getAllUsers);

// Get User Profile
userRoute.get('/profile/:userId', getProfile);
userRoute.put("/update-profile", userAuth, upload.single("profilePicture"), updateUserProfile);
userRoute.get("/profile", userAuth, getProfile);
userRoute.get("/:id/status", updateUserIsActive);
userRoute.get("/my-library", userAuth, getMyLibrary);
userRoute.get("/my-wallet", userAuth, getMyWallet);
// userRoute.post("/course-purchase",userAuth, purchaseCourse);

export default userRoute;