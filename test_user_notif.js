import mongoose from 'mongoose';
import { Notification } from './models/notification.model.js';
import User from './models/user.model.js';

const runTest = async () => {
  try {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    
    // Find the latest notification
    const latestNotif = await Notification.findOne().sort({ createdAt: -1 });
    console.log('Latest Notification:', latestNotif.title, 'Target Group:', latestNotif.targetGroup);
    
    // Check how many user notifications were created
    const userNotifs = await mongoose.connection.collection('usernotifications').find({ notificationId: latestNotif._id }).toArray();
    console.log('Number of UserNotifications created:', userNotifs.length);
    
    if (latestNotif.targetGroup === 'CourseEnrolled') {
      const courseId = latestNotif.targetCourse;
      console.log('Target Course:', courseId);
      const enrolled = await User.find({ purchaseCourses: courseId });
      console.log('Number of users enrolled in this course:', enrolled.length);
    }

    process.exit(0);
  } catch (error) {
    console.error('Test Error:', error);
    process.exit(1);
  }
};

runTest();
