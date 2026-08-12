import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL || 'devdigicoders@gmail.com',
        pass: process.env.SMTP_PASSWORD // Requires App Password if using Gmail
      }
    });

    const isArray = Array.isArray(to);
    const mailOptions = {
      from: `"CodersAdda" <${process.env.SMTP_EMAIL || 'devdigicoders@gmail.com'}>`,
      to: isArray ? process.env.SMTP_EMAIL || 'devdigicoders@gmail.com' : to, // send to self if array
      bcc: isArray ? to : undefined,
      subject,
      text,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    return false;
  }
};
