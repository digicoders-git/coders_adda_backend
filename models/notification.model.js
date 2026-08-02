import mongoose from "mongoose";

export const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  actionLink: {
    type: String,
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Critical'],
    default: 'Normal'
  },
  targetGroup: {
    type: String,
    enum: ['All', 'Premium', 'Free', 'Specific', 'CourseEnrolled'],
    default: 'All'
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  targetCourse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  scheduledFor: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Pending', 'Sent', 'Failed'],
    default: 'Sent'
  },
  type: {
    type: String,
    default: 'General'
  }
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);

export const userNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const UserNotification = mongoose.model('UserNotification', userNotificationSchema);

export const notificationSettingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  courseUpdates: { type: Boolean, default: true },
  quiz: { type: Boolean, default: true },
  test: { type: Boolean, default: true },
  liveClasses: { type: Boolean, default: true },
  offers: { type: Boolean, default: true },
  studyReminder: { type: Boolean, default: true },
  assignment: { type: Boolean, default: true },
  currentAffairs: { type: Boolean, default: true },
  payments: { type: Boolean, default: true },
  announcements: { type: Boolean, default: true }
}, { timestamps: true });

export const NotificationSetting = mongoose.model('NotificationSetting', notificationSettingSchema);
