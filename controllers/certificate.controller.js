import Certificate from "../models/certificate.model.js";

import fs from "fs";
import path from "path";
import os from "os";

/* ================= GET USER CERTIFICATES ================= */
export const getUserCertificates = async (req, res) => {
  try {
    const userId = req.user.id; // From verifyToken middleware
    const certificates = await Certificate.find({ user: userId })
      .populate("course", "title thumbnail")
      .sort({ issuedAt: -1 });

    // Filter out certificates where the file is missing on disk
    const validCertificates = [];
    const isRender = process.env.RENDER === 'true';
    const rootDir = isRender ? os.tmpdir() : process.cwd();

    for (const cert of certificates) {
      if (!cert.certificateUrl) continue;
      
      // If it's a Cloudinary URL, assume it's valid and don't check local filesystem
      if (cert.certificateUrl.includes("res.cloudinary.com")) {
        validCertificates.push(cert);
        continue;
      }

      const fileName = cert.certificateUrl.split('/').pop();
      const filePath = path.join(rootDir, "uploads", "certificates", "issued", fileName);
      
      if (fs.existsSync(filePath)) {
        validCertificates.push(cert);
      } else {
        // Auto-delete from DB if file is missing (to allow re-generation)
        await Certificate.findByIdAndDelete(cert._id);
      }
    }

    return res.status(200).json({
      success: true,
      certificates: validCertificates
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= VERIFY CERTIFICATE ================= */
export const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const certificate = await Certificate.findOne({ certificateId })
      .populate("user", "fullName email")
      .populate("course", "title instructor");

    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    return res.status(200).json({
      success: true,
      certificate
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET USER CERTIFICATES BY USER ID (ADMIN) ================= */
export const getUserCertificatesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const certificates = await Certificate.find({ user: userId })
      .populate("course", "title thumbnail")
      .sort({ issuedAt: -1 });

    return res.status(200).json({
      success: true,
      certificates
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
