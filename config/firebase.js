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

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  const app = initializeApp({
    credential: cert(serviceAccount)
  });
  messagingInstance = getMessaging(app);
  console.log('Firebase Admin initialized successfully');
} else {
  console.warn('Firebase Admin is not initialized. Please provide serviceAccountKey.json in the config folder.');
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
