const auditService = require('../services/auditService');

const auditInterceptor = (entityType) => {
    return (req, res, next) => {
        // Solo auditar métodos que modifican datos
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            return next();
        }

        // Interceptar el evento 'finish' de la respuesta
        res.on('finish', () => {
            // Solo loguear si la petición fue exitosa (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const user = req.user;

                // Sanitizar body (quitar contraseñas)
                const safeBody = { ...req.body };
                if (safeBody.password) safeBody.password = '[HIDDEN]';
                if (safeBody.newPassword) safeBody.newPassword = '[HIDDEN]';

                // Determinar ID de entidad
                const entityId = req.params.id || (res.locals.createdId) || null;

                if (user) {
                    const actionType = `${req.method}_${entityType || 'API'}`.toUpperCase();

                    auditService.log({
                        userId: user.id,
                        username: user.username,
                        action: actionType,
                        entity: entityType || 'unknown',
                        entityId: entityId,
                        details: {
                            path: req.originalUrl,
                            method: req.method,
                            body: safeBody
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    }).catch(err => console.error('Audit Log Error:', err));
                }
            }
        });

        next();
    };
};

module.exports = auditInterceptor;
