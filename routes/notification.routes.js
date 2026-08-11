import express from 'express';
import userAuth from '../middleware/userAuth.js';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import {
  createNotification,
  getAdminNotifications,
  deleteNotification,
  getNotificationStats,
  getAdminUsersForPicker,
  getAdminCoursesForPicker,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getUserNotificationSettings,
  updateUserNotificationSettings
} from '../controllers/notification.controller.js';

import upload from '../middleware/multer.js';

const router = express.Router();

// --- ADMIN ROUTES ---
router.post('/admin/create', verifyAdminToken, upload.single('image'), createNotification);
router.get('/admin/list', verifyAdminToken, getAdminNotifications);
router.delete('/admin/:id', verifyAdminToken, deleteNotification);
router.get('/admin/stats', verifyAdminToken, getNotificationStats);

// Admin Picker APIs (for user selector & course selector in Create Notification)
router.get('/admin/users', verifyAdminToken, getAdminUsersForPicker);
router.get('/admin/courses', verifyAdminToken, getAdminCoursesForPicker);

// --- USER ROUTES ---
router.get('/my-notifications', userAuth, getMyNotifications);
router.get('/unread-count', userAuth, getUnreadCount);
router.put('/mark-read/:id', userAuth, markAsRead);
router.put('/mark-all-read', userAuth, markAllAsRead);

router.get('/settings', userAuth, getUserNotificationSettings);
router.put('/settings', userAuth, updateUserNotificationSettings);

export default router;
