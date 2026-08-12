import Lecture from "../models/lecture.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import UserProgress from "../models/UserProgress.js";
import { sendCourseUpdateNotification } from "./notification.controller.js";
import LecturePurchase from "../models/lecturePurchase.model.js";

const uploadToCloudinary = (filePath, options) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(filePath, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

const processUpload = async (fileObj, options, fallbackFolder, baseUrl) => {
  try {
    const result = await uploadToCloudinary(fileObj.path, options);
    return {
      url: result.secure_url,
      localUrl: result.secure_url,
      public_id: result.public_id
    };
  } catch (err) {
    console.error(`Cloudinary upload failed for ${fileObj.fieldname}:`, err.message || err);
    const localPath = `/uploads/${fallbackFolder}/${fileObj.filename}`;
    return {
      url: baseUrl + localPath,
      localUrl: baseUrl + localPath,
      public_id: ""
    };
  }
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
      price,
      contentType,
      liveUrl,
      liveStatus,
      scheduledAt,
      quizId
    } = req.body;

    if (!course || !topic || !srNo || !title || !duration) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload Video
    let videoData = { url: "", public_id: "" };
    let thumbData = { url: "", public_id: "" };
    let resourceData = { url: "", public_id: "" };

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    if (req.files?.video?.[0]) {
      videoData = await processUpload(req.files.video[0], {
        folder: "lectures/videos",
        resource_type: "video",
        chunk_size: 6000000
      }, "lectures/videos", baseUrl);
    }

    if (req.files?.thumbnail?.[0]) {
      thumbData = await processUpload(req.files.thumbnail[0], {
        folder: "lectures/thumbnails",
        resource_type: "image",
        chunk_size: 6000000
      }, "lectures/thumbnails", baseUrl);
    }

    if (req.files?.resource?.[0]) {
      resourceData = await processUpload(req.files.resource[0], {
        folder: "lectures/resources",
        resource_type: "raw",
        chunk_size: 6000000
      }, "lectures/resources", baseUrl);
    }

    const lecture = await Lecture.create({
      course,
      topic,
      srNo,
      title,
      duration,
      description,
      privacy,
      isActive,
      price: price !== undefined ? Number(price) : 0,
      contentType: contentType || "video",
      liveUrl: liveUrl || "",
      liveStatus: liveStatus || "scheduled",
      scheduledAt: scheduledAt || null,
      quizId: quizId || null,
      video: videoData,
      thumbnail: thumbData,
      resource: resourceData
    });
    console.log("LECTURE SAVED:", lecture.video, lecture.thumbnail);

    // 🔔 Auto-notify enrolled students about new lecture
    sendCourseUpdateNotification(course, 'NewLecture', title).catch(e => console.error('Notification error:', e));

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

    const isAdmin = req.admin ? true : false;
    const isEnrolled = req.user && req.user._id && courseId
      && req.user.purchaseCourses
      && req.user.purchaseCourses.some(id => id.toString() === courseId.toString());

    // Get all paid lecture purchases for this user in one query
    let purchasedLectureIds = new Set();
    if (req.user && req.user._id) {
      const purchases = await LecturePurchase.find({
        user: req.user._id,
        lecture: { $in: lectures.map(l => l._id) }
      }).select('lecture').lean();
      purchasedLectureIds = new Set(purchases.map(p => p.lecture.toString()));
    }

    // Sanitize lectures based on privacy + purchase status
    lectures.forEach(lecture => {
      if (isAdmin) return; // Admin sees everything

      if (lecture.privacy === "locked") {
        const hasPaid = purchasedLectureIds.has(lecture._id.toString());
        const lecturePrice = typeof lecture.price === 'number' ? lecture.price : 0;
        const hasPaidPrice = lecturePrice > 0;

        if (hasPaidPrice) {
          // Paid lecture — needs separate purchase even if enrolled in course
          if (!hasPaid) {
            lecture.isPaidLecture = true;
            lecture.lecturePrice = lecturePrice;
            lecture.video = null;
            lecture.resource = null;
          } else {
            // User has purchased the lecture
            lecture.privacy = "unlocked";
            lecture.isPaidLecture = false;
          }
        } else {
          // Free-to-enrolled lecture — just needs course enrollment
          if (!isEnrolled) {
            lecture.isPaidLecture = false;
            lecture.video = null;
            lecture.resource = null;
          } else {
            // User is enrolled in the course
            lecture.privacy = "unlocked";
          }
        }
      }
    });

    // Check progress for authenticated users
    if (req.user && req.user._id) {
      if (courseId) {
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
    }

    return res.status(200).json({ success: true, lectures, data: lectures, total: lectures.length });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= CHECK LECTURE PURCHASE ================= */
export const checkLecturePurchase = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const userId = req.user._id;

    const purchase = await LecturePurchase.findOne({ user: userId, lecture: lectureId });
    return res.status(200).json({ success: true, purchased: !!purchase });
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

    // Check enrollment
    const isAdmin = req.admin ? true : false;
    const courseId = lecture.course._id || lecture.course;
    const isEnrolled = req.user && req.user._id && courseId 
      && req.user.purchaseCourses 
      && req.user.purchaseCourses.some(id => id.toString() === courseId.toString());

    if (lecture.privacy === "locked" && !isEnrolled && !isAdmin) {
      if (lecture.video) lecture.video = null;
      if (lecture.resource) lecture.resource = null;
    }

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
      price,
      contentType,
      liveUrl,
      liveStatus,
      scheduledAt,
      quizId,
      removeVideo,
      removeThumbnail,
      removeResource
    } = req.body;

    if (course !== undefined) lecture.course = course;
    if (topic !== undefined) lecture.topic = topic;
    if (srNo !== undefined) lecture.srNo = srNo;
    if (title !== undefined) lecture.title = title;
    if (duration !== undefined) lecture.duration = duration;
    if (description !== undefined) lecture.description = description;
    if (privacy !== undefined) lecture.privacy = privacy;
    if (isActive !== undefined) lecture.isActive = isActive;
    if (price !== undefined) lecture.price = Number(price);
    if (contentType !== undefined) lecture.contentType = contentType;
    if (liveUrl !== undefined) lecture.liveUrl = liveUrl;
    if (liveStatus !== undefined) lecture.liveStatus = liveStatus;
    if (scheduledAt !== undefined) lecture.scheduledAt = scheduledAt;
    if (quizId !== undefined) lecture.quizId = quizId || null;

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Update video
    if (req.files?.video?.[0]) {
      if (lecture.video?.public_id) {
        await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: "video" }).catch(e => console.error(e));
      }
      lecture.video = await processUpload(req.files.video[0], {
        folder: "lectures/videos",
        resource_type: "video",
        chunk_size: 6000000
      }, "lectures/videos", baseUrl);
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
      lecture.thumbnail = await processUpload(req.files.thumbnail[0], {
        folder: "lectures/thumbnails",
        resource_type: "image",
        chunk_size: 6000000
      }, "lectures/thumbnails", baseUrl);
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
      lecture.resource = await processUpload(req.files.resource[0], {
        folder: "lectures/resources",
        resource_type: "raw",
        chunk_size: 6000000
      }, "lectures/resources", baseUrl);
      lecture.markModified('resource');
    } else if (removeResource === "true") {
      if (lecture.resource?.public_id) {
        await cloudinary.uploader.destroy(lecture.resource.public_id, { resource_type: "raw" }).catch(e => console.error(e));
      }
      lecture.resource = null;
      lecture.markModified('resource');
    }


    await lecture.save();

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
