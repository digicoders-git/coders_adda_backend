import mongoose from 'mongoose';

const runTest = async () => {
  try {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    const targetCourse = new mongoose.Types.ObjectId('6a704bd69df7e66a8071781f');
    const enrolledUsers = await mongoose.connection.collection('users').find({ purchaseCourses: targetCourse }).toArray();
    enrolledUsers.forEach(u => console.log('User:', u.name, 'Mobile:', u.mobile));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
runTest();
