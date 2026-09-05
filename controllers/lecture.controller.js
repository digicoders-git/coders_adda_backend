import Lecture from "../models/lecture.model.js";
const processUploadLocal = (fileObj, folder, baseUrl) => {
  const localPath = `/uploads/${folder}/${fileObj.filename}`;
  return {
    url: baseUrl + localPath,
    localUrl: baseUrl + localPath,
    public_id: fileObj.path
  };
};

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
      isActive,
      price,
      contentType,
      liveUrl,
      liveStatus,
      scheduledAt,
      quizId
    } = req.body;

    if (!course || !topic || !srNo || !title || !duration) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload Video
    let videoData = { url: "", public_id: "" };
    let thumbData = { url: "", public_id: "" };
    let resourceData = { url: "", public_id: "" };

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    if (req.files?.video?.[0]) {
      videoData = processUploadLocal(req.files.video[0], "lectures/videos", baseUrl);
    }

    if (req.files?.thumbnail?.[0]) {
      thumbData = processUploadLocal(req.files.thumbnail[0], "lectures/thumbnails", baseUrl);
    }

    if (req.files?.resource?.[0]) {
      resourceData = processUploadLocal(req.files.resource[0], "lectures/resources", baseUrl);
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
      price: price !== undefined ? Number(price) : 0,
      contentType: contentType || "video",
      liveUrl: liveUrl || "",
      liveStatus: liveStatus || "scheduled",
      scheduledAt: scheduledAt || null,
      quizId: quizId || null,
      video: videoData,
      thumbnail: thumbData,
      resource: resourceData
    });
    console.log("LECTURE SAVED:", lecture.video, lecture.thumbnail);

    // 🔔 Auto-notify enrolled students about new lecture
    sendCourseUpdateNotification(course, 'NewLecture', title).catch(e => console.error('Notification error:', e));

    return res.status(201).json({
      success: true,
      message: "Lecture created successfully",
      lecture
    });

  } catch (error) {
    console.error("CREATE LECTURE ERROR:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET ALL LECTURES (WITH FILTER & PAGINATION) ================= */
export const getAllLectures = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, courseId = "" } = req.query;

    const query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (courseId) {
      query.course = courseId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const data = await Lecture.find(query)
      .populate("course", "title")
      .populate("topic", "topic")
      .sort({ srNo: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Lecture.countDocuments(query);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= GET LECTURES BY COURSE ================= */
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

/* ================= GET LECTURES BY TOPIC ================= */
export const getLecturesByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const lectures = await Lecture.find({ topic: topicId }).sort({ srNo: 1 }).lean();

    const courseId = lectures.length > 0 ? lectures[0].course : null;

    const isAdmin = req.admin ? true : false;
    const isEnrolled = req.user && req.user._id && courseId
      && req.user.purchaseCourses
      && req.user.purchaseCourses.some(id => id.toString() === courseId.toString());

    // Get all paid lecture purchases for this user in one query
    let purchasedLectureIds = new Set();
    if (req.user && req.user._id) {
      const purchases = await LecturePurchase.find({
        user: req.user._id,
        lecture: { $in: lectures.map(l => l._id) }
      }).select('lecture').lean();
      purchasedLectureIds = new Set(purchases.map(p => p.lecture.toString()));
    }

    // Sanitize lectures based on privacy + purchase status
    lectures.forEach(lecture => {
      if (isAdmin) return; // Admin sees everything

      if (lecture.privacy === "locked") {
        const hasPaid = purchasedLectureIds.has(lecture._id.toString());
        const lecturePrice = typeof lecture.price === 'number' ? lecture.price : 0;
        const hasPaidPrice = lecturePrice > 0;

        if (hasPaidPrice) {
          // Paid lecture — needs separate purchase even if enrolled in course
          if (!hasPaid) {
            lecture.isPaidLecture = true;
            lecture.lecturePrice = lecturePrice;
            lecture.video = null;
            lecture.resource = null;
          } else {
            // User has purchased the lecture
            lecture.privacy = "unlocked";
            lecture.isPaidLecture = false;
          }
        } else {
          // Free-to-enrolled lecture — just needs course enrollment
          if (!isEnrolled) {
            lecture.isPaidLecture = false;
            lecture.video = null;
            lecture.resource = null;
          } else {
            // User is enrolled in the course
            lecture.privacy = "unlocked";
          }
        }
      }
    });

    // Check progress for authenticated users
    if (req.user && req.user._id) {
      if (courseId) {
        const userProgresses = await UserProgress.find({
          user: req.user._id,
          course: courseId
        });

        if (userProgresses && userProgresses.length > 0) {
          lectures.forEach(lecture => {
            const lectureProgress = userProgresses.find(
              p => p.lecture.toString() === lecture._id.toString()
            );
            lecture.isCompleted = lectureProgress ? lectureProgress.isCompleted : false;
          });
        }
      }
    }

    return res.status(200).json({ success: true, lectures, data: lectures, total: lectures.length });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ================= CHECK LECTURE PURCHASE ================= */
export const checkLecturePurchase = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const userId = req.user._id;

    const purchase = await LecturePurchase.findOne({ user: userId, lecture: lectureId });
    return res.status(200).json({ success: true, purchased: !!purchase });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


/* ================= GET SINGLE LECTURE ================= */
export const getSingleLecture = async (req, res) => {
  try {
    const { id } = req.params;

    const lecture = await Lecture.findById(id)
      .populate("course", "title")
      .populate("topic", "topic");

    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    // Check enrollment
    const isAdmin = req.admin ? true : false;
    const courseId = lecture.course._id || lecture.course;
    const isEnrolled = req.user && req.user._id && courseId 
      && req.user.purchaseCourses 
      && req.user.purchaseCourses.some(id => id.toString() === courseId.toString());

    if (lecture.privacy === "locked" && !isEnrolled && !isAdmin) {
      if (lecture.video) lecture.video = null;
      if (lecture.resource) lecture.resource = null;
    }

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
      isActive,
      price,
      contentType,
      liveUrl,
      liveStatus,
      scheduledAt,
      quizId,
      removeVideo,
      removeThumbnail,
      removeResource
    } = req.body;

    if (course !== undefined) lecture.course = course;
    if (topic !== undefined) lecture.topic = topic;
    if (srNo !== undefined) lecture.srNo = srNo;
    if (title !== undefined) lecture.title = title;
    if (duration !== undefined) lecture.duration = duration;
    if (description !== undefined) lecture.description = description;
    if (privacy !== undefined) lecture.privacy = privacy;
    if (isActive !== undefined) lecture.isActive = isActive;
    if (price !== undefined) lecture.price = Number(price);
    if (contentType !== undefined) lecture.contentType = contentType;
    if (liveUrl !== undefined) lecture.liveUrl = liveUrl;
    if (liveStatus !== undefined) lecture.liveStatus = liveStatus;
    if (scheduledAt !== undefined) lecture.scheduledAt = scheduledAt;
    if (quizId !== undefined) lecture.quizId = quizId || null;

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    // Helper to safely delete local file
    const safeDeleteLocal = (publicId) => {
      if (publicId && fs.existsSync(publicId)) {
        try { fs.unlinkSync(publicId); } catch(e) { console.error("Local delete error:", e); }
      }
    };

    // Update video
    if (req.files?.video?.[0]) {
      safeDeleteLocal(lecture.video?.public_id);
      lecture.video = processUploadLocal(req.files.video[0], "lectures/videos", baseUrl);
      lecture.markModified('video');
    } else if (removeVideo === "true") {
      safeDeleteLocal(lecture.video?.public_id);
      lecture.video = null;
      lecture.markModified('video');
    }

    // Update thumbnail
    if (req.files?.thumbnail?.[0]) {
      safeDeleteLocal(lecture.thumbnail?.public_id);
      lecture.thumbnail = processUploadLocal(req.files.thumbnail[0], "lectures/thumbnails", baseUrl);
      lecture.markModified('thumbnail');
    } else if (removeThumbnail === "true") {
      safeDeleteLocal(lecture.thumbnail?.public_id);
      lecture.thumbnail = null;
      lecture.markModified('thumbnail');
    }

    // Update resource
    if (req.files?.resource?.[0]) {
      safeDeleteLocal(lecture.resource?.public_id);
      lecture.resource = processUploadLocal(req.files.resource[0], "lectures/resources", baseUrl);
      lecture.markModified('resource');
    } else if (removeResource === "true") {
      safeDeleteLocal(lecture.resource?.public_id);
      lecture.resource = null;
      lecture.markModified('resource');
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

    // Helper to safely delete local file
    const safeDeleteLocal = (publicId) => {
      if (publicId && fs.existsSync(publicId)) {
        try { fs.unlinkSync(publicId); } catch(e) { console.error("Local delete error:", e); }
      }
    };

    if (lecture.video?.public_id) safeDeleteLocal(lecture.video.public_id);
    if (lecture.thumbnail?.public_id) safeDeleteLocal(lecture.thumbnail.public_id);
    if (lecture.resource?.public_id) safeDeleteLocal(lecture.resource.public_id);

    await Lecture.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Lecture deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
