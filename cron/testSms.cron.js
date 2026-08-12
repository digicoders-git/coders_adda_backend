import cron from 'node-cron';
import Quiz from '../models/quiz.model.js';

import { sendQuizNotification } from '../controllers/notification.controller.js';

cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Find all tests and quizzes that are starting right now (or have already started) and haven't sent start SMS
    const pendingTests = await Quiz.find({
      type: { $in: ['Test', 'Quiz', null, ''] },
      scheduledStartTime: { $lte: now },
      startSmsSent: false,
      status: true
    });

    if (pendingTests.length > 0) {
      console.log(`[CRON] Found ${pendingTests.length} tests starting now to send SMS for.`);

      for (const test of pendingTests) {
        // Only send Push Notification (App Notification)
        await sendQuizNotification(test, true);
        console.log(`[CRON] Auto Push Notification triggered for ${test.title}.`);
        
        test.startSmsSent = true;
        await test.save();
      }
    }
  } catch (error) {
    console.error('[CRON] Error processing test start SMS:', error);
  }
});
