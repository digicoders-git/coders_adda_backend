import Short from "../models/short.model.js";
import cloudinary from "../config/cloudinary.js";

/* ================= CREATE SHORT (ADMIN) ================= */
export const createShort = async (req, res) => {
  try {
    const { instructorName, caption } = req.body;

    if (!instructorName || !caption) {
      return res.status(400).json({
        message: "Instructor name and caption are required"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Video is required"
      });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "shorts",
      resource_type: "video"
    });

    const short = await Short.create({
      instructorName,
      caption,
      video: {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      }
    });

    res.status(201).json({
      message: "Short created successfully",
      data: short
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= UPDATE SHORT (ADMIN) ================= */
export const updateShort = async (req, res) => {
  try {
    const { id } = req.params;

    const short = await Short.findById(id);
    if (!short) {
      return res.status(404).json({ message: "Short not found" });
    }

    const { instructorName, caption, isActive } = req.body;

    if (instructorName !== undefined) short.instructorName = instructorName;
    if (caption !== undefined) short.caption = caption;
    if (isActive !== undefined) short.isActive = isActive;

    // If new video uploaded
    if (req.file) {
      // delete old video from cloudinary
      if (short.video?.public_id) {
        await cloudinary.uploader.destroy(short.video.public_id, {
          resource_type: "video"
        });
      }

      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "shorts",
        resource_type: "video"
      });

      short.video = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      };
    }

    await short.save();

    res.json({
      message: "Short updated successfully",
      data: short
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= DELETE SHORT (ADMIN) ================= */
export const deleteShort = async (req, res) => {
  try {
    const { id } = req.params;

    const short = await Short.findById(id);
    if (!short) {
      return res.status(404).json({ message: "Short not found" });
    }

    // delete video from cloudinary
    if (short.video?.public_id) {
      await cloudinary.uploader.destroy(short.video.public_id, {
        resource_type: "video"
      });
    }

    await short.deleteOne();

    res.json({ message: "Short deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= GET ALL SHORTS (ADMIN) WITH SEARCH + FILTER + PAGINATION ================= */
export const getAllShorts = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, isActive } = req.query;

    let filter = {};

    // 🔍 Search by instructorName or caption
    if (search) {
      filter.$or = [
        { instructorName: { $regex: search, $options: "i" } },
        { caption: { $regex: search, $options: "i" } }
      ];
    }

    // 🧹 Filter by status
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const total = await Short.countDocuments(filter);

    const shorts = await Short.find(filter)
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit);

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: shorts
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


/* ================= GET ACTIVE SHORTS (APP) ================= */
export const getActiveShorts = async (req, res) => {
  try {
    const shorts = await Short.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ data: shorts });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= TOGGLE SHORT STATUS (ADMIN) ================= */
export const toggleShortStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const short = await Short.findById(id);
    if (!short) {
      return res.status(404).json({ message: "Short not found" });
    }

    short.isActive = !short.isActive;
    await short.save();

    res.json({
      message: "Short status updated",
      data: {
        _id: short._id,
        isActive: short.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
