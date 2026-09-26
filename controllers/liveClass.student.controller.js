/**
 * liveClass.student.controller.js
 * Student-facing APIs for live classes.
 * Auth: userAuth → req.user, req.userId
 *
 * Security: Student never gets stream key or encrypted values.
 * Playback URL only returned after enrollment + visibility check.
 */

import LiveClass from '../models/liveClass.model.js';

/**
 * Helper: Check if student is enrolled in course.
 * purchaseCourses array is already merged with subscription courses by userAuth middleware.
 */
function isEnrolled(user, courseId) {
  return user.purchaseCourses?.some(
    (id) => id.toString() === courseId.toString()
  );
}

/**
 * GET /live-class/student/by-course/:courseId
 * Get all visible live classes for a course.
 * Returns only LIVE and RECORDED classes (student-safe fields only).
 */
export const getClassesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Enrollment check
    if (!isEnrolled(req.user, courseId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course',
      });
    }

    const classes = await LiveClass.find({
      courseId,
      appVisibility: { $in: ['LIVE', 'RECORDED'] },
    })
      .sort({ scheduledAt: -1 })
      .select(
        'title description scheduledAt expectedDurationMinutes status appVisibility liveStartedAt liveEndedAt durationSeconds'
      )
      .lean();

    return res.json({ success: true, data: classes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /live-class/student/upcoming/:courseId
 * Get SCHEDULED classes visible to students (for "upcoming" banner).
 * Does NOT require enrollment — can be used for marketing too.
 * Returns only public-safe fields (no URLs).
 */
export const getUpcomingByCourse = async (req, res) => {
  try {
    const classes = await LiveClass.find({
      courseId: req.params.courseId,
      status: 'SCHEDULED',
    })
      .sort({ scheduledAt: 1 })
      .select('title description scheduledAt expectedDurationMinutes instructorId')
      .populate('instructorId', 'fullName')
      .lean();

    return res.json({ success: true, data: classes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /live-class/student/:id/play
 * The most secure route — returns playback URL only after full auth chain:
 *   1. JWT valid (userAuth middleware)
 *   2. Student enrolled in class's course
 *   3. appVisibility = LIVE or RECORDED
 *
 * Returns:
 *   { type: "live", playbackUrl: "https://live.codersadda.com/live/cls_xxx.m3u8" }
 *   { type: "recorded", playbackUrl: "https://live.codersadda.com/dvr/cls_xxx_final.mp4" }
 */
export const getPlaybackUrl = async (req, res) => {
  try {
    const doc = await LiveClass.findById(req.params.id)
      .select('courseId status appVisibility streamName recordingUrl')
      .lean();

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Enrollment check
    if (!isEnrolled(req.user, doc.courseId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course',
      });
    }

    // Check visibility
    if (doc.appVisibility === 'HIDDEN') {
      return res.status(403).json({
        success: false,
        message: 'Live class is not available yet',
      });
    }

    // Live playback
    if (doc.appVisibility === 'LIVE' && doc.status === 'LIVE') {
      const hlsBase = process.env.SRS_HLS_BASE || 'https://live.codersadda.com/live';
      return res.json({
        success: true,
        data: {
          type: 'live',
          playbackUrl: `${hlsBase}/${doc.streamName}.m3u8`,
        },
      });
    }

    // Recording playback
    if (doc.appVisibility === 'RECORDED' && doc.recordingUrl) {
      return res.json({
        success: true,
        data: {
          type: 'recorded',
          playbackUrl: doc.recordingUrl,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Class playback is not currently available',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
