/**
 * srsCallback.routes.js
 * Internal-only routes for SRS HTTP callbacks.
 *
 * Prefix in server.js:
 *   app.use('/internal/srs', srsCallbackRoutes);
 *
 * All routes protected by verifySrsSecret middleware.
 * SRS must include header: X-SRS-Callback-Secret: <SRS_CALLBACK_SECRET>
 */

import express from 'express';
import verifySrsSecret from '../middleware/verifySrsSecret.js';
import {
  handleOnPublish,
  handleOnUnpublish,
  handleOnDvr,
} from '../controllers/srsCallback.controller.js';

const router = express.Router();

// SRS sends POST with JSON body
router.post('/on-publish', verifySrsSecret, handleOnPublish);
router.post('/on-unpublish', verifySrsSecret, handleOnUnpublish);
router.post('/on-dvr', verifySrsSecret, handleOnDvr);

export default router;
