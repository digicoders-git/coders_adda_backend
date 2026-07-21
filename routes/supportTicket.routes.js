import express from 'express';
import {
  createSupportTicket,
  getAllSupportTickets,
  updateSupportTicketStatus,
  deleteSupportTicket,
} from '../controllers/supportTicket.controller.js';
import optionalUserAuth from '../middleware/optionalUserAuth.js';
import verifyAdmin from '../middleware/verifyAdmin.js';

const supportTicketRouter = express.Router();

// Public / Mobile User Route
supportTicketRouter.post('/create', optionalUserAuth, createSupportTicket);

// Admin Routes
supportTicketRouter.get('/admin/all', verifyAdmin, getAllSupportTickets);
supportTicketRouter.put('/admin/update/:id', verifyAdmin, updateSupportTicketStatus);
supportTicketRouter.delete('/admin/delete/:id', verifyAdmin, deleteSupportTicket);

export default supportTicketRouter;
