import mongoose from 'mongoose';
import Quiz from './models/quiz.model.js';

const runTest = async () => {
  try {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    const test = await Quiz.findOne({ title: /Final Push Notification Test/i });
    console.log('Test:', test.title, 'startSmsSent:', test.startSmsSent);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
runTest();
