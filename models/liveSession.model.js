import mongoose from 'mongoose';

const liveSessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  topic: { type: String, default: '' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' },
  teacherName: { type: String, default: '' },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 60 },
  status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
  playbackUrl: { type: String, default: '' },
  streamKey: { type: String, default: '' },
  ingestEndpoint: { type: String, default: '' },
  recordingUrl: { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  viewerCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('LiveSession', liveSessionSchema);
