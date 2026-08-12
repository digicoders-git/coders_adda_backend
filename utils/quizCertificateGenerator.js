import { createCanvas, loadImage, registerFont } from "canvas";
import QuizCertificate from "../models/quizCertificate.model.js";
import User from "../models/user.model.js";
import Quiz from "../models/quiz.model.js";
import fs from "fs";
import path from "path";

const fontDir = path.join(process.cwd(), "assets", "fonts");
if (fs.existsSync(fontDir)) {
  // Roboto
  if (fs.existsSync(path.join(fontDir, "Roboto", "Roboto-Regular.ttf"))) {
    registerFont(path.join(fontDir, "Roboto", "Roboto-Regular.ttf"), { family: "roboto" });
  }
  if (fs.existsSync(path.join(fontDir, "Roboto", "Roboto-Bold.ttf"))) {
    registerFont(path.join(fontDir, "Roboto", "Roboto-Bold.ttf"), { family: "roboto", weight: "bold" });
  }
  if (fs.existsSync(path.join(fontDir, "Roboto", "Roboto-Italic.ttf"))) {
    registerFont(path.join(fontDir, "Roboto", "Roboto-Italic.ttf"), { family: "roboto", style: "italic" });
  }
  
  // Inter
  if (fs.existsSync(path.join(fontDir, "Inter", "Inter_24pt-Regular.ttf"))) {
    registerFont(path.join(fontDir, "Inter", "Inter_24pt-Regular.ttf"), { family: "inter" });
  }
  if (fs.existsSync(path.join(fontDir, "Inter", "Inter_24pt-Bold.ttf"))) {
    registerFont(path.join(fontDir, "Inter", "Inter_24pt-Bold.ttf"), { family: "inter", weight: "bold" });
  }
  
  // Montserrat
  if (fs.existsSync(path.join(fontDir, "Montserrat", "Montserrat-Regular.ttf"))) {
    registerFont(path.join(fontDir, "Montserrat", "Montserrat-Regular.ttf"), { family: "montserrat" });
  }
  if (fs.existsSync(path.join(fontDir, "Montserrat", "Montserrat-Bold.ttf"))) {
    registerFont(path.join(fontDir, "Montserrat", "Montserrat-Bold.ttf"), { family: "montserrat", weight: "bold" });
  }
}

/**
 * Generates a quiz certificate for a user.
 * - Draws on canvas using template config
 * - Uploads to Cloudinary (accessible on app/web)
 * - Falls back to local URL only if Cloudinary fails
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
    const width  = parseInt(template.width)  || 1200;
    const height = parseInt(template.height) || 800;
    const canvas = createCanvas(width, height);
    const ctx    = canvas.getContext("2d");

    // Load Background Template Image
    let bkgPath = template.certificateImage;
    if (bkgPath && bkgPath.startsWith("/uploads")) {
      bkgPath = path.join(process.cwd(), bkgPath);
    }
    const image = await loadImage(bkgPath);
    ctx.drawImage(image, 0, 0, width, height);

    // Draw text based on template config
    const drawTemplateText = (config, text) => {
      if (!config || !config.status || !text) return;

      const fontStyle  = config.italic ? "italic "  : "";
      const fontWeight = config.bold   ? "bold "    : "";
      ctx.font         = `${fontStyle}${fontWeight}${config.fontSize || "30px"} ${config.fontFamily || "Arial"}`;
      ctx.fillStyle    = config.textColor || "#000000";
      ctx.textAlign    = config.textAlign || "center";
      ctx.textBaseline = "middle";

      const x = parseFloat(config.horizontalPosition);
      const y = parseFloat(config.verticalPosition);
      ctx.fillText(text, x, y);

      if (config.underline) {
        const metrics   = ctx.measureText(text);
        const textWidth = metrics.width;
        ctx.beginPath();
        ctx.strokeStyle = config.textColor || "#000000";
        ctx.lineWidth   = 2;
        ctx.moveTo(x - textWidth / 2, y + parseInt(config.fontSize) / 2);
        ctx.lineTo(x + textWidth / 2, y + parseInt(config.fontSize) / 2);
        ctx.stroke();
      }
    };

    const certId    = `QC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const issueDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });

    // Draw all dynamic fields
    drawTemplateText(template.studentName,  user.fullName || user.name);
    drawTemplateText(template.quizName,     quiz.title);
    drawTemplateText(template.quizCode,     quiz.quizCode);
    drawTemplateText(template.userMobile,   user.mobile || "N/A");
    drawTemplateText(template.collegeName,  user.college || "CodersAdda");
    drawTemplateText(template.totalScore,   extraData.totalScore || "N/A");
    drawTemplateText(template.certificateId, certId);
    drawTemplateText(template.issueDate,    issueDate);

    // Save locally first (needed for Cloudinary upload)
    const issuedDir = path.join(process.cwd(), "uploads", "issued-quiz-certificates");
    if (!fs.existsSync(issuedDir)) {
      fs.mkdirSync(issuedDir, { recursive: true });
    }
    const fileName = `${certId}.png`;
    const filePath = path.join(issuedDir, fileName);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

    console.log(`✅ Quiz Certificate generated locally: ${filePath}`);

    // ── Upload to Cloudinary (so app can access it) ──
    let certificateUrl;
    try {
      const cloudinary = (await import("../config/cloudinary.js")).default;
      const cloudResult = await cloudinary.uploader.upload(filePath, {
        folder:        "quiz-certificates/issued",
        resource_type: "image",
        public_id:     certId,
      });
      certificateUrl = cloudResult.secure_url;
      console.log(`☁️  Quiz Certificate uploaded to Cloudinary: ${certificateUrl}`);

      // Remove local file after successful Cloudinary upload
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    } catch (cloudinaryErr) {
      // Fallback: use local URL (works only on same network / localhost)
      console.error("⚠️  Cloudinary upload failed, using local URL:", cloudinaryErr.message);
      certificateUrl = `${process.env.BASE_URL || "http://localhost:3900"}/uploads/issued-quiz-certificates/${fileName}`;
    }

    // Save to Database
    const certificate = await QuizCertificate.create({
      user:           userId,
      quiz:           quizId,
      certificateUrl: certificateUrl,
      certificateId:  certId,
      issuedAt:       new Date()
    });

    return certificate;

  } catch (error) {
    console.error("❌ Quiz Certificate Generation Error:", error);
    return null;
  }
};
