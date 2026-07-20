import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import Certificate from "../models/certificate.model.js";
import User from "../models/user.model.js";
import Course from "../models/course.model.js";
import { generateFontCSS } from "./fontCssGenerator.js";
import { generateCertificateHTML } from "./certificateHtml.js";

/**
 * Generates a certificate for a user based on stored template configuration using Puppeteer.
 */
export const generateCertificate = async (userId, courseId, template) => {
  let browser = null;
  try {
    const existing = await Certificate.findOne({ user: userId, course: courseId });
    if (existing) return existing;

    const user = await User.findById(userId);
    const course = await Course.findById(courseId);
    if (!user || !course) throw new Error("User or Course not found");

    const certId = `CERT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const issueDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    console.log(`🚀 Starting Puppeteer for: ${user.name} - ${course.title}`);

    // 1. Launch Browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage();

    // 🚩 Debugging: Catch page errors
    page.on("console", (msg) => console.log("📄 Puppeteer Log:", msg.text()));
    page.on("pageerror", (err) => console.error("❌ Puppeteer Page Error:", err.message));

    // 2. Prepare HTML & CSS
    // Extract required font families to keep HTML size small
    const getLayer = (l) => template[l] || (template._doc ? template._doc[l] : null);
    const layers = ["studentName", "courseName", "certificateId", "collegeName", "issueDate"];
    const requiredFamilies = layers
      .map(l => {
        const layer = getLayer(l);
        return layer?.fontFamily?.split(',')[0].trim().replace(/['"]/g, "");
      })
      .filter(f => f);

    const uniqueFamilies = [...new Set(requiredFamilies)];
    console.log(`🔡 Fonts requested: ${uniqueFamilies.join(', ')}`);
    console.log(`🖼️ Background Image URL: ${template.certificateImage}`);

    const fontCSS = generateFontCSS(uniqueFamilies);
    const html = generateCertificateHTML(template, user, course, fontCSS, certId, issueDate);
    console.log(`📄 Generated HTML Size: ${(html.length / 1024 / 1024).toFixed(2)} MB`);

    // 3. Set Content
    await page.setViewport({
      width: parseInt(template.width) || 1200,
      height: parseInt(template.height) || 800,
      deviceScaleFactor: 2
    });

    // Use only 'load' to avoid waiting for every single background request for 60s
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 60000
    });

    // 4. Generate Screenshot
    const certificatesDir = "uploads/certificates/issued";
    if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir, { recursive: true });

    const fileName = `${certId}.png`;
    const filePath = path.join(certificatesDir, fileName);

    // Give it a larger buffer for fonts to settle (3 seconds)
    await new Promise(r => setTimeout(r, 3000));

    await page.screenshot({
      path: filePath,
      type: "png",
      fullPage: true,
      omitBackground: true
    });

    console.log(`✅ Certificate File Generated at: ${filePath}`);

    const certificateUrl = `${process.env.BASE_URL}/${certificatesDir}/${fileName}`;

    // 5. Save to Database
    const certificate = await Certificate.create({
      user: userId,
      course: courseId,
      certificateUrl: certificateUrl,
      certificateId: certId,
      issuedAt: new Date()
    });

    await browser.close();
    return certificate;

  } catch (error) {
    console.error("❌ Puppeteer Certificate Generation Error:", error);
    if (browser) await browser.close();
    return null;
  }
};
