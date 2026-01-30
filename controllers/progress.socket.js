import jwt from "jsonwebtoken";
import UserProgress from "../models/UserProgress.js";

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
