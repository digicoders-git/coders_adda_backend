import QuizCertificateTemplate from "../models/quizCertificateTemplate.model.js";
import Quiz from "../models/quiz.model.js";
import QuizCertificate from "../models/quizCertificate.model.js";
import { generateQuizCertificate } from "../utils/quizCertificateGenerator.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

/* ================= SAVE/UPDATE QUIZ TEMPLATE ================= */
export const saveQuizCertificateTemplate = async (req, res) => {
  try {
    const {
      quizId,
      certificateName,
      width,
      height,
      studentName,
      quizName,
      quizCode,
      userMobile,
      collegeName,
      totalScore,
      certificateId,
      issueDate,
      sampleTexts
    } = req.body;

    if (!quizId) {
      return res.status(400).json({ message: "Quiz ID is required" });
    }

    let template = await QuizCertificateTemplate.findOne({ quiz: quizId });

    // Handle Image Upload Localy
    let certificateImageUrl = template?.certificateImage;
    if (req.file) {
      certificateImageUrl = `/uploads/quiz-certificates/${req.file.filename}`;
    }

    if (!certificateImageUrl) {
      return res.status(400).json({ message: "Certificate image is required" });
    }

    const parseField = (field) => field ? JSON.parse(field) : undefined;

    const updateData = {
      quiz: quizId,
      certificateName: certificateName || "Quiz Certificate",
      certificateImage: certificateImageUrl,
      width: width || "1200",
      height: height || "800",
      studentName: parseField(studentName),
      quizName: parseField(quizName),
      quizCode: parseField(quizCode),
      userMobile: parseField(userMobile),
      collegeName: parseField(collegeName),
      totalScore: parseField(totalScore),
      certificateId: parseField(certificateId),
      issueDate: parseField(issueDate),
      sampleTexts: sampleTexts ? JSON.parse(sampleTexts) : undefined,
    };

    if (!template) {
      template = new QuizCertificateTemplate(updateData);
    } else {
      template.set(updateData);
    }

    await template.save();

    // Link template to Quiz
    await Quiz.findByIdAndUpdate(quizId, { certificateTemplate: template._id });

    return res.status(200).json({
      success: true,
      message: "Quiz certificate template saved successfully",
      template
    });

  } catch (error) {
    console.error("Save quiz template error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= ISSUE QUIZ CERTIFICATE DYNAMICALLY ================= */
export const issueQuizCertificateManual = async (req, res) => {
  try {
    const userId = req.userId;
    const { quizId, totalScore } = req.body;

    if (!quizId) return res.status(400).json({ success: false, message: "Quiz ID is required" });

    // Find Template
    const template = await QuizCertificateTemplate.findOne({ quiz: quizId });
    if (!template || !template.status) {
      return res.status(404).json({ success: false, message: "Certificate template not found or disabled" });
    }

    // Generate Certificate
    const extraData = { totalScore };
    const certificate = await generateQuizCertificate(userId, quizId, template, extraData);

    if (!certificate) {
      return res.status(500).json({ success: false, message: "Failed to generate certificate" });
    }

    return res.status(201).json({
      success: true,
      message: "Certificate generated and saved successfully",
      certificate
    });

  } catch (error) {
    console.error("Issue Certificate Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ================= GET MY QUIZ CERTIFICATES ================= */
export const getMyQuizCertificates = async (req, res) => {
  try {
    const userId = req.userId;
    const certificates = await QuizCertificate.find({ user: userId })
      .populate('quiz', 'title quizCode')
      .sort({ issuedAt: -1 });

    return res.status(200).json({
      success: true,
      data: certificates
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET TEMPLATE BY QUIZ ================= */
export const getQuizCertificateTemplate = async (req, res) => {
  try {
    const { quizId } = req.params;
    const template = await QuizCertificateTemplate.findOne({ quiz: quizId });

    if (!template) {
      return res.status(404).json({ message: "No template found for this quiz" });
    }

    return res.status(200).json({
      success: true,
      template
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET ALL QUIZ TEMPLATES ================= */
export const getAllQuizCertificateTemplates = async (req, res) => {
  try {
    const templates = await QuizCertificateTemplate.find()
      .populate("quiz", "title quizCode")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= DELETE QUIZ TEMPLATE ================= */
export const deleteQuizCertificateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await QuizCertificateTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Unlink from Quiz
    await Quiz.findOneAndUpdate(
      { certificateTemplate: id },
      { $unset: { certificateTemplate: "" } }
    );

    await QuizCertificateTemplate.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Quiz certificate template removed successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= TOGGLE QUIZ TEMPLATE STATUS ================= */
export const toggleQuizCertificateTemplateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await QuizCertificateTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    template.status = !template.status;
    await template.save();

    return res.status(200).json({
      success: true,
      message: `Quiz Certificate ${template.status ? "Activated" : "Deactivated"} successfully`,
      status: template.status
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
