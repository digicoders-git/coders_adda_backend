import mongoose from 'mongoose';
import User from './models/user.model.js';
import { Notification } from './models/notification.model.js';

const runTest = async () => {
  try {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    
    const notification = await Notification.findOne({ title: /Final Push/i });
    console.log('Target Course:', notification.targetCourse);
    
    let usersQuery = {};
    if (notification.targetGroup === 'CourseEnrolled' && notification.targetCourse) {
      const enrolledUsers = await User.find({
        purchaseCourses: notification.targetCourse
      }).select('_id fcmToken');
      console.log('Enrolled Users found:', enrolledUsers.length);
      console.log(enrolledUsers);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
runTest();
