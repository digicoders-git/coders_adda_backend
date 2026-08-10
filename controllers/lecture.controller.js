import Lecture from "../models/lecture.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import UserProgress from "../models/UserProgress.js";
import { sendCourseUpdateNotification } from "./notification.controller.js";

const uploadToCloudinary = (filePath, options) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(filePath, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

/* ================= CREATE LECTURE ================= */
export const createLecture = async (req, res) => {
  try {
    const {
      course,
      topic,
      srNo,
      title,
      duration,
      description,
      privacy,
      isActive,
      contentType,
      liveUrl,
      liveStatus,
      scheduledAt,
      quizId
    } = req.body;

    if (!course || !topic || !srNo || !title) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload Video
    let videoData = { url: "", public_id: "" };
    let thumbData = { url: "", public_id: "" };
    let resourceData = { url: "", public_id: "" };

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    if (req.files?.video?.[0]) {
      const v = await uploadToCloudinary(req.files.video[0].path, {
        folder: "lectures/videos",
        resource_type: "video",
        chunk_size: 6000000
      });
      videoData = {
        url: v.secure_url,
        localUrl: v.secure_url,
        public_id: v.public_id
      };
    }

    if (req.files?.thumbnail?.[0]) {
      const t = await uploadToCloudinary(req.files.thumbnail[0].path, {
        folder: "lectures/thumbnails",
        resource_type: "image",
        chunk_size: 6000000
      });
      thumbData = {
        url: t.secure_url,
        localUrl: t.secure_url,
        public_id: t.public_id
      };
    }

    if (req.files?.resource?.[0]) {
      const r = await uploadToCloudinary(req.files.resource[0].path, {
        folder: "lectures/resources",
        resource_type: "raw",
        chunk_size: 6000000
      });
      resourceData = {
        url: r.secure_url,
        localUrl: r.secure_url,
        public_id: r.public_id
      };
    }

    const lecture = await Lecture.create({
      course,
      topic,
      srNo,
      title,
      duration: duration || "",
      description,
      privacy,
      isActive,
      contentType: contentType || "video",
      liveUrl,
      liveStatus,
      scheduledAt,
      quizId: quizId || null,
      video: videoData,
      thumbnail: thumbData,
      resource: resourceData
    });
    console.log("LECTURE SAVED:", lecture.video, lecture.thumbnail);

    // 🔔 Auto-notify enrolled students about new content
    let notificationType = 'NewLecture';
    if (contentType === 'live') {
      notificationType = 'NewLive';
    } else if (contentType === 'pdf') {
      notificationType = 'NewNotes';
    } else if (contentType === 'test' || contentType === 'subjective_test') {
      notificationType = 'NewTest';
    }

    sendCourseUpdateNotification(course, notificationType, title, thumbData.url || '').catch(e => console.error('Notification error:', e));

    return res.status(201).json({
      success: true,
      message: "Lecture created successfully",
      lecture
    });

  } catch (error) {
    console.error("CREATE LECTURE ERROR:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET ALL LECTURES (WITH FILTER & PAGINATION) ================= */
export const getAllLectures = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, courseId = "" } = req.query;

    const query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (courseId) {
      query.course = courseId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const data = await Lecture.find(query)
      .populate("course", "title")
      .populate("topic", "topic")
      .sort({ srNo: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Lecture.countDocuments(query);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET LECTURES BY COURSE ================= */
export const getLecturesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const data = await Lecture.find({ course: courseId })
      .populate("topic", "topic")
      .sort({ srNo: 1 });

    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET LECTURES BY TOPIC ================= */
export const getLecturesByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const lectures = await Lecture.find({ topic: topicId }).sort({ srNo: 1 }).lean();

    const courseId = lectures.length > 0 ? lectures[0].course : null;

    // Check if user is enrolled in this course
    let isEnrolled = false;
    if (req.user && req.user._id && courseId) {
      const user = await import("../models/user.model.js").then(m => m.default);
      const dbUser = await user.findById(req.user._id).select("purchaseCourses").lean();
      isEnrolled = dbUser?.purchaseCourses?.some(
        id => id.toString() === courseId.toString()
      ) ?? false;
    }

    // Check progress for enrolled users
    if (isEnrolled && req.user && req.user._id && courseId) {
      const userProgresses = await UserProgress.find({
        user: req.user._id,
        course: courseId
      });
      if (userProgresses && userProgresses.length > 0) {
        lectures.forEach(lecture => {
          const lectureProgress = userProgresses.find(
            p => p.lecture.toString() === lecture._id.toString()
          );
          lecture.isCompleted = lectureProgress ? lectureProgress.isCompleted : false;
        });
      }
    }

    // Hide video/resource URLs for locked lectures if user is NOT enrolled
    const sanitizedLectures = lectures.map(lecture => {
      const isLocked = lecture.privacy === "locked";
      if (isLocked && !isEnrolled) {
        return {
          ...lecture,
          video: { url: "", public_id: "" },
          resource: { url: "", public_id: "" },
          liveUrl: "",
        };
      }
      return lecture;
    });

    return res.status(200).json({ success: true, lectures: sanitizedLectures, data: sanitizedLectures, total: sanitizedLectures.length });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET SINGLE LECTURE ================= */
export const getSingleLecture = async (req, res) => {
  try {
    const { id } = req.params;

    const lecture = await Lecture.findById(id)
      .populate("course", "title")
      .populate("topic", "topic");

    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    return res.status(200).json({ success: true, data: lecture });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= UPDATE LECTURE ================= */
export const updateLecture = async (req, res) => {
  try {
    const { id } = req.params;

    const lecture = await Lecture.findById(id);
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    const {
      course,
      topic,
      srNo,
      title,
      duration,
      description,
      privacy,
      isActive,
      removeVideo,
      removeThumbnail,
      removeResource,
      contentType,
      liveUrl,
      liveStatus,
      scheduledAt,
      quizId
    } = req.body;

    const oldLiveStatus = lecture.liveStatus;

    if (course !== undefined) lecture.course = course;
    if (topic !== undefined) lecture.topic = topic;
    if (srNo !== undefined) lecture.srNo = srNo;
    if (title !== undefined) lecture.title = title;
    if (duration !== undefined) lecture.duration = duration;
    if (description !== undefined) lecture.description = description;
    if (privacy !== undefined) lecture.privacy = privacy;
    if (isActive !== undefined) lecture.isActive = isActive;
    if (contentType !== undefined) lecture.contentType = contentType;
    if (liveUrl !== undefined) lecture.liveUrl = liveUrl;
    if (liveStatus !== undefined) lecture.liveStatus = liveStatus;
    if (scheduledAt !== undefined) lecture.scheduledAt = scheduledAt;
    if (quizId !== undefined) lecture.quizId = quizId;

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Update video
    if (req.files?.video?.[0]) {
      if (lecture.video?.public_id) {
        await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: "video" }).catch(e => console.error(e));
      }
      const v = await uploadToCloudinary(req.files.video[0].path, {
        folder: "lectures/videos",
        resource_type: "video",
        chunk_size: 6000000
      });
      lecture.video = {
        url: v.secure_url,
        localUrl: v.secure_url,
        public_id: v.public_id
      };
      lecture.markModified('video');
    } else if (removeVideo === "true") {
      if (lecture.video?.public_id) {
        await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: "video" }).catch(e => console.error(e));
      }
      lecture.video = null;
      lecture.markModified('video');
    }

    // Update thumbnail
    if (req.files?.thumbnail?.[0]) {
      if (lecture.thumbnail?.public_id) {
        await cloudinary.uploader.destroy(lecture.thumbnail.public_id).catch(e => console.error(e));
      }
      const t = await uploadToCloudinary(req.files.thumbnail[0].path, {
        folder: "lectures/thumbnails",
        resource_type: "image",
        chunk_size: 6000000
      });
      lecture.thumbnail = {
        url: t.secure_url,
        localUrl: t.secure_url,
        public_id: t.public_id
      };
      lecture.markModified('thumbnail');
    } else if (removeThumbnail === "true") {
      if (lecture.thumbnail?.public_id) {
        await cloudinary.uploader.destroy(lecture.thumbnail.public_id).catch(e => console.error(e));
      }
      lecture.thumbnail = null;
      lecture.markModified('thumbnail');
    }

    // Update resource
    if (req.files?.resource?.[0]) {
      if (lecture.resource?.public_id) {
        await cloudinary.uploader.destroy(lecture.resource.public_id, { resource_type: "raw" }).catch(e => console.error(e));
      }
      const r = await uploadToCloudinary(req.files.resource[0].path, {
        folder: "lectures/resources",
        resource_type: "raw",
        chunk_size: 6000000
      });
      lecture.resource = {
        url: r.secure_url,
        localUrl: r.secure_url,
        public_id: r.public_id
      };
      lecture.markModified('resource');
    } else if (removeResource === "true") {
      if (lecture.resource?.public_id) {
        await cloudinary.uploader.destroy(lecture.resource.public_id, { resource_type: "raw" }).catch(e => console.error(e));
      }
      lecture.resource = null;
      lecture.markModified('resource');
    }


    await lecture.save();

    if (lecture.contentType === 'live' && lecture.liveStatus === 'live' && oldLiveStatus !== 'live') {
      sendCourseUpdateNotification(
        lecture.course,
        'NewLive',
        `Live Now: ${lecture.title}`,
        lecture.thumbnail?.url || ''
      ).catch(e => console.error('Notification error:', e));
    }

    return res.status(200).json({
      success: true,
      message: "Lecture updated successfully",
      lecture
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= DELETE ================= */
export const deleteLecture = async (req, res) => {
  try {
    const { id } = req.params;

    const lecture = await Lecture.findById(id);
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    /* if (lecture.video?.public_id) {
      await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: "video" });
    }
    if (lecture.thumbnail?.public_id) {
      await cloudinary.uploader.destroy(lecture.thumbnail.public_id);
    }
    if (lecture.resource?.public_id) {
      await cloudinary.uploader.destroy(lecture.resource.public_id, { resource_type: "raw" });
    } */

    await Lecture.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Lecture deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
