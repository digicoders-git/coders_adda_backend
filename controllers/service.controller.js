import Service from "../models/service.model.js";
import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary.js"; // removed

/* ================= CREATE SERVICE ================= */
export const createService = async (req, res) => {
  try {
    const { title, description, displayPlatform, status } = req.body;

    let icon = {};
    if (req.file) {
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const localUrl = `${baseUrl}/uploads/services/${req.file.filename}`;

      icon = {
        url: localUrl,
        localUrl: localUrl,
        public_id: req.file.path
      };
    }

    const service = await Service.create({
      title,
      description,
      icon,
      displayPlatform: displayPlatform || "both",
      isActive: status === "Active" || status === true || status === "true" ? true : false
    });

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      service
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET ALL SERVICES ================= */
export const getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 100, search, isActive, displayPlatform, targetPlatform } = req.query;
    let filter = {};

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    if (targetPlatform === "website") {
      filter.displayPlatform = { $in: ["both", "website"] };
    } else if (targetPlatform === "app") {
      filter.displayPlatform = { $in: ["both", "app"] };
    } else if (displayPlatform) {
      filter.displayPlatform = displayPlatform;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    const services = await Service.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Service.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      data: services
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= GET SINGLE SERVICE ================= */
export const getSingleService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    return res.status(200).json({ success: true, service });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ================= UPDATE SERVICE ================= */
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, displayPlatform, status } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    let icon = service.icon;
    if (req.file) {
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const localUrl = `${baseUrl}/uploads/services/${req.file.filename}`;

      // delete old locally
      if (service.icon?.public_id && fs.existsSync(service.icon.public_id)) {
        try { fs.unlinkSync(service.icon.public_id); } catch(e) {}
      }

      icon = {
        url: localUrl,
        localUrl: localUrl,
        public_id: req.file.path
      };
    }

    service.title = title !== undefined ? title : service.title;
    service.description = description !== undefined ? description : service.description;
    service.displayPlatform = displayPlatform !== undefined ? displayPlatform : service.displayPlatform;
    if (status !== undefined) {
      service.isActive = status === "Active" || status === true || status === "true";
    }
    service.icon = icon;

    await service.save();

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ================= DELETE SERVICE ================= */
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    if (service.icon?.public_id && fs.existsSync(service.icon.public_id)) {
      try { fs.unlinkSync(service.icon.public_id); } catch(e) {}
    }
    await Service.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

/* ================= TOGGLE STATUS ================= */
export const toggleServiceStatus = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "NotFound" });

    service.isActive = !service.isActive;
    await service.save();

    return res.status(200).json({ success: true, isActive: service.isActive });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
