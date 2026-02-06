/**
 * Project Planning Routes
 * Rutas para el módulo de matriz de planificación presupuestaria
 */

const express = require('express');
const router = express.Router();
const projectPlanningController = require('../controllers/projectPlanningController');
const verifyToken = require('../middleware/authMiddleware');
const { hasPermission } = verifyToken;
const filterByDepartmentAccess = require('../middleware/filterByDepartmentAccess');

// Todos los endpoints requieren autenticación
router.use(verifyToken);

// Aplicar filtro de departamento a todos los endpoints de listado/consulta
// (El middleware verifica el rol y aplica o no el filtro automáticamente)
router.use(filterByDepartmentAccess);

// =============================================================================
// CRUD BÁSICO
// =============================================================================

/**
 * @route   POST /api/budget/projects
 * @desc    Crear nuevo proyecto
 * @access  Requiere permiso: project.planning.create
 */
router.post(
    '/',
    hasPermission('project.planning.create'),
    projectPlanningController.createProject
);

/**
 * @route   GET /api/budget/projects
 * @desc    Listar proyectos (filtrado automático por departamento)
 * @access  Requiere permiso: project.planning.view
 */
router.get(
    '/',
    hasPermission('project.planning.view'),
    projectPlanningController.listProjects
);

/**
 * @route   GET /api/budget/projects/:id
 * @desc    Obtener proyecto por ID
 * @access  Requiere permiso: project.planning.view
 */
router.get(
    '/:id',
    hasPermission('project.planning.view'),
    projectPlanningController.getProjectById
);

/**
 * @route   PUT /api/budget/projects/:id
 * @desc    Actualizar proyecto
 * @access  Requiere permiso: project.planning.edit
 */
router.put(
    '/:id',
    hasPermission('project.planning.edit'),
    projectPlanningController.updateProject
);

/**
 * @route   POST /api/budget/projects/:id/duplicate
 * @desc    Duplicar proyecto
 * @access  Requiere permiso: project.planning.create
 */
router.post(
    '/:id/duplicate',
    hasPermission('project.planning.create'),
    projectPlanningController.duplicateProject
);

// =============================================================================
// FLUJO DE APROBACIÓN
// =============================================================================

/**
 * @route   POST /api/budget/projects/:id/submit
 * @desc    Enviar proyecto a aprobación
 * @access  Requiere permiso: project.planning.create
 */
router.post(
    '/:id/submit',
    hasPermission('project.planning.create'),
    projectPlanningController.submitForApproval
);

/**
 * @route   POST /api/budget/projects/:id/approve
 * @desc    Aprobar proyecto
 * @access  Requiere permiso: project.planning.approve
 */
router.post(
    '/:id/approve',
    hasPermission('project.planning.approve'),
    projectPlanningController.approveProject
);

/**
 * @route   POST /api/budget/projects/:id/reject
 * @desc    Rechazar proyecto
 * @access  Requiere permiso: project.planning.approve
 */
router.post(
    '/:id/reject',
    hasPermission('project.planning.approve'),
    projectPlanningController.rejectProject
);

/**
 * @route   GET /api/budget/projects/pending-approvals
 * @desc    Obtener proyectos pendientes de aprobación para el usuario
 * @access  Requiere permiso: project.planning.approve
 * @note    IMPORTANTE: Esta ruta debe ir ANTES de /:id para evitar conflictos
 */
router.get(
    '/pending-approvals',
    hasPermission('project.planning.approve'),
    projectPlanningController.getPendingApprovals
);

// =============================================================================
// CONSULTAS Y REPORTES
// =============================================================================

/**
 * @route   GET /api/budget/projects/:id/summary
 * @desc    Obtener resumen ejecutivo de proyecto
 * @access  Requiere permiso: project.planning.view
 */
router.get(
    '/:id/summary',
    hasPermission('project.planning.view'),
    projectPlanningController.getProjectSummary
);

/**
 * @route   GET /api/budget/projects/:id/purchase-requests
 * @desc    Obtener solicitudes de compra vinculadas al proyecto
 * @access  Requiere permiso: project.planning.view
 */
router.get(
    '/:id/purchase-requests',
    hasPermission('project.planning.view'),
    projectPlanningController.getProjectPurchaseRequests
);

/**
 * @route   DELETE /api/budget/projects/:id
 * @desc    Eliminar proyecto (Solo borrador, Soft Delete)
 * @access  Requiere permiso: project.planning.create
 */
router.delete(
    '/:id',
    hasPermission('project.planning.create'),
    projectPlanningController.deleteProject
);

/**
 * @route   GET /api/budget/projects/dashboard/:areaId
 * @desc    Dashboard de proyectos por área
 * @access  Requiere permiso: project.planning.view
 */
router.get(
    '/dashboard/:areaId',
    hasPermission('project.planning.view'),
    projectPlanningController.getDashboardByArea
);

/**
 * @route   POST /api/budget/projects/:id/complete
 * @desc    Marcar proyecto como completado
 * @access  Requiere permiso: project.planning.approve
 */
router.post(
    '/:id/complete',
    hasPermission('project.planning.approve'),
    projectPlanningController.completeProject
);

/**
 * @route   POST /api/budget/projects/:id/cancel
 * @desc    Cancelar proyecto
 * @access  Requiere permiso: project.planning.approve
 */
router.post(
    '/:id/cancel',
    hasPermission('project.planning.approve'),
    projectPlanningController.cancelProject
);

module.exports = router;
