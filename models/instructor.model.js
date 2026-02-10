import mongoose from "mongoose";

const instructorSchema = new mongoose.Schema({
  instructorId: {
    type: String,
    unique: true
  },

  fullName: {
    type: String,
    required: true
  },

  email: {
    type: String,
    unique: true,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    required: true
  },

  isActive: {
    type: Boolean,
    default: true
  },

  totalEarnings: {
    type: Number,
    default: 0
  },

  courseEarnings: [
    {
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
      },
      earnedAmount: {
        type: Number,
        default: 0
      },
      totalRevenue: {
        type: Number,
        default: 0
      },
      salesCount: {
        type: Number,
        default: 0
      }
    }
  ]

}, { timestamps: true });


// ⚠️ IMPORTANT: NEVER use arrow function here
instructorSchema.pre("save", async function () {

  // Only for new document
  if (!this.isNew) return;

  const lastInstructor = await mongoose.model("Instructor").findOne().sort({ createdAt: -1 });

  let nextNumber = 1001;

  if (lastInstructor && lastInstructor.instructorId) {
    const lastNo = parseInt(lastInstructor.instructorId.replace("INS", ""));
    nextNumber = lastNo + 1;
  }

  this.instructorId = "INS" + nextNumber;
});


const Instructor = mongoose.model("Instructor", instructorSchema);
export default Instructor;
