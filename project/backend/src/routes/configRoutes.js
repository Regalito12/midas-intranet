const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

const authorize = verifyToken.authorize;

router.get('/', configController.getConfig);
router.put('/', authorize('admin'), configController.updateConfig);

module.exports = router;
