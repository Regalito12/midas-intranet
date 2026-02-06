const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);
const authorize = verifyToken.authorize;

router.get('/', eventsController.getEvents);
router.post('/', authorize('admin', 'rrhh'), eventsController.createEvent);
router.delete('/:id', authorize('admin', 'rrhh'), eventsController.deleteEvent);

module.exports = router;
