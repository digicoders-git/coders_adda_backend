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
    let videoData = {};
    if (req.files?.video) {
      const v = await cloudinary.uploader.upload(req.files.video[0].path, {
        folder: "lectures/videos",
        resource_type: "video"
      });
      videoData = { url: v.secure_url, public_id: v.public_id };
      fs.unlinkSync(req.files.video[0].path);
    }

    // Upload Thumbnail
    let thumbData = {};
    if (req.files?.thumbnail) {
      const t = await cloudinary.uploader.upload(req.files.thumbnail[0].path, {
        folder: "lectures/thumbnails"
      });
      thumbData = { url: t.secure_url, public_id: t.public_id };
      fs.unlinkSync(req.files.thumbnail[0].path);
    }

    // Upload Resource PDF
    let resourceData = {};
    if (req.files?.resource) {
      const r = await cloudinary.uploader.upload(req.files.resource[0].path, {
        folder: "lectures/resources",
        resource_type: "raw"
      });
      resourceData = { url: r.secure_url, public_id: r.public_id };
      fs.unlinkSync(req.files.resource[0].path);
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
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET ALL ================= */
export const getAllLectures = async (req, res) => {
  try {
    const data = await Lecture.find()
      .populate("course", "title")
      .populate("topic", "topic")
      .sort({ srNo: 1 });

    return res.status(200).json({ success: true, data });
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
      isActive
    } = req.body;

    if (course !== undefined) lecture.course = course;
    if (topic !== undefined) lecture.topic = topic;
    if (srNo !== undefined) lecture.srNo = srNo;
    if (title !== undefined) lecture.title = title;
    if (duration !== undefined) lecture.duration = duration;
    if (description !== undefined) lecture.description = description;
    if (privacy !== undefined) lecture.privacy = privacy;
    if (isActive !== undefined) lecture.isActive = isActive;

    // Update video
    if (req.files?.video) {
      if (lecture.video?.public_id) {
        await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: "video" });
      }
      const v = await cloudinary.uploader.upload(req.files.video[0].path, {
        folder: "lectures/videos",
        resource_type: "video"
      });
      lecture.video = { url: v.secure_url, public_id: v.public_id };
      fs.unlinkSync(req.files.video[0].path);
    }

    // Update thumbnail
    if (req.files?.thumbnail) {
      if (lecture.thumbnail?.public_id) {
        await cloudinary.uploader.destroy(lecture.thumbnail.public_id);
      }
      const t = await cloudinary.uploader.upload(req.files.thumbnail[0].path, {
        folder: "lectures/thumbnails"
      });
      lecture.thumbnail = { url: t.secure_url, public_id: t.public_id };
      fs.unlinkSync(req.files.thumbnail[0].path);
    }

    // Update resource
    if (req.files?.resource) {
      if (lecture.resource?.public_id) {
        await cloudinary.uploader.destroy(lecture.resource.public_id, { resource_type: "raw" });
      }
      const r = await cloudinary.uploader.upload(req.files.resource[0].path, {
        folder: "lectures/resources",
        resource_type: "raw"
      });
      lecture.resource = { url: r.secure_url, public_id: r.public_id };
      fs.unlinkSync(req.files.resource[0].path);
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

    if (lecture.video?.public_id) {
      await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: "video" });
    }
    if (lecture.thumbnail?.public_id) {
      await cloudinary.uploader.destroy(lecture.thumbnail.public_id);
    }
    if (lecture.resource?.public_id) {
      await cloudinary.uploader.destroy(lecture.resource.public_id, { resource_type: "raw" });
    }

    await Lecture.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Lecture deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
