/**
 * Purchase Order Controller
 * Controlador para gestionar Órdenes de Compra
 */

const PurchaseOrderService = require('../services/PurchaseOrderService');
const BudgetService = require('../services/BudgetService');
const logger = require('../config/logger');

class PurchaseOrderController {

    /**
     * POST /api/purchase-orders
     * Generar nueva orden de compra
     */
    async generateOrder(req, res) {
        try {
            const {
                requestId,
                supplierName,
                supplierTaxId,
                supplierContact,
                unitPrice,
                quantity,
                subtotal,
                taxAmount,
                totalAmount,
                currency,
                paymentTerms,
                deliveryDate,
                deliveryAddress,
                notes
            } = req.body;

            // Validaciones
            if (!requestId || !supplierName || !unitPrice || !quantity || !totalAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos requeridos'
                });
            }

            const result = await PurchaseOrderService.generatePurchaseOrder(
                requestId,
                req.user.id,
                {
                    supplierName,
                    supplierTaxId,
                    supplierContact,
                    unitPrice,
                    quantity,
                    subtotal,
                    taxAmount,
                    totalAmount,
                    currency,
                    paymentTerms,
                    deliveryDate,
                    deliveryAddress,
                    notes,
                    ipAddress: req.ip
                }
            );

            res.status(201).json({
                success: true,
                data: result,
                message: 'Orden de compra generada exitosamente'
            });

        } catch (error) {
            logger.error('Error generating purchase order:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al generar orden de compra'
            });
        }
    }

    /**
     * GET /api/purchase-orders/:id
     * Obtener orden de compra por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const order = await PurchaseOrderService.getOrderById(id, req.user.id);

            res.json({
                success: true,
                data: order
            });

        } catch (error) {
            logger.error('Error fetching purchase order:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'Orden de compra no encontrada'
            });
        }
    }

    /**
     * GET /api/purchase-orders
     * Listar órdenes de compra con filtros
     */
    async list(req, res) {
        try {
            const { status, companyId, dateFrom, dateTo } = req.query;

            const filters = {
                status,
                companyId,
                dateFrom,
                dateTo
            };

            const orders = await PurchaseOrderService.listOrders(filters);

            res.json({
                success: true,
                data: orders,
                total: orders.length
            });

        } catch (error) {
            logger.error('Error listing purchase orders:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener órdenes de compra'
            });
        }
    }

    /**
     * POST /api/purchase-orders/:id/approve
     * Aprobar orden de compra
     */
    async approve(req, res) {
        try {
            const { id } = req.params;
            const { digitalSignature } = req.body;

            const result = await PurchaseOrderService.approveOrder(
                id,
                req.user.id,
                digitalSignature
            );

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            logger.error('Error approving purchase order:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al aprobar orden de compra'
            });
        }
    }

    /**
     * GET /api/purchase-orders/budget/check/:costCenterId
     * Verificar disponibilidad presupuestaria
     */
    async checkBudget(req, res) {
        try {
            const { costCenterId } = req.params;
            const { amount } = req.query;

            if (!amount) {
                return res.status(400).json({
                    success: false,
                    message: 'El parámetro "amount" es requerido'
                });
            }

            const budgetCheck = await BudgetService.checkAvailability(
                costCenterId,
                parseFloat(amount)
            );

            res.json({
                success: true,
                data: budgetCheck
            });

        } catch (error) {
            logger.error('Error checking budget:', error);
            res.status(500).json({
                success: false,
                message: 'Error al verificar presupuesto'
            });
        }
    }

}

module.exports = new PurchaseOrderController();
