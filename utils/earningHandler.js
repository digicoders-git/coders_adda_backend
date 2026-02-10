import Course from "../models/course.model.js";
import Instructor from "../models/instructor.model.js";

/**
 * Calculates and adds earnings to the instructor after a successful course purchase.
 * @param {string} courseId - The ID of the purchased course.
 * @param {number} amountPaid - The amount the student paid for the course.
 */
export const calculateInstructorEarning = async (courseId, amountPaid) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      console.error(`Course with ID ${courseId} not found for earning calculation.`);
      return;
    }

    const instructorId = course.instructor;
    const percentage = course.priceForInstructor || 15; // default to 15 if not set

    const instructorEarned = (amountPaid * percentage) / 100;

    // Update Instructor Model
    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      console.error(`Instructor with ID ${instructorId} not found.`);
      return;
    }

    // Update total earnings
    instructor.totalEarnings = (instructor.totalEarnings || 0) + instructorEarned;

    // Update per-course earnings
    const courseEarningIndex = instructor.courseEarnings.findIndex(
      (item) => item.course.toString() === courseId.toString()
    );

    if (courseEarningIndex !== -1) {
      // Exist: increment
      instructor.courseEarnings[courseEarningIndex].earnedAmount += instructorEarned;
      instructor.courseEarnings[courseEarningIndex].totalRevenue += amountPaid;
      instructor.courseEarnings[courseEarningIndex].salesCount += 1;
    } else {
      // New entry: push
      instructor.courseEarnings.push({
        course: courseId,
        earnedAmount: instructorEarned,
        totalRevenue: amountPaid,
        salesCount: 1,
      });
    }

    await instructor.save();
    console.log(`Earned ${instructorEarned} for instructor ${instructorId} on course ${courseId}`);
  } catch (error) {
    console.error("Error calculating instructor earning:", error);
  }
};
