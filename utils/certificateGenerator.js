import { createCanvas, loadImage, registerFont } from "canvas";
import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary.js";
import Certificate from "../models/certificate.model.js";
import User from "../models/user.model.js";
import Course from "../models/course.model.js";

/**
 * Generates a certificate for a user and uploads it to Cloudinary.
 */
export const generateCertificate = async (userId, courseId, template) => {
  try {
    // Check if already issued
    const existing = await Certificate.findOne({ user: userId, course: courseId });
    if (existing) return existing;

    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) throw new Error("User or Course not found");

    // Dimensions from template
    const width = parseInt(template.width) || 1200;
    const height = parseInt(template.height) || 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Load Background Template Image
    const image = await loadImage(template.certificateImage);
    ctx.drawImage(image, 0, 0, width, height);

    // Function to draw text based on template config
    const drawTemplateText = (config, text) => {
      if (!config || !config.status || !text) return;

      // Construct font string: "italic bold 40px Arial"
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

    const certId = `CERT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const issueDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    // Draw Dynamic Fields based on template configuration
    drawTemplateText(template.studentName, user.name || user.fullName);
    drawTemplateText(template.courseName, course.title);
    drawTemplateText(template.certificateId, certId);
    drawTemplateText(template.collegeName, user.college || "CodersAdda");
    drawTemplateText(template.issueDate, issueDate);

    const buffer = canvas.toBuffer("image/png");

    // Save Locally
    const certificatesDir = "uploads/certificates/issued";
    if (!fs.existsSync(certificatesDir)) {
      fs.mkdirSync(certificatesDir, { recursive: true });
    }

    const fileName = `${certId}.png`;
    const filePath = path.join(certificatesDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const certificateUrl = `${process.env.BASE_URL}/${certificatesDir}/${fileName}`;

    /* // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "issued_certificates",
          public_id: certId,
          resource_type: "image"
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    }); */

    // Save to Database
    const certificate = await Certificate.create({
      user: userId,
      course: courseId,
      certificateUrl: certificateUrl,
      certificateId: certId,
      issuedAt: new Date()
    });

    return certificate;

  } catch (error) {
    console.error("Certificate Generation Error:", error);
    return null;
  }
};
