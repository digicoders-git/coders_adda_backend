/**
 * srsCallback.controller.js
 * Handles SRS HTTP callback events:
 *   - on_publish:   OBS started streaming → status = LIVE_HIDDEN
 *   - on_unpublish: OBS stopped streaming → status = ENDED
 *   - on_dvr:       Recording file ready → FFmpeg compression → status = RECORDED
 *
 * Security: All routes protected by verifySrsSecret middleware.
 * SRS must send header: X-SRS-Callback-Secret: <SRS_CALLBACK_SECRET>
 *
 * SRS response protocol:
 *   Return HTTP 200 with body "0" → SRS allows action
 *   Return HTTP 200 with body "1" or non-200 → SRS rejects action (stream rejected)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import LiveClass from '../models/liveClass.model.js';

// ── on_publish ───────────────────────────────────────────────────────────────

/**
 * POST /internal/srs/on-publish
 * Called by SRS when OBS starts streaming to rtmp://live.codersadda.com/live/{stream}
 *
 * Body from SRS 5:
 * { action: "on_publish", vhost: "__defaultVhost__", app: "live", stream: "cls_xxxx", ... }
 */
export const handleOnPublish = async (req, res) => {
  const { stream } = req.body;
  console.log(`[SRS on_publish] stream=${stream}`);

  if (!stream) {
    console.warn('[SRS on_publish] No stream name in request');
    return res.status(200).send('1'); // Reject unknown streams
  }

  try {
    const liveClass = await LiveClass.findOne({ streamName: stream });

    if (!liveClass) {
      console.warn(`[SRS on_publish] No LiveClass found for streamName: ${stream} — REJECTING`);
      return res.status(200).send('1'); // Reject: unknown stream
    }

    // Only allow streaming if class is in a valid pre-live state
    const ALLOWED_STATUSES = ['SCHEDULED', 'LIVE_HIDDEN', 'LIVE'];
    if (!ALLOWED_STATUSES.includes(liveClass.status)) {
      console.warn(`[SRS on_publish] Class ${liveClass._id} in status ${liveClass.status} — REJECTING`);
      return res.status(200).send('1');
    }

    // Update to LIVE_HIDDEN — admin must click "Show on App" to make visible
    await LiveClass.updateOne(
      { _id: liveClass._id },
      {
        $set: {
          status: 'LIVE_HIDDEN',
          liveStartedAt: liveClass.liveStartedAt || new Date(),
        },
      }
    );

    console.log(`[SRS on_publish] ✅ Class ${liveClass._id} → LIVE_HIDDEN`);
    return res.status(200).send('0'); // Accept stream
  } catch (err) {
    console.error('[SRS on_publish] Error:', err.message);
    return res.status(200).send('1'); // Reject on error (safe default)
  }
};

// ── on_unpublish ─────────────────────────────────────────────────────────────

/**
 * POST /internal/srs/on-unpublish
 * Called by SRS when OBS stops streaming.
 *
 * Body: { action: "on_unpublish", app: "live", stream: "cls_xxxx", ... }
 */
export const handleOnUnpublish = async (req, res) => {
  const { stream } = req.body;
  console.log(`[SRS on_unpublish] stream=${stream}`);

  if (!stream) return res.status(200).send('0');

  try {
    const result = await LiveClass.updateOne(
      {
        streamName: stream,
        status: { $in: ['LIVE_HIDDEN', 'LIVE'] },
      },
      {
        $set: {
          status: 'ENDED',
          appVisibility: 'HIDDEN',
          liveEndedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[SRS on_unpublish] ✅ stream=${stream} → ENDED`);
    } else {
      console.warn(`[SRS on_unpublish] No matching class for stream=${stream}`);
    }

    return res.status(200).send('0');
  } catch (err) {
    console.error('[SRS on_unpublish] Error:', err.message);
    return res.status(200).send('0'); // Always return 0 for unpublish (non-critical)
  }
};

// ── on_dvr ───────────────────────────────────────────────────────────────────

/**
 * POST /internal/srs/on-dvr
 * Called by SRS when DVR recording file is finalized.
 *
 * Body from SRS 5:
 * {
 *   action: "on_dvr",
 *   app: "live",
 *   stream: "cls_xxxx",
 *   file: "/usr/local/srs/objs/nginx/html/dvr/cls_xxxx.mp4"
 * }
 */
export const handleOnDvr = async (req, res) => {
  const { stream, file } = req.body;
  console.log(`[SRS on_dvr] stream=${stream}, file=${file}`);

  // Always acknowledge SRS immediately
  res.status(200).send('0');

  if (!stream || !file) {
    console.warn('[SRS on_dvr] Missing stream or file');
    return;
  }

  // Run FFmpeg processing async (after response sent)
  try {
    const liveClass = await LiveClass.findOne({ streamName: stream });

    if (!liveClass) {
      console.warn(`[SRS on_dvr] No class found for stream=${stream}`);
      return;
    }

    // Map SRS container path to host path
    // SRS container: /usr/local/srs/objs/nginx/html/dvr/cls_xxx.mp4
    // Host mount:    /var/srs_dvr/cls_xxx.mp4
    const DVR_BASE = process.env.SRS_DVR_BASE || '/var/srs_dvr';
    const DVR_PUBLIC_BASE = process.env.SRS_DVR_PUBLIC_BASE || 'https://live.codersadda.com/dvr';

    const filename = path.basename(file);
    const rawPath = path.join(DVR_BASE, filename);
    const finalFilename = filename.replace('.mp4', '_final.mp4');
    const finalPath = path.join(DVR_BASE, finalFilename);

    // Verify raw file exists
    if (!fs.existsSync(rawPath)) {
      console.warn(`[SRS on_dvr] Raw file not found: ${rawPath}`);
      await LiveClass.updateOne({ _id: liveClass._id }, {
        $set: { recordingStatus: 'FAILED' },
      });
      return;
    }

    // Update to PROCESSING
    await LiveClass.updateOne(
      { _id: liveClass._id },
      {
        $set: {
          status: 'PROCESSING',
          recordingStatus: 'PROCESSING',
          recordingRawPath: rawPath,
        },
      }
    );

    console.log(`[DVR] Starting FFmpeg: ${rawPath} → ${finalPath}`);

    // Spawn FFmpeg compression
    await runFfmpegCompression(rawPath, finalPath);

    // Verify output exists and has size
    const stats = fs.statSync(finalPath);
    if (!stats.size) throw new Error('FFmpeg output file is empty');

    // Delete original raw file
    fs.unlinkSync(rawPath);
    console.log(`[DVR] Raw file deleted: ${rawPath}`);

    // Get duration via FFprobe (optional — spawn separate)
    const durationSec = await getVideoDuration(finalPath).catch(() => 0);

    const recordingUrl = `${DVR_PUBLIC_BASE}/${finalFilename}`;

    // Update class as RECORDED
    await LiveClass.updateOne(
      { _id: liveClass._id },
      {
        $set: {
          status: 'RECORDED',
          appVisibility: 'RECORDED',
          recordingStatus: 'READY',
          recordingFinalPath: finalPath,
          recordingUrl,
          durationSeconds: durationSec,
          fileSizeBytes: stats.size,
        },
      }
    );

    console.log(`[DVR] ✅ Class ${liveClass._id} → RECORDED. URL: ${recordingUrl}`);
  } catch (err) {
    console.error('[SRS on_dvr] Processing error:', err.message);
    // Mark as FAILED so admin can manually retry
    try {
      const liveClass = await LiveClass.findOne({ streamName: stream });
      if (liveClass) {
        await LiveClass.updateOne(
          { _id: liveClass._id },
          { $set: { recordingStatus: 'FAILED', status: 'ENDED' } }
        );
      }
    } catch (e2) {
      console.error('[SRS on_dvr] Failed to update failure status:', e2.message);
    }
  }
};

// ── FFmpeg Helpers ────────────────────────────────────────────────────────────

/**
 * Run FFmpeg to compress raw recording.
 * Target: ~900MB → ~400MB with CRF 28, fast preset.
 */
function runFfmpegCompression(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', // Overwrite output if exists
      outputPath,
    ];

    console.log(`[FFmpeg] Running: ffmpeg ${args.join(' ')}`);

    const proc = spawn('ffmpeg', args, { stdio: 'pipe' });

    proc.stderr.on('data', (data) => {
      // FFmpeg writes progress to stderr — log selectively
      const line = data.toString();
      if (line.includes('frame=') || line.includes('time=') || line.includes('Error')) {
        process.stdout.write(`[FFmpeg] ${line}`);
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[FFmpeg] ✅ Done: ${outputPath}`);
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

/**
 * Get video duration in seconds using ffprobe.
 */
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      filePath,
    ]);

    let output = '';
    proc.stdout.on('data', (d) => (output += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const json = JSON.parse(output);
          resolve(Math.round(parseFloat(json.format?.duration || '0')));
        } catch {
          resolve(0);
        }
      } else {
        reject(new Error('ffprobe failed'));
      }
    });
  });
}
