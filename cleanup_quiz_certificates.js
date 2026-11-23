/**
 * Run this script ONCE to clean up quiz certificates with localhost URLs.
 * Those old certs had localhost URLs which don't work on the mobile app.
 * After deletion, users can re-generate them and get Cloudinary URLs.
 * 
 * Usage: node cleanup_quiz_certificates.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const QuizCertificateSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  quiz: mongoose.Schema.Types.ObjectId,
  certificateUrl: String,
  certificateId: String,
  issuedAt: Date,
}, { timestamps: true });

const QuizCertificate = mongoose.model('QuizCertificate', QuizCertificateSchema);

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find all quiz certificates with localhost URLs
  const badCerts = await QuizCertificate.find({
    certificateUrl: { $regex: 'localhost', $options: 'i' }
  });

  console.log(`Found ${badCerts.length} quiz certificates with localhost URLs`);

  if (badCerts.length > 0) {
    badCerts.forEach(c => {
      console.log(`  - ${c.certificateId}: ${c.certificateUrl}`);
    });

    const result = await QuizCertificate.deleteMany({
      certificateUrl: { $regex: 'localhost', $options: 'i' }
    });
    console.log(`✅ Deleted ${result.deletedCount} bad certificates`);
    console.log('Users can now re-download and get fresh Cloudinary URLs');
  } else {
    console.log('✅ No bad certificates found — nothing to clean');
  }

  await mongoose.disconnect();
  console.log('Done!');
}

cleanup().catch(console.error);
