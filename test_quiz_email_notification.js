import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { sendQuizNotification } from './controllers/notification.controller.js';

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    
    console.log('Connected to DB. Triggering Quiz Notification Test...');
    
    const dummyQuiz = {
      title: 'Mega Advanced Flutter Quiz (Test)',
      level: 'Advanced'
    };

    await sendQuizNotification(dummyQuiz);
    
    console.log('Test completed successfully. Check emails and FCM logs.');
    
    // Allow some time for async emails to finish
    setTimeout(() => {
      process.exit(0);
    }, 15000);
  } catch (error) {
    console.error('Test Error:', error);
    process.exit(1);
  }
};

runTest();
