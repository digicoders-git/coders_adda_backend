import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './models/user.model.js';
import Quiz from './models/quiz.model.js';
import QuizCertificateTemplate from './models/quizCertificateTemplate.model.js';
import { generateQuizCertificate } from './utils/quizCertificateGenerator.js';
import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    console.log('Connected to DB. Testing Certificate Logic for 0 marks...');
    
    // Find a valid user
    const user = await User.findOne({ email: { $exists: true, $ne: '' } });
    const quiz = await Quiz.findOne({});
    
    // 1. Create a dummy image
    const dummyImageDir = path.join(process.cwd(), 'uploads', 'quiz-certificates');
    if (!fs.existsSync(dummyImageDir)) {
      fs.mkdirSync(dummyImageDir, { recursive: true });
    }
    const dummyImagePath = path.join(dummyImageDir, 'dummy.png');
    
    const cvs = createCanvas(1200, 800);
    const cctx = cvs.getContext('2d');
    cctx.fillStyle = '#ffffff';
    cctx.fillRect(0, 0, 1200, 800);
    cctx.fillStyle = '#000000';
    cctx.font = '30px Arial';
    cctx.fillText('Dummy Certificate Background', 100, 100);
    
    fs.writeFileSync(dummyImagePath, cvs.toBuffer('image/png'));
    console.log(`Created dummy image at ${dummyImagePath}`);
    
    const validTemplate = new QuizCertificateTemplate({
      quiz: quiz._id,
      status: true,
      certificateImage: dummyImagePath,
      width: 1200,
      height: 800,
      studentName: { x: 500, y: 400, fontSize: 40, color: '#000000', status: true },
      quizTitle: { x: 500, y: 500, fontSize: 30, color: '#000000', status: true },
      score: { x: 500, y: 600, fontSize: 20, color: '#000000', status: true },
      date: { x: 500, y: 700, fontSize: 20, color: '#000000', status: true },
      certificateId: { x: 500, y: 750, fontSize: 20, color: '#000000', status: true }
    });
    
    console.log(`Testing for User: ${user.email}, Quiz: ${quiz._id}`);
    
    const certificate = await generateQuizCertificate(user._id, quiz._id, validTemplate, {
      totalScore: '0 / 100',
    });
    
    if (certificate) {
      console.log('✅ Certificate generated successfully for 0 marks!', certificate.certificateUrl);
    } else {
      console.log('❌ Failed to generate certificate.');
    }
    
    setTimeout(() => {
      process.exit(0);
    }, 15000);
  } catch (error) {
    console.error('Test Error:', error);
    process.exit(1);
  }
};

runTest();
