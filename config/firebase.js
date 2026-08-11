import dotenv from 'dotenv';
dotenv.config();

import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the serviceAccountKey.json is placed in the config folder
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

let messagingInstance = null;

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw.startsWith("'") && raw.endsWith("'")) {
      raw = raw.slice(1, -1);
    }
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT from environment variables.");
  }
} else if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
}

if (serviceAccount) {
  const app = initializeApp({
    credential: cert(serviceAccount)
  });
  messagingInstance = getMessaging(app);
  console.log('Firebase Admin initialized successfully');
} else {
  console.warn('Firebase Admin is not initialized. Please provide FIREBASE_SERVICE_ACCOUNT in .env or serviceAccountKey.json in the config folder.');
}

const admin = {
  messaging: () => {
    if (!messagingInstance) {
        throw new Error('Firebase Admin is not initialized. Please provide serviceAccountKey.json in the config folder.');
    }
    return messagingInstance;
  }
};

export default admin;
