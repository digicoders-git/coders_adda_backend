import { Notification, UserNotification, NotificationSetting } from '../models/notification.model.js';
import User from '../models/user.model.js';
import admin from '../config/firebase.js';
import Course from '../models/course.model.js';

// --- ADMIN CONTROLLERS ---

export const createNotification = async (req, res) => {
  try {
    const { title, body, image, actionLink, priority, targetGroup, targetUsers, targetCourse, scheduledFor, type } = req.body;

    const notification = new Notification({
      title, body, image, actionLink, priority, targetGroup, targetUsers, targetCourse, scheduledFor, type,
      status: scheduledFor ? 'Pending' : 'Sent'
    });
    
    await notification.save();

    if (!scheduledFor) {
      // Send immediately
      await processNotification(notification);
    }

    return res.status(201).json({ success: true, message: 'Notification created', data: notification });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    await UserNotification.deleteMany({ notificationId: req.params.id });
    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getNotificationStats = async (req, res) => {
  try {
    const totalSent = await Notification.countDocuments({ status: 'Sent' });
    const totalPending = await Notification.countDocuments({ status: 'Pending' });
    
    const userStats = await UserNotification.aggregate([
      { $group: { _id: "$isRead", count: { $sum: 1 } } }
    ]);
    
    let readCount = 0;
    let unreadCount = 0;
    userStats.forEach(stat => {
      if(stat._id) readCount = stat.count;
      else unreadCount = stat.count;
    });

    const readRate = (readCount + unreadCount) > 0 ? (readCount / (readCount + unreadCount)) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalSent,
        totalPending,
        readCount,
        unreadCount,
        readRate: readRate.toFixed(2) + '%'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// --- CORE PROCESSOR ---
export const processNotification = async (notification) => {
  try {
    let usersQuery = { fcmToken: { $exists: true, $ne: null } };
    
    if (notification.targetGroup === 'Specific' && notification.targetUsers?.length) {
      usersQuery._id = { $in: notification.targetUsers };
    } else if (notification.targetGroup === 'CourseEnrolled' && notification.targetCourse) {
       const course = await Course.findById(notification.targetCourse).populate('enrolledStudents');
       if(course && course.enrolledStudents) {
         usersQuery._id = { $in: course.enrolledStudents.map(s => s._id) };
       }
    }

    const users = await User.find(usersQuery);
    
    const userNotifications = users.map(user => ({
      userId: user._id,
      notificationId: notification._id,
      isRead: false
    }));
    
    if (userNotifications.length > 0) {
      await UserNotification.insertMany(userNotifications);
    }
    
    const tokens = users.map(u => u.fcmToken);
    
    if (tokens.length > 0) {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          actionLink: notification.actionLink || '',
          type: notification.type || 'General'
        },
        android: {
          notification: {
            channelId: 'codersadda_notifications',
            sound: 'default'
          }
        }
      };
      
      if(notification.image) {
          message.notification.imageUrl = notification.image;
      }
      
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunkTokens = tokens.slice(i, i + chunkSize);
        await admin.messaging().sendEachForMulticast({ ...message, tokens: chunkTokens });
      }
    }
    
    notification.status = 'Sent';
    await notification.save();
    
  } catch (err) {
    console.error('Error processing notification:', err);
    notification.status = 'Failed';
    await notification.save();
  }
}

// --- USER CONTROLLERS ---

export const getMyNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const userNotifs = await UserNotification.find({ userId: req.user._id })
      .populate('notificationId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await UserNotification.countDocuments({ userId: req.user._id });

    const formatted = userNotifs.filter(un => un.notificationId).map(un => ({
      _id: un._id,
      notification: un.notificationId,
      isRead: un.isRead,
      createdAt: un.createdAt
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await UserNotification.countDocuments({ userId: req.user._id, isRead: false });
    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await UserNotification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true }
    );
    return res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await UserNotification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    return res.status(200).json({ success: true, message: 'All marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getUserNotificationSettings = async (req, res) => {
  try {
    let settings = await NotificationSetting.findOne({ userId: req.user._id });
    if (!settings) {
      settings = await NotificationSetting.create({ userId: req.user._id });
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateUserNotificationSettings = async (req, res) => {
  try {
    const settings = await NotificationSetting.findOneAndUpdate(
      { userId: req.user._id },
      { $set: req.body },
      { new: true, upsert: true }
    );
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
