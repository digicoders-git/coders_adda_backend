/**
 * liveClass.admin.controller.js
 * Admin-only APIs for managing live classes.
 * Auth: verifyAdminToken → req.admin
 */

import LiveClass from '../models/liveClass.model.js';
import Instructor from '../models/instructor.model.js';
import Course from '../models/course.model.js';
import { generateStreamCredentials } from '../utils/streamKey.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

const safeClass = (doc) => {
  // Never expose streamSecretEncrypted in any admin response
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj.streamSecretEncrypted;
  return obj;
};

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /live-class/admin
 * Schedule a new live class. Generates stream credentials automatically.
 */
export const createLiveClass = async (req, res) => {
  try {
    const {
      courseId,
      instructorId,
      title,
      topic,
      description,
      scheduledAt,
      expectedDurationMinutes,
    } = req.body;

    if (!courseId || !instructorId || !title || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'courseId, instructorId, title, scheduledAt are required',
      });
    }

    // Validate references exist
    const [course, instructor] = await Promise.all([
      Course.findById(courseId).select('title thumbnail'),
      Instructor.findById(instructorId).select('fullName'),
    ]);

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!instructor) return res.status(404).json({ success: false, message: 'Instructor not found' });

    // Handle thumbnail
    const getBaseUrl = () => {
      const b = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      return b.includes("onrender.com") ? "https://api.codersadda.com" : b;
    };

    let thumbnailUrl = req.body.thumbnailUrl || '';
    if (req.file) {
      thumbnailUrl = `${getBaseUrl()}/uploads/courses/thumbnails/${req.file.filename}`;
    } else if (!thumbnailUrl && course?.thumbnail) {
      thumbnailUrl = course.thumbnail.url || course.thumbnail.localUrl || (typeof course.thumbnail === 'string' ? course.thumbnail : '');
    }

    // Generate stream credentials
    const { streamName, streamSecretEncrypted } = generateStreamCredentials();

    const liveClass = await LiveClass.create({
      courseId,
      instructorId,
      title,
      topic: topic || '',
      description: description || '',
      thumbnailUrl: thumbnailUrl || '',
      scheduledAt: new Date(scheduledAt),
      expectedDurationMinutes: Number(expectedDurationMinutes) || 60,
      streamName,
      streamSecretEncrypted,
      status: 'SCHEDULED',
      appVisibility: 'HIDDEN',
      createdBy: req.admin?._id || req.admin?.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Live class scheduled successfully',
      data: safeClass(liveClass),
    });
  } catch (err) {
    console.error('[createLiveClass]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /live-class/admin/all
 * List all live classes with course + instructor info.
 */
export const getAllLiveClasses = async (req, res) => {
  try {
    const classes = await LiveClass.find()
      .sort({ scheduledAt: -1 })
      .populate('courseId', 'title thumbnail')
      .populate('instructorId', 'fullName')
      .select('-streamSecretEncrypted')
      .lean();

    return res.json({ success: true, data: classes });
  } catch (err) {
    console.error('[getAllLiveClasses]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /live-class/admin/stats
 * Count by status for dashboard header.
 */
export const getLiveClassStats = async (req, res) => {
  try {
    const [scheduled, live, processing, recorded, liveHidden] = await Promise.all([
      LiveClass.countDocuments({ status: 'SCHEDULED' }),
      LiveClass.countDocuments({ status: 'LIVE' }),
      LiveClass.countDocuments({ status: 'PROCESSING' }),
      LiveClass.countDocuments({ status: 'RECORDED' }),
      LiveClass.countDocuments({ status: 'LIVE_HIDDEN' }),
    ]);

    return res.json({
      success: true,
      data: { scheduled, liveHidden, live, processing, recorded },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /live-class/admin/:id
 * Single class detail.
 */
export const getLiveClassById = async (req, res) => {
  try {
    const doc = await LiveClass.findById(req.params.id)
      .populate('courseId', 'title')
      .populate('instructorId', 'fullName')
      .select('-streamSecretEncrypted')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'Class not found' });

    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /live-class/admin/:id
 * Update class details (title, description, scheduledAt, instructor, etc.)
 * Cannot change status directly via this route (use dedicated routes).
 */
export const updateLiveClass = async (req, res) => {
  try {
    const BLOCKED_FIELDS = ['status', 'appVisibility', 'streamName', 'streamSecretEncrypted', 'recordingStatus'];
    BLOCKED_FIELDS.forEach((f) => delete req.body[f]);

    if (req.file) {
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      req.body.thumbnailUrl = `${baseUrl}/uploads/courses/thumbnails/${req.file.filename}`;
    }

    const doc = await LiveClass.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .select('-streamSecretEncrypted')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'Class not found' });

    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /live-class/admin/:id
 * Delete a class (only if not LIVE or PROCESSING).
 */
export const deleteLiveClass = async (req, res) => {
  try {
    const doc = await LiveClass.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Class not found' });

    if (['LIVE', 'LIVE_HIDDEN', 'PROCESSING'].includes(doc.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete a class with status: ${doc.status}`,
      });
    }

    await doc.deleteOne();
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /live-class/admin/:id/show-on-app
 * Make class visible to students (admin confirms stream looks good).
 * status must be LIVE_HIDDEN.
 */
export const showOnApp = async (req, res) => {
  try {
    const doc = await LiveClass.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Class not found' });

    if (doc.status !== 'LIVE_HIDDEN') {
      return res.status(400).json({
        success: false,
        message: `Class must be in LIVE_HIDDEN state to show on app. Current: ${doc.status}`,
      });
    }

    doc.status = 'LIVE';
    doc.appVisibility = 'LIVE';
    await doc.save();

    return res.json({ success: true, message: 'Class is now visible to students', data: safeClass(doc) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /live-class/admin/:id/hide-from-app
 * Hide a live class from students (emergency hide).
 */
export const hideFromApp = async (req, res) => {
  try {
    const doc = await LiveClass.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Class not found' });

    if (doc.status !== 'LIVE') {
      return res.status(400).json({ success: false, message: 'Class is not currently LIVE' });
    }

    doc.status = 'LIVE_HIDDEN';
    doc.appVisibility = 'HIDDEN';
    await doc.save();

    return res.json({ success: true, message: 'Class hidden from students', data: safeClass(doc) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /live-class/admin/:id/cancel
 * Cancel a scheduled class.
 */
export const cancelLiveClass = async (req, res) => {
  try {
    const doc = await LiveClass.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Class not found' });

    if (!['SCHEDULED'].includes(doc.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only SCHEDULED classes can be cancelled',
      });
    }

    doc.status = 'CANCELLED';
    doc.appVisibility = 'HIDDEN';
    await doc.save();

    return res.json({ success: true, message: 'Class cancelled', data: safeClass(doc) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
