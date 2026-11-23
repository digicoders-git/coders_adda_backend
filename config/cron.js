import cron from 'node-cron';
import User from '../models/user.model.js';
import admin from './firebase.js';

export const initCronJobs = () => {
  // Run every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    try {
      console.log("Running Daily Profile Completion Reminder...");
      
      // Find users who have an fcmToken but are missing name or college
      const incompleteUsers = await User.find({
        fcmToken: { $exists: true, $ne: null },
        $or: [
          { fullName: { $exists: false } },
          { fullName: "" },
          { collegeName: { $exists: false } },
          { collegeName: "" }
        ]
      });

      if (incompleteUsers.length > 0) {
        const tokens = incompleteUsers.map(u => u.fcmToken);
        const message = {
          notification: {
            title: "Complete Your Profile! 📝",
            body: "A complete profile helps you get better opportunities. Update it now!",
          },
          tokens: tokens,
        };
        await admin.messaging().sendEachForMulticast(message);
        console.log(`Sent profile completion reminder to ${tokens.length} users.`);
      }
    } catch (error) {
      console.error("Error running profile completion cron job:", error);
    }
  });
};
