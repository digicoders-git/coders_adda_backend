/**
 * liveClass.instructor.controller.js
 * Instructor-only APIs.
 * Auth: verifyInstructorToken → req.instructor
 */

import LiveClass from '../models/liveClass.model.js';
import { decryptKey, generateStreamCredentials } from '../utils/streamKey.js';

/**
 * GET /live-class/instructor/my-classes
 * Get all classes assigned to this instructor.
 */
export const getMyClasses = async (req, res) => {
  try {
    const instructorId = req.instructor?.id || req.instructor?._id;

    const classes = await LiveClass.find({ instructorId })
      .sort({ scheduledAt: -1 })
      .populate('courseId', 'title')
      .select('-streamSecretEncrypted')
      .lean();

    return res.json({ success: true, data: classes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /live-class/instructor/:id/obs-config
 * Return OBS configuration with DECRYPTED stream key.
 * Key is decrypted on-demand — never stored in DB as plaintext.
 *
 * Response is in-memory only; instructor should copy and not save.
 */
export const getObsConfig = async (req, res) => {
  try {
    const instructorId = req.instructor?.id || req.instructor?._id;

    // Fetch WITH encrypted key (select: false override)
    const doc = await LiveClass.findById(req.params.id)
      .select('+streamSecretEncrypted')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'Class not found' });

    // Ensure instructor owns this class
    if (doc.instructorId.toString() !== instructorId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Only allow config access for scheduled/live_hidden/live statuses
    const ALLOWED = ['SCHEDULED', 'LIVE_HIDDEN', 'LIVE'];
    if (!ALLOWED.includes(doc.status)) {
      return res.status(400).json({
        success: false,
        message: `OBS config not available for class in status: ${doc.status}`,
      });
    }

    if (!doc.streamSecretEncrypted || !doc.streamName) {
      return res.status(500).json({ success: false, message: 'Stream credentials not generated' });
    }

    // Decrypt key for this response only
    const streamKey = decryptKey(doc.streamSecretEncrypted);

    return res.json({
      success: true,
      data: {
        server: 'rtmp://live.codersadda.com/live',
        streamKey,
        streamName: doc.streamName,
        note: 'Keep this stream key private. Do not share.',
        expiresNote: 'Valid for this class only. Regenerate if compromised.',
      },
    });
  } catch (err) {
    console.error('[getObsConfig]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /live-class/instructor/:id/regen-key
 * Regenerate stream key (e.g. if instructor thinks it was leaked).
 * Class must not be currently LIVE.
 */
export const regenStreamKey = async (req, res) => {
  try {
    const instructorId = req.instructor?.id || req.instructor?._id;

    const doc = await LiveClass.findById(req.params.id)
      .select('+streamSecretEncrypted');

    if (!doc) return res.status(404).json({ success: false, message: 'Class not found' });

    if (doc.instructorId.toString() !== instructorId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (['LIVE', 'LIVE_HIDDEN'].includes(doc.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot regenerate key while class is live',
      });
    }

    const { streamName, streamSecretEncrypted, rawKey } = generateStreamCredentials();
    doc.streamName = streamName;
    doc.streamSecretEncrypted = streamSecretEncrypted;
    await doc.save();

    return res.json({
      success: true,
      message: 'Stream key regenerated. Update your OBS settings.',
      data: {
        server: 'rtmp://live.codersadda.com/live',
        streamKey: rawKey,
        streamName,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
