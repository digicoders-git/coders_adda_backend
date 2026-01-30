import Job from "../models/job.model.js";

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
      jobStatus
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
      jobStatus
    });

    res.status(201).json({
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
      jobStatus
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
    if (jobStatus !== undefined) job.jobStatus = jobStatus;

    if (requiredSkills !== undefined) {
      if (Array.isArray(requiredSkills)) {
        job.requiredSkills = requiredSkills;
      } else {
        job.requiredSkills = requiredSkills.split(",").map((s) => s.trim());
      }
    }

    await job.save();

    res.json({
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

    res.json({ message: "Job deleted successfully" });
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

    res.json({ data: job });
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

    if (workType) {
      filter.workType = workType;
    }

    if (experience) {
      filter.requiredExperience = experience;
    }

    if (status) {
      filter.jobStatus = status;
    }

    const total = await Job.countDocuments(filter);

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: jobs
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
    job.jobStatus = job.jobStatus === "active" ? "disable" : "active";

    await job.save();

    res.json({
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
