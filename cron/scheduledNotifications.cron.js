import cron from 'node-cron';
import { Notification } from '../models/notification.model.js';
import { processNotification } from '../controllers/notification.controller.js';

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Find notifications that are Pending and scheduled for now or in the past
    const pendingNotifications = await Notification.find({
      status: 'Pending',
      scheduledFor: { $lte: now }
    });

    if (pendingNotifications.length > 0) {
      console.log(`[CRON] Found ${pendingNotifications.length} scheduled notifications to process.`);
      
      for (const notif of pendingNotifications) {
        await processNotification(notif);
      }
    }
  } catch (error) {
    console.error('[CRON] Error processing scheduled notifications:', error);
  }
});
