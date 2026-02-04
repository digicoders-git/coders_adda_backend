import express from 'express'
import connectDB from './config/db.js';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { adminRoute } from './routes/admin.route.js';
import CourseCategoryRoutes from './routes/courseCategory.routes.js';
import instructorRoute from './routes/instructor.routes.js';
import courseRoute from './routes/course.routes.js';
import CourseCurriculumRoute from './routes/courseCurriculum.routes.js';
import lectureRoute from './routes/lecture.routes.js';
import ebookRoute from './routes/ebook.routes.js';
import ebooksCategoryRoute from './routes/ebooksCategory.routes.js';
import jobRoute from './routes/job.routes.js';
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
import http from "http";
import { initSocket } from "./config/socket.js";
dotenv.config()
import "./cron/subscriptionExpiry.cron.js";

const app = express()
const port = process.env.PORT || 3000
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

await connectDB();

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


// 404 handler
app.use((req, res) =>
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));


// app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

const server = http.createServer(app);

// init websocket
initSocket(server);

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
