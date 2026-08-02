import express from 'express';
import userAuth from '../middleware/userAuth.js';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import {
  createNotification,
  getAdminNotifications,
  deleteNotification,
  getNotificationStats,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getUserNotificationSettings,
  updateUserNotificationSettings
} from '../controllers/notification.controller.js';

const router = express.Router();

// --- ADMIN ROUTES ---
router.post('/admin/create', verifyAdminToken, createNotification);
router.get('/admin/list', verifyAdminToken, getAdminNotifications);
router.delete('/admin/:id', verifyAdminToken, deleteNotification);
router.get('/admin/stats', verifyAdminToken, getNotificationStats);

// --- USER ROUTES ---
router.get('/my-notifications', userAuth, getMyNotifications);
router.get('/unread-count', userAuth, getUnreadCount);
router.put('/mark-read/:id', userAuth, markAsRead);
router.put('/mark-all-read', userAuth, markAllAsRead);

router.get('/settings', userAuth, getUserNotificationSettings);
router.put('/settings', userAuth, updateUserNotificationSettings);

export default router;
