/**
 * Company Controller
 * Controlador para gestionar empresas
 */

const pool = require('../config/db');
const logger = require('../config/logger');

class CompanyController {

    /**
     * GET /api/companies
     * Obtener todas las empresas activas
     */
    async getAll(req, res) {
        try {
            const [companies] = await pool.query(`
        SELECT id, code, name, legal_name, tax_id, active
        FROM companies
        WHERE active = TRUE
        ORDER BY name ASC
      `);

            res.json({
                success: true,
                data: companies
            });

        } catch (error) {
            logger.error('Error fetching companies:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener empresas',
                error: error.message
            });
        }
    }

    /**
     * GET /api/companies/:id
     * Obtener empresa por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const [companies] = await pool.query(`
        SELECT * FROM companies WHERE id = ?
      `, [id]);

            if (companies.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa no encontrada'
                });
            }

            res.json({
                success: true,
                data: companies[0]
            });

        } catch (error) {
            logger.error('Error fetching company:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener empresa',
                error: error.message
            });
        }
    }

}

module.exports = new CompanyController();
