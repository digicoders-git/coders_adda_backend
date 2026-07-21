import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

import express from 'express'
import connectDB from './config/db.js';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { adminRoute } from './routes/admin.route.js';
import CourseCategoryRoutes from './routes/courseCategory.routes.js';
import instructorRoute from './routes/instructor.routes.js';
import courseRoute from './routes/course.routes.js';
import CourseCurriculumRoute from './routes/courseCurriculum.routes.js';
import lectureRoute from './routes/lecture.routes.js';
import ebookRoute from './routes/ebook.routes.js';
import ebooksCategoryRoute from './routes/ebooksCategory.routes.js';
import jobRoute from './routes/job.routes.js';
import jobV3Route from './routes/jobV3.routes.js';
import subscriptionRoute from './routes/subscription.routes.js';
import sliderRoute from './routes/slider.routes.js';
import shortRoute from './routes/short.routes.js';
import shortLikeRoutes from './routes/shortLike.routes.js';
import shortCommentRoutes from './routes/shortComment.routes.js';
import shortShareRoute from './routes/shortShare.routes.js';
import userRoute from './routes/user.routes.js';
import adminUserRoutes from './routes/adminUser.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import paymentRoute from './routes/payment.routes.js';
import quizRoute from './routes/quiz.routes.js';
import adminCourseEnrollmentRoutes from './routes/adminCourseEnrollment.routes.js';
import adminEbookEnrollmentRoutes from './routes/adminEbookEnrollment.routes.js';
import adminJobEnrollmentRoutes from './routes/adminJobEnrollment.routes.js';
import adminSalesRoutes from './routes/adminSales.routes.js';
import ambassadorRoutes from './routes/ambassador.routes.js';
import certificateRoute from './routes/certificate.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import blogRoutes from './routes/blog.routes.js';
import reviewRoutes from './routes/review.routes.js';
import supportTicketRouter from './routes/supportTicket.routes.js';
import http from "http";
import { initSocket } from "./config/socket.js";
import "./cron/subscriptionExpiry.cron.js";

const app = express()
app.get('/course/check', (req, res) => res.json({ status: "SYSTEM READY", time: new Date().toISOString() }));
const port = process.env.PORT || 3000
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
const isRender = process.env.RENDER === "true";

const rootDir = isRender ? os.tmpdir() : __dirname;
const uploadDir = path.resolve(rootDir, "uploads");


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const subDirs = ["reviews", "blogs", "courses", "lectures", "users", "sliders", "certificates", "instructors"];
subDirs.forEach(dir => {
  const fullPath = path.resolve(uploadDir, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

app.use('/uploads', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(uploadDir));

try {
  await connectDB();
  console.log("✅ Database Connected Successfully");
} catch (error) {
  console.error("❌ Database Connection Failed:", error);
}

app.use('/admin', adminRoute)
app.use('/admin/users', adminUserRoutes)
app.use('/dashboard', dashboardRoutes)
app.use('/CourseCategory', CourseCategoryRoutes)
app.use('/instructor', instructorRoute)
app.use('/course', courseRoute)
app.use('/curriculum', CourseCurriculumRoute)
app.use('/lecture', lectureRoute)
app.use('/ebooks-category', ebooksCategoryRoute)
app.use('/ebook', ebookRoute)
app.use('/job', jobRoute)
app.use('/job-v3', jobV3Route)
app.use('/subscriptions', subscriptionRoute)
app.use('/sliders', sliderRoute)
app.use('/shorts', shortRoute)
app.use('/short-likes', shortLikeRoutes)
app.use('/short-comments', shortCommentRoutes)
app.use('/short-shares', shortShareRoute)
app.use('/users', userRoute)
app.use('/payment', paymentRoute)
app.use('/quiz', quizRoute)
app.use('/admin/course-enrollments', adminCourseEnrollmentRoutes)
app.use('/admin/ebook-enrollments', adminEbookEnrollmentRoutes)
app.use('/admin/job-enrollments', adminJobEnrollmentRoutes)
app.use('/admin/sales', adminSalesRoutes)
app.use('/ambassador', ambassadorRoutes)
app.use('/certificate', certificateRoute)
app.use('/coupon', couponRoutes)
app.use('/blog', blogRoutes)
app.use('/review', reviewRoutes)
app.use('/support-ticket', supportTicketRouter)


// 404 handler
app.use((req, res) =>
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));


// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: err.code || err.name || "UnknownError",
    details: err.message
  });
});

const server = http.createServer(app);

// init websocket
initSocket(server);

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
