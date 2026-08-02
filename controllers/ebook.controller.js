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
      fileSize,
      isActive
    } = req.body;

    if (!category || !title || !authorName) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Upload PDF
    let pdfData = {};
    if (req.files && req.files.pdf) {
      const result = await cloudinary.uploader.upload(req.files.pdf[0].path, {
        folder: "ebooks/pdfs",
        resource_type: "auto",
        access_mode: "public"
      });
      
      const localUrl = `${baseUrl}/uploads/ebooks/pdfs/${req.files.pdf[0].filename}`;
      
      pdfData = {
        url: result.secure_url,
        localUrl: localUrl,
        public_id: result.public_id,
        fileSize: fileSize
      };
      // fs.unlinkSync(req.files.pdf[0].path); // STOP UNLINKING
    } else {
      return res.status(400).json({ message: "PDF file is required" });
    }

    // Upload Image
    let imageData = {};
    if (req.files && req.files.image) {
      const img = await cloudinary.uploader.upload(req.files.image[0].path, {
        folder: "ebooks/images",
        resource_type: "image"
      });
      
      const localUrl = `${baseUrl}/uploads/ebooks/images/${req.files.image[0].filename}`;
      
      imageData = { 
        url: img.secure_url, 
        localUrl: localUrl,
        public_id: img.public_id 
      };
      // fs.unlinkSync(req.files.image[0].path); // STOP UNLINKING
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

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Update PDF
    if (req.files && req.files.pdf) {
      if (ebook.pdf?.public_id) {
        await cloudinary.uploader.destroy(ebook.pdf.public_id).catch(e => console.error("Cloudinary delete error:", e));
      }

      const p = await cloudinary.uploader.upload(req.files.pdf[0].path, {
        folder: "ebooks/pdfs",
        resource_type: "auto",
        access_mode: "public"
      });

      const localUrl = `${baseUrl}/uploads/ebooks/pdfs/${req.files.pdf[0].filename}`;

      ebook.pdf = {
        url: p.secure_url,
        localUrl: localUrl,
        public_id: p.public_id,
        fileSize: fileSize || ebook.pdf.fileSize
      };
      // fs.unlinkSync(req.files.pdf[0].path);
    }

    // Update Image
    if (req.files && req.files.image) {
      if (ebook.image?.public_id) {
        await cloudinary.uploader.destroy(ebook.image.public_id, { resource_type: "image" }).catch(e => console.error("Cloudinary delete error:", e));
      }

      const img = await cloudinary.uploader.upload(req.files.image[0].path, {
        folder: "ebooks/images",
        resource_type: "image"
      });

      const localUrl = `${baseUrl}/uploads/ebooks/images/${req.files.image[0].filename}`;

      ebook.image = { 
        url: img.secure_url, 
        localUrl: localUrl,
        public_id: img.public_id 
      };
      // fs.unlinkSync(req.files.image[0].path);
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
      await cloudinary.uploader.destroy(ebook.pdf.public_id);
    }
    if (ebook.image?.public_id) {
      await cloudinary.uploader.destroy(ebook.image.public_id, { resource_type: "image" });
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
