/**
 * Company Routes
 */

const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const verifyToken = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @route   GET /api/companies
 * @desc    Obtener todas las empresas activas
 * @access  Private
 */
router.get('/', companyController.getAll);

/**
 * @route   GET /api/companies/:id
 * @desc    Obtener empresa por ID
 * @access  Private
 */
router.get('/:id', companyController.getById);

module.exports = router;
