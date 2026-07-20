import { createCanvas, loadImage } from "canvas";
import QuizCertificate from "../models/quizCertificate.model.js";
import User from "../models/user.model.js";
import Quiz from "../models/quiz.model.js";
import fs from "fs";
import path from "path";

/**
 * Generates a quiz certificate for a user and saves it locally.
 */
export const generateQuizCertificate = async (userId, quizId, template, extraData = {}) => {
  try {
    // Check if already issued
    const existing = await QuizCertificate.findOne({ user: userId, quiz: quizId });
    if (existing) return existing;

    const user = await User.findById(userId);
    const quiz = await Quiz.findById(quizId);

    if (!user || !quiz) throw new Error("User or Quiz not found");

    // Dimensions from template
    const width = parseInt(template.width) || 1200;
    const height = parseInt(template.height) || 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Load Background Template Image
    let bkgPath = template.certificateImage;
    if (bkgPath.startsWith("/uploads")) {
      bkgPath = path.join(process.cwd(), bkgPath);
    }
    const image = await loadImage(bkgPath);
    ctx.drawImage(image, 0, 0, width, height);

    // Function to draw text based on template config
    const drawTemplateText = (config, text) => {
      if (!config || !config.status || !text) return;

      const fontStyle = config.italic ? "italic " : "";
      const fontWeight = config.bold ? "bold " : "";
      ctx.font = `${fontStyle}${fontWeight}${config.fontSize} ${config.fontFamily || "Arial"}`;

      ctx.fillStyle = config.textColor || "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const x = parseFloat(config.horizontalPosition);
      const y = parseFloat(config.verticalPosition);

      ctx.fillText(text, x, y);

      if (config.underline) {
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        ctx.beginPath();
        ctx.strokeStyle = config.textColor || "#000000";
        ctx.lineWidth = 2;
        ctx.moveTo(x - textWidth / 2, y + parseInt(config.fontSize) / 2);
        ctx.lineTo(x + textWidth / 2, y + parseInt(config.fontSize) / 2);
        ctx.stroke();
      }
    };

    const certId = `QC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const issueDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    // Draw Dynamic Fields
    drawTemplateText(template.studentName, user.fullName || user.name);
    drawTemplateText(template.quizName, quiz.title);
    drawTemplateText(template.quizCode, quiz.quizCode);
    drawTemplateText(template.userMobile, user.mobile || "N/A");
    drawTemplateText(template.collegeName, user.college || "CodersAdda");
    drawTemplateText(template.totalScore, extraData.totalScore || "N/A");
    drawTemplateText(template.certificateId, certId);
    drawTemplateText(template.issueDate, issueDate);

    const buffer = canvas.toBuffer("image/png");

    // Save Locally
    const issuedDir = "uploads/issued-quiz-certificates";
    if (!fs.existsSync(issuedDir)) {
      fs.mkdirSync(issuedDir, { recursive: true });
    }
    const fileName = `${certId}.png`;
    const filePath = path.join(issuedDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3500}`;
    const certificateUrl = `${baseUrl}/uploads/issued-quiz-certificates/${fileName}`;

    // Save to Database
    const certificate = await QuizCertificate.create({
      user: userId,
      quiz: quizId,
      certificateUrl: certificateUrl,
      certificateId: certId,
      issuedAt: new Date()
    });

    return certificate;

  } catch (error) {
    console.error("Quiz Certificate Generation Error:", error);
    return null;
  }
};
