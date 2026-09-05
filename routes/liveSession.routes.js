import express from 'express';
import {
  getSessionsByCourse,
  getUpcomingSessions,
  getSessionById,
  createSession,
  updateSession,
  getAllSessions,
  deleteSession,
} from '../controllers/liveSession.controller.js';

const router = express.Router();

// Student routes
router.get('/upcoming', getUpcomingSessions);
router.get('/by-course/:courseId', getSessionsByCourse);
router.get('/:id', getSessionById);

// Admin routes
router.get('/admin/all', getAllSessions);
router.post('/admin/create', createSession);
router.put('/admin/:id', updateSession);
router.delete('/admin/:id', deleteSession);

export default router;
