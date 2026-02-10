import User from "../models/user.model.js";
import mongoose from "mongoose";
import CourseCurriculum from "../models/courseCurriculum.model.js";
import Lecture from "../models/lecture.model.js";
import { generateToken } from "../utils/jwt.js";
import cloudinary from "../config/cloudinary.js";
import Payment from "../models/payment.model.js";
import { purchasableItemsMap } from "../services/purchasableItemsMap.js";
import QuizCertificate from "../models/quizCertificate.model.js";
import fs from "fs";
import path from "path";


// Fixed OTP
const FIXED_OTP = "123456";

// Mobile OTP Login
export const mobileLogin = async (req, res) => {
  try {
    const { mobile, otp, referralCode } = req.body;

    // Validation
    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required"
      });
    }


    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required"
      });
    }

    // OTP verification
    if (otp !== FIXED_OTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Use 123456"
      });
    }

    // Find existing user
    let user = await User.findOne({ mobile });
    // if(user.isActive == false){
    //   return res.status(400).json({success:false,message:'Your account is blocked, contact to DigiCoders'})
    // }

    if (!user) {
      // Create new user
      user = new User({
        mobile,
        isMobileVerified: true,
        loginMethod: 'mobile'
      });

      // 🎁 Referral Logic
      if (referralCode) {
        const referrer = await User.findOne({ referralCode, isAmbassador: true });
        if (!referrer) {
          return res.status(400).json({ success: false, message: "Invalid Referral Code" });
        }

        user.referredBy = referrer._id;

        // Get commission from config
        const Config = mongoose.model("Config");
        const commissionConfig = await Config.findOne({ key: "referral_commission" });
        const commissionAmount = commissionConfig ? Number(commissionConfig.value) : 0;

        referrer.walletBalance += commissionAmount;
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        await referrer.save();

        // 🔥 Update AmbassadorApplication collection (Separate collection as requested)
        const AmbassadorApplication = mongoose.model("AmbassadorApplication");
        await AmbassadorApplication.findOneAndUpdate(
          { user: referrer._id },
          { $inc: { referralCount: 1 } }
        );

        // 💰 Record Transaction in Payment history
        await Payment.create({
          user: referrer._id,
          itemType: "referral_reward",
          itemId: user._id, // the new user
          amount: commissionAmount,
          status: "success",
          razorpay: {
            status: "captured"
          }
        });
      }

      await user.save();
    } else {
      // Update existing user
      user.isMobileVerified = true;
      user.loginMethod = 'mobile';
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Success response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        mobile: user.mobile,
        isMobileVerified: user.isMobileVerified,
        loginMethod: user.loginMethod,
        isAmbassador: user.isAmbassador,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
        referralCount: user.referralCount || 0
      }
    });

  } catch (error) {
    console.error("Mobile login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Google Login
export const googleLogin = async (req, res) => {
  try {
    const { googleData, mobile, referralCode } = req.body;

    // Validation
    if (!googleData || !googleData.id) {
      return res.status(400).json({
        success: false,
        message: "Google data is required"
      });
    }

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required for Google login"
      });
    }

    const { id, email, name, picture, email_verified } = googleData;

    // Check if mobile already exists
    let user = await User.findOne({ mobile });

    if (user) {
      // Update existing user with Google data
      user.googleId = id;
      user.email = email;
      user.name = name;
      user.picture = picture;
      user.loginMethod = 'google';
      await user.save();
    } else {
      // Create new user with Google data
      user = new User({
        mobile,
        googleId: id,
        email,
        name,
        picture,
        loginMethod: 'google'
      });

      // 🎁 Referral Logic
      if (referralCode) {
        const referrer = await User.findOne({ referralCode, isAmbassador: true });
        if (!referrer) {
          return res.status(400).json({ success: false, message: "Invalid Referral Code" });
        }

        user.referredBy = referrer._id;

        // Get commission from config
        const Config = mongoose.model("Config");
        const commissionConfig = await Config.findOne({ key: "referral_commission" });
        const commissionAmount = commissionConfig ? Number(commissionConfig.value) : 0;

        referrer.walletBalance += commissionAmount;
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        await referrer.save();

        // 🔥 Update AmbassadorApplication collection (Separate collection as requested)
        const AmbassadorApplication = mongoose.model("AmbassadorApplication");
        await AmbassadorApplication.findOneAndUpdate(
          { user: referrer._id },
          { $inc: { referralCount: 1 } }
        );

        // 💰 Record Transaction in Payment history
        await Payment.create({
          user: referrer._id,
          itemType: "referral_reward",
          itemId: user._id, // the new user
          amount: commissionAmount,
          status: "success",
          razorpay: {
            status: "captured"
          }
        });
      }

      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Success response
    res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        name: user.name,
        picture: user.picture,
        loginMethod: user.loginMethod,
        isAmbassador: user.isAmbassador,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
        referralCount: user.referralCount || 0
      }
    });

  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get User Profile

export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select("-__v") // internal version hide

      // ================= COURSES =================
      .populate({
        path: "purchaseCourses",
        select: "title thumbnail promoVideo priceType price technology badge isActive category instructor",
        populate: [
          { path: "category", select: "name" },
          { path: "instructor", select: "name email" }
        ]
      })

      // ================= EBOOKS =================
      .populate({
        path: "purchaseEbooks",
        select: "title authorName priceType price pdf category isActive",
        populate: [
          { path: "category", select: "name" }
        ]
      })

      // ================= SUBSCRIPTIONS =================
      .populate({
        path: "purchaseSubscriptions.subscription",
        select: "planType duration planPricingType price freeJobs planStatus planBenefits includedCourses includedEbooks",
        populate: [
          {
            path: "includedCourses",
            select: "title thumbnail priceType price"
          },
          {
            path: "includedEbooks",
            select: "title pdf priceType price"
          }
        ]
      })

      .populate({
        path: "purchaseJobs",
        select: "jobTitle companyName location salaryPackage requiredExperience workType isActive"
      })
      .populate("referredBy", "name referralCode");

    // Fetch Quiz Certificates separately
    const quizCertificates = await QuizCertificate.find({ user: userId })
      .populate("quiz", "title quizCode")
      .sort({ issuedAt: -1 });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔥 COURSE → TOPIC → LECTURE BUILD
    const coursesWithContent = await Promise.all(
      (user.purchaseCourses || []).map(async (course) => {
        // 1️⃣ Topics (Chapters)
        const topics = await CourseCurriculum.find({
          course: course._id,
          isActive: true
        }).sort({ createdAt: 1 });

        // 2️⃣ Lectures per topic
        const topicsWithLectures = await Promise.all(
          topics.map(async (topic) => {
            const lectures = await Lecture.find({
              course: course._id,
              topic: topic._id,
              isActive: true
            }).sort({ srNo: 1 });

            return {
              ...topic.toObject(),
              lectures
            };
          })
        );

        return {
          ...course.toObject(),
          curriculum: topicsWithLectures
        };
      })
    );

    // Replace flat purchaseCourses with nested hierarchy
    const userObj = user.toObject();
    userObj.purchaseCourses = coursesWithContent;
    userObj.quizCertificates = quizCertificates;

    return res.json({
      success: true,
      user: userObj
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Failed to load profile" });
  }
};




/* ===============================
   UPDATE USER PROFILE + IMAGE
================================= */
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId; // auth middleware se

    const {
      name,
      email,
      about,
      socialLinks,
      college,
      course,
      semester,
      branch,
      technology,
      skills
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 🔹 Normal fields update
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (about !== undefined) user.about = about;

    if (socialLinks !== undefined) {
      // agar string aa raha hai to parse kar lo
      user.socialLinks = typeof socialLinks === "string"
        ? JSON.parse(socialLinks)
        : socialLinks;
    }

    if (college !== undefined) user.college = college;
    if (course !== undefined) user.course = course;
    if (semester !== undefined) user.semester = semester;
    if (branch !== undefined) user.branch = branch;

    if (technology !== undefined) {
      user.technology = typeof technology === "string"
        ? JSON.parse(technology)
        : technology;
    }
    if (skills !== undefined) {
      user.skills = typeof skills === "string"
        ? JSON.parse(skills)
        : skills;
    }

    // 🖼️ Profile Picture Upload
    if (req.file) {
      // Purani image delete (optional but recommended)
      if (user.profilePicture && user.profilePicture.public_id) {
        /* await cloudinary.uploader.destroy(user.profilePicture.public_id); */
        const oldFilePath = path.join("uploads/users/profile_pictures", user.profilePicture.public_id);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      /* const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "users/profile_pictures",
        crop: "fill"
      }); */

      const baseUrl = process.env.BASE_URL;
      const imageUrl = `${baseUrl}/uploads/users/profile_pictures/${req.file.filename}`;

      user.profilePicture = {
        url: imageUrl,
        public_id: req.file.filename
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user
    });

  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// export const purchaseCourse = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const { courseId } = req.body;

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     // ❌ Already purchased check
//     if (user.purchaseCourses.includes(courseId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Course already purchased"
//       });
//     }

//     // ✅ Push courseId into array
//     user.purchaseCourses.push(courseId);

//     // 💾 Save user
//     await user.save();

//     // 🔥 Populate purchased courses
//     const updatedUser = await User.findById(userId).populate("purchaseCourses");

//     return res.status(200).json({
//       success: true,
//       message: "Course purchased successfully",
//       user: updatedUser
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message
//     });
//   }
// };



export const updateUserIsActive = async (req, res) => {
  try {
    const { id } = req.params
    // console.log(id)
    const user = await User.findOne({ _id: id });
    // console.log(user)

    if (!user) {
      return res.status(404).json({ message: "User not found !" });
    }


    const isBlockedUser = await User.findOneAndUpdate({ _id: id }, { isActive: !user.isActive }, { new: true })
    // console.log(isBlockedUser)
    return res.status(201).json({ message: isBlockedUser.isActive ? "User blocked" : "User unblocked", isBlockedUser })

  } catch (error) {
    return res.status(500).json({ message: "Inernal Server Error", error: error.message })
  }
}

export const getAllUsers = async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const total = await User.countDocuments(filter);
    const data = await User.find(filter)
      .populate("referredBy", "name referralCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= MY WALLET API ================= */
export const getMyWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Fetch all user transactions
    const payments = await Payment.find({ user: userId }).sort({ createdAt: -1 });

    const transactions = await Promise.all(payments.map(async (payment) => {
      const config = purchasableItemsMap[payment.itemType];
      let itemName = "Unknown Item";

      if (payment.itemType === "referral_reward") {
        const referredUser = await User.findById(payment.itemId).select("name");
        itemName = `Referral Reward: ${referredUser?.name || "New User"}`;
      } else if (config) {
        const item = await config.model.findById(payment.itemId).select("title name jobTitle planType");
        itemName = item?.title || item?.name || item?.jobTitle || item?.planType || "Deleted Item";
      }

      return {
        ...payment.toObject(),
        itemName
      };
    }));

    // Calculate Total Earnings (Sum of all successful referral rewards)
    const referralPayments = payments.filter(p => p.itemType === "referral_reward" && p.status === "success");
    const totalEarnings = referralPayments.reduce((acc, curr) => acc + curr.amount, 0);

    // For now withdrawn is 0 as withdrawal logic is not yet implemented
    const withdrawn = 0;

    res.status(200).json({
      success: true,
      data: {
        totalBalance: user.walletBalance,
        totalEarnings: totalEarnings,
        withdrawn: withdrawn,
        transactions: transactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};