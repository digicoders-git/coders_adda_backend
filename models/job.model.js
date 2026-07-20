import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    jobTitle: {
      type: String,
      required: true,
      trim: true
    },

    jobCategory: {
      type: String, // role / category name
      required: true,
      trim: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    salaryPackage: {
      type: String, // "12-18 LPA"
      required: true,
      trim: true
    },

    requiredExperience: {
      type: String,
      enum: ["Fresher", "1-2 Years", "3-5 Years", "5+ Years"],
      required: true
    },

    workType: {
      type: String,
      enum: ["Work From Office", "Work From Home", "Hybrid"],
      required: true
    },

    numberOfOpenings: {
      type: Number,
      required: true,
      min: 1
    },

    requiredSkills: [
      {
        type: String,
        trim: true
      }
    ], // ["flutter","dart","python"]

    jobDescription: {
      type: String,
      required: true
    },

    companyName: {
      type: String,
      required: true,
      trim: true
    },

    companyMobile: {
      type: String,
      trim: true
    },

    companyWebsite: {
      type: String,
      trim: true
    },

    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    fullAddress: {
      type: String,
      required: true
    },

    jobStatus: {
      type: String,
      default: "Active", // Active, Disabled
      enum: ["Active", "Disabled"]
    },
    price: {
      type: Number,
      default: 0
    },
    priceType: {
      type: String,
      enum: ["free", "paid"],
      default: "free"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema);
