import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Lecture from './models/lecture.model.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const lecture = await Lecture.findOne({ title: 'Introduction Of HTML' });
    if (lecture) {
      console.log('Lecture Found:');
      console.log('Privacy:', lecture.privacy);
      console.log('Course ID:', lecture.course);
    } else {
      console.log('Lecture not found.');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
