const pool = require('../config/db');

/**
 * Servicio de Matriz de Aprobación
 * Resuelve dinámicamente quién debe aprobar según el monto y departamento.
 */
const matrixService = {
    /**
     * Obtener el siguiente nivel de aprobación requerido
     * @param {number} amount - Monto total de la solicitud
     * @param {string} department - Departamento del solicitante
     * @param {Array<number>} approvedLevelIds - IDs de niveles que ya aprobaron
     * @returns {Promise<Object|null>} - Retorna el nivel y el rol, o null si ya terminó
     */
    async getNextRequiredApprover(amount, department, approvedLevelIds = []) {
        // 1. Buscar reglas que apliquen (Match Dept + Monto)
        // Se busca reglas del depto O globales
        const query = `
            SELECT m.*, l.name as level_name, l.rank
            FROM approval_matrix m
            JOIN approval_levels l ON m.approval_level_id = l.id
            WHERE (m.department = ? OR m.department = 'GLOBAL')
            AND ? >= m.min_amount 
            AND ? <= m.max_amount
            AND m.is_active = TRUE
            ORDER BY l.rank ASC
        `;

        const [rules] = await pool.query(query, [department, amount, amount]);

        // 2. Filtrar los niveles que ya aprobaron
        const pendingRules = rules.filter(rule => !approvedLevelIds.includes(rule.approval_level_id));

        if (pendingRules.length > 0) {
            // Retornar el de menor rango (el siguiente en la escalera)
            return pendingRules[0];
        }

        return null; // No faltan aprobaciones
    },

    /**
     * Obtener TODOS los niveles requeridos (para calcular ruta completa)
     * @param {number} amount 
     * @param {string} department 
     * @returns {Promise<Array>} Listado de reglas/niveles ordenados por rango
     */
    async getRequiredLevels(amount, department) {
        const query = `
            SELECT m.*, l.name as level_name, l.rank
            FROM approval_matrix m
            JOIN approval_levels l ON m.approval_level_id = l.id
            WHERE (m.department = ? OR m.department = 'GLOBAL')
            AND ? >= m.min_amount 
            AND ? <= m.max_amount
            AND m.is_active = TRUE
            ORDER BY l.rank ASC
        `;
        const [rules] = await pool.query(query, [department, amount, amount]);
        return rules;
    }
};

module.exports = matrixService;
