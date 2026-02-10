import express from "express";
import {
  saveCertificateTemplate,
  getCertificateTemplate,
  getAllCertificateTemplates,
  deleteCertificateTemplate,
  toggleCertificateTemplateStatus
} from "../controllers/certificateTemplate.controller.js";
import {
  getUserCertificates,
  verifyCertificate,
  getUserCertificatesByUserId
} from "../controllers/certificate.controller.js";
import userAuth from "../middleware/userAuth.js";
import verifyAdminToken from "../middleware/verifyAdminToken.js";
import upload from "../middleware/multer.js";

const certificateRoute = express.Router();

// Admin Routes
certificateRoute.post("/template/save", verifyAdminToken, upload.single("certificateImage"), saveCertificateTemplate);
certificateRoute.get("/template/all", verifyAdminToken, getAllCertificateTemplates);
certificateRoute.get("/template/:courseId", verifyAdminToken, getCertificateTemplate);
certificateRoute.delete("/template/delete/:id", verifyAdminToken, deleteCertificateTemplate);
certificateRoute.patch("/template/toggle-status/:id", verifyAdminToken, toggleCertificateTemplateStatus);
certificateRoute.get("/admin/user-certificates/:userId", verifyAdminToken, getUserCertificatesByUserId);

// User Routes
certificateRoute.get("/my-certificates", userAuth, getUserCertificates);
certificateRoute.get("/verify/:certificateId", verifyCertificate);

export default certificateRoute;
