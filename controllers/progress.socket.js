import jwt from "jsonwebtoken";
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

const registerProgressSocket = (socket, io) => {
  let userId = null;

  // 1️⃣ App will authenticate socket using JWT
  // socket.on("auth", (token) => {
  //   try {
  //     const decoded = jwt.verify(token, process.env.JWT_SECRET);

  //     // Tumhare token me: decoded.userId hota hai
  //     userId = decoded.userId;

  //     socket.join(`user:${userId}`);
  //     console.log("✅ Socket authenticated for user:", userId);
  //   } catch (err) {
  //     console.log("❌ Invalid socket token");
  //     socket.disconnect();
  //   }
  // });
  socket.on("auth", (token) => {
    try {
      console.log("🔑 Token received:", token.slice(0, 30));
      console.log("🧪 JWT_SECRET from env:", process.env.JWT_SECRET);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      console.log("🧾 Decoded token:", decoded);

      userId = decoded.userId;

      socket.join(`user:${userId}`);
      console.log("✅ Socket authenticated for user:", userId);

    } catch (err) {
      console.log("❌ Socket auth error:", err.message);
      socket.disconnect();
    }
  });


  // 2️⃣ App will send progress updates
  socket.on("progress:update", async (data) => {
    try {
      if (!userId) {
        return socket.emit("progress:error", { message: "Not authenticated" });
      }

      const {
        courseId,
        topicId,
        lectureId,
        watchedSeconds,
        durationSeconds
      } = data;

      // Basic validation
      if (!courseId || !topicId || !lectureId || !durationSeconds) {
        return socket.emit("progress:error", { message: "Missing fields" });
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

      // 📜 CERTIFICATE LOGIC: Check course completion (TIME BASED - Matches Dashboard)
      const lectures = await Lecture.find({ course: courseId, isActive: true }).select("duration");
      const totalDuration = lectures.reduce((acc, l) => acc + parseDuration(l.duration), 0);

      const userProgressDocs = await UserProgress.find({
        user: userId,
        course: courseId
      }).select("watchedSeconds");

      const watched = userProgressDocs.reduce((acc, doc) => acc + (doc.watchedSeconds || 0), 0);
      const coursePercent = totalDuration > 0 ? (watched / totalDuration) * 100 : 0;

      if (coursePercent >= 90) {
        // Check if course has a template
        const courseData = await Course.findById(courseId).select("certificateTemplate");
        if (courseData?.certificateTemplate) {
          const template = await CertificateTemplate.findById(courseData.certificateTemplate);
          if (template) {
            const certificate = await generateCertificate(userId, courseId, template);
            if (certificate) {
              socket.emit("certificate:issued", {
                success: true,
                certificateUrl: certificate.certificateUrl,
                message: "Congratulations! You've earned a certificate."
              });
            }
          }
        }
      }

      // Acknowledge to app
      socket.emit("progress:saved", {
        lectureId,
        success: true,
        isCompleted: completed
      });
    } catch (err) {
      console.error("❌ Socket progress error:", err);
      socket.emit("progress:error", { message: "Server error" });
    }
  });
};

export default registerProgressSocket;
