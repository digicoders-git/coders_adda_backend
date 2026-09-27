/**
 * liveClass.routes.js
 * Unified routes for the live class system.
 *
 * Prefix in server.js:
 *   app.use('/live-class', liveClassRoutes);
 *   app.use('/internal/srs', srsCallbackRoutes);
 */

import express from 'express';

// Middleware
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import verifyInstructorToken from '../middleware/verifyInstructorToken.js';
import userAuth from '../middleware/userAuth.js';

// Admin controllers
import {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassStats,
  getLiveClassById,
  updateLiveClass,
  deleteLiveClass,
  showOnApp,
  hideFromApp,
  cancelLiveClass,
} from '../controllers/liveClass.admin.controller.js';

// Instructor controllers
import {
  getMyClasses,
  getObsConfig,
  regenStreamKey,
} from '../controllers/liveClass.instructor.controller.js';

// Student controllers
import {
  getClassesByCourse,
  getUpcomingByCourse,
  getPlaybackUrl,
} from '../controllers/liveClass.student.controller.js';

const router = express.Router();

// ── Admin Routes (verifyAdminToken) ──────────────────────────────────────────
router.get('/admin/stats', verifyAdminToken, getLiveClassStats);
router.get('/admin/all', verifyAdminToken, getAllLiveClasses);
router.get('/admin/:id', verifyAdminToken, getLiveClassById);
router.post('/admin', verifyAdminToken, createLiveClass);
router.patch('/admin/:id', verifyAdminToken, updateLiveClass);
router.delete('/admin/:id', verifyAdminToken, deleteLiveClass);
router.post('/admin/:id/show-on-app', verifyAdminToken, showOnApp);
router.post('/admin/:id/hide-from-app', verifyAdminToken, hideFromApp);
router.post('/admin/:id/cancel', verifyAdminToken, cancelLiveClass);

// ── Instructor Routes (verifyInstructorToken) ─────────────────────────────────
router.get('/instructor/my-classes', verifyInstructorToken, getMyClasses);
router.get('/instructor/classes', verifyInstructorToken, getMyClasses); // alias
router.get('/instructor/:id/obs-config', verifyInstructorToken, getObsConfig);
router.get('/instructor/classes/:id/obs', verifyInstructorToken, getObsConfig); // alias
router.post('/instructor/:id/regen-key', verifyInstructorToken, regenStreamKey);
router.post('/instructor/classes/:id/regenerate-key', verifyInstructorToken, regenStreamKey); // alias

// ── Student Routes (userAuth) ──────────────────────────────────────────────
router.get('/student/by-course/:courseId', userAuth, getClassesByCourse);
router.get('/student/upcoming/:courseId', getUpcomingByCourse); // Public — no auth
router.get('/student/:id/play', userAuth, getPlaybackUrl);

export default router;
