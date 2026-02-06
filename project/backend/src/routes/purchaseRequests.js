/**
 * Purchase Request Routes
 * Rutas para el módulo de compras
 */

const express = require('express');
const router = express.Router();
const purchaseRequestController = require('../controllers/purchaseRequestController');
const verifyToken = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware'); // Middleware para archivos

// Middleware de autenticación para todas las rutas
router.use(verifyToken);

/**
 * @route   POST /api/purchase-requests
 * @desc    Crear nueva solicitud de compra
 * @access  Private - Cualquier usuario autenticado
 */
router.post(
    '/',
    upload.array('attachments', 5), // Máximo 5 archivos
    purchaseRequestController.createRequest
);

/**
 * @route   GET /api/purchase-requests
 * @desc    Listar todas las solicitudes (Administradores/Reportes)
 * @access  Private
 */
router.get(
    '/',
    verifyToken.hasPermission('purchase.request.view'),
    purchaseRequestController.listAllRequests
);

/**
 * @route   GET /api/purchase-requests/my-requests
 * @desc    Obtener mis solicitudes
 * @access  Private
 */
router.get(
    '/my-requests',
    purchaseRequestController.getMyRequests
);

/**
 * @route   GET /api/purchase-requests/pending-approvals
 * @desc    Obtener solicitudes pendientes de aprobar
 * @access  Private - Usuarios con rol de aprobador
 */
router.get(
    '/pending-approvals',
    purchaseRequestController.getPendingApprovals
);

/**
 * @route   GET /api/purchase-requests/:id
 * @desc    Obtener solicitud por ID
 * @access  Private
 */
router.get(
    '/:id',
    purchaseRequestController.getRequestById
);

/**
 * @route   POST /api/purchase-requests/:id/release
 * @desc    Liberar solicitud (Supervisor)
 * @access  Private - Supervisores
 */
router.post(
    '/:id/release',
    verifyToken.hasPermission('purchase.request.release'),
    purchaseRequestController.releaseRequest
);

/**
 * @route   POST /api/purchase-requests/:id/approve
 * @desc    Aprobar solicitud (Ejecutivo/Finanzas)
 * @access  Private - Aprobadores
 */
router.post(
    '/:id/approve',
    verifyToken.hasPermission('purchase.request.approve'),
    purchaseRequestController.approveRequest
);

/**
 * @route   POST /api/purchase-requests/:id/reject
 * @desc    Rechazar solicitud
 * @access  Private - Supervisores y Aprobadores
 */
router.post(
    '/:id/reject',
    purchaseRequestController.rejectRequest
);

/**
 * @route   PATCH /api/purchase-requests/:id/reassign-project
 * @desc    Reasignar solicitud a otro proyecto
 * @access  Private - Requiere permiso de edición
 */
router.patch(
    '/:id/reassign-project',
    verifyToken.hasPermission('purchase.request.edit'),
    purchaseRequestController.reassignProject
);

/**
 * @route   GET /api/purchase-requests/:id/budget-check
 * @desc    Verificar disponibilidad presupuestaria
 * @access  Private
 */
router.get(
    '/:id/budget-check',
    purchaseRequestController.checkBudget
);

module.exports = router;
