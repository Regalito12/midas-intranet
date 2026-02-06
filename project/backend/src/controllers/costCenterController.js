/**
 * Cost Center Controller
 * Controlador para gestionar centros de costo
 */

const pool = require('../config/db');
const logger = require('../config/logger');

class CostCenterController {

    /**
     * GET /api/cost-centers
     * Obtener todos los centros de costo activos
     */
    async getAll(req, res) {
        try {
            const [costCenters] = await pool.query(`
        SELECT 
          cc.id,
          cc.code,
          cc.name,
          cc.company_id,
          c.name as company_name,
          cc.manager_id,
          u.name as manager_name,
          cc.active
        FROM cost_centers cc
        LEFT JOIN companies c ON cc.company_id = c.id
        LEFT JOIN users u ON cc.manager_id = u.id
        WHERE cc.active = TRUE
        ORDER BY cc.code ASC
      `);

            res.json({
                success: true,
                data: costCenters
            });

        } catch (error) {
            logger.error('Error fetching cost centers:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener centros de costo',
                error: error.message
            });
        }
    }

    /**
     * GET /api/cost-centers/:id
     * Obtener centro de costo por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const [costCenters] = await pool.query(`
        SELECT 
          cc.*,
          c.name as company_name,
          u.name as manager_name
        FROM cost_centers cc
        LEFT JOIN companies c ON cc.company_id = c.id
        LEFT JOIN users u ON cc.manager_id = u.id
        WHERE cc.id = ?
      `, [id]);

            if (costCenters.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Centro de costo no encontrado'
                });
            }

            res.json({
                success: true,
                data: costCenters[0]
            });

        } catch (error) {
            logger.error('Error fetching cost center:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener centro de costo',
                error: error.message
            });
        }
    }

    /**
     * GET /api/cost-centers/company/:companyId
     * Obtener centros de costo por empresa
     */
    async getByCompany(req, res) {
        try {
            const { companyId } = req.params;

            const [costCenters] = await pool.query(`
        SELECT 
          cc.id,
          cc.code,
          cc.name,
          cc.company_id,
          u.name as manager_name
        FROM cost_centers cc
        LEFT JOIN users u ON cc.manager_id = u.id
        WHERE cc.company_id = ? AND cc.active = TRUE
        ORDER BY cc.code ASC
      `, [companyId]);

            res.json({
                success: true,
                data: costCenters
            });

        } catch (error) {
            logger.error('Error fetching cost centers by company:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener centros de costo',
                error: error.message
            });
        }
    }

}

module.exports = new CostCenterController();
