import mongoose from 'mongoose';
import UserNotification from './models/userNotification.model.js';
import { Notification } from './models/notification.model.js';

const runTest = async () => {
  try {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    
    const notif = await Notification.findOne({ title: /Final Push/i });
    if(notif) {
      const userNotifs = await UserNotification.find({ notificationId: notif._id });
      console.log('User Notifications created:', userNotifs.length);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
runTest();
