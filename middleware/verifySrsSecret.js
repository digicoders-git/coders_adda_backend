/**
 * verifySrsSecret.js
 * Middleware to verify SRS callback requests are legitimate.
 * SRS must send header: X-SRS-Callback-Secret: <SRS_CALLBACK_SECRET>
 *
 * Any external request without this secret → 403.
 */

const verifySrsSecret = (req, res, next) => {
  const secret = process.env.SRS_CALLBACK_SECRET;

  if (!secret) {
    console.error('[verifySrsSecret] SRS_CALLBACK_SECRET not set in .env!');
    return res.status(500).json({ success: false, message: 'Server misconfiguration' });
  }

  const incoming = req.headers['x-srs-callback-secret'];

  if (!incoming || incoming !== secret) {
    console.warn(`[verifySrsSecret] Unauthorized callback from ${req.ip}`);
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  next();
};

export default verifySrsSecret;
