import { Notification, UserNotification, NotificationSetting } from '../models/notification.model.js';
import User from '../models/user.model.js';
import admin from '../config/firebase.js';
import Course from '../models/course.model.js';
import Payment from '../models/payment.model.js';

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
    const { type, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .populate('targetCourse', 'title')
      .populate('targetUsers', 'name mobile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({ success: true, data: notifications, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
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
    const totalFailed = await Notification.countDocuments({ status: 'Failed' });
    
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

    // Type breakdown
    const typeBreakdown = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalSent,
        totalPending,
        totalFailed,
        readCount,
        unreadCount,
        readRate: readRate.toFixed(2) + '%',
        typeBreakdown
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// --- ADMIN PICKER HELPERS ---

export const getAdminUsersForPicker = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('_id name mobile email profilePicture fcmToken')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({ success: true, data: users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getAdminCoursesForPicker = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .select('_id title thumbnail technology')
      .sort({ title: 1 });
    return res.status(200).json({ success: true, data: courses });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// --- CORE PROCESSOR ---
export const processNotification = async (notification) => {
  try {
    let usersQuery = {};
    
    if (notification.targetGroup === 'Specific' && notification.targetUsers?.length) {
      // Specific users
      usersQuery._id = { $in: notification.targetUsers };
    } else if (notification.targetGroup === 'CourseEnrolled' && notification.targetCourse) {
      // Use Payment model to find enrolled users (Course model has no enrolledStudents field)
      const payments = await Payment.find({
        itemType: 'course',
        itemId: notification.targetCourse,
        status: 'success'
      }).select('user');
      const enrolledUserIds = payments.map(p => p.user);
      if (enrolledUserIds.length === 0) return; // No enrolled users
      usersQuery._id = { $in: enrolledUserIds };
    } else if (notification.targetGroup === 'Premium') {
      // Users with active subscription purchases (placeholder logic)
      usersQuery.isSubscribed = true;
    }
    // For 'All', no filter needed — send to everyone with fcmToken

    const users = await User.find(usersQuery).select('_id fcmToken');
    
    if (users.length === 0) return;

    // Save UserNotification records for in-app bell
    const userNotifications = users.map(user => ({
      userId: user._id,
      notificationId: notification._id,
      isRead: false
    }));
    
    await UserNotification.insertMany(userNotifications, { ordered: false }).catch(() => {});
    
    // FCM Push — only for users who have fcmToken
    const tokens = users.map(u => u.fcmToken).filter(t => t && t.length > 10);
    
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
      
      // Send in chunks of 500 (FCM limit)
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunkTokens = tokens.slice(i, i + chunkSize);
        await admin.messaging().sendEachForMulticast({ ...message, tokens: chunkTokens }).catch(err => {
          console.error('FCM send error:', err.message);
        });
      }
    }
    
    notification.status = 'Sent';
    await notification.save();
    
  } catch (err) {
    console.error('Error processing notification:', err);
    notification.status = 'Failed';
    await notification.save();
  }
};

// --- AUTO TRIGGER: Course Update Notification ---
// Called automatically when lecture/topic/notes/PDF is added to a course
// type: 'NewLecture' | 'NewTopic' | 'NewNotes' | 'NewTest'
export const sendCourseUpdateNotification = async (courseId, type, resourceTitle, customImage = '') => {
  try {
    const course = await Course.findById(courseId).select('title thumbnail');
    if (!course) return;

    const typeLabels = {
      NewLecture: { emoji: '🎬', label: 'New Lecture Added' },
      NewTopic:   { emoji: '📚', label: 'New Topic Added' },
      NewNotes:   { emoji: '📄', label: 'New Notes/PDF Added' },
      NewTest:    { emoji: '📝', label: 'New Test Added' },
      NewLive:    { emoji: '🔴', label: 'Live Stream Started' },
    };

    const info = typeLabels[type] || { emoji: '🔔', label: 'Course Updated' };

    const notification = new Notification({
      title: `${info.emoji} ${info.label} — ${course.title}`,
      body: `"${resourceTitle}" is now available in your course. Start learning now!`,
      image: customImage || course.thumbnail?.url || '',
      actionLink: `/course-detail/${courseId}`,
      priority: 'Normal',
      targetGroup: 'CourseEnrolled',
      targetCourse: courseId,
      type: type,
      status: 'Sent'
    });

    await notification.save();
    await processNotification(notification);

    console.log(`✅ Auto-notification sent [${type}]: ${course.title} — ${resourceTitle}`);
  } catch (err) {
    console.error(`❌ Auto-notification failed [${type}]:`, err.message);
  }
};

// --- AUTO TRIGGER: Quiz Notification ---
// Called when a new quiz is created — notify ALL users
export const sendQuizNotification = async (quiz) => {
  try {
    const notification = new Notification({
      title: `🧠 New Quiz Available: ${quiz.title}`,
      body: `A new ${quiz.level || 'General'} level quiz is live! ${quiz.totalQuestions} questions. Challenge yourself now!`,
      actionLink: `/quiz`,
      priority: 'High',
      targetGroup: 'All',
      type: 'Quiz',
      status: 'Sent'
    });

    await notification.save();
    await processNotification(notification);

    console.log(`✅ Quiz notification sent: ${quiz.title}`);
  } catch (err) {
    console.error('❌ Quiz notification failed:', err.message);
  }
};

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
