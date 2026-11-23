import express from 'express';
import { handleIvsWebhook } from '../controllers/ivsWebhook.controller.js';

const router = express.Router();

// POST /webhooks/ivs-recording
router.post('/ivs-recording', handleIvsWebhook);

export default router;
