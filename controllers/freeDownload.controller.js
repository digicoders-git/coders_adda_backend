import FreeDownload from "../models/freeDownload.model.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3900";

/* ================= CREATE DOWNLOAD ================= */
export const createFreeDownload = async (req, res) => {
  try {
    const { title, category, description, authorName, fileSize, fileType, isActive } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const baseUrl = BASE_URL;

    // Process uploaded file
    let fileData = {};
    if (req.files && (req.files.file || req.files.pdf)) {
      const uploadedFile = req.files.file ? req.files.file[0] : req.files.pdf[0];
      const localUrl = `${baseUrl}/uploads/downloads/files/${uploadedFile.filename}`;
      fileData = {
        url: localUrl,
        localUrl: localUrl,
        public_id: uploadedFile.filename,
        fileName: uploadedFile.originalname,
        fileSize: fileSize || `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`,
        fileType: fileType || uploadedFile.mimetype || "application/pdf",
      };
    } else {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    // Process optional thumbnail / image
    let thumbnailData = {};
    if (req.files && req.files.image) {
      const localUrl = `${baseUrl}/uploads/downloads/images/${req.files.image[0].filename}`;
      thumbnailData = {
        url: localUrl,
        localUrl: localUrl,
        public_id: req.files.image[0].filename,
      };
    }

    const item = await FreeDownload.create({
      title,
      category: category || "General",
      description: description || "",
      authorName: authorName || "Admin",
      file: fileData,
      thumbnail: thumbnailData,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({
      success: true,
      message: "Material uploaded successfully",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET ALL DOWNLOADS (PUBLIC & ADMIN) ================= */
export const getAllFreeDownloads = async (req, res) => {
  try {
    const { search, category, isActive, page = 1, limit = 100 } = req.query;

    let filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    if (category && category !== "All") filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true" || isActive === true;

    const skip = (Number(page) - 1) * Number(limit);
    const data = await FreeDownload.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await FreeDownload.countDocuments(filter);

    // Also get distinct categories
    const categories = await FreeDownload.distinct("category");

    return res.status(200).json({
      success: true,
      total,
      categories: ["All", ...categories.filter(Boolean)],
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET SINGLE DOWNLOAD ================= */
export const getSingleFreeDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await FreeDownload.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/* ================= UPDATE DOWNLOAD ================= */
export const updateFreeDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, authorName, fileSize, fileType, isActive } = req.body;

    const item = await FreeDownload.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (title) item.title = title;
    if (category) item.category = category;
    if (description !== undefined) item.description = description;
    if (authorName) item.authorName = authorName;
    if (isActive !== undefined) item.isActive = isActive === "true" || isActive === true;

    const baseUrl = BASE_URL;

    // Check for new file
    if (req.files && (req.files.file || req.files.pdf)) {
      const uploadedFile = req.files.file ? req.files.file[0] : req.files.pdf[0];
      const localUrl = `${baseUrl}/uploads/downloads/files/${uploadedFile.filename}`;
      item.file = {
        url: localUrl,
        localUrl: localUrl,
        public_id: uploadedFile.filename,
        fileName: uploadedFile.originalname,
        fileSize: fileSize || `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`,
        fileType: fileType || uploadedFile.mimetype || "application/pdf",
      };
    }

    // Check for new thumbnail
    if (req.files && req.files.image) {
      const localUrl = `${baseUrl}/uploads/downloads/images/${req.files.image[0].filename}`;
      item.thumbnail = {
        url: localUrl,
        localUrl: localUrl,
        public_id: req.files.image[0].filename,
      };
    }

    await item.save();

    return res.status(200).json({
      success: true,
      message: "Material updated successfully",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/* ================= DELETE DOWNLOAD ================= */
export const deleteFreeDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await FreeDownload.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    return res.status(200).json({ success: true, message: "Material deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/* ================= INCREMENT DOWNLOAD COUNT ================= */
export const trackDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await FreeDownload.findByIdAndUpdate(
      id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    return res.status(200).json({ success: true, downloadCount: item ? item.downloadCount : 0 });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};
