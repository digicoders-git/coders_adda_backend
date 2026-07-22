import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: [
        'Course Query',
        'Payment & Refund',
        'Job & Internship',
        'Certificate Issue',
        'Technical Problem',
        'Other Query',
      ],
      default: 'Other Query',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Closed'],
      default: 'Pending',
    },
    adminReply: {
      type: String,
      default: '',
    },
    repliedAt: {
      type: Date,
    },
    source: {
      type: String,
      enum: ['App', 'Website'],
      default: 'App',
    },
  },
  { timestamps: true }
);

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
