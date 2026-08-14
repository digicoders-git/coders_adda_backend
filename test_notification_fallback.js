import dotenv from 'dotenv';
dotenv.config();
import { sendEmail } from './utils/sendEmail.js';

async function testFallback() {
  const user = { email: 'devdigicoders@gmail.com', name: 'Test User' };
  const safeTitle = 'Test Course';
  const certificateUrl = 'https://res.cloudinary.com/dazumf2fc/image/upload/v1738770281/certificates/issued/CERT-fake-404.png';
  
  const emailHtml = `<h1>Test Certificate</h1>`;
  const safeFileName = 'Certificate.png';
  const attachments = certificateUrl ? [{ filename: safeFileName, href: certificateUrl }] : [];

  console.log('Attempting to send email with attachment (expected to fail due to 404)...');
  let emailSent = await sendEmail(
    user.email,
    'Congratulations! Certificate for ' + safeTitle,
    'Body text',
    emailHtml,
    attachments
  );

  if (!emailSent && attachments.length > 0) {
    console.log('[Notification] Retrying email without attachment to ' + user.email);
    emailSent = await sendEmail(
      user.email,
      'Congratulations! Certificate for ' + safeTitle,
      'Body text',
      emailHtml,
      []
    );
  }

  if (emailSent) {
    console.log('[Notification] Certificate Email sent successfully!');
  } else {
    console.log('[Notification] Failed to send Certificate Email.');
  }
}

testFallback();
