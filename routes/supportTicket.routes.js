import express from 'express';
import {
  createSupportTicket,
  getAllSupportTickets,
  updateSupportTicketStatus,
  deleteSupportTicket,
  getMySupportTickets,
} from '../controllers/supportTicket.controller.js';
import optionalUserAuth from '../middleware/optionalUserAuth.js';
import verifyAdminToken from '../middleware/verifyAdminToken.js';

const supportTicketRouter = express.Router();

// Public / Mobile User Routes
supportTicketRouter.post('/create', optionalUserAuth, createSupportTicket);
supportTicketRouter.get('/my-tickets', optionalUserAuth, getMySupportTickets);

// Admin Routes
supportTicketRouter.get('/admin/all', verifyAdminToken, getAllSupportTickets);
supportTicketRouter.put('/admin/update/:id', verifyAdminToken, updateSupportTicketStatus);
supportTicketRouter.delete('/admin/delete/:id', verifyAdminToken, deleteSupportTicket);

export default supportTicketRouter;
