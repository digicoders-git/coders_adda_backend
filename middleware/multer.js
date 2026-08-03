import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isRender = process.env.RENDER === "true";
    const rootDir = isRender ? os.tmpdir() : path.resolve(__dirname, "..");
    let dest = path.resolve(rootDir, "uploads");


    // Logic to separate folders based on fieldname or route
    if (file.fieldname === "thumbnail") {
      dest = path.resolve(dest, req.originalUrl.includes("lecture") ? "lectures/thumbnails" : "courses/thumbnails");
    } else if (file.fieldname === "promoVideo" || file.fieldname === "video") {
      if (req.originalUrl.includes("lecture")) {
        dest = path.resolve(dest, "lectures/videos");
      } else if (req.originalUrl.includes("short")) {
        dest = path.resolve(dest, "shorts");
      } else {
        dest = path.resolve(dest, "courses/videos");
      }
    } else if (file.fieldname === "resource") {
      dest = path.resolve(dest, "lectures/resources");
    } else if (file.fieldname === "image") {
      if (req.originalUrl.includes("slider")) {
        dest = path.resolve(dest, "sliders");
      } else if (req.originalUrl.includes("review")) {
        dest = path.resolve(dest, "reviews");
      } else if (req.originalUrl.includes("blog")) {
        dest = path.resolve(dest, "blogs");
      } else if (req.originalUrl.includes("ebook")) {
        dest = path.resolve(dest, "ebooks/images");
      }
    } else if (file.fieldname === "pdf") {
      if (req.originalUrl.includes("ebook")) {
        dest = path.resolve(dest, "ebooks/pdfs");
      }
    } else if (file.fieldname === "icon") {
      if (req.originalUrl.includes("service")) {
        dest = path.resolve(dest, "services");
      }
    } else if (file.fieldname === "certificateImage") {
      dest = path.resolve(dest, "certificates/templates");
    } else if (file.fieldname === "profilePicture") {
      if (req.originalUrl.includes("instructor")) {
        dest = path.resolve(dest, "instructors/profile_pictures");
      } else {
        dest = path.resolve(dest, "users/profile_pictures");
      }
    } else if (file.fieldname === "resume") {
      dest = path.resolve(dest, "job_applications/resumes");
    }


    try {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
    } catch (err) {
      console.error("Multer folder creation error:", err);
      return cb(err);
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

export default upload;
