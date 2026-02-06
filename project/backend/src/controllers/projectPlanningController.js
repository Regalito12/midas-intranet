/**
 * Project Planning Controller
 * Controlador para gestionar la matriz de planificación presupuestaria
 */

const ProjectPlanningService = require('../services/ProjectPlanningService');
const logger = require('../config/logger');

class ProjectPlanningController {

    /**
     * POST /api/budget/projects
     * Crear nuevo proyecto
     */
    async createProject(req, res) {
        try {
            const projectData = {
                project_code: req.body.project_code || null, // Auto-generate if not provided
                project_name: req.body.project_name,
                project_type: req.body.project_type,
                area_id: req.body.area_id,
                cost_center_id: req.body.cost_center_id,
                responsible_user_id: req.body.responsible_user_id || req.user.id,
                description: req.body.description,
                project_objective: req.body.project_objective,
                institutional_objective: req.body.institutional_objective,
                expected_roi: req.body.expected_roi,
                budgeted_amount: req.body.budgeted_amount,
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                execution_quarter: req.body.execution_quarter,
                fiscal_year: req.body.fiscal_year || new Date().getFullYear()
            };

            // Validaciones
            if (!projectData.project_name || !projectData.project_type ||
                !projectData.area_id || !projectData.cost_center_id ||
                !projectData.budgeted_amount || !projectData.start_date ||
                !projectData.end_date || !projectData.execution_quarter) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos requeridos'
                });
            }

            if (projectData.budgeted_amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El monto presupuestado debe ser mayor a cero'
                });
            }

            const project = await ProjectPlanningService.createProject(projectData, req.user.id);

            logger.info(`Project created: ${project.project_code} by user ${req.user.id}`);

            res.status(201).json({
                success: true,
                data: project,
                message: 'Proyecto creado exitosamente'
            });

        } catch (error) {
            logger.error('Error creating project:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al crear proyecto'
            });
        }
    }

    /**
     * POST /api/budget/projects/:id/duplicate
     * Duplicar proyecto
     */
    async duplicateProject(req, res) {
        try {
            const { id } = req.params;

            const project = await ProjectPlanningService.duplicateProject(id, req.user.id);

            logger.info(`Project duplicated: ${id} -> ${project.id} by user ${req.user.id}`);

            res.status(201).json({
                success: true,
                data: project,
                message: 'Proyecto duplicado exitosamente'
            });

        } catch (error) {
            logger.error('Error duplicating project:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al duplicar proyecto'
            });
        }
    }

    /**
     * GET /api/budget/projects
     * Listar proyectos con filtros
     */
    async listProjects(req, res) {
        try {
            const filters = {
                status: req.query.status,
                fiscal_year: req.query.fiscal_year,
                execution_quarter: req.query.execution_quarter,
                project_type: req.query.project_type,
                cost_center_id: req.query.cost_center_id,
                departmentFilter: req.departmentFilter // Inyectado por middleware
            };

            const projects = await ProjectPlanningService.listProjects(
                filters,
                req.user.id,
                req.user.role
            );

            res.json({
                success: true,
                data: projects,
                total: projects.length
            });

        } catch (error) {
            logger.error('Error listing projects:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener proyectos'
            });
        }
    }

    /**
     * GET /api/budget/projects/:id
     * Obtener proyecto por ID
     */
    async getProjectById(req, res) {
        try {
            const { id } = req.params;

            const project = await ProjectPlanningService.getProjectById(
                id,
                req.user.id,
                req.user.role
            );

            res.json({
                success: true,
                data: project
            });

        } catch (error) {
            logger.error('Error getting project:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'Proyecto no encontrado'
            });
        }
    }

    /**
     * PUT /api/budget/projects/:id
     * Actualizar proyecto
     */
    async updateProject(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const project = await ProjectPlanningService.updateProject(
                id,
                updates,
                req.user.id,
                req.user.role
            );

            logger.info(`Project updated: ${project.project_code} by user ${req.user.id}`);

            res.json({
                success: true,
                data: project,
                message: 'Proyecto actualizado exitosamente'
            });

        } catch (error) {
            logger.error('Error updating project:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al actualizar proyecto'
            });
        }
    }

    /**
     * POST /api/budget/projects/:id/submit
     * Enviar proyecto a aprobación
     */
    async submitForApproval(req, res) {
        try {
            const { id } = req.params;

            const result = await ProjectPlanningService.submitForApproval(id, req.user.id);

            logger.info(`Project submitted for approval: ${id} by user ${req.user.id}`);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Error submitting project:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al enviar proyecto a aprobación'
            });
        }
    }

    /**
     * POST /api/budget/projects/:id/approve
     * Aprobar proyecto
     */
    async approveProject(req, res) {
        try {
            const { id } = req.params;
            const { notes } = req.body;

            const result = await ProjectPlanningService.approveProject(
                id,
                req.user.id,
                notes
            );

            logger.info(`Project approved: ${id} by user ${req.user.id}`);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Error approving project:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al aprobar proyecto'
            });
        }
    }

    /**
     * POST /api/budget/projects/:id/reject
     * Rechazar proyecto
     */
    async rejectProject(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            if (!reason || reason.length < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar un motivo de rechazo detallado (mínimo 10 caracteres)'
                });
            }

            const result = await ProjectPlanningService.rejectProject(
                id,
                req.user.id,
                reason
            );

            logger.info(`Project rejected: ${id} by user ${req.user.id}`);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Error rejecting project:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al rechazar proyecto'
            });
        }
    }

    /**
     * GET /api/budget/projects/:id/summary
     * Obtener resumen ejecutivo de proyecto
     */
    async getProjectSummary(req, res) {
        try {
            const { id } = req.params;

            const summary = await ProjectPlanningService.getProjectSummary(id);

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            logger.error('Error getting project summary:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener resumen del proyecto'
            });
        }
    }

    /**
     * GET /api/budget/projects/:id/purchase-requests
     * Obtener solicitudes de compra vinculadas a un proyecto
     */
    async getProjectPurchaseRequests(req, res) {
        try {
            const { id } = req.params;

            // Validar acceso al proyecto primero
            await ProjectPlanningService.getProjectById(id, req.user.id, req.user.role);

            // Obtener solicitudes vinculadas
            const pool = require('../config/db');
            const [requests] = await pool.query(`
                SELECT 
                    pr.*,
                    u.name as requester_name
                FROM purchase_requests pr
                LEFT JOIN users u ON pr.user_id = u.id
                WHERE pr.planned_project_id = ?
                ORDER BY pr.created_at DESC
            `, [id]);

            res.json({
                success: true,
                data: requests,
                total: requests.length
            });

        } catch (error) {
            logger.error('Error getting project purchase requests:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener solicitudes del proyecto'
            });
        }
    }

    /**
     * GET /api/budget/projects/pending-approvals
     * Obtener proyectos pendientes de aprobación para el usuario
     */
    async getPendingApprovals(req, res) {
        try {
            const approvals = await ProjectPlanningService.getPendingApprovals(
                req.user.id,
                req.user.role
            );

            res.json({
                success: true,
                data: approvals,
                total: approvals.length
            });

        } catch (error) {
            logger.error('Error getting pending approvals:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener aprobaciones pendientes'
            });
        }
    }

    /**
     * GET /api/budget/projects/dashboard/:areaId
     * Dashboard de proyectos por área
     */
    async getDashboardByArea(req, res) {
        try {
            const { areaId } = req.params;
            const currentYear = new Date().getFullYear();

            const pool = require('../config/db');

            // Métricas del área
            const [metrics] = await pool.query(`
                SELECT 
                    COUNT(*) as total_projects,
                    SUM(CASE WHEN status = 'APROBADO' OR status = 'EN_EJECUCION' THEN 1 ELSE 0 END) as approved_projects,
                    SUM(CASE WHEN status = 'PENDIENTE_APROBACION' THEN 1 ELSE 0 END) as pending_projects,
                    SUM(budgeted_amount) as total_budget,
                    SUM(committed_amount) as total_committed,
                    SUM(spent_amount) as total_spent,
                    SUM(available_amount) as total_available
                FROM budget_project_planning
                WHERE area_id = ?
                  AND fiscal_year = ?
                  AND deleted_at IS NULL
            `, [areaId, currentYear]);

            // Proyectos por trimestre
            const [byQuarter] = await pool.query(`
                SELECT 
                    execution_quarter,
                    COUNT(*) as project_count,
                    SUM(budgeted_amount) as quarter_budget
                FROM budget_project_planning
                WHERE area_id = ?
                  AND fiscal_year = ?
                  AND deleted_at IS NULL
                GROUP BY execution_quarter
                ORDER BY execution_quarter
            `, [areaId, currentYear]);

            // Proyectos por tipo
            const [byType] = await pool.query(`
                SELECT 
                    project_type,
                    COUNT(*) as project_count,
                    SUM(budgeted_amount) as type_budget
                FROM budget_project_planning
                WHERE area_id = ?
                  AND fiscal_year = ?
                  AND deleted_at IS NULL
                GROUP BY project_type
            `, [areaId, currentYear]);

            res.json({
                success: true,
                data: {
                    metrics: metrics[0],
                    by_quarter: byQuarter,
                    by_type: byType,
                    year: currentYear
                }
            });

        } catch (error) {
            logger.error('Error getting dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener dashboard'
            });
        }
    }

    /**
     * DELETE /api/budget/projects/:id
     * Eliminar proyecto (borrador)
     */
    async deleteProject(req, res) {
        try {
            const { id } = req.params;

            const result = await ProjectPlanningService.deleteProject(id, req.user.id);

            logger.info(`Project deleted: ${id} by user ${req.user.id}`);

            res.json(result);

        } catch (error) {
            logger.error('Error deleting project:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al eliminar proyecto'
            });
        }
    }

    /**
     * POST /api/budget/projects/:id/complete
     * Marcar proyecto como completado
     */
    async completeProject(req, res) {
        try {
            const { id } = req.params;
            const { completion_notes } = req.body;

            const result = await ProjectPlanningService.completeProject(
                id,
                req.user.id,
                completion_notes
            );

            logger.info(`Project ${id} completed by user ${req.user.id}`);

            res.json(result);

        } catch (error) {
            logger.error('Error completing project:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al completar proyecto'
            });
        }
    }

    /**
     * POST /api/budget/projects/:id/cancel
     * Cancelar proyecto
     */
    async cancelProject(req, res) {
        try {
            const { id } = req.params;
            const { cancellation_reason } = req.body;

            if (!cancellation_reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar una razón de cancelación'
                });
            }

            const result = await ProjectPlanningService.cancelProject(
                id,
                req.user.id,
                cancellation_reason
            );

            logger.info(`Project ${id} cancelled by user ${req.user.id}`);

            res.json(result);

        } catch (error) {
            logger.error('Error cancelling project:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al cancelar proyecto'
            });
        }
    }

}

module.exports = new ProjectPlanningController();
