import mongoose from 'mongoose';
import Lecture from './models/lecture.model.js';
import UserProgress from './models/UserProgress.js';

async function check() {
  await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
  
  const progresses = await UserProgress.aggregate([
    { $group: { _id: { user: '$user', course: '$course' }, completed: { $sum: { $cond: ['$isCompleted', 1, 0] } } } },
    { $sort: { completed: -1 } },
    { $limit: 1 }
  ]);
  
  if (!progresses.length) {
    console.log('No progress');
    return process.exit(0);
  }
  
  const best = progresses[0];
  const activeLecturesCount = await Lecture.countDocuments({ course: best._id.course, isActive: true });
  
  console.log('Best Progress User:', best._id.user, 'Course:', best._id.course);
  console.log('Completed:', best.completed, 'Active Lectures:', activeLecturesCount);
  
  const notActiveCount = await Lecture.countDocuments({ course: best._id.course, isActive: false });
  console.log('Inactive lectures count:', notActiveCount);

  process.exit(0);
}

check().catch(console.error);
