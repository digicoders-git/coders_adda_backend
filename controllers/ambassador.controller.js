import AmbassadorApplication from "../models/ambassadorApplication.model.js";
import User from "../models/user.model.js";
import Config from "../models/config.model.js";

/* ================= PRE-USER ACTIONS ================= */

// Apply for Ambassador Program
export const applyForAmbassador = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, email, phoneNumber, collegeName, courseStream } = req.body;

    // Check if already applied or approved
    const existing = await AmbassadorApplication.findOne({ user: userId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.status === 'approved' ? 'Already an Ambassador' : 'Application already submitted'
      });
    }

    const application = await AmbassadorApplication.create({
      user: userId,
      fullName,
      email,
      phoneNumber,
      collegeName,
      courseStream
    });

    res.status(201).json({ success: true, message: "Application submitted successfully", data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current user's ambassador status
export const getAmbassadorStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const application = await AmbassadorApplication.findOne({ user: userId });
    const user = await User.findById(userId).select("isAmbassador referralCode walletBalance referralCount");

    res.status(200).json({
      success: true,
      status: application ? application.status : 'none',
      isAmbassador: user.isAmbassador,
      referralCode: user.referralCode,
      walletBalance: user.walletBalance,
      referralCount: user.referralCount || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= ADMIN ACTIONS ================= */

// List applications
export const adminGetApplications = async (req, res) => {
  try {
    const { status, search } = req.query;
    console.log("Admin Get Applications Query:", req.query);
    let filter = {};
    if (status) filter.status = status;

    console.log("Filter used:", filter);

    const applications = await AmbassadorApplication.find(filter)
      .populate("user", "name mobile profilePicture referralCode referralCount")
      .sort({ createdAt: -1 });

    console.log(`Found ${applications.length} applications for status: ${status}`);
    if (applications.length > 0) {
      console.log("First record ID:", applications[0]._id);
    }

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve application
export const adminApproveApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await AmbassadorApplication.findById(id);

    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    if (application.status === 'approved') return res.status(400).json({ success: false, message: "Already approved" });

    application.status = 'approved';
    await application.save();

    // Update user to Ambassador
    const user = await User.findById(application.user);
    user.isAmbassador = true;

    // Generate Referral Code: CA + Name(First 3) + Random(4)
    const namePart = (user.name || application.fullName).replace(/\s+/g, '').substring(0, 3).toUpperCase();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const generatedCode = `DCT${namePart}${randomPart}`;

    user.referralCode = generatedCode;
    application.referralCode = generatedCode;

    await user.save();
    await application.save();

    res.status(200).json({ success: true, message: "Application approved!", referralCode: user.referralCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject application
export const adminRejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const application = await AmbassadorApplication.findById(id);

    if (!application) return res.status(404).json({ success: false, message: "Application not found" });

    application.status = 'rejected';
    application.adminComment = comment || "Criteria not met";
    await application.save();

    res.status(200).json({ success: true, message: "Application rejected" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Referral Config
export const adminGetConfig = async (req, res) => {
  try {
    console.log("Admin Get Config Hit");
    let config = await Config.findOne({ key: "referral_commission" });
    if (!config) {
      config = await Config.create({ key: "referral_commission", value: 10, description: "Amount credited to ambassador for each referral signup" });
    }
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Referral Config
export const adminUpdateConfig = async (req, res) => {
  try {
    const { value } = req.body;
    console.log("Updating Config Value to:", value);
    let config = await Config.findOneAndUpdate(
      { key: "referral_commission" },
      { value: Number(value) },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, message: "Config updated", data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get referred users for an ambassador
export const adminGetReferredUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    const users = await User.find({ referredBy: userId })
      .select("name email mobile profilePicture createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
