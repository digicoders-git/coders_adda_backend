import Ebook from "../models/ebook.model.js";
import fs from "fs";
import { sendEbookNotification } from "./notification.controller.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3900";

/* ================= CREATE EBOOK ================= */
export const createEbook = async (req, res) => {
  try {
    const {
      category,
      title,
      authorName,
      description,
      priceType,
      price,
      fileSize,
      isActive
    } = req.body;

    if (!category || !title || !authorName) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const baseUrl = BASE_URL;

    // Upload PDF
    let pdfData = {};
    if (req.files && req.files.pdf) {
      const localUrl = `${baseUrl}/uploads/ebooks/pdfs/${req.files.pdf[0].filename}`;
      pdfData = {
        url: localUrl,
        localUrl: localUrl,
        public_id: req.files.pdf[0].filename,
        fileSize: fileSize
      };
    } else {
      return res.status(400).json({ message: "PDF file is required" });
    }

    // Upload Image
    let imageData = {};
    if (req.files && req.files.image) {
      const localUrl = `${baseUrl}/uploads/ebooks/images/${req.files.image[0].filename}`;
      imageData = { 
        url: localUrl, 
        localUrl: localUrl,
        public_id: req.files.image[0].filename
      };
    }


    const ebook = await Ebook.create({
      category,
      title,
      authorName,
      description,
      priceType,
      price: priceType === "free" ? 0 : Math.abs(Number(price)),
      isActive,
      pdf: pdfData,
      image: imageData
    });

    // 🔔 Auto-notify all users about new ebook (fire-and-forget)
    sendEbookNotification(ebook).catch(e => console.error('Ebook notification error:', e));

    return res.status(201).json({
      success: true,
      message: "E-Book created successfully",
      ebook
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET ALL ================= */
export const getAllEbooks = async (req, res) => {
  try {
    const { search, category, isActive, priceType, minPrice, maxPrice, page = 1, limit = 1000000 } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { authorName: { $regex: search, $options: "i" } }
      ];
    }

    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (priceType) filter.priceType = priceType;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;

    const data = await Ebook.find(filter)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Ebook.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET SINGLE ================= */
export const getSingleEbook = async (req, res) => {
  try {
    const { id } = req.params;

    const ebook = await Ebook.findById(id).populate("category", "name");
    if (!ebook) return res.status(404).json({ message: "E-Book not found" });

    return res.status(200).json({ success: true, data: ebook });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= UPDATE ================= */
export const updateEbook = async (req, res) => {
  try {
    const { id } = req.params;

    const ebook = await Ebook.findById(id);
    if (!ebook) return res.status(404).json({ message: "E-Book not found" });

    const {
      category,
      title,
      authorName,
      description,
      priceType,
      price,
      fileSize,
      isActive
    } = req.body;

    if (category !== undefined) ebook.category = category;
    if (title !== undefined) ebook.title = title;
    if (authorName !== undefined) ebook.authorName = authorName;
    if (description !== undefined) ebook.description = description;
    if (priceType !== undefined) ebook.priceType = priceType;
    if (price !== undefined) ebook.price = priceType === "free" ? 0 : Math.abs(Number(price));
    if (isActive !== undefined) ebook.isActive = isActive;

    const baseUrl = BASE_URL;

    // Update PDF
    if (req.files && req.files.pdf) {
      const localUrl = `${baseUrl}/uploads/ebooks/pdfs/${req.files.pdf[0].filename}`;
      ebook.pdf = {
        url: localUrl,
        localUrl: localUrl,
        public_id: req.files.pdf[0].filename,
        fileSize: fileSize || ebook.pdf.fileSize
      };
    }

    // Update Image
    if (req.files && req.files.image) {
      const localUrl = `${baseUrl}/uploads/ebooks/images/${req.files.image[0].filename}`;
      ebook.image = { 
        url: localUrl, 
        localUrl: localUrl,
        public_id: req.files.image[0].filename
      };
    }


    await ebook.save();

    return res.status(200).json({
      success: true,
      message: "E-Book updated successfully",
      ebook
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= DELETE ================= */
export const deleteEbook = async (req, res) => {
  try {
    const { id } = req.params;

    const ebook = await Ebook.findById(id);
    if (!ebook) return res.status(404).json({ message: "E-Book not found" });

    // No Cloudinary to delete — local files are kept on disk

    await Ebook.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "E-Book deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
