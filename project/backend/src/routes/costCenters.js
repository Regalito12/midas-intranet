/**
 * Cost Center Routes
 */

const express = require('express');
const router = express.Router();
const costCenterController = require('../controllers/costCenterController');
const verifyToken = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @route   GET /api/cost-centers
 * @desc    Obtener todos los centros de costo activos
 * @access  Private
 */
router.get('/', costCenterController.getAll);

/**
 * @route   GET /api/cost-centers/company/:companyId
 * @desc    Obtener centros de costo por empresa
 * @access  Private
 */
router.get('/company/:companyId', costCenterController.getByCompany);

/**
 * @route   GET /api/cost-centers/:id
 * @desc    Obtener centro de costo por ID
 * @access  Private
 */
router.get('/:id', costCenterController.getById);

module.exports = router;
