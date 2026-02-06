const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', verifyToken.hasPermission('manage_tickets'), ticketController.getAllTickets);
router.get('/user/:userId', verifyToken.hasPermission('view_helpdesk'), ticketController.getTicketsByUser);
router.get('/:id', verifyToken.hasPermission('view_helpdesk'), ticketController.getTicketById);
router.get('/:id/comments', verifyToken.hasPermission('view_helpdesk'), ticketController.getTicketComments);
router.post('/', verifyToken.hasPermission('view_helpdesk'), ticketController.createTicket);
router.post('/:id/comments', verifyToken.hasPermission('view_helpdesk'), ticketController.addComment);
router.patch('/:id/status', verifyToken.hasPermission('manage_tickets'), ticketController.updateTicketStatus);
router.delete('/:id', verifyToken.hasPermission('manage_tickets'), ticketController.deleteTicket);

module.exports = router;
