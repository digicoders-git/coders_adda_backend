import multer from "multer";

// Use memory storage — file is available as req.file.buffer
// Controller uploads it directly to Cloudinary (no local disk needed)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export default upload;
