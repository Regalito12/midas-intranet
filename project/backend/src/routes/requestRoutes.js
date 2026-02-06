const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const verifyToken = require('../middleware/authMiddleware');
const auditInterceptor = require('../middleware/auditInterceptor');

router.use(verifyToken);
router.use(auditInterceptor('request'));

router.get('/', verifyToken.hasPermission('approve_requests'), requestController.getAllRequests);
router.get('/user/:userId', verifyToken.hasPermission('view_own_requests'), requestController.getRequestsByUser);
router.get('/:requestId/items', verifyToken.hasPermission('view_own_requests'), requestController.getRequestItems);
router.post('/', verifyToken.hasPermission('create_request'), requestController.createRequest);
router.patch('/:id/status', verifyToken.hasPermission('approve_requests'), requestController.updateRequestStatus);
router.delete('/:id', verifyToken.hasPermission('create_request'), requestController.deleteRequest);

module.exports = router;
