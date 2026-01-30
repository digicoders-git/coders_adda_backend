import Ebook from "../models/ebook.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

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
      isActive
    } = req.body;

    if (!category || !title || !authorName) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload PDF
    let pdfData = {};
    if (req.file) {
      const p = await cloudinary.uploader.upload(req.file.path, {
        folder: "ebooks/pdfs",
        resource_type: "raw"
      });
      pdfData = { url: p.secure_url, public_id: p.public_id };
      fs.unlinkSync(req.file.path);
    } else {
      return res.status(400).json({ message: "PDF file is required" });
    }

    const ebook = await Ebook.create({
      category,
      title,
      authorName,
      description,
      priceType,
      price: priceType === "paid" ? price : 0,
      isActive,
      pdf: pdfData
    });

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
    const { search, category, isActive, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { authorName: { $regex: search, $options: "i" } }
      ];
    }

    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";

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
      isActive
    } = req.body;

    if (category !== undefined) ebook.category = category;
    if (title !== undefined) ebook.title = title;
    if (authorName !== undefined) ebook.authorName = authorName;
    if (description !== undefined) ebook.description = description;
    if (priceType !== undefined) ebook.priceType = priceType;
    if (price !== undefined) ebook.price = priceType === "paid" ? price : 0;
    if (isActive !== undefined) ebook.isActive = isActive;

    // Update PDF
    if (req.file) {
      if (ebook.pdf?.public_id) {
        await cloudinary.uploader.destroy(ebook.pdf.public_id, { resource_type: "raw" });
      }

      const p = await cloudinary.uploader.upload(req.file.path, {
        folder: "ebooks/pdfs",
        resource_type: "raw"
      });

      ebook.pdf = { url: p.secure_url, public_id: p.public_id };
      fs.unlinkSync(req.file.path);
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

    if (ebook.pdf?.public_id) {
      await cloudinary.uploader.destroy(ebook.pdf.public_id, { resource_type: "raw" });
    }

    await Ebook.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "E-Book deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
