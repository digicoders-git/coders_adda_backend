import Certificate from "../models/certificate.model.js";

/* ================= GET USER CERTIFICATES ================= */
export const getUserCertificates = async (req, res) => {
  try {
    const userId = req.user.id; // From verifyToken middleware
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
