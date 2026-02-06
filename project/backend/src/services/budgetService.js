const pool = require('../config/db');
const AuditService = require('./auditService');

/**
 * Servicio Mejorado de Control Presupuestario
 */
class BudgetService {

    /**
     * Verificar disponibilidad de fondos (mejorado)
     */
    async checkAvailability(costCenterId, amount) {
        try {
            const currentYear = new Date().getFullYear();
            const [budgets] = await pool.query(`
                SELECT 
                    id,
                    total_amount,
                    committed_amount,
                    spent_amount,
                    (total_amount - committed_amount - spent_amount) as available
                FROM budgets 
                WHERE cost_center_id = ? 
                AND year = ?
                AND active = TRUE
            `, [costCenterId, currentYear]);

            if (budgets.length === 0) {
                return {
                    hasBudget: false,
                    available: 0,
                    sufficient: false,
                    warning: 'No hay presupuesto asignado para este centro de costo'
                };
            }

            const budget = budgets[0];
            const available = budget.available;
            const sufficient = available >= amount;

            return {
                hasBudget: true,
                available: available,
                sufficient: sufficient,
                budgetId: budget.id,
                totalBudget: budget.total_amount,
                committed: budget.committed_amount,
                spent: budget.spent_amount,
                warning: sufficient
                    ? null
                    : `Presupuesto insuficiente. Disponible: RD$${available.toLocaleString()}, Requerido: RD$${amount.toLocaleString()}`
            };

        } catch (error) {
            return { hasBudget: false, available: 0, sufficient: false, warning: 'Error verificando presupuesto' };
        }
    }

    /**
     * Comprometer fondos (al generar OC)
     */
    async commitBudget(costCenterId, amount, orderId, userId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const currentYear = new Date().getFullYear();
            const [budgets] = await connection.query(`
                SELECT * FROM budgets 
                WHERE cost_center_id = ? 
                AND year = ?
                AND active = TRUE
                FOR UPDATE
            `, [costCenterId, currentYear]);

            if (budgets.length === 0) {
                throw new Error('No hay presupuesto asignado');
            }

            const budget = budgets[0];
            const available = budget.total_amount - budget.committed_amount - budget.spent_amount;

            if (available < amount) {
                throw new Error(`Presupuesto insuficiente. Disponible: ${available}, Requerido: ${amount}`);
            }

            // Actualizar presupuesto comprometido
            await connection.query(`
                UPDATE budgets 
                SET committed_amount = committed_amount + ?
                WHERE id = ?
            `, [amount, budget.id]);

            // Registrar auditoría
            if (AuditService && AuditService.log) {
                await AuditService.log({
                    user_id: userId,
                    action: 'BUDGET_COMMITTED',
                    table_name: 'budgets',
                    record_id: budget.id,
                    old_values: JSON.stringify({ committed_amount: budget.committed_amount }),
                    new_values: JSON.stringify({
                        committed_amount: budget.committed_amount + amount,
                        order_id: orderId
                    }),
                    ip_address: null
                }, connection);
            }

            await connection.commit();
            return { success: true, message: 'Presupuesto comprometido correctamente' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Gastar del presupuesto (cuando se finaliza una OC)
     */
    async spendFromBudget(costCenterId, amount, orderId, userId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const currentYear = new Date().getFullYear();
            const [budgets] = await connection.query(`
                SELECT * FROM budgets 
                WHERE cost_center_id = ? 
                AND year = ?
                AND active = TRUE
                FOR UPDATE
            `, [costCenterId, currentYear]);

            if (budgets.length === 0) {
                throw new Error('No hay presupuesto asignado');
            }

            const budget = budgets[0];

            // Mover de "comprometido" a "gastado"
            await connection.query(`
                UPDATE budgets 
                SET 
                    committed_amount = GREATEST(0, committed_amount - ?),
                    spent_amount = spent_amount + ?
                WHERE id = ?
            `, [amount, amount, budget.id]);

            await connection.commit();

            return {
                success: true,
                message: 'Presupuesto actualizado correctamente'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Liberar presupuesto comprometido (cuando se cancela una OC)
     */
    async releaseCommittedBudget(costCenterId, amount) {
        try {
            const currentYear = new Date().getFullYear();
            await pool.query(`
                UPDATE budgets 
                SET committed_amount = GREATEST(0, committed_amount - ?)
                WHERE cost_center_id = ?
                AND year = ?
                AND active = TRUE
            `, [amount, costCenterId, currentYear]);

            return {
                success: true,
                message: 'Presupuesto liberado correctamente'
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener resumen presupuestario por centro de costo
     */
    async getBudgetSummary(costCenterId) {
        try {
            const currentYear = new Date().getFullYear();
            const [budgets] = await pool.query(`
                SELECT 
                    b.*,
                    cc.code as cost_center_code,
                    cc.name as cost_center_name,
                    c.name as company_name,
                    (b.total_amount - b.committed_amount - b.spent_amount) as available,
                    ROUND((b.spent_amount / b.total_amount) * 100, 2) as spent_percentage,
                    ROUND((b.committed_amount / b.total_amount) * 100, 2) as committed_percentage
                FROM budgets b
                INNER JOIN cost_centers cc ON b.cost_center_id = cc.id
                LEFT JOIN companies c ON cc.company_id = c.id
                WHERE b.cost_center_id = ?
                AND b.year = ?
                AND b.active = TRUE
            `, [costCenterId, currentYear]);

            if (budgets.length === 0) {
                return null;
            }

            return budgets[0];

        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener métricas de presupuesto para dashboard
     */
    async getDashboardMetrics(companyId = null) {
        try {
            const currentYear = new Date().getFullYear();
            let query = `
                SELECT 
                    COUNT(DISTINCT b.id) as total_budgets,
                    SUM(b.total_amount) as total_budget,
                    SUM(b.committed_amount) as total_committed,
                    SUM(b.spent_amount) as total_spent,
                    SUM(b.total_amount - b.committed_amount - b.spent_amount) as total_available,
                    ROUND(AVG((b.spent_amount / b.total_amount) * 100), 2) as avg_spent_percentage
                FROM budgets b
                INNER JOIN cost_centers cc ON b.cost_center_id = cc.id
                WHERE b.year = ?
                AND b.active = TRUE
            `;

            const params = [currentYear];

            if (companyId) {
                query += ` AND cc.company_id = ?`;
                params.push(companyId);
            }

            const [metrics] = await pool.query(query, params);

            return metrics[0];

        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener dashboard de presupuesto para supervisión
     */
    async getBudgetDashboard() {
        try {
            const currentYear = new Date().getFullYear();

            // Get all budgets with cost center details
            const [budgets] = await pool.query(`
                SELECT 
                    b.id,
                    b.cost_center_id,
                    cc.name as cost_center_name,
                    b.total_amount,
                    b.committed_amount,
                    b.spent_amount,
                    (b.total_amount - b.committed_amount - b.spent_amount) as available,
                    ROUND(((b.committed_amount + b.spent_amount) / b.total_amount) * 100, 2) as usage_percentage
                FROM budgets b
                LEFT JOIN cost_centers cc ON b.cost_center_id = cc.id
                WHERE b.year = ?
                AND b.active = TRUE
                ORDER BY usage_percentage DESC
            `, [currentYear]);

            // Calculate totals
            const totals = budgets.reduce((acc, budget) => ({
                total: acc.total + parseFloat(budget.total_amount),
                committed: acc.committed + parseFloat(budget.committed_amount),
                spent: acc.spent + parseFloat(budget.spent_amount),
                available: acc.available + parseFloat(budget.available)
            }), { total: 0, committed: 0, spent: 0, available: 0 });

            return {
                budgets,
                totals,
                year: currentYear
            };
        } catch (error) {
            throw error;
        }
    }

    // Mantener compatibilidad con métodos antiguos
    async reserveFunds(costCenterId, amount) {
        return this.commitBudget(costCenterId, amount, null, null);
    }

    async commitFunds(costCenterId, amount) {
        return this.spendFromBudget(costCenterId, amount, null, null);
    }

}

module.exports = new BudgetService();
