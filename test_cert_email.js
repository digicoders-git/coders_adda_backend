import dotenv from 'dotenv';
dotenv.config();
import { sendEmail } from './utils/sendEmail.js';

async function test() {
  const url = 'https://res.cloudinary.com/dazumf2fc/image/upload/v1738770281/certificates/issued/CERT-1738770275815-1815.png'; // fake 404 url
  const attachments = [{ filename: 'test_cert.png', href: url }]; // using href
  const res = await sendEmail(
    'test@example.com',
    'Test Cert',
    'Test Body',
    '<h1>Test HTML</h1>',
    attachments
  );
  console.log('Result:', res);
}
test();
