const pool = require('../config/db');

/**
 * Servicio de Reglas de Negocio
 * Evalúa políticas dinámicas sin hardcoding.
 */
const ruleService = {
    /**
     * Evaluar si una acción cumple con las reglas definidas
     * @param {string} ruleType - Tipo de regla (ej: 'MAX_AMOUNT')
     * @param {string} entityTarget - Entidad (ej: 'PETTY_CASH', 'VACATION')
     * @param {Object} context - Datos para evaluar (ej: { amount: 6000, department: 'IT' })
     * @returns {Promise<{allowed: boolean, reason: string}>}
     */
    async evaluate(ruleType, entityTarget, context) {
        try {
            // Buscar reglas activas que apliquen
            const [rules] = await pool.query(
                'SELECT * FROM business_rules WHERE rule_type = ? AND entity_target = ? AND is_active = TRUE ORDER BY priority DESC',
                [ruleType, entityTarget]
            );

            if (rules.length === 0) {
                return { allowed: true, reason: 'No existen reglas restrictivas' }; // Por defecto permitido si no hay reglas
            }

            for (const rule of rules) {
                const conditions = typeof rule.conditions_json === 'string' ? JSON.parse(rule.conditions_json) : rule.conditions_json;

                // Evaluación simple de condiciones
                // Ejemplo condition: { "operator": "gt", "field": "amount", "value": 5000 }
                if (conditions && this.checkCondition(conditions, context)) {
                    // Si la condición se cumple, verificamos si la regla PERMITE o DENIEGA
                    // Asumimos que las reglas definen RESTRICCIONES (si matchea, se aplica la acción)
                    const actions = typeof rule.actions_json === 'string' ? JSON.parse(rule.actions_json) : rule.actions_json;

                    if (actions && actions.result === 'DENY') {
                        return {
                            allowed: false,
                            reason: actions.message || `Violación de regla: ${rule.name}`
                        };
                    }
                }
            }

            return { allowed: true };
        } catch (error) {
            // Fail-safe: If rules engine fails, deny for security
            return { allowed: false, reason: 'Error evaluando reglas de negocio' };
        }
    },

    checkCondition(condition, context) {
        const valueToCheck = context[condition.field];
        const threshold = condition.value;

        switch (condition.operator) {
            case 'gt': return valueToCheck > threshold;
            case 'gte': return valueToCheck >= threshold;
            case 'lt': return valueToCheck < threshold;
            case 'lte': return valueToCheck <= threshold;
            case 'eq': return valueToCheck == threshold;
            case 'neq': return valueToCheck != threshold;
            default: return false;
        }
    }
};

module.exports = ruleService;
