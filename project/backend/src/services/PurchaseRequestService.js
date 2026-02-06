/**
 * PurchaseRequestService
 * Servicio para gestionar solicitudes de compra
 */

const pool = require('../config/db');
const AuditService = require('./auditService');
const ProjectPlanningService = require('./ProjectPlanningService');

class PurchaseRequestService {

  /**
   * Crear nueva solicitud de compra
   */
  async createRequest(userId, requestData, files = []) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Generar número de solicitud
      const requestNumber = await this.generateRequestNumber(connection);

      // Los items vienen como un string JSON desde el frontend (FormData)
      const items = typeof requestData.items === 'string'
        ? JSON.parse(requestData.items)
        : (requestData.items || []);

      if (items.length === 0) {
        throw new Error('La solicitud debe contener al menos un ítem');
      }

      // Calcular total de la solicitud
      const totalEstimated = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.estimatedPrice)), 0);

      // ==========================================
      // INTEGRACIÓN CON PLANIFICACIÓN DE PROYECTOS
      // ==========================================
      let plannedProjectId = requestData.plannedProjectId || null;
      let isUnplanned = false;
      let unplannedJustification = requestData.unplannedJustification || null;

      if (plannedProjectId) {
        // Validar que el proyecto existe y está aprobado
        try {
          const project = await ProjectPlanningService.getProjectById(
            plannedProjectId,
            userId,
            'admin' // Bypass role check for validation
          );

          if (project.status !== 'APROBADO') {
            throw new Error('El proyecto seleccionado no está aprobado');
          }

          // Validación de Fechas (M-001)
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const startDate = project.start_date ? new Date(project.start_date) : null;
          const endDate = project.end_date ? new Date(project.end_date) : null;

          if (startDate && endDate) {
            if (today < startDate || today > endDate) {
              throw new Error(
                `La fecha actual (${today.toLocaleDateString()}) está fuera del rango de ejecución del proyecto ` +
                `(${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
              );
            }
          }

          // Verificar presupuesto disponible del proyecto
          const budgetCheck = await ProjectPlanningService.checkProjectBudget(
            plannedProjectId,
            totalEstimated
          );

          if (!budgetCheck.sufficient) {
            throw new Error(
              budgetCheck.warning ||
              `Presupuesto insuficiente en el proyecto. Disponible: RD$${budgetCheck.available?.toLocaleString()}`
            );
          }

          isUnplanned = false;
        } catch (error) {
          throw new Error(`Error validando proyecto planificado: ${error.message}`);
        }
      } else {
        // Marcar como no planificada y validar justificación
        isUnplanned = true;

        if (!unplannedJustification || unplannedJustification.length < 50) {
          throw new Error(
            'Las solicitudes no planificadas requieren justificación detallada (mínimo 50 caracteres)'
          );
        }
      }

      // Insertar solicitud (Cabecera) con campos de proyecto
      // Nota: Mantenemos product_name y description de la cabecera con los datos del primer item 
      // para compatibilidad con listados existentes que no hemos migrado a ver sub-items
      const [result] = await connection.query(`
        INSERT INTO purchase_requests (
          request_number, user_id, company_id, cost_center_id,
          assignment_type, assignment_reference,
          product_name, description, quantity, estimated_price,
          total_estimated, status,
          planned_project_id, is_unplanned, unplanned_justification
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SOLICITADO', ?, ?, ?)
      `, [
        requestNumber,
        userId,
        requestData.companyId,
        requestData.costCenterId,
        requestData.assignmentType,
        requestData.assignmentReference || null,
        items[0].productName,
        items[0].description,
        items[0].quantity,
        items[0].estimatedPrice,
        totalEstimated,
        plannedProjectId,
        isUnplanned,
        unplannedJustification
      ]);

      const requestId = result.insertId;

      // Insertar ítems detallados
      for (const item of items) {
        const itemTotal = parseFloat(item.quantity) * parseFloat(item.estimatedPrice);
        await connection.query(`
          INSERT INTO purchase_request_items (
            purchase_request_id, product_name, description, 
            quantity, estimated_price, total_estimated
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          requestId,
          item.productName,
          item.description,
          item.quantity,
          item.estimatedPrice,
          itemTotal
        ]);
      }

      // Insertar adjuntos si existen
      if (files && files.length > 0) {
        for (const file of files) {
          await connection.query(`
            INSERT INTO purchase_request_attachments (
              purchase_request_id, file_name, file_path, 
              file_type, file_size, uploaded_by
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            requestId,
            file.filename,
            file.path,
            file.mimetype,
            file.size,
            userId
          ]);
        }
      }

      // 5. Determinar Niveles de Aprobación (Matriz Dinámica)
      const matrixService = require('./matrixService');
      const approvalLevels = await matrixService.getRequiredLevels(totalEstimated, requestData.department || 'GLOBAL');

      if (approvalLevels.length > 0) {
        for (let i = 0; i < approvalLevels.length; i++) {
          const level = approvalLevels[i];
          await connection.query(`
            INSERT INTO purchase_approvals (
              purchase_request_id, approval_level, required_role_name, approval_status
            ) VALUES (?, ?, ?, 'PENDIENTE')
          `, [requestId, i + 1, level.approver_role || level.level_name]);
        }
      } else {
        await connection.query(`
          UPDATE purchase_requests SET status = 'APROBADO' WHERE id = ?
        `, [requestId]);
      }

      // Auditar
      await AuditService.log({
        userId,
        action: 'PURCHASE_REQUEST_CREATED',
        entityType: 'purchase_request',
        entityId: requestId,
        newValue: JSON.stringify({ ...requestData, items, approvalLevelsCount: approvalLevels.length }),
        connection
      });

      await connection.commit();

      return {
        success: true,
        requestId,
        requestNumber
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Generar número de solicitud: PR-2026-0001
   */
  async generateRequestNumber(connection) {
    const currentYear = new Date().getFullYear();

    // Obtener y actualizar serial
    const [rows] = await connection.query(`
      SELECT last_number FROM purchase_serials 
      WHERE serial_type = 'PR' AND fiscal_year = ?
      FOR UPDATE
    `, [currentYear]);

    let lastNumber = 0;
    if (rows.length > 0) {
      lastNumber = rows[0].last_number;
    }

    const nextNumber = lastNumber + 1;

    if (rows.length > 0) {
      await connection.query(`
        UPDATE purchase_serials 
        SET last_number = ? 
        WHERE serial_type = 'PR' AND fiscal_year = ?
      `, [nextNumber, currentYear]);
    } else {
      await connection.query(`
        INSERT INTO purchase_serials (serial_type, fiscal_year, last_number)
        VALUES ('PR', ?, ?)
      `, [currentYear, nextNumber]);
    }

    return `PR-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Obtener solicitud por ID
   */
  async getRequestById(requestId, userId) {
    const [requests] = await pool.query(`
      SELECT 
        pr.*,
        u.name as requester_name,
        u.email as requester_email,
        c.name as company_name,
        cc.name as cost_center_name,
        cc.code as cost_center_code
      FROM purchase_requests pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN companies c ON pr.company_id = c.id
      LEFT JOIN cost_centers cc ON pr.cost_center_id = cc.id
      WHERE pr.id = ?
    `, [requestId]);

    if (requests.length === 0) {
      throw new Error('Solicitud no encontrada');
    }

    const request = requests[0];

    // Obtener ítems detallados
    const [items] = await pool.query(`
      SELECT * FROM purchase_request_items 
      WHERE purchase_request_id = ?
    `, [requestId]);

    request.items = items;

    // Obtener adjuntos
    const [attachments] = await pool.query(`
      SELECT * FROM purchase_request_attachments 
      WHERE purchase_request_id = ?
    `, [requestId]);

    request.attachments = attachments;

    // Obtener aprobaciones pendientes
    const [approvals] = await pool.query(`
      SELECT * FROM purchase_approvals 
      WHERE purchase_request_id = ? 
      ORDER BY approval_level ASC
    `, [requestId]);

    request.approvals = approvals;

    return request;
  }

  /**
   * Obtener solicitudes del usuario
   */
  async getMyRequests(userId, filters = {}) {
    let query = `
      SELECT 
        pr.*,
        c.name as company_name,
        cc.name as cost_center_name
      FROM purchase_requests pr
      LEFT JOIN companies c ON pr.company_id = c.id
      LEFT JOIN cost_centers cc ON pr.cost_center_id = cc.id
      WHERE pr.user_id = ?
    `;

    const params = [userId];

    if (filters.status) {
      query += ` AND pr.status = ?`;
      params.push(filters.status);
    }

    if (filters.dateFrom) {
      query += ` AND pr.created_at >= ?`;
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ` AND pr.created_at <= ?`;
      params.push(filters.dateTo);
    }

    query += ` ORDER BY pr.created_at DESC`;
    const [rows] = await pool.query(query, params);

    return rows;
  }

  /**
   * Obtener solicitudes pendientes de aprobación para un usuario
   */
  async getPendingApprovals(userId) {
    // Obtener roles del usuario
    const [userRoles] = await pool.query(`
      SELECT r.name 
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `, [userId]);

    if (userRoles.length === 0) {
      return [];
    }

    const roleNames = userRoles.map(r => r.name);

    // Buscar solicitudes con aprobaciones pendientes para estos roles
    const [requests] = await pool.query(`
      SELECT DISTINCT
        pr.*,
        pa.approval_level,
        pa.required_role_name,
        u.name as requester_name,
        c.name as company_name,
        cc.name as cost_center_name
      FROM purchase_requests pr
      INNER JOIN purchase_approvals pa ON pr.id = pa.purchase_request_id
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN companies c ON pr.company_id = c.id
      LEFT JOIN cost_centers cc ON pr.cost_center_id = cc.id
      WHERE pa.approval_status = 'PENDIENTE'
        AND pa.required_role_name IN (?)
        AND pr.status IN ('LIBERADO', 'APROBADO')
      ORDER BY pr.created_at ASC
    `, [roleNames]);

    return requests;
  }

  /**
   * Verificar disponibilidad presupuestaria
   */
  async checkBudgetAvailability(costCenterId, amount) {
    const currentYear = new Date().getFullYear();

    const [budgets] = await pool.query(`
      SELECT 
        id, total_amount, committed_amount, spent_amount,
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
        warning: 'No hay presupuesto configurado para este centro de costo'
      };
    }

    const budget = budgets[0];
    const available = budget.available;

    return {
      hasBudget: true,
      total_amount: budget.total_amount,
      spent_amount: budget.spent_amount,
      committed_amount: budget.committed_amount,
      available,
      sufficient: available >= amount,
      warning: available < amount ? 'Presupuesto insuficiente' : null
    };
  }

  /**
   * Forzar cambio de estado administrativo (desde Torre de Control)
   */
  async forceOverride(requestId, userId, targetStatus, reason) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Obtener estado actual
      const [current] = await connection.query('SELECT status FROM purchase_requests WHERE id = ? FOR UPDATE', [requestId]);
      if (current.length === 0) throw new Error('Solicitud no encontrada');

      // 2. Actualizar estado y registrar motivo
      await connection.query(`
        UPDATE purchase_requests 
        SET status = ?, override_reason = ?
        WHERE id = ?
      `, [targetStatus, reason, requestId]);

      // 3. Auditar acción crítica
      await AuditService.log({
        userId,
        actionType: 'FORCE_OVERRIDE',
        entityType: 'purchase_request',
        entityId: requestId,
        oldValue: { status: current[0].status },
        newValue: { status: targetStatus, reason },
        description: `Salto administrativo forzado por el administrador: ${reason}`,
        severity: 'critical',
        connection
      });

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Reasignar solicitud a otro proyecto (M-003)
   */
  async reassignProject(requestId, newProjectId, userId, justification) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Validar solicitud existente
      const [request] = await connection.query('SELECT * FROM purchase_requests WHERE id = ? FOR UPDATE', [requestId]);
      if (request.length === 0) throw new Error('Solicitud no encontrada');
      const currentRequest = request[0];

      // 2. Validar nuevo proyecto
      const project = await ProjectPlanningService.getProjectById(newProjectId, userId, 'admin');
      if (project.status !== 'APROBADO') {
        throw new Error('El nuevo proyecto no está aprobado');
      }

      // 3. Validar presupuesto en nuevo proyecto
      const budgetCheck = await ProjectPlanningService.checkProjectBudget(newProjectId, currentRequest.total_estimated);
      if (!budgetCheck.sufficient) {
        throw new Error(`Presupuesto insuficiente en el nuevo proyecto. Disponible: RD$${budgetCheck.available?.toLocaleString()}`);
      }

      // 4. Actualizar asignación
      const oldProjectId = currentRequest.planned_project_id;
      await connection.query(`
        UPDATE purchase_requests 
        SET planned_project_id = ?, 
            unplanned_justification = NULL, 
            is_unplanned = 0
        WHERE id = ?
      `, [newProjectId, requestId]);

      // 5. Auditoría
      await AuditService.log({
        userId,
        actionType: 'REASSIGN_PROJECT',
        entityType: 'purchase_request',
        entityId: requestId,
        oldValue: { planned_project_id: oldProjectId },
        newValue: { planned_project_id: newProjectId, justification },
        description: `Reasignación de proyecto: De ID ${oldProjectId} a ID ${newProjectId}. Motivo: ${justification}`,
        severity: 'medium',
        connection
      });

      await connection.commit();
      return { success: true, message: 'Solicitud reasignada correctamente' };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtener todas las solicitudes (para administradores/reportes)
   */
  async getAllRequests(filters = {}) {
    let query = `
      SELECT 
        pr.*,
        u.name as requester_name,
        c.name as company_name,
        cc.name as cost_center_name
      FROM purchase_requests pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN companies c ON pr.company_id = c.id
      LEFT JOIN cost_centers cc ON pr.cost_center_id = cc.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.status) {
      query += ` AND pr.status = ?`;
      params.push(filters.status);
    }

    if (filters.companyId) {
      query += ` AND pr.company_id = ?`;
      params.push(filters.companyId);
    }

    if (filters.dateFrom) {
      query += ` AND pr.created_at >= ?`;
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ` AND pr.created_at <= ?`;
      params.push(`${filters.dateTo} 23:59:59`);
    }

    query += ` ORDER BY pr.created_at DESC`;
    const [rows] = await pool.query(query, params);

    return rows;
  }

}

module.exports = new PurchaseRequestService();
