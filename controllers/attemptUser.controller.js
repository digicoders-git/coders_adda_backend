import AttemptUser from "../models/attemptUser.model.js";
import Quiz from "../models/quiz.model.js";
import QuestionTopic from "../models/questionTopic.model.js";
import QuizCertificateTemplate from "../models/quizCertificateTemplate.model.js";
import { generateQuizCertificate } from "../utils/quizCertificateGenerator.js";
import QuizCertificate from "../models/quizCertificate.model.js";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";

export const createAttempt = async (req, res) => {
  try {
    const { quizId, duration, answers } = req.body;
    const studentId = req.userId;

    if (!studentId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // 1. Fetch Quiz and the associated Topic
    const quiz = await Quiz.findById(quizId).populate("questionTopicId");
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    const topic = quiz.questionTopicId;
    if (!topic || !topic.questions) {
      return res.status(404).json({ success: false, message: "Quiz questions not found" });
    }

    // 2. Calculate Marks
    let marks = 0;
    const pointsPerQuestion = quiz.points || 1;

    // Filter questions if quiz has specific selected questions
    let quizQuestions = topic.questions;
    if (quiz.selectedQuestions && quiz.selectedQuestions.length > 0) {
      const selectedIds = quiz.selectedQuestions.map((id) => id.toString());
      quizQuestions = topic.questions.filter((q) =>
        selectedIds.includes(q._id.toString()),
      );
    }

    // Combine with custom manual questions
    if (quiz.customQuestions && quiz.customQuestions.length > 0) {
      quizQuestions = [...quizQuestions, ...quiz.customQuestions];
    }

    // Create a map or object for quick lookup of correct answers
    const correctAnswersMap = {};
    quizQuestions.forEach((q) => {
      correctAnswersMap[q._id.toString()] = q.correctAnswer;
    });

    // Validating answers
    answers.forEach((userAns) => {
      const correctAnswer = correctAnswersMap[userAns.questionId];
      if (correctAnswer && userAns.selectedOption === correctAnswer) {
        marks += pointsPerQuestion;
      }
    });

    const totalMarks = quizQuestions.length * pointsPerQuestion;

    // 3. Create Attempt Record
    const attempt = await AttemptUser.create({
      studentId,
      quizId,
      marks,
      totalMarks,
      duration, // Time taken by user (sent from frontend)
      answers
    });

    // 4. Update Quiz model to include this attempt ID
    await Quiz.findByIdAndUpdate(quizId, {
      $push: { attempts: attempt._id }
    });

    // 5. Automatic Certificate Logic
    let certificateIssued = false;
    let certificateDetails = null;

    if (quiz.certificateTemplate) {
      const template = await QuizCertificateTemplate.findById(quiz.certificateTemplate);
      if (template && template.status) {
        // You can add passing criteria here, e.g., marks >= totalMarks * 0.4
        // For now, any attempt generates a certificate if mark > 0
        if (marks > 0) {
          const certificate = await generateQuizCertificate(studentId, quizId, template);
          if (certificate) {
            certificateIssued = true;
            certificateDetails = certificate;
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Quiz attempt submitted and evaluated successfully",
      data: {
        attemptId: attempt._id,
        marks,
        totalMarks,
        duration: attempt.duration,
        submittedAt: attempt.submittedAt,
        certificateIssued,
        certificateDetails
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getMyAttempts = async (req, res) => {
  try {
    const studentId = req.userId;

    if (!studentId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const attempts = await AttemptUser.find({ studentId })
      .populate({
        path: "quizId",
        populate: { path: "questionTopicId" }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: attempts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getAttemptsByQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const attempts = await AttemptUser.find({ quizId }).populate("studentId");

    // Fetch all certificates for this quiz
    const certificates = await QuizCertificate.find({ quiz: quizId });
    const certifiedStudents = new Set(certificates.map(c => c.user.toString()));

    const data = attempts.map(attempt => {
      const attemptObj = attempt.toObject();
      return {
        ...attemptObj,
        certificateGenerated: certifiedStudents.has(attempt.studentId?._id?.toString())
      };
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getAttemptsByUser = async (req, res) => {
  try {
    const attempts = await AttemptUser.find({ studentId: req.params.studentId }).populate("quizId");
    res.json({
      success: true,
      data: attempts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= EXPORT SECTION ================= */

export const exportQuizReportExcel = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId).populate("questionTopicId");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const attempts = await AttemptUser.find({ quizId }).populate("studentId").sort({ marks: -1, duration: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Quiz Report");

    worksheet.columns = [
      { header: "Rank", key: "rank", width: 10 },
      { header: "Student Name", key: "name", width: 25 },
      { header: "Mobile", key: "mobile", width: 15 },
      { header: "College", key: "college", width: 30 },
      { header: "Marks", key: "marks", width: 10 },
      { header: "Total Marks", key: "totalMarks", width: 15 },
      { header: "Duration (min)", key: "duration", width: 15 },
      { header: "Accuracy (%)", key: "accuracy", width: 15 },
      { header: "Submitted At", key: "submittedAt", width: 20 },
    ];

    attempts.forEach((attempt, index) => {
      worksheet.addRow({
        rank: index + 1,
        name: attempt.studentId?.name || "N/A",
        mobile: attempt.studentId?.mobile || "N/A",
        college: attempt.studentId?.college || "N/A",
        marks: attempt.marks,
        totalMarks: attempt.totalMarks,
        duration: attempt.duration,
        accuracy: Math.round((attempt.marks / attempt.totalMarks) * 100),
        submittedAt: new Date(attempt.submittedAt).toLocaleString(),
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Quiz_Report_${quiz.title.replace(/\s+/g, "_")}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportUserQuizResultPDF = async (req, res) => {
  try {
    const { quizId, studentId } = req.params;
    const quiz = await Quiz.findById(quizId).populate("questionTopicId");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const attempt = await AttemptUser.findOne({ quizId, studentId }).populate("studentId");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    // Calculate Rank
    const allAttempts = await AttemptUser.find({ quizId }).sort({ marks: -1, duration: 1 });
    const rank = allAttempts.findIndex(a => a.studentId.toString() === studentId) + 1;

    const doc = new jsPDF();
    let questions = quiz.questionTopicId?.questions || [];

    // Respect selected questions
    if (quiz.selectedQuestions && quiz.selectedQuestions.length > 0) {
      const selectedIds = quiz.selectedQuestions.map((id) => id.toString());
      questions = questions.filter((q) =>
        selectedIds.includes(q._id.toString()),
      );
    }

    // Add custom questions
    if (quiz.customQuestions && quiz.customQuestions.length > 0) {
      questions = [...questions, ...quiz.customQuestions];
    }

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Quiz Assessment Result", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Quiz Title: ${quiz.title}`, 14, 30);
    doc.text(`Quiz Code: ${quiz.quizCode}`, 14, 36);

    doc.setFont("helvetica", "bold");
    doc.text("Student Information:", 110, 30);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${attempt.studentId?.name || "N/A"}`, 110, 36);
    doc.text(`Mobile: ${attempt.studentId?.mobile || "N/A"}`, 110, 42);
    doc.text(`College: ${attempt.studentId?.college || "N/A"}`, 110, 48);

    doc.setLineWidth(0.5);
    doc.line(14, 52, 196, 52);

    doc.setFont("helvetica", "bold");
    doc.text(`Rank: #${rank} / ${allAttempts.length}`, 14, 60);
    doc.text(`Total Score: ${attempt.marks} / ${attempt.totalMarks}`, 70, 60);
    doc.text(`Time Taken: ${attempt.duration} mins`, 140, 60);

    let yPos = 80;

    questions.forEach((q, index) => {
      const studentAnsObj = attempt.answers?.find(ans => String(ans.questionId) === String(q._id));
      const charToIdx = { a: 0, b: 1, c: 2, d: 3 };
      const studentOptionIndex = studentAnsObj ? charToIdx[studentAnsObj.selectedOption?.toLowerCase()] : -1;
      const correctIdx = ["a", "b", "c", "d"].indexOf(q.correctAnswer.toLowerCase());

      const isAttempted = studentOptionIndex !== -1;
      const isCorrect = isAttempted && studentOptionIndex === correctIdx;

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const splitQuestion = doc.splitTextToSize(`Q${index + 1}: ${q.question}`, 170);
      doc.text(splitQuestion, 14, yPos);
      yPos += splitQuestion.length * 6 + 2;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const options = [q.options.a, q.options.b, q.options.c, q.options.d];
      const labels = ["A", "B", "C", "D"];

      options.forEach((opt, optIdx) => {
        const isThisCorrect = optIdx === correctIdx;
        const isThisStudentChoice = isAttempted && optIdx === studentOptionIndex;

        let indicator = "";
        if (isThisCorrect) {
          doc.setTextColor(0, 150, 0);
          indicator = "  (Correct)";
        } else if (isThisStudentChoice && !isCorrect) {
          doc.setTextColor(200, 0, 0);
          indicator = "  (Wrong)";
        } else {
          doc.setTextColor(0, 0, 0);
        }

        const fullText = `[${labels[optIdx]}] ${opt}${indicator}`;
        const splitOpt = doc.splitTextToSize(fullText, 160);
        doc.text(splitOpt, 20, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += splitOpt.length * 6;
      });

      yPos += 2;
      doc.setFont("helvetica", "italic");
      if (!isAttempted) {
        doc.setTextColor(100, 100, 100);
        doc.text("Result: Not Attempted", 20, yPos);
      } else if (!isCorrect) {
        doc.setTextColor(200, 0, 0);
        doc.text(`Result: Incorrect (Selected: ${labels[studentOptionIndex]}, Correct: ${labels[correctIdx]})`, 20, yPos);
      } else {
        doc.setTextColor(0, 150, 0);
        doc.text("Result: Correct", 20, yPos);
      }
      doc.setTextColor(0, 0, 0);
      yPos += 12;
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Result_${attempt.studentId?.name.replace(/\s+/g, "_")}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
