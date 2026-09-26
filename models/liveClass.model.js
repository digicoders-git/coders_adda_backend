/**
 * liveClass.model.js
 * Production model for CodersAdda live classes.
 *
 * State Machine:
 * SCHEDULED → LIVE_HIDDEN → LIVE → ENDED → PROCESSING → RECORDED
 *           ↘ CANCELLED
 */

import mongoose from 'mongoose';

const liveClassSchema = new mongoose.Schema(
  {
    // ── Course & Batch ──────────────────────────────────
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },

    // ── Instructor ──────────────────────────────────────
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      required: true,
    },

    // ── Basic Info ──────────────────────────────────────
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    expectedDurationMinutes: {
      type: Number,
      default: 60,
    },

    // ── Stream Credentials ──────────────────────────────
    // streamName: used in RTMP path → rtmp://live.codersadda.com/live/{streamName}
    streamName: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // Encrypted rawKey (AES-256-CBC). Decrypted on-demand for teacher OBS config.
    // NEVER return this field directly to any client.
    streamSecretEncrypted: {
      type: String,
      select: false, // excluded from all queries by default
    },

    // ── Status ──────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'SCHEDULED',    // Created, not yet live
        'LIVE_HIDDEN',  // Stream started, hidden from students
        'LIVE',         // Visible + joinable by students
        'ENDED',        // Stream stopped
        'PROCESSING',   // FFmpeg compression running
        'RECORDED',     // Recording ready
        'CANCELLED',    // Admin cancelled
      ],
      default: 'SCHEDULED',
      index: true,
    },

    // Controls what students see in the app
    appVisibility: {
      type: String,
      enum: [
        'HIDDEN',       // Not visible to students
        'LIVE',         // Students see live join button
        'RECORDED',     // Students see recording
      ],
      default: 'HIDDEN',
    },

    // ── Recording ───────────────────────────────────────
    recordingStatus: {
      type: String,
      enum: ['NONE', 'PROCESSING', 'READY', 'FAILED'],
      default: 'NONE',
    },

    // Path on disk from SRS DVR (e.g. /var/srs_dvr/cls_xxxx.mp4)
    recordingRawPath: {
      type: String,
      default: '',
    },

    // Final compressed recording path on disk
    recordingFinalPath: {
      type: String,
      default: '',
    },

    // Public URL for students to watch (via live.codersadda.com/dvr/...)
    recordingUrl: {
      type: String,
      default: '',
    },

    // File metadata
    durationSeconds: {
      type: Number,
      default: 0,
    },

    fileSizeBytes: {
      type: Number,
      default: 0,
    },

    // ── Timestamps ──────────────────────────────────────
    liveStartedAt: { type: Date },
    liveEndedAt: { type: Date },

    // ── Meta ────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast course + status queries (student feed)
liveClassSchema.index({ courseId: 1, status: 1 });
liveClassSchema.index({ courseId: 1, appVisibility: 1 });

export default mongoose.model('LiveClass', liveClassSchema);
