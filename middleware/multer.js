import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = "uploads/";

    // Logic to separate folders based on fieldname or route
    if (file.fieldname === "thumbnail") {
      dest += req.originalUrl.includes("lecture") ? "lectures/thumbnails" : "courses/thumbnails";
    } else if (file.fieldname === "promoVideo" || file.fieldname === "video") {
      if (req.originalUrl.includes("lecture")) {
        dest += "lectures/videos";
      } else if (req.originalUrl.includes("short")) {
        dest += "shorts";
      } else {
        dest += "courses/videos";
      }
    } else if (file.fieldname === "resource") {
      dest += "lectures/resources";
    } else if (file.fieldname === "image") {
      dest += req.originalUrl.includes("slider") ? "sliders" : "";
    } else if (file.fieldname === "certificateImage") {
      dest += "certificates/templates";
    } else if (file.fieldname === "profilePicture") {
      dest += "users/profile_pictures";
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
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
