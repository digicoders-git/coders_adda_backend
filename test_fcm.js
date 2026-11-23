import mongoose from 'mongoose';
import User from './models/user.model.js';

const runTest = async () => {
  try {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    
    const users = await User.find({}).select('_id name email fcmToken purchaseCourses');
    users.forEach(u => console.log(`User: ${u.name}, Enrolled: ${u.purchaseCourses.length}, Token: ${u.fcmToken}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Test Error:', error);
    process.exit(1);
  }
};

runTest();
