const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', uploadController.uploadMiddleware, uploadController.uploadFile);

module.exports = router;
