import CertificateTemplate from "../models/certificateTemplate.model.js";
import Course from "../models/course.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import mongoose from "mongoose";

/* ================= SAVE/UPDATE TEMPLATE ================= */
export const saveCertificateTemplate = async (req, res) => {
  try {
    const {
      courseId,
      certificateName,
      width,
      height,
      studentName,
      courseName,
      certificateId,
      collegeName,
      issueDate,
      sampleTexts
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    let template = await CertificateTemplate.findOne({ course: courseId });

    // Handle Image Upload
    let certificateImageUrl = template?.certificateImage;
    if (req.file) {
      /* const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "certificates/templates"
      });
      certificateImageUrl = result.secure_url;
      fs.unlinkSync(req.file.path); */
      certificateImageUrl = `${process.env.BASE_URL}/uploads/certificates/templates/${req.file.filename}`;
    }

    if (!certificateImageUrl) {
      return res.status(400).json({ message: "Certificate image is required" });
    }

    // Strictly construct the object to save
    const updateData = {
      course: courseId,
      certificateName: certificateName || "Certificate",
      certificateImage: certificateImageUrl,
      width: width || "1200",
      height: height || "800",
      studentName: studentName ? JSON.parse(studentName) : undefined,
      courseName: courseName ? JSON.parse(courseName) : undefined,
      certificateId: certificateId ? JSON.parse(certificateId) : undefined,
      collegeName: collegeName ? JSON.parse(collegeName) : undefined,
      issueDate: issueDate ? JSON.parse(issueDate) : undefined,
      sampleTexts: sampleTexts ? JSON.parse(sampleTexts) : undefined,
    };

    if (!template) {
      template = new CertificateTemplate(updateData);
    } else {
      // Use Mongoose .set() to ensure only schema fields are updated
      template.set(updateData);
    }

    await template.save();

    // Link template to course
    await Course.findByIdAndUpdate(courseId, { certificateTemplate: template._id });

    return res.status(200).json({
      success: true,
      message: "Certificate template saved successfully",
      template
    });

  } catch (error) {
    console.error("Save template error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET TEMPLATE BY COURSE ================= */
export const getCertificateTemplate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const template = await CertificateTemplate.findOne({ course: courseId });

    if (!template) {
      return res.status(404).json({ message: "No template found for this course" });
    }

    return res.status(200).json({
      success: true,
      template
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET ALL TEMPLATES ================= */
export const getAllCertificateTemplates = async (req, res) => {
  try {
    const templates = await CertificateTemplate.find()
      .populate("course", "title thumbnail")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= DELETE TEMPLATE ================= */
export const deleteCertificateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await CertificateTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Unlink from Course
    await Course.findOneAndUpdate(
      { certificateTemplate: id },
      { $unset: { certificateTemplate: "" } }
    );

    await CertificateTemplate.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Certificate template removed successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= TOGGLE TEMPLATE STATUS ================= */
export const toggleCertificateTemplateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await CertificateTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    template.status = !template.status;
    await template.save();

    return res.status(200).json({
      success: true,
      message: `Certificate ${template.status ? "Activated" : "Deactivated"} successfully`,
      status: template.status
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
