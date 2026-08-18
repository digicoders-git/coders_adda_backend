import fs from "fs";
import path from "path";
import os from "os";
import { createCanvas, loadImage } from "canvas";
import Certificate from "../models/certificate.model.js";
import User from "../models/user.model.js";
import Course from "../models/course.model.js";

/**
 * Generates a certificate for a user based on stored template configuration using node-canvas.
 */
export const generateCertificate = async (userId, courseId, template) => {
  try {
    let existing = await Certificate.findOne({ user: userId, course: courseId });
    
    // Check if the file actually exists on disk
    if (existing) {
      if (existing.certificateUrl && existing.certificateUrl.includes("res.cloudinary.com")) {
        // Cloudinary URL, assume valid
        return existing;
      }

      const isRender = process.env.RENDER === 'true';
      const rootDir = isRender ? os.tmpdir() : process.cwd();
      const fileName = existing.certificateUrl ? existing.certificateUrl.split('/').pop() : '';
      const filePath = path.join(rootDir, "uploads", "certificates", "issued", fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Certificate file missing for ${existing.certificateId}, re-generating...`);
        await Certificate.findByIdAndDelete(existing._id);
        existing = null;
      } else {
        return existing;
      }
    }

    const user = await User.findById(userId);
    const course = await Course.findById(courseId);
    if (!user || !course) throw new Error("User or Course not found");

    const certId = `CERT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let pendingCert;
    try {
      pendingCert = await Certificate.create({
        user: userId,
        course: courseId,
        certificateUrl: "pending",
        certificateId: certId,
        issuedAt: new Date()
      });
    } catch (err) {
      if (err.code === 11000) {
        console.log(`[CERT] Race condition prevented for ${userId}-${courseId}`);
        return await Certificate.findOne({ user: userId, course: courseId });
      }
      throw err;
    }

    const issueDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    console.log(`🚀 Starting Canvas Certificate Gen for: ${user.name} - ${course.title}`);

    const width = parseInt(template.width) || 1200;
    const height = parseInt(template.height) || 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Load background image
    const image = await loadImage(template.certificateImage);
    ctx.drawImage(image, 0, 0, width, height);

    const getLayer = (l) => template[l] || (template._doc ? template._doc[l] : null);

    const renderText = (layerCfg, text) => {
      if (!layerCfg || !layerCfg.status || !text) return;

      let fontStyle = "";
      if (layerCfg.italic) fontStyle += "italic ";
      if (layerCfg.bold) fontStyle += "bold ";
      
      // Canvas fallback to sans-serif if font not installed
      const fontSize = layerCfg.fontSize || "30px";
      ctx.font = `${fontStyle}${fontSize} sans-serif`;
      ctx.fillStyle = layerCfg.textColor || "#000000";
      ctx.textAlign = layerCfg.textAlign || "center";
      ctx.textBaseline = "middle";

      const x = parseFloat(layerCfg.horizontalPosition) || 0;
      const y = parseFloat(layerCfg.verticalPosition) || 0;

      ctx.fillText(text, x, y);

      // Simple underline approximation if needed
      if (layerCfg.underline) {
        const textWidth = ctx.measureText(text).width;
        ctx.beginPath();
        ctx.moveTo(x - textWidth / 2, y + parseInt(fontSize) / 2 + 2);
        ctx.lineTo(x + textWidth / 2, y + parseInt(fontSize) / 2 + 2);
        ctx.strokeStyle = layerCfg.textColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const studentName = user.name || user.fullName || "Student Name";
    const courseTitle = course.title || "Course Name";
    const collegeName = user.college || "CodersAdda";

    renderText(getLayer("studentName"), studentName);
    renderText(getLayer("courseName"), courseTitle);
    renderText(getLayer("certificateId"), certId);
    renderText(getLayer("collegeName"), collegeName);
    renderText(getLayer("issueDate"), issueDate);

    // Save to file
    const isRender = process.env.RENDER === 'true';
    const rootDir = isRender ? os.tmpdir() : process.cwd();
    const certificatesDir = path.join(rootDir, "uploads", "certificates", "issued");
    
    if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir, { recursive: true });

    const fileName = `${certId}.png`;
    const filePath = path.join(certificatesDir, fileName);

    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    await new Promise((resolve, reject) => {
      out.on("finish", resolve);
      out.on("error", reject);
    });

    console.log(`✅ Certificate File Generated locally at: ${filePath}`);

    // Use local URL directly (served via BASE_URL)
    const certificateUrl = `${process.env.BASE_URL || "http://localhost:3900"}/uploads/certificates/issued/${fileName}`;
    console.log(`✅ Certificate available at: ${certificateUrl}`);

    // Update Database
    pendingCert.certificateUrl = certificateUrl;
    await pendingCert.save();

    return pendingCert;

  } catch (error) {
    console.error("❌ Canvas Certificate Generation Error:", error);
    throw error;
  }
};
