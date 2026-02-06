/**
 * Purchase Order Routes
 */

const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const verifyToken = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @route   POST /api/purchase-orders
 * @desc    Generar nueva orden de compra
 * @access  Private (requiere permiso purchase.order.generate)
 */
router.post(
    '/',
    verifyToken.hasPermission('purchase.order.generate'),
    purchaseOrderController.generateOrder
);

/**
 * @route   GET /api/purchase-orders
 * @desc    Listar órdenes de compra
 * @access  Private (requiere permiso purchase.order.view)
 */
router.get(
    '/',
    verifyToken.hasPermission('purchase.order.view'),
    purchaseOrderController.list
);

/**
 * @route   GET /api/purchase-orders/budget/check/:costCenterId
 * @desc    Verificar disponibilidad presupuestaria
 * @access  Private
 */
router.get(
    '/budget/check/:costCenterId',
    purchaseOrderController.checkBudget
);

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Obtener orden de compra por ID
 * @access  Private (requiere permiso purchase.order.view)
 */
router.get(
    '/:id',
    verifyToken.hasPermission('purchase.order.view'),
    purchaseOrderController.getById
);

/**
 * @route   POST /api/purchase-orders/:id/approve
 * @desc    Aprobar orden de compra
 * @access  Private (requiere permiso purchase.order.approve)
 */
router.post(
    '/:id/approve',
    verifyToken.hasPermission('purchase.order.approve'),
    purchaseOrderController.approve
);

module.exports = router;
