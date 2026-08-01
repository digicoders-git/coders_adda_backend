import Lecture from "../models/lecture.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

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
      isActive
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
      const v = await cloudinary.uploader.upload_large(req.files.video[0].path, {
        folder: "lectures/videos",
        resource_type: "video",
        chunk_size: 6000000
      });
      videoData = {
        url: v.secure_url,
        localUrl: `${baseUrl}/uploads/lectures/videos/${req.files.video[0].filename}`,
        public_id: v.public_id
      };
    }

    if (req.files?.thumbnail?.[0]) {
      const t = await cloudinary.uploader.upload_large(req.files.thumbnail[0].path, {
        folder: "lectures/thumbnails",
        resource_type: "image",
        chunk_size: 6000000
      });
      thumbData = {
        url: t.secure_url,
        localUrl: `${baseUrl}/uploads/lectures/thumbnails/${req.files.thumbnail[0].filename}`,
        public_id: t.public_id
      };
    }

    if (req.files?.resource?.[0]) {
      const r = await cloudinary.uploader.upload_large(req.files.resource[0].path, {
        folder: "lectures/resources",
        resource_type: "auto",
        chunk_size: 6000000
      });
      resourceData = {
        url: r.secure_url,
        localUrl: `${baseUrl}/uploads/lectures/resources/${req.files.resource[0].filename}`,
        public_id: r.public_id
      };
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
      video: videoData,
      thumbnail: thumbData,
      resource: resourceData
    });

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

/* ================= GET BY COURSE ================= */
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

/* ================= GET BY TOPIC ================= */
export const getLecturesByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;

    const data = await Lecture.find({ topic: topicId })
      .populate("course", "title")
      .populate("topic", "topic")
      .sort({ srNo: 1 });

    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET SINGLE ================= */
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

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Update video
    if (req.files?.video?.[0]) {
      if (lecture.video?.public_id) {
        await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: "video" }).catch(e => console.error(e));
      }
      const v = await cloudinary.uploader.upload_large(req.files.video[0].path, {
        folder: "lectures/videos",
        resource_type: "video",
        chunk_size: 6000000
      });
      lecture.video = {
        url: v.secure_url,
        localUrl: `${baseUrl}/uploads/lectures/videos/${req.files.video[0].filename}`,
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
        await cloudinary.uploader.destroy(lecture.thumbnail.public_id, { resource_type: "image" }).catch(e => console.error(e));
      }
      const t = await cloudinary.uploader.upload_large(req.files.thumbnail[0].path, {
        folder: "lectures/thumbnails",
        resource_type: "image",
        chunk_size: 6000000
      });
      lecture.thumbnail = {
        url: t.secure_url,
        localUrl: `${baseUrl}/uploads/lectures/thumbnails/${req.files.thumbnail[0].filename}`,
        public_id: t.public_id
      };
      lecture.markModified('thumbnail');
    } else if (removeThumbnail === "true") {
      if (lecture.thumbnail?.public_id) {
        await cloudinary.uploader.destroy(lecture.thumbnail.public_id, { resource_type: "image" }).catch(e => console.error(e));
      }
      lecture.thumbnail = null;
      lecture.markModified('thumbnail');
    }

    // Update resource
    if (req.files?.resource?.[0]) {
      if (lecture.resource?.public_id) {
        await cloudinary.uploader.destroy(lecture.resource.public_id, { resource_type: "raw" }).catch(e => console.error(e));
      }
      const r = await cloudinary.uploader.upload_large(req.files.resource[0].path, {
        folder: "lectures/resources",
        resource_type: "auto",
        chunk_size: 6000000
      });
      lecture.resource = {
        url: r.secure_url,
        localUrl: `${baseUrl}/uploads/lectures/resources/${req.files.resource[0].filename}`,
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
