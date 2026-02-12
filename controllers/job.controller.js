import Job from "../models/job.model.js";
import JobEnrollment from "../models/jobEnrollment.model.js";
import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";

/* ================= CREATE JOB ================= */
export const createJob = async (req, res) => {
  try {
    const {
      jobTitle,
      jobCategory,
      location,
      salaryPackage,
      requiredExperience,
      workType,
      numberOfOpenings,
      requiredSkills,
      jobDescription,
      companyName,
      contactEmail,
      fullAddress,
      companyMobile,
      companyWebsite,
      jobStatus,
      price,
      priceType
    } = req.body;

    // Required fields check
    if (
      !jobTitle ||
      !jobCategory ||
      !location ||
      !salaryPackage ||
      !requiredExperience ||
      !workType ||
      !numberOfOpenings ||
      !jobDescription ||
      !companyName ||
      !contactEmail ||
      !fullAddress
    ) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // skills: "flutter, dart, python" => ["flutter","dart","python"]
    let skillsArray = [];
    if (requiredSkills) {
      if (Array.isArray(requiredSkills)) {
        skillsArray = requiredSkills;
      } else {
        skillsArray = requiredSkills.split(",").map((s) => s.trim());
      }
    }

    const job = await Job.create({
      jobTitle,
      jobCategory,
      location,
      salaryPackage,
      requiredExperience,
      workType,
      numberOfOpenings,
      requiredSkills: skillsArray,
      jobDescription,
      companyName,
      contactEmail,
      fullAddress,
      companyMobile,
      companyWebsite,
      jobStatus,
      price: price || 0,
      priceType: priceType || "free"
    });

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= UPDATE JOB ================= */
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const {
      jobTitle,
      jobCategory,
      location,
      salaryPackage,
      requiredExperience,
      workType,
      numberOfOpenings,
      requiredSkills,
      jobDescription,
      companyName,
      contactEmail,
      fullAddress,
      companyMobile,
      companyWebsite,
      jobStatus,
      price,
      priceType
    } = req.body;

    if (jobTitle !== undefined) job.jobTitle = jobTitle;
    if (jobCategory !== undefined) job.jobCategory = jobCategory;
    if (location !== undefined) job.location = location;
    if (salaryPackage !== undefined) job.salaryPackage = salaryPackage;
    if (requiredExperience !== undefined) job.requiredExperience = requiredExperience;
    if (workType !== undefined) job.workType = workType;
    if (numberOfOpenings !== undefined) job.numberOfOpenings = numberOfOpenings;
    if (jobDescription !== undefined) job.jobDescription = jobDescription;
    if (companyName !== undefined) job.companyName = companyName;
    if (contactEmail !== undefined) job.contactEmail = contactEmail;
    if (fullAddress !== undefined) job.fullAddress = fullAddress;
    if (companyMobile !== undefined) job.companyMobile = companyMobile;
    if (companyWebsite !== undefined) job.companyWebsite = companyWebsite;
    if (jobStatus !== undefined) job.jobStatus = jobStatus;
    if (price !== undefined) job.price = price;
    if (priceType !== undefined) job.priceType = priceType;

    if (requiredSkills !== undefined) {
      if (Array.isArray(requiredSkills)) {
        job.requiredSkills = requiredSkills;
      } else {
        job.requiredSkills = requiredSkills.split(",").map((s) => s.trim());
      }
    }

    await job.save();

    res.json({
      success: true,
      message: "Job updated successfully",
      data: job
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= DELETE JOB ================= */
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    await job.deleteOne();

    res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET SINGLE JOB ================= */
export const getSingleJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Check if job is unlocked for this user
    let isUnlocked = false;

    // 1. Check for Admin token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Check if it's an admin token by searching for the admin ID
        // Admin tokens usually store the id in the payload (based on admin.controller.js generateToken)
        const isAdmin = await Admin.exists({ _id: decoded.id });
        if (isAdmin) isUnlocked = true;
      } catch (err) {
        // Not a valid admin token or expired, ignore
      }
    }

    // 2. If not admin, check if regular user is enrolled
    if (!isUnlocked && req.user) {
      isUnlocked = await JobEnrollment.exists({ user: req.user._id, job: id });
    }

    // 3. If job is free, it's considered unlocked
    if (job.priceType === "free") isUnlocked = true;

    if (!isUnlocked) {
      return res.json({
        success: true,
        data: {
          _id: job._id,
          jobTitle: job.jobTitle,
          companyName: job.companyName,
          jobCategory: job.jobCategory,
          location: job.location,
          salaryPackage: job.salaryPackage,
          requiredExperience: job.requiredExperience,
          workType: job.workType,
          jobStatus: job.jobStatus,
          price: job.price,
          priceType: job.priceType,
          numberOfOpenings: job.numberOfOpenings,
          locked: true
        }
      });
    }

    res.json({ success: true, data: { ...job.toObject(), locked: false } });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET ALL JOBS (SEARCH + FILTER + PAGINATION) ================= */
export const getAllJobs = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, location, workType, experience, status } = req.query;

    let filter = {};

    // Search by title or company
    if (search) {
      filter.$or = [
        { jobTitle: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } }
      ];
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    if (workType && workType !== "All") {
      filter.workType = workType;
    }

    if (experience && experience !== "All") {
      filter.requiredExperience = experience;
    }

    if (status && status !== "All") {
      filter.jobStatus = status;
    }

    const total = await Job.countDocuments(filter);

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get auth status for locking logic
    let isAdminRequest = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        isAdminRequest = await Admin.exists({ _id: decoded.id });
      } catch (err) { }
    }

    const jobsWithLockStatus = await Promise.all(
      jobs.map(async (job) => {
        let isUnlocked = isAdminRequest;

        if (!isUnlocked && req.user) {
          isUnlocked = await JobEnrollment.exists({ user: req.user._id, job: job._id });
        }
        if (job.priceType === "free") isUnlocked = true;

        if (!isUnlocked) {
          return {
            _id: job._id,
            jobTitle: job.jobTitle,
            companyName: job.companyName,
            jobCategory: job.jobCategory,
            location: job.location,
            salaryPackage: job.salaryPackage,
            requiredExperience: job.requiredExperience,
            workType: job.workType,
            jobStatus: job.jobStatus,
            price: job.price,
            priceType: job.priceType,
            numberOfOpenings: job.numberOfOpenings,
            locked: true
          };
        }
        return { ...job.toObject(), locked: false };
      })
    );

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: jobsWithLockStatus
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= TOGGLE JOB STATUS ================= */
export const toggleJobStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // toggle status
    job.jobStatus = job.jobStatus === "Active" ? "Disabled" : "Active";

    await job.save();

    res.json({
      success: true,
      message: `Job status updated to ${job.jobStatus}`,
      data: {
        _id: job._id,
        jobStatus: job.jobStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
