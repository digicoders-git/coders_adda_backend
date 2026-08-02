import express from 'express';
import { sendNotificationToUser, sendNotificationToAll } from '../controllers/notification.controller.js';
import verifyAdminToken from '../middleware/verifyAdminToken.js';

const notificationRoute = express.Router();

// Route to send a notification to a specific user (Admin only)
notificationRoute.post('/send', verifyAdminToken, sendNotificationToUser);

// Route to broadcast a notification to all users (Admin only)
notificationRoute.post('/broadcast', verifyAdminToken, sendNotificationToAll);

export default notificationRoute;
