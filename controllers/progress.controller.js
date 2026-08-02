import UserProgress from "../models/UserProgress.js";
import Lecture from "../models/lecture.model.js";
import Course from "../models/course.model.js";
import CertificateTemplate from "../models/certificateTemplate.model.js";
import { generateCertificate } from "../utils/certificateGenerator.js";

// Helper: Parse duration string ("10 min", "1:20:30", "05:20") into seconds
const parseDuration = (hms) => {
  if (!hms) return 0;
  if (typeof hms !== "string") return 0;
  const time = hms.toLowerCase();
  if (time.includes("min")) return (parseInt(time) || 0) * 60;
  const a = time.split(':');
  let seconds = 0;
  if (a.length === 3) seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
  else if (a.length === 2) seconds = (+a[0]) * 60 + (+a[1]);
  else seconds = parseInt(time) || 0;
  return seconds;
};

export const updateProgressREST = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      courseId,
      topicId,
      lectureId,
      watchedSeconds,
      durationSeconds
    } = req.body;

    // Basic validation
    if (!courseId || !topicId || !lectureId || !durationSeconds) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // (A) Limit watchedSeconds so it doesn't exceed duration
    const safeWatchedSeconds = Math.min(watchedSeconds, durationSeconds);

    // (B) Calculate completion on server (90% rule)
    const progressPercent = (safeWatchedSeconds / durationSeconds) * 100;
    const completed = progressPercent >= 90;

    // Upsert = insert or update
    await UserProgress.findOneAndUpdate(
      {
        user: userId,
        lecture: lectureId
      },
      {
        user: userId,
        course: courseId,
        topic: topicId,
        lecture: lectureId,
        watchedSeconds: safeWatchedSeconds,
        durationSeconds,
        isCompleted: completed
      },
      {
        upsert: true,
        new: true
      }
    );

    // 📜 CERTIFICATE LOGIC: Check course completion (ALL LECTURES COMPLETED)
    const activeLecturesCount = await Lecture.countDocuments({ course: courseId, isActive: true });
    const completedLecturesCount = await UserProgress.countDocuments({
      user: userId,
      course: courseId,
      isCompleted: true
    });

    console.log(`[REST] Progress: User ${userId} completed ${completedLecturesCount}/${activeLecturesCount} lectures`);

    let certificateIssued = false;
    let certificateUrl = null;
    let debugReason = "";

    if (activeLecturesCount > 0 && completedLecturesCount >= activeLecturesCount) {
      console.log(`[REST] All lectures completed. Checking certificate template...`);
      // Check if course has a template
      const courseData = await Course.findById(courseId).select("certificateTemplate");
      if (courseData?.certificateTemplate) {
        const template = await CertificateTemplate.findById(courseData.certificateTemplate);
        if (template) {
          console.log(`[REST] Generating certificate...`);
          try {
            const certificate = await generateCertificate(userId, courseId, template);
            if (certificate) {
              certificateIssued = true;
              certificateUrl = certificate.certificateUrl;
              debugReason = "Success";
              console.log(`[REST] Certificate generated successfully!`);
            } else {
              debugReason = "generateCertificate returned null";
            }
          } catch(certError) {
             debugReason = "Puppeteer Error: " + certError.message;
             console.error(`[REST] Certificate Generation Failed:`, certError);
          }
        } else {
          debugReason = "Template ID not found in DB";
          console.log(`[REST] Template not found in DB`);
        }
      } else {
        debugReason = "Course has no certificateTemplate attached";
        console.log(`[REST] Course has no template attached`);
      }
    } else {
      debugReason = `Completed ${completedLecturesCount} of ${activeLecturesCount} lectures`;
    }

    return res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      certificateIssued,
      certificateUrl,
      debugReason
    });

  } catch (error) {
    console.error("❌ REST Progress update error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
