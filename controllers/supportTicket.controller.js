import { SupportTicket } from '../models/supportTicket.model.js';
import User from '../models/user.model.js';
import admin from '../config/firebase.js';
import { Notification } from '../models/notification.model.js';
import { processNotification } from './notification.controller.js';

// Create a new support ticket (App user or guest)
export const createSupportTicket = async (req, res) => {
  try {
    const { name, email, mobile, category, subject, message, source } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required.',
      });
    }

    let userId = req.user ? req.user._id : null;
    let userName = name;
    let userEmail = email;
    let userMobile = mobile;

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        userName = userName || user.name;
        userEmail = userEmail || user.email;
        userMobile = userMobile || user.mobile;
      }
    }

    const newTicket = await SupportTicket.create({
      userId,
      name: userName || 'Anonymous Student',
      email: userEmail || 'Not Provided',
      mobile: userMobile || '',
      category: category || 'Other Query',
      subject,
      message,
      source: source || 'App',
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      data: newTicket,
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting support ticket.',
      error: error.message,
    });
  }
};

// Get all support tickets (Admin dashboard)
export const getAllSupportTickets = async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await SupportTicket.countDocuments(query);
    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: tickets,
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching support tickets.',
      error: error.message,
    });
  }
};

// Update ticket status / reply (Admin)
export const updateSupportTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found.',
      });
    }

    if (status) ticket.status = status;
    if (adminReply !== undefined) {
      ticket.adminReply = adminReply;
      ticket.repliedAt = new Date();
    }

    await ticket.save();

    // 📩 Send Direct Notification if replied or resolved
    if ((adminReply !== undefined || status === 'Resolved') && ticket.userId) {
      try {
        const ticketUser = await User.findById(ticket.userId);
        if (ticketUser) {
          const title = status === 'Resolved' ? "Support Ticket Resolved ✅" : "Support Ticket Update 📩";
          const body = status === 'Resolved' 
            ? `Your ticket "${ticket.subject}" has been marked as resolved.` 
            : `Your ticket "${ticket.subject}" has a new update!`;

          const notification = new Notification({
            title,
            body,
            actionLink: '/support',
            priority: 'Normal',
            targetGroup: 'Specific',
            targetUsers: [ticketUser._id],
            type: 'System',
            status: 'Sent'
          });

          await notification.save();
          await processNotification(notification);
        }
      } catch (notifErr) {
        console.error("Failed to send ticket reply notification:", notifErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully.',
      data: ticket,
    });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating support ticket.',
      error: error.message,
    });
  }
};

// Delete ticket (Admin)
export const deleteSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    await SupportTicket.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Support ticket deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting support ticket.',
      error: error.message,
    });
  }
};

// Get student's own support tickets (Mobile App)
export const getMySupportTickets = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const { email } = req.query;

    let query = {};
    if (userId) {
      query = { $or: [{ userId }, { email: req.user.email }] };
    } else if (email) {
      query = { email };
    } else {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const tickets = await SupportTicket.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error('Error fetching my support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching my support tickets.',
      error: error.message,
    });
  }
};
