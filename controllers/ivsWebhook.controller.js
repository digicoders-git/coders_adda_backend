// AWS IVS webhook has been removed.
// Live class streaming is now handled manually (admin enters stream/playback URLs directly).
// This file is kept as a placeholder in case a future webhook integration is needed.

export const handleIvsWebhook = async (req, res) => {
  return res.status(200).json({ success: true, message: 'Webhook endpoint disabled (AWS IVS removed)' });
};
