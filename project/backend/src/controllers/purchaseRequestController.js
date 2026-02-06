/**
 * Purchase Request Controller
 * Controlador para gestionar solicitudes de compra
 */

const PurchaseRequestService = require('../services/PurchaseRequestService');
const WorkflowService = require('../services/workflowService');
const logger = require('../config/logger');

class PurchaseRequestController {

    /**
     * POST /api/purchase-requests
     * Crear nueva solicitud de compra
     */
    async createRequest(req, res) {
        try {
            const userId = req.user.id;
            const requestData = req.body;
            const files = req.files || [];

            // Parsear ítems si vienen como string (FormData standard)
            const items = typeof requestData.items === 'string'
                ? JSON.parse(requestData.items)
                : (requestData.items || []);

            // Validaciones básicas de cabecera
            if (!requestData.companyId || !requestData.costCenterId || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos obligatorios o la solicitud no tiene ítems'
                });
            }

            // Calcular total de la solicitud sumando todos los ítems
            const totalAmount = items.reduce((sum, item) =>
                sum + (parseFloat(item.quantity || 0) * parseFloat(item.estimatedPrice || 0)), 0
            );

            // Verificar disponibilidad presupuestaria (warning, no bloquea)
            const budgetCheck = await PurchaseRequestService.checkBudgetAvailability(
                requestData.costCenterId,
                totalAmount
            );

            // Crear solicitud
            const result = await PurchaseRequestService.createRequest(userId, requestData, files);

            res.status(201).json({
                success: true,
                message: 'Solicitud creada correctamente',
                data: {
                    requestId: result.requestId,
                    requestNumber: result.requestNumber,
                    budgetWarning: budgetCheck.warning || null,
                    budgetAvailable: budgetCheck.available
                }
            });

        } catch (error) {
            logger.error('Error creating purchase request:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear solicitud de compra',
                error: error.message
            });
        }
    }

    /**
     * GET /api/purchase-requests/:id
     * Obtener solicitud por ID
     */
    async getRequestById(req, res) {
        try {
            const requestId = req.params.id;
            const userId = req.user.id;

            const request = await PurchaseRequestService.getRequestById(requestId, userId);

            // Obtener acciones disponibles para el usuario
            const actions = await WorkflowService.getAvailableActions(requestId, userId);

            res.json({
                success: true,
                data: {
                    ...request,
                    availableActions: actions
                }
            });

        } catch (error) {
            logger.error('Error getting purchase request:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/purchase-requests
     * Listar todas las solicitudes (Administración/Reportes)
     */
    async listAllRequests(req, res) {
        try {
            const filters = {
                status: req.query.status,
                companyId: req.query.companyId,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo
            };

            const requests = await PurchaseRequestService.getAllRequests(filters);

            res.json({
                success: true,
                data: requests,
                count: requests.length
            });

        } catch (error) {
            logger.error('Error listing all requests:', error);
            res.status(500).json({
                success: false,
                message: 'Error al listar solicitudes',
                error: error.message
            });
        }
    }

    /**
     * GET /api/purchase-requests/my-requests
     * Obtener mis solicitudes
     */
    async getMyRequests(req, res) {
        try {
            const userId = req.user.id;
            const filters = {
                status: req.query.status,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo
            };

            const requests = await PurchaseRequestService.getMyRequests(userId, filters);

            res.json({
                success: true,
                data: requests,
                count: requests.length
            });

        } catch (error) {
            logger.error('Error getting my requests:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener solicitudes',
                error: error.message
            });
        }
    }

    /**
     * GET /api/purchase-requests/pending-approvals
     * Obtener solicitudes pendientes de aprobar para el usuario actual
     */
    async getPendingApprovals(req, res) {
        try {
            const userId = req.user.id;

            const requests = await PurchaseRequestService.getPendingApprovals(userId);

            res.json({
                success: true,
                data: requests,
                count: requests.length
            });

        } catch (error) {
            logger.error('Error getting pending approvals:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener aprobaciones pendientes',
                error: error.message
            });
        }
    }

    /**
     * POST /api/purchase-requests/:id/release
     * Liberar solicitud (Supervisor)
     */
    async releaseRequest(req, res) {
        try {
            const requestId = req.params.id;
            const userId = req.user.id;
            const { notes } = req.body;

            const result = await WorkflowService.releaseRequest(requestId, userId, notes);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Error releasing request:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/purchase-requests/:id/approve
     * Aprobar solicitud (Ejecutivo/Finanzas)
     */
    async approveRequest(req, res) {
        try {
            const requestId = req.params.id;
            const userId = req.user.id;
            const { notes } = req.body;

            const result = await WorkflowService.approveRequest(requestId, userId, notes);

            res.json({
                success: true,
                message: result.message,
                allApproved: result.allApproved
            });

        } catch (error) {
            logger.error('Error approving request:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/purchase-requests/:id/reject
     * Rechazar solicitud
     */
    async rejectRequest(req, res) {
        try {
            const requestId = req.params.id;
            const userId = req.user.id;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar un motivo de rechazo'
                });
            }

            const result = await WorkflowService.rejectRequest(requestId, userId, reason);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Error rejecting request:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/purchase-requests/:id/budget-check
     * Verificar disponibilidad presupuestaria
     */
    async checkBudget(req, res) {
        try {
            const requestId = req.params.id;

            const request = await PurchaseRequestService.getRequestById(requestId, req.user.id);
            const budgetCheck = await PurchaseRequestService.checkBudgetAvailability(
                request.cost_center_id,
                request.total_estimated
            );

            res.json({
                success: true,
                data: budgetCheck
            });

        } catch (error) {
            logger.error('Error checking budget:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * PATCH /api/purchase-requests/:id/reassign-project
     * Reasignar solicitud a otro proyecto
     */
    async reassignProject(req, res) {
        try {
            const requestId = req.params.id;
            const { newProjectId, justification } = req.body;
            const userId = req.user.id;

            if (!newProjectId || !justification) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar el nuevo ID del proyecto y una justificación'
                });
            }

            const result = await PurchaseRequestService.reassignProject(requestId, newProjectId, userId, justification);

            res.json(result);

        } catch (error) {
            logger.error('Error reassigning project:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

}

module.exports = new PurchaseRequestController();
