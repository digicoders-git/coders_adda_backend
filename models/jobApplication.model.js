import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming user model is named 'User'
      required: true,
    },

    // Section 1: Personal Information
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    profilePhoto: {
      type: String, // URL
      default: "",
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
    },

    // Section 2: Professional Information
    currentJobTitle: {
      type: String,
      trim: true,
    },
    experience: {
      type: String,
      enum: ["Fresher", "Experienced"],
    },
    totalExperience: {
      type: String, // e.g. "2 Years"
      trim: true,
    },
    currentCompany: {
      type: String,
      trim: true,
    },
    currentSalary: {
      type: String,
      trim: true,
    },
    expectedSalary: {
      type: String,
      trim: true,
    },
    noticePeriod: {
      type: String,
      trim: true,
    },

    // Section 3: Education
    qualification: {
      type: String,
      required: true,
      trim: true,
    },
    college: {
      type: String,
      trim: true,
    },
    passingYear: {
      type: String,
      trim: true,
    },
    percentage: {
      type: String,
      trim: true,
    },

    // Section 4: Skills
    skills: [
      {
        type: String,
        trim: true,
      }
    ],

    // Section 5: Resume
    resumeURL: {
      type: String,
      required: true,
    },

    // Section 6: Professional Links
    linkedIn: {
      type: String,
      trim: true,
    },
    gitHub: {
      type: String,
      trim: true,
    },
    portfolio: {
      type: String,
      trim: true,
    },

    // Section 7: Job Preferences
    preferredLocation: {
      type: String,
      trim: true,
    },
    workType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    },
    relocate: {
      type: String,
      enum: ["Yes", "No"],
    },

    // Section 8: Cover Letter
    coverLetter: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    // Admin & Status Fields
    status: {
      type: String,
      enum: [
        "Applied", 
        "Under Review", 
        "Shortlisted", 
        "Interview Scheduled", 
        "Interview Completed", 
        "Selected", 
        "Offer Sent", 
        "Joined", 
        "Rejected"
      ],
      default: "Applied",
    },
    hrNotes: {
      type: String,
      trim: true,
    },
    interviewDate: {
      type: Date,
    },
    interviewTime: {
      type: String,
      trim: true,
    },
    interviewMode: {
      type: String,
      enum: ["Online", "Offline", "Phone"],
    },
    
    // Status Timeline array to track changes
    statusTimeline: [
      {
        status: String,
        updatedAt: {
          type: Date,
          default: Date.now
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Admin"
        },
        message: String // Optional message from HR
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("JobApplication", jobApplicationSchema);
