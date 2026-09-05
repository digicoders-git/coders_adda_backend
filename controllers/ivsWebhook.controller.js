import LiveSession from '../models/liveSession.model.js';

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

export const handleIvsWebhook = async (req, res) => {
  try {
    // Security check
    const secret = req.headers['x-webhook-secret'];
    if (process.env.IVS_WEBHOOK_SECRET && secret !== process.env.IVS_WEBHOOK_SECRET) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const event = req.body;
    console.log('IVS EVENT:', JSON.stringify(event, null, 2));

    const detailType = event['detail-type'];
    const detail = event.detail || {};

    // Stream Start — save streamId to match later
    if (detailType === 'IVS Stream State Change' && detail.stream_id) {
      await LiveSession.findOneAndUpdate(
        { status: 'live' },
        { $set: { streamId: detail.stream_id } },
        { sort: { updatedAt: -1 } }
      );
      return res.status(200).json({ success: true, message: 'streamId saved' });
    }

    // Recording End — save recording URL
    if (
      detailType === 'IVS Recording State Change' &&
      detail.recording_status === 'Recording End'
    ) {
      const prefix = detail.recording_s3_key_prefix || '';
      const hlsKey = `${prefix}/media/hls/master.m3u8`;

      let recordingUrl = '';
      if (CLOUDFRONT_DOMAIN) {
        recordingUrl = `https://${CLOUDFRONT_DOMAIN}/${hlsKey}`;
      } else {
        // Direct S3 URL fallback (public bucket only)
        const bucket = detail.recording_s3_bucket_name || '';
        recordingUrl = `https://${bucket}.s3.amazonaws.com/${hlsKey}`;
      }

      // Match by streamId first, fallback to most recent ended session
      let session = null;
      if (detail.stream_id) {
        session = await LiveSession.findOneAndUpdate(
          { streamId: detail.stream_id },
          {
            $set: {
              recordingUrl,
              recordingStatus: 'ready',
              status: 'ended',
            },
          },
          { new: true }
        );
      }

      // Fallback — most recently ended session without recording
      if (!session) {
        session = await LiveSession.findOneAndUpdate(
          { status: 'ended', recordingUrl: '' },
          {
            $set: {
              recordingUrl,
              recordingStatus: 'ready',
            },
          },
          { sort: { updatedAt: -1 }, new: true }
        );
      }

      console.log('Recording saved:', recordingUrl, '→ session:', session?._id);
      return res.status(200).json({ success: true, recordingUrl });
    }

    return res.status(200).json({ success: true, message: 'Event ignored' });
  } catch (err) {
    console.error('IVS Webhook error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
