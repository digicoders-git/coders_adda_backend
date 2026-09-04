// canvas is loaded lazily to avoid startup crash when native binary is missing (e.g. Windows without GTK)
import QuizCertificate from "../models/quizCertificate.model.js";
import User from "../models/user.model.js";
import Quiz from "../models/quiz.model.js";
import fs from "fs";
import path from "path";
import { sendEmail } from "./sendEmail.js";

// Lazy canvas loader — registers fonts once on first successful load
let _canvasLoaded = false;
let createCanvas, loadImage, registerFont;
async function loadCanvas() {
  if (_canvasLoaded) return true;
  try {
    ({ createCanvas, loadImage, registerFont } = await import("canvas"));
    // Register fonts after canvas is loaded
    const fontDir = path.join(process.cwd(), "assets", "fonts");
    if (fs.existsSync(fontDir) && registerFont) {
      const tryFont = (file, opts) => {
        const p = path.join(fontDir, file);
        if (fs.existsSync(p)) registerFont(p, opts);
      };
      tryFont("Roboto/Roboto-Regular.ttf",     { family: "roboto" });
      tryFont("Roboto/Roboto-Bold.ttf",         { family: "roboto", weight: "bold" });
      tryFont("Roboto/Roboto-Italic.ttf",       { family: "roboto", style: "italic" });
      tryFont("Inter/Inter_24pt-Regular.ttf",   { family: "inter" });
      tryFont("Inter/Inter_24pt-Bold.ttf",      { family: "inter", weight: "bold" });
      tryFont("Montserrat/Montserrat-Regular.ttf", { family: "montserrat" });
      tryFont("Montserrat/Montserrat-Bold.ttf",    { family: "montserrat", weight: "bold" });
    }
    _canvasLoaded = true;
    return true;
  } catch (e) {
    console.warn("⚠️  canvas module not available (missing GTK/Cairo on Windows). Certificate generation skipped.");
    return false;
  }
}

/**
 * Generates a quiz certificate for a user.
 * - Draws on canvas using template config
 * - Uploads to Cloudinary (accessible on app/web)
 * - Falls back to local URL only if Cloudinary fails
 */
export const generateQuizCertificate = async (userId, quizId, template, extraData = {}) => {
  // Load canvas lazily — returns null if not available on this machine
  const canvasAvailable = await loadCanvas();
  if (!canvasAvailable) {
    console.warn("⚠️  Skipping quiz certificate generation: canvas not available.");
    return null;
  }

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
    if (!bkgPath) throw new Error("Certificate template has no background image.");

    // If it's a local path (old template), convert to absolute and check existence
    if (bkgPath.startsWith("/uploads")) {
      const localPath = path.join(process.cwd(), bkgPath);
      if (!fs.existsSync(localPath)) {
        console.error(`⚠️  Certificate background image not found on disk: ${localPath}`);
        console.error(`   Please re-upload the certificate template for quiz: ${quizId}`);
        return null; // Gracefully skip instead of crashing
      }
      bkgPath = localPath;
    }
    // Cloudinary / http URLs are loaded directly by canvas — no change needed

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

    // Use local URL directly (served via BASE_URL)
    let certificateUrl = `${process.env.BASE_URL || "http://localhost:3900"}/uploads/issued-quiz-certificates/${fileName}`;
    console.log(`✅ Quiz Certificate available at: ${certificateUrl}`);

    // Save to Database
    const certificate = await QuizCertificate.create({
      user:           userId,
      quiz:           quizId,
      certificateUrl: certificateUrl,
      certificateId:  certId,
      issuedAt:       new Date()
    });

    if (user && user.email) {
      const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4CAF50; text-align: center;">Congratulations ${user.name}!</h2>
        <p style="font-size: 16px; color: #333;">You have successfully completed the quiz <strong>${quiz ? quiz.title : ''}</strong>.</p>
        <p style="font-size: 16px; color: #333;">Your certificate has been generated.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${certificateUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Download Certificate</a>
        </div>
        <p style="font-size: 14px; color: #666; text-align: center;">Keep learning and growing with CodersAdda!</p>
      </div>`;
      
      await sendEmail(
        user.email,
        "Your Quiz Certificate - CodersAdda",
        "Your quiz certificate has been generated successfully.",
        emailHtml,
        []
      ).catch(err => {
        console.error("Failed to send certificate email:", err.message);
      });
    }

    return certificate;

  } catch (error) {
    console.error("❌ Quiz Certificate Generation Error:", error);
    return null;
  }
};
