import admin from '../config/firebase.js';
import User from '../models/user.model.js';

export const sendNotificationToUser = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ success: false, message: "userId, title, and body are required" });
    }

    const user = await User.findById(userId);

    if (!user || !user.fcmToken) {
      return res.status(404).json({ success: false, message: "User or FCM token not found" });
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: user.fcmToken,
    };

    const response = await admin.messaging().send(message);
    
    return res.status(200).json({ success: true, message: "Notification sent successfully", response });
  } catch (error) {
    console.error("Send notification error:", error);
    return res.status(500).json({ success: false, message: "Failed to send notification", error: error.message });
  }
};

export const sendNotificationToAll = async (req, res) => {
  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: "title and body are required" });
    }

    const users = await User.find({ fcmToken: { $exists: true, $ne: null } });
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "No users with FCM tokens found" });
    }

    const tokens = users.map(user => user.fcmToken);

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    return res.status(200).json({ 
      success: true, 
      message: `Notifications sent: ${response.successCount} successful, ${response.failureCount} failed`,
      response 
    });
  } catch (error) {
    console.error("Broadcast notification error:", error);
    return res.status(500).json({ success: false, message: "Failed to broadcast notification", error: error.message });
  }
};
