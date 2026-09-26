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

  // Stream info — filled manually by admin (any platform: YouTube, Zoom, Agora, etc.)
  playbackUrl: { type: String, default: '' },   // HLS / YouTube embed / Zoom link for students
  streamKey: { type: String, default: '' },      // Optional: OBS stream key (any platform)
  ingestEndpoint: { type: String, default: '' }, // Optional: RTMP ingest URL

  // Recording
  recordingUrl: { type: String, default: '' },
  recordingStatus: { type: String, enum: ['pending', 'recording', 'ready', 'failed'], default: 'pending' },

  thumbnailUrl: { type: String, default: '' },
  viewerCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('LiveSession', liveSessionSchema);
