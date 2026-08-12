import { Notification, UserNotification, NotificationSetting, InstructorNotification } from '../models/notification.model.js';
import User from '../models/user.model.js';
import Instructor from '../models/instructor.model.js';
import cloudinary from '../config/cloudinary.js';
import admin from '../config/firebase.js';
import Course from '../models/course.model.js';
import Payment from '../models/payment.model.js';
import { sendEmail } from '../utils/sendEmail.js';

// --- ADMIN CONTROLLERS ---

export const createNotification = async (req, res) => {
  try {
    const { title, body, actionLink, priority, targetGroup, targetUsers, targetCourse, scheduledFor, type } = req.body;

    let imageUrl = req.body.image || '';
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, { folder: 'notifications' });
      if (uploadResult && uploadResult.secure_url) {
        imageUrl = uploadResult.secure_url;
      }
    }

    let parsedTargetUsers = targetUsers;
    if (typeof targetUsers === 'string') {
      try { parsedTargetUsers = JSON.parse(targetUsers); } catch (e) { parsedTargetUsers = [targetUsers]; }
    }

    const notification = new Notification({
      title, body, image: imageUrl, actionLink, priority, targetGroup,
      targetUsers: parsedTargetUsers, targetCourse, scheduledFor, type,
      status: scheduledFor ? 'Pending' : 'Sent'
    });

    await notification.save();

    if (!scheduledFor) {
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
    if (notification.targetGroup === 'Instructors') {
      const instructors = await Instructor.find({ isActive: true }).select('_id');
      if (instructors.length > 0) {
        const instructorNotifications = instructors.map(inst => ({
          instructorId: inst._id,
          notificationId: notification._id,
          isRead: false
        }));
        await InstructorNotification.insertMany(instructorNotifications, { ordered: false }).catch(() => {});
      }
      notification.status = 'Sent';
      await notification.save();
      return;
    }

    let usersQuery = {};

    if (notification.targetGroup === 'Specific' && notification.targetUsers?.length) {
      usersQuery._id = { $in: notification.targetUsers };
    } else if (notification.targetGroup === 'CourseEnrolled' && notification.targetCourse) {
      const enrolledUsers = await User.find({
        purchaseCourses: notification.targetCourse
      }).select('_id');
      const enrolledUserIds = enrolledUsers.map(u => u._id);
      if (enrolledUserIds.length === 0) return;
      usersQuery._id = { $in: enrolledUserIds };
    } else if (notification.targetGroup === 'Premium') {
      usersQuery.isSubscribed = true;
    }

    const users = await User.find(usersQuery).select('_id fcmToken');

    if (users.length === 0) return;

    const userNotifications = users.map(user => ({
      userId: user._id,
      notificationId: notification._id,
      isRead: false
    }));

    await UserNotification.insertMany(userNotifications, { ordered: false }).catch(() => {});

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

      if (notification.image) {
        message.notification.imageUrl = notification.image;
      }

      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunkTokens = tokens.slice(i, i + chunkSize);
        await admin.messaging().sendEachForMulticast({ ...message, tokens: chunkTokens })
          .then((response) => {
            console.log(`FCM send success: ${response.successCount}, failure: ${response.failureCount}`);
            if (response.failureCount > 0) {
              response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                  console.error(`FCM failure for token ${chunkTokens[idx]}:`, resp.error);
                }
              });
            }
          })
          .catch(err => {
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
export const sendCourseUpdateNotification = async (courseId, type, resourceTitle, customImage = '') => {
  try {
    const course = await Course.findById(courseId).select('title thumbnail priceType price');
    if (!course) return;

    const typeLabels = {
      NewLecture: { emoji: 'LECTURE', label: 'New Lecture Added' },
      NewTopic:   { emoji: 'TOPIC', label: 'New Topic Added' },
      NewNotes:   { emoji: 'NOTES', label: 'New Notes/PDF Added' },
      NewTest:    { emoji: 'TEST', label: 'New Test Added' },
      NewLive:    { emoji: 'LIVE', label: 'Live Stream Started' },
    };

    const info = typeLabels[type] || { emoji: 'UPDATE', label: 'Course Updated' };

    // If the course is free, target 'All' users. If paid, target only enrolled students.
    const isFree = course.priceType === 'free' || (course.price || 0) === 0;
    const targetGroup = isFree ? 'All' : 'CourseEnrolled';

    const notification = new Notification({
      title: `[${info.emoji}] ${info.label} - ${course.title}`,
      body: `"${resourceTitle}" is now available in your course. Start learning now!`,
      image: customImage || course.thumbnail?.url || '',
      actionLink: `/course-detail/${courseId}`,
      priority: 'Normal',
      targetGroup: targetGroup,
      targetCourse: courseId,
      type: type,
      status: 'Sent'
    });

    await notification.save();
    await processNotification(notification);

    console.log(`Auto-notification sent [${type}]: ${course.title} - ${resourceTitle}`);
  } catch (err) {
    console.error(`Auto-notification failed [${type}]:`, err.message);
  }
};

// --- AUTO TRIGGER: Quiz Notification ---
export const sendQuizNotification = async (quiz) => {
  try {
    const notification = new Notification({
      title: `New Quiz Available: ${quiz.title}`,
      body: `A new ${quiz.level || 'General'} level quiz is live! Challenge yourself now!`,
      actionLink: `/quiz`,
      priority: 'High',
      targetGroup: 'All',
      type: 'Quiz',
      status: 'Sent'
    });

    await notification.save();
    await processNotification(notification);

    console.log(`Quiz notification sent: ${quiz.title}`);
  } catch (err) {
    console.error('Quiz notification failed:', err.message);
  }
};

// --- AUTO TRIGGER: Ebook Notification ---
export const sendEbookNotification = async (ebook) => {
  try {
    const notification = new Notification({
      title: `New E-Book Published: ${ebook.title}`,
      body: `Check out our new e-book by ${ebook.authorName}. ${ebook.priceType === 'free' ? 'It is completely FREE!' : 'Grab your copy now!'}`,
      image: ebook.image?.url || '',
      actionLink: `/ebook-details/${ebook._id}`,
      priority: 'Normal',
      targetGroup: 'All',
      type: 'General',
      status: 'Sent'
    });

    await notification.save();
    await processNotification(notification);

    console.log(`Ebook notification sent: ${ebook.title}`);
  } catch (err) {
    console.error('Ebook notification failed:', err.message);
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

// --- AUTO TRIGGER: Certificate Notification ---
export const sendCertificateNotification = async (userId, courseId, certificateUrl) => {
  try {
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) return;

    const title = 'Certificate Earned!';
    const body = 'Congratulations ' + user.name + '! You have successfully completed "' + course.title + '".';

    // 1. Create Notification document targeting this specific user
    const notification = new Notification({
      title,
      body,
      actionLink: '/certificates',
      priority: 'High',
      targetGroup: 'Specific',
      targetUsers: [user._id],
      type: 'System',
      status: 'Sent'
    });

    await notification.save();

    // 2. processNotification handles UserNotification (in-app bell) + FCM push
    await processNotification(notification);

    // 3. Email with certificate attachment
    if (user.email) {
      const safeName = user.name || 'Student';
      const safeTitle = course.title || 'Course';
      const emailHtml = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">'
        + '<h2 style="color: #4CAF50; text-align: center;">Congratulations ' + safeName + '!</h2>'
        + '<p style="font-size: 16px; color: #333;">You have successfully completed the course <strong>' + safeTitle + '</strong>. Your certificate is attached to this email.</p>'
        + '<div style="text-align: center; margin: 30px 0;">'
        + '<a href="' + certificateUrl + '" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Your Certificate</a>'
        + '</div>'
        + '<p style="font-size: 14px; color: #666; text-align: center;">Keep learning and growing with CodersAdda!<br><em>The CodersAdda Team</em></p>'
        + '</div>';

      const safeFileName = 'Certificate_' + safeTitle.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
      const attachments = certificateUrl ? [{ filename: safeFileName, path: certificateUrl }] : [];

      await sendEmail(
        user.email,
        'Congratulations! Certificate for ' + safeTitle,
        body,
        emailHtml,
        attachments
      );
      console.log('[Notification] Certificate Email sent to ' + user.email);
    }
  } catch (error) {
    console.error('[Notification] Error sending certificate notification:', error);
  }
};
