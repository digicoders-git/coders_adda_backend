import JobApplication from "../models/jobApplication.model.js";
import Job from "../models/job.model.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import JobEnrollment from "../models/jobEnrollment.model.js";
import admin from "../config/firebase.js";

// Utility function to generate unique Application ID
const generateApplicationId = () => {
  return 'APP-' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
};

/* ================= APPLY FOR JOB ================= */
export const applyForJob = async (req, res) => {
  try {
    const {
      jobId, fullName, email, mobile, city, state, dob, gender,
      currentJobTitle, experience, totalExperience, currentCompany, currentSalary, expectedSalary, noticePeriod,
      qualification, college, passingYear, percentage, skills,
      linkedIn, gitHub, portfolio, preferredLocation, workType, relocate, coverLetter
    } = req.body;

    const userId = req.user._id;

    // 1. Check if Job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // 2. Prevent duplicate application
    const existingApplication = await JobApplication.findOne({ jobId, userId });
    if (existingApplication) {
      return res.status(400).json({ success: false, message: "You have already applied for this job." });
    }

    // 3. Handle Resume File Upload
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Resume is required (PDF/DOC/DOCX)." });
    }
    const resumeURL = `/uploads/job_applications/resumes/${req.file.filename}`;

    // Handle Skills array parsing
    let parsedSkills = [];
    if (skills) {
      try {
        parsedSkills = JSON.parse(skills);
      } catch (e) {
        parsedSkills = skills.split(",").map(s => s.trim());
      }
    }

    // 4. Job Access & Limit Deduction Check
    const user = await User.findById(userId).populate('purchaseSubscriptions.subscription');
    const isFreeJob = job.priceType === 'free';
    const hasPurchasedDirectly = user.purchaseJobs.includes(jobId);
    
    // Calculate allowed free jobs from active subscriptions
    let totalAllowedFreeJobs = 0;
    const now = new Date();
    user.purchaseSubscriptions.forEach(sub => {
      if (sub.subscription && sub.endDate > now) {
        totalAllowedFreeJobs += (sub.subscription.freeJobs || 0);
      }
    });

    let usedFreeCredit = false;

    if (!isFreeJob && !hasPurchasedDirectly) {
      // User hasn't bought it directly, check if they have subscription credits
      if (totalAllowedFreeJobs > 0) {
        if (user.freeJobUnlocksUsed >= totalAllowedFreeJobs) {
           return res.status(403).json({ success: false, message: "You have exhausted your free job applies. Please upgrade your plan." });
        }
        // Will deduct credit
        usedFreeCredit = true;
      } else {
        return res.status(403).json({ success: false, message: "You need to unlock this job or buy a subscription to apply." });
      }
    }

    // 5. Create Application
    const applicationId = generateApplicationId();
    const newApplication = await JobApplication.create({
      applicationId,
      jobId,
      userId,
      fullName,
      email,
      mobile,
      city,
      state,
      dob: dob ? new Date(dob) : undefined,
      gender,
      currentJobTitle,
      experience,
      totalExperience,
      currentCompany,
      currentSalary,
      expectedSalary,
      noticePeriod,
      qualification,
      college,
      passingYear,
      percentage,
      skills: parsedSkills,
      resumeURL,
      linkedIn,
      gitHub,
      portfolio,
      preferredLocation,
      workType,
      relocate,
      coverLetter,
      status: "Applied",
      statusTimeline: [
        { status: "Applied", message: "Application submitted successfully." }
      ]
    });

    // 6. Deduct Free Credit (if used) & Save JobEnrollment
    if (usedFreeCredit) {
      user.freeJobUnlocksUsed += 1;
      await user.save();
    }

    // Always create a JobEnrollment so Admin Panel stats (which rely on JobEnrollments) show them as applied.
    await JobEnrollment.findOneAndUpdate(
      { user: user._id, job: jobId },
      { user: user._id, job: jobId },
      { upsert: true, new: true }
    );

    // 5. Notifications
    // Notify User
    if (req.user.fcmToken) {
      try {
        await admin.messaging().send({
          token: req.user.fcmToken,
          notification: {
            title: "Application Submitted! 🎉",
            body: `You have successfully applied for ${job.jobTitle} at ${job.companyName}.`
          }
        });
      } catch (err) {
        console.error("User Push Notification Error:", err);
      }
    }

    // Notify Admins
    try {
      const admins = await Admin.find({ fcmToken: { $exists: true, $ne: null } });
      if (admins.length > 0) {
        const tokens = admins.map(a => a.fcmToken);
        await admin.messaging().sendEachForMulticast({
          tokens: tokens,
          notification: {
            title: "New Job Application 📋",
            body: `${fullName} applied for ${job.jobTitle}.`
          }
        });
      }
    } catch (err) {
      console.error("Admin Push Notification Error:", err);
    }

    res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      data: newApplication
    });

  } catch (error) {
    console.error("Apply Job Error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ================= GET MY APPLICATIONS (USER) ================= */
export const getMyApplications = async (req, res) => {
  try {
    const applications = await JobApplication.find({ userId: req.user._id })
      .populate("jobId", "jobTitle companyName location salaryPackage")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ================= WITHDRAW APPLICATION (USER) ================= */
export const withdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await JobApplication.findOne({ _id: id, userId: req.user._id });
    
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (application.status !== "Applied") {
      return res.status(400).json({ success: false, message: "You can only withdraw applications that are still in the 'Applied' state." });
    }

    await JobApplication.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Application withdrawn successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ================= GET ALL APPLICATIONS (ADMIN) ================= */
export const getAllApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;
    
    let query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { applicationId: { $regex: search, $options: "i" } }
      ];
    }

    const total = await JobApplication.countDocuments(query);
    const applications = await JobApplication.find(query)
      .populate("jobId", "jobTitle companyName")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: applications,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ================= GET SINGLE APPLICATION (ADMIN) ================= */
export const getApplicationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await JobApplication.findById(id)
      .populate("jobId")
      .populate("userId", "name email mobile");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ================= UPDATE APPLICATION STATUS (ADMIN) ================= */
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, hrNotes, message, interviewDate, interviewTime, interviewMode } = req.body;

    const application = await JobApplication.findById(id).populate("jobId", "jobTitle companyName");
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (status) application.status = status;
    if (hrNotes !== undefined) application.hrNotes = hrNotes;
    
    if (interviewDate) application.interviewDate = new Date(interviewDate);
    if (interviewTime) application.interviewTime = interviewTime;
    if (interviewMode) application.interviewMode = interviewMode;

    if (status && status !== application.statusTimeline[application.statusTimeline.length - 1].status) {
      application.statusTimeline.push({
        status,
        updatedBy: req.admin._id,
        message: message || `Status updated to ${status}`
      });
      
      // Notify User
      const user = await User.findById(application.userId);
      if (user && user.fcmToken) {
        try {
           await admin.messaging().send({
            token: user.fcmToken,
            notification: {
              title: "Application Status Updated 🔔",
              body: `Your application for ${application.jobId.jobTitle} is now: ${status}.`
            }
          });
        } catch (err) {
           console.error("User Push Notification Error:", err);
        }
      }
    }

    await application.save();

    res.status(200).json({
      success: true,
      message: "Application updated successfully.",
      data: application
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ================= GET DASHBOARD STATS (ADMIN) ================= */
export const getDashboardStats = async (req, res) => {
  try {
    const totalApplications = await JobApplication.countDocuments();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysApplications = await JobApplication.countDocuments({ createdAt: { $gte: today } });
    
    const shortlisted = await JobApplication.countDocuments({ status: "Shortlisted" });
    const selected = await JobApplication.countDocuments({ status: "Selected" });
    const rejected = await JobApplication.countDocuments({ status: "Rejected" });

    res.status(200).json({
      success: true,
      data: {
        totalApplications,
        todaysApplications,
        shortlisted,
        selected,
        rejected
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
