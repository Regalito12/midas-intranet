const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

// Rutas de reacciones
router.post('/reactions', interactionController.addReaction);
router.delete('/reactions', interactionController.removeReaction);
router.get('/reactions/:newsId', interactionController.getReactionsByNews);

// Rutas de comentarios
router.post('/comments', interactionController.addComment);
router.get('/comments/:newsId', interactionController.getCommentsByNews);
router.delete('/comments/:id', interactionController.deleteComment);

module.exports = router;
