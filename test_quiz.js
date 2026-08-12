import mongoose from 'mongoose';
import Quiz from './models/quiz.model.js';

const runTest = async () => {
  try {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    const quizzes = await mongoose.connection.collection('quizzes').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    quizzes.forEach(q => console.log(q.title, q.courseId));
    process.exit(0);
  } catch (error) {
    console.error('Test Error:', error);
    process.exit(1);
  }
};

runTest();
