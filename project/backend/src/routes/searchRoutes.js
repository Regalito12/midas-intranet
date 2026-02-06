const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, searchController.search);

module.exports = router;
