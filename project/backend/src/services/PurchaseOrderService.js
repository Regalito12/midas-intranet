/**
 * Purchase Order Service
 * Servicio para gestionar Órdenes de Compra
 */

const pool = require('../config/db');
const AuditService = require('./auditService');
const logger = require('../config/logger');
const ProjectPlanningService = require('./ProjectPlanningService');
const BudgetService = require('./budgetService');

class PurchaseOrderService {

    /**
     * Generar nueva Orden de Compra desde una solicitud aprobada
     */
    async generatePurchaseOrder(requestId, userId, orderData) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Verificar que la solicitud está aprobada
            const [requests] = await connection.query(`
        SELECT * FROM purchase_requests WHERE id = ? AND status = 'APROBADO'
      `, [requestId]);

            if (requests.length === 0) {
                throw new Error('La solicitud no está aprobada o no existe');
            }

            const request = requests[0];

            // 2. Generar número de OC
            const orderNumber = await this.generateOrderNumber(connection);

            // 3. Crear registro de orden de compra
            const [result] = await connection.query(`
        INSERT INTO purchase_orders (
          order_number,
          request_id,
          supplier_name,
          supplier_tax_id,
          supplier_contact,
          unit_price,
          quantity,
          subtotal,
          tax_amount,
          total_amount,
          currency,
          payment_terms,
          delivery_date,
          delivery_address,
          notes,
          status,
          generated_by,
          generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GENERADA', ?, NOW())
      `, [
                orderNumber,
                requestId,
                orderData.supplierName,
                orderData.supplierTaxId,
                orderData.supplierContact,
                orderData.unitPrice,
                orderData.quantity,
                orderData.subtotal,
                orderData.taxAmount || 0,
                orderData.totalAmount,
                orderData.currency || 'DOP',
                orderData.paymentTerms,
                orderData.deliveryDate,
                orderData.deliveryAddress,
                orderData.notes,
                userId
            ]);

            const orderId = result.insertId;

            // 4. Actualizar estado de la solicitud
            await connection.query(`
        UPDATE purchase_requests 
        SET status = 'ORDEN_GENERADA'
        WHERE id = ?
      `, [requestId]);

            // 5. Comprometer presupuesto
            if (request.planned_project_id && !request.is_unplanned) {
                // CAMINO A: Proyecto Planificado (Matriz)
                await ProjectPlanningService.commitProjectBudget(
                    request.planned_project_id,
                    orderData.totalAmount,
                    requestId,
                    userId
                );
            } else if (request.cost_center_id) {
                // CAMINO B: No Planificado (Centro de Costo / Legacy)
                await this.commitBudget(
                    connection,
                    request.cost_center_id,
                    orderData.totalAmount,
                    orderId,
                    userId
                );
            }

            // 6. Registrar auditoría
            await AuditService.log({
                user_id: userId,
                action: 'PURCHASE_ORDER_GENERATED',
                table_name: 'purchase_orders',
                record_id: orderId,
                old_values: null,
                new_values: JSON.stringify({
                    order_number: orderNumber,
                    request_id: requestId,
                    total_amount: orderData.totalAmount
                }),
                ip_address: orderData.ipAddress || null
            }, connection);

            await connection.commit();

            return {
                orderId,
                orderNumber,
                message: 'Orden de compra generada exitosamente'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Generar número serial de OC (PO-YYYY-NNNN)
     */
    async generateOrderNumber(connection) {
        const currentYear = new Date().getFullYear();

        // Obtener el último serial del año actual
        const [serials] = await connection.query(`
      SELECT last_number 
      FROM purchase_serials 
      WHERE fiscal_year = ? AND serial_type = 'PO'
    `, [currentYear]);

        let nextNumber;

        if (serials.length === 0) {
            // Crear nuevo serial para el año
            await connection.query(`
        INSERT INTO purchase_serials (serial_type, fiscal_year, last_number)
        VALUES ('PO', ?, 1)
      `, [currentYear]);
            nextNumber = 1;
        } else {
            // Incrementar serial existente
            nextNumber = serials[0].last_number + 1;
            await connection.query(`
        UPDATE purchase_serials 
        SET last_number = ?
        WHERE fiscal_year = ? AND serial_type = 'PO'
      `, [nextNumber, currentYear]);
        }

        // Formato: PO-2026-0001
        return `PO-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
    }

    /**
     * Comprometer monto del presupuesto
     */
    async commitBudget(connection, costCenterId, amount, orderId, userId) {
        // Verificar presupuesto disponible
        const [budgets] = await connection.query(`
      SELECT * FROM budgets 
      WHERE cost_center_id = ? 
      AND year = YEAR(CURDATE())
      AND active = TRUE
    `, [costCenterId]);

        if (budgets.length === 0) {
            logger.warn('⚠️ No hay presupuesto asignado para este centro de costo. Saltando compromiso presupuestario.', { costCenterId });
            return;
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

        // Registrar auditoría del presupuesto
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

    /**
     * Obtener orden de compra por ID
     */
    async getOrderById(orderId, userId) {
        try {
            const [orders] = await pool.query(`
        SELECT 
          po.*,
          pr.request_number,
          pr.product_name,
          pr.description as request_description,
          cc.code as cost_center_code,
          cc.name as cost_center_name,
          c.name as company_name,
          u1.name as generated_by_name,
          u1.email as generated_by_email,
          u2.name as approved_by_name,
          u2.email as approved_by_email
        FROM purchase_orders po
        INNER JOIN purchase_requests pr ON po.request_id = pr.id
        LEFT JOIN cost_centers cc ON pr.cost_center_id = cc.id
        LEFT JOIN companies c ON pr.company_id = c.id
        LEFT JOIN users u1 ON po.generated_by = u1.id
        LEFT JOIN users u2 ON po.approved_by = u2.id
        WHERE po.id = ?
      `, [orderId]);

            if (orders.length === 0) {
                throw new Error('Orden de compra no encontrada');
            }

            return orders[0];

        } catch (error) {
            throw error;
        }
    }

    /**
     * Listar órdenes de compra con filtros
     */
    async listOrders(filters = {}) {
        try {
            let query = `
        SELECT 
          po.id,
          po.order_number,
          po.supplier_name,
          po.total_amount,
          po.status,
          po.generated_at,
          pr.request_number,
          pr.product_name,
          c.name as company_name,
          u.name as generated_by_name
        FROM purchase_orders po
        INNER JOIN purchase_requests pr ON po.request_id = pr.id
        LEFT JOIN companies c ON pr.company_id = c.id
        LEFT JOIN users u ON po.generated_by = u.id
        WHERE 1=1
      `;

            const params = [];

            if (filters.status) {
                query += ` AND po.status = ?`;
                params.push(filters.status);
            }

            if (filters.companyId) {
                query += ` AND pr.company_id = ?`;
                params.push(filters.companyId);
            }

            if (filters.dateFrom) {
                query += ` AND po.generated_at >= ?`;
                params.push(filters.dateFrom);
            }

            if (filters.dateTo) {
                query += ` AND po.generated_at <= ?`;
                params.push(filters.dateTo);
            }

            query += ` ORDER BY po.generated_at DESC`;

            const [orders] = await pool.query(query, params);
            return orders;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Aprobar orden de compra
     */
    async approveOrder(orderId, userId, digitalSignature = null) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            await connection.query(`
        UPDATE purchase_orders 
        SET 
          status = 'APROBADA',
          approved_by = ?,
          approved_at = NOW(),
          digital_signature = ?
        WHERE id = ? AND status = 'GENERADA'
      `, [userId, digitalSignature, orderId]);

            // Actualizar solicitud relacionada
            await connection.query(`
        UPDATE purchase_requests pr
        INNER JOIN purchase_orders po ON pr.id = po.request_id
        SET pr.status = 'CERRADO'
        WHERE po.id = ?
      `, [orderId]);

            // Auditoría
            await AuditService.log({
                user_id: userId,
                action: 'PURCHASE_ORDER_APPROVED',
                table_name: 'purchase_orders',
                record_id: orderId,
                old_values: JSON.stringify({ status: 'GENERADA' }),
                new_values: JSON.stringify({ status: 'APROBADA' }),
                ip_address: null
            }, connection);

            await connection.commit();

            return { message: 'Orden de compra aprobada exitosamente' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

}

module.exports = new PurchaseOrderService();
