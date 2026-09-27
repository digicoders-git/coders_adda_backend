import LiveSession from '../models/liveSession.model.js';
import LiveClass from '../models/liveClass.model.js';

const hlsBase = process.env.SRS_HLS_BASE || 'https://live.codersadda.com/live';

// Helper to format LiveClass to Flutter LiveSession model shape
const formatLiveClassForApp = (doc) => {
  let appStatus = 'scheduled';
  if (doc.appVisibility === 'LIVE' || doc.status === 'LIVE') {
    appStatus = 'live';
  } else if (doc.status === 'SCHEDULED') {
    appStatus = 'scheduled';
  } else {
    appStatus = 'ended';
  }

  const playbackUrl = doc.streamName ? `${hlsBase}/${doc.streamName}.m3u8` : '';

  return {
    _id: doc._id,
    id: doc._id,
    title: doc.title,
    course: doc.courseId ? {
      _id: doc.courseId._id || doc.courseId,
      title: doc.courseId.title || 'Course',
    } : null,
    teacher: doc.instructorId ? {
      _id: doc.instructorId._id || doc.instructorId,
      fullName: doc.instructorId.fullName || 'Instructor',
    } : null,
    teacherName: doc.instructorId?.fullName || 'Instructor',
    topic: doc.topic || doc.description || doc.title,
    scheduledAt: doc.scheduledAt,
    durationMinutes: doc.expectedDurationMinutes || 60,
    status: appStatus,
    playbackUrl: playbackUrl,
    recordingUrl: doc.recordingUrl || '',
    thumbnailUrl: doc.thumbnailUrl || '',
    viewerCount: 0,
    isLiveClass: true,
  };
};

// GET /live-session/by-course/:courseId — student use
export const getSessionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Fetch modern LiveClass records
    const liveClasses = await LiveClass.find({
      courseId,
      status: { $ne: 'CANCELLED' },
      appVisibility: { $in: ['LIVE', 'RECORDED', 'HIDDEN'] },
    })
      .populate('courseId', 'title')
      .populate('instructorId', 'fullName')
      .sort({ scheduledAt: -1 })
      .lean();

    // Fetch legacy LiveSession records
    const legacySessions = await LiveSession.find({
      course: courseId,
      isActive: true,
    })
      .populate('course', 'title')
      .populate('teacher', 'fullName')
      .sort({ scheduledAt: -1 })
      .lean();

    const formattedLiveClasses = liveClasses.map(formatLiveClassForApp);
    const combined = [...formattedLiveClasses, ...legacySessions];

    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /live-session/upcoming — all upcoming sessions
export const getUpcomingSessions = async (req, res) => {
  try {
    const liveClasses = await LiveClass.find({
      status: { $in: ['SCHEDULED', 'LIVE_HIDDEN', 'LIVE'] },
    })
      .populate('courseId', 'title')
      .populate('instructorId', 'fullName')
      .sort({ scheduledAt: 1 })
      .lean();

    const legacySessions = await LiveSession.find({
      status: { $in: ['scheduled', 'live'] },
      isActive: true,
    })
      .populate('course', 'title')
      .populate('teacher', 'fullName')
      .sort({ scheduledAt: 1 })
      .lean();

    const formattedLiveClasses = liveClasses.map(formatLiveClassForApp);
    const combined = [...formattedLiveClasses, ...legacySessions];

    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /live-session/:id — single session
export const getSessionById = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id)
      .populate('courseId', 'title')
      .populate('instructorId', 'fullName')
      .lean();

    if (liveClass) {
      return res.json(formatLiveClassForApp(liveClass));
    }

    const session = await LiveSession.findById(req.params.id)
      .populate('course', 'title')
      .populate('teacher', 'fullName');

    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /live-session/admin/create — admin create
export const createSession = async (req, res) => {
  try {
    const session = await LiveSession.create(req.body);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /live-session/admin/:id — admin update (status, recordingUrl etc)
export const updateSession = async (req, res) => {
  try {
    const session = await LiveSession.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /live-session/admin/all — admin list all
export const getAllSessions = async (req, res) => {
  try {
    const sessions = await LiveSession.find()
      .populate('course', 'title')
      .populate('teacher', 'fullName')
      .sort({ scheduledAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /live-session/admin/:id
export const deleteSession = async (req, res) => {
  try {
    await LiveSession.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

