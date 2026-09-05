import LiveSession from '../models/liveSession.model.js';

// GET /live-session/by-course/:courseId — student use
export const getSessionsByCourse = async (req, res) => {
  try {
    const sessions = await LiveSession.find({
      course: req.params.courseId,
      isActive: true,
    })
      .populate('course', 'title')
      .populate('teacher', 'fullName')
      .sort({ scheduledAt: -1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /live-session/upcoming — all upcoming sessions
export const getUpcomingSessions = async (req, res) => {
  try {
    const sessions = await LiveSession.find({
      status: { $in: ['scheduled', 'live'] },
      isActive: true,
    })
      .populate('course', 'title')
      .populate('teacher', 'fullName')
      .sort({ scheduledAt: 1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /live-session/:id — single session
export const getSessionById = async (req, res) => {
  try {
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
    const data = {
      ...req.body,
      playbackUrl: req.body.playbackUrl || process.env.IVS_PLAYBACK_URL || '',
      streamKey: req.body.streamKey || process.env.IVS_STREAM_KEY || '',
      ingestEndpoint: req.body.ingestEndpoint || process.env.IVS_INGEST_ENDPOINT || '',
    };
    const session = await LiveSession.create(data);
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
