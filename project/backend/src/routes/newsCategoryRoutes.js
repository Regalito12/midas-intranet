const express = require('express');
const router = express.Router();
const newsCategoryController = require('../controllers/newsCategoryController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', newsCategoryController.getAllCategories);
router.post('/', newsCategoryController.createCategory);
router.delete('/:id', newsCategoryController.deleteCategory);

module.exports = router;
