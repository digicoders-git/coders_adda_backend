import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda';

await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB');

// Get first course
const course = await mongoose.connection.db.collection('courses').findOne({}, { projection: { _id: 1, title: 1 } });
console.log('📚 Using course:', course._id, course.title);

// Insert test live session
const result = await mongoose.connection.db.collection('livesessions').insertOne({
  title: 'Test Live Class - State Management',
  topic: 'Flutter State Management',
  course: course._id,
  teacherName: 'Test Teacher',
  scheduledAt: new Date(),
  durationMinutes: 120,
  status: 'live',
  playbackUrl: 'https://563c3edfec85.us-east-1.playback.live-video.net/api/video/v1/us-east-1.659925004178.channel.1GrjtewZQKHG.m3u8',
  streamKey: 'sk_us-east-1_2l5d3Klux77M_1FFa2wEdLzz61U6h1CzPYFOaLWsjcO',
  ingestEndpoint: 'rtmps://563c3edfec85.global-contribute.live-video.net:443/app/',
  recordingUrl: '',
  viewerCount: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log('✅ Live session inserted:', result.insertedId);
console.log('📋 Course ID to test in app:', course._id.toString());

await mongoose.disconnect();
process.exit(0);
