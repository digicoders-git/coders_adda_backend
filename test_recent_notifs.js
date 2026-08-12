import mongoose from 'mongoose';
import { Notification } from './models/notification.model.js';

const runTest = async () => {
  try {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    const notifs = await Notification.find().sort({createdAt: -1}).limit(2);
    console.log(JSON.stringify(notifs, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
runTest();
