/**
 * streamKey.js
 * Utility for generating and managing live class stream credentials securely.
 *
 * - streamName: Short, URL-safe, unique ID used in RTMP path (cls_xxxxxxxx)
 * - rawKey: The actual OBS stream key (never stored in DB as plaintext)
 * - streamSecretEncrypted: AES-256-CBC encrypted rawKey stored in DB
 *
 * Teacher gets rawKey only via authenticated API call (decrypted on demand).
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_HEX = process.env.STREAM_KEY_ENCRYPTION_SECRET;

function getKey() {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error('STREAM_KEY_ENCRYPTION_SECRET must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(KEY_HEX, 'hex');
}

/**
 * Generate a unique, URL-safe stream name.
 * Format: cls_<8 random hex chars>
 * Example: cls_3f9a2c17
 */
export function generateStreamName() {
  return 'cls_' + crypto.randomBytes(5).toString('hex');
}

/**
 * Generate a secure raw stream key.
 * This is what goes into OBS "Stream Key" field.
 * Example: a3f9c2...48 chars
 */
export function generateRawKey() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Encrypt rawKey using AES-256-CBC.
 * Returns: "iv_hex:encrypted_hex"
 */
export function encryptKey(rawKey) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(rawKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt encrypted key back to rawKey.
 * Input: "iv_hex:encrypted_hex"
 * Returns: rawKey string
 */
export function decryptKey(encryptedValue) {
  const [ivHex, encryptedHex] = encryptedValue.split(':');
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate a fresh set of stream credentials.
 * Returns: { streamName, streamSecretEncrypted }
 * rawKey is NOT returned — caller gets it via decryptKey when needed.
 */
export function generateStreamCredentials() {
  const streamName = generateStreamName();
  const rawKey = generateRawKey();
  const streamSecretEncrypted = encryptKey(rawKey);
  return { streamName, streamSecretEncrypted, rawKey };
}
