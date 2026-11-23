import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    a: { type: String, required: true },
    b: { type: String, required: true },
    c: { type: String, required: true },
    d: { type: String, required: true }
  },
  correctAnswer: {
    type: String,
    required: true,
    enum: ["a", "b", "c", "d"]
  }
});

const questionTopicSchema = new mongoose.Schema(
  {
    topicName: { type: String, required: true },
    status: { type: Boolean, default: true },
    questions: [questionSchema]
  },
  { timestamps: true }
);

export default mongoose.model("QuestionTopic", questionTopicSchema);
