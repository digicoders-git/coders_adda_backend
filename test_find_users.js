import mongoose from 'mongoose';
import User from './models/user.model.js';

const runTest = async () => {
  try {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    
    const targetCourse = "6a704bd69df7e66a8071781f";
    
    const enrolledUsers = await User.find({
      purchaseCourses: targetCourse
    }).select('_id');
    
    console.log('Enrolled Users:', enrolledUsers.length);
    console.log(enrolledUsers);
    
    const allUsers = await User.find({}).select('_id');
    console.log('All Users:', allUsers.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Test Error:', error);
    process.exit(1);
  }
};

runTest();
