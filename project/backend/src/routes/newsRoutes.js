const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', verifyToken.hasPermission('view_news'), newsController.getAllNews);
router.post('/', verifyToken.hasPermission('manage_news'), newsController.createNews);
router.put('/:id', verifyToken.hasPermission('manage_news'), newsController.updateNews);
router.delete('/:id', verifyToken.hasPermission('manage_news'), newsController.deleteNews);

module.exports = router;
