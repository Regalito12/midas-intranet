const db = require('../config/db'); // Ajustar esto según tu configuración real de DB connection

/**
 * 🕵️ Audit Middleware (Passive Mode)
 * Este middleware intercepta requests que modifican datos y los registra en la base de datos.
 * NO bloquea el request si falla el log.
 */
const auditMiddleware = async (req, res, next) => {
    // 1. Filtro: Solo auditar métodos que cambian datos (POST, PUT, DELETE, PATCH)
    if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
        return next();
    }

    // 2. Captura Inicial (Pre-Response)
    const startTime = Date.now();
    const { method, originalUrl, body, user, ip } = req;

    // Sanitización básica: No guardar passwords en logs
    const safeBody = { ...body };
    if (safeBody.password) safeBody.password = '*****';
    if (safeBody.confirmPassword) safeBody.confirmPassword = '*****';

    // Hook para capturar el resultado después de que termine el request
    const originalSend = res.send;

    res.send = function (content) {
        // Restaurar función original
        res.send = originalSend;

        // Ejecutar original (NO BLOQUEAR AL USUARIO)
        const responseResult = originalSend.apply(res, arguments);

        // 3. Registrar Log (Asíncrono & Safe)
        // Usamos setImmediate para que esto corra después de enviar la respuesta
        setImmediate(async () => {
            try {
                const userId = user ? user.id : null;
                const userEmail = user ? (user.email || user.username) : 'anonymous';
                const status = res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS';

                // Determinar entidad basada en URL (heurística simple)
                // Ej: /api/requests/123 -> Entity: requests, ID: 123
                const urlParts = originalUrl.split('/');
                const entity = urlParts[2] || 'unknown'; // assuming /api/entity
                const entityId = urlParts[3] || null;

                const query = `
                    INSERT INTO audit_logs 
                    (user_id, user_email, action, entity, entity_id, new_values, ip_address, user_agent, status, error_details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const values = [
                    userId,
                    userEmail,
                    method, // Action code maps to Method initially
                    entity,
                    entityId,
                    JSON.stringify(safeBody), // Guardamos lo que intentaron enviar
                    ip || req.connection.remoteAddress,
                    req.get('User-Agent'),
                    status,
                    res.statusCode >= 400 ? `Status Code: ${res.statusCode}` : null
                ];

                // Ejecutar query (Compatible con mysql2/promise)
                if (db && db.query) {
                    await db.query(query, values);
                } else {
                    console.warn('[AUDIT LOG] DB connection not available');
                }

            } catch (error) {
                // 🛡️ SAFETY NET: Si falla el log, NO crashea la app, solo imprime error en consola
                console.error('[AUDIT LOG FATAL ERROR]', error.sqlMessage || error.message);
            }
        });

        return responseResult;
    };

    next();
};

module.exports = auditMiddleware;
