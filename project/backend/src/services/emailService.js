/**
 * Servicio de Email - Envío de notificaciones
 */

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Configuración del transporter (usar variables de entorno en producción)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

const emailService = {
    /**
     * Enviar email de notificación
     */
    async sendNotification({ to, subject, html, text }) {
        try {
            const mailOptions = {
                from: `"MIDAS Intranet" <${process.env.SMTP_USER || 'noreply@midas.com'}>`,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, '') // Versión texto plano
            };

            const info = await transporter.sendMail(mailOptions);
            logger.info('📧 Email enviado', { messageId: info.messageId, to, subject });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error('Error enviando email', { error: error.message, to, subject });
            return { success: false, error: error.message };
        }
    },

    /**
     * Plantilla para ticket nuevo
     */
    async sendTicketCreated({ email, ticketNumber, title, description }) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #00B74F 0%, #0066CC 100%); color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">🎫 Nuevo Ticket Creado</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9;">
                    <p style="color: #333;">Se ha creado un nuevo ticket de soporte:</p>
                    <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #00B74F;">
                        <p><strong>Número:</strong> ${ticketNumber}</p>
                        <p><strong>Título:</strong> ${title}</p>
                        <p><strong>Descripción:</strong> ${description}</p>
                    </div>
                    <p style="color: #666; margin-top: 20px;">Recibirás actualizaciones cuando el estado cambie.</p>
                </div>
                <div style="background: #333; color: #aaa; padding: 10px; text-align: center; font-size: 12px;">
                    MIDAS Intranet - Sistema Interno
                </div>
            </div>
        `;

        return this.sendNotification({
            to: email,
            subject: `[Ticket ${ticketNumber}] ${title}`,
            html
        });
    },

    /**
     * Plantilla para solicitud aprobada/rechazada
     */
    async sendRequestUpdate({ email, requestId, status, approverName }) {
        const statusColors = {
            aprobada: '#00B74F',
            rechazada: '#EF4444',
            pendiente: '#F59E0B'
        };

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: ${statusColors[status] || '#333'}; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">📋 Actualización de Solicitud</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9;">
                    <p style="color: #333;">Tu solicitud <strong>#${requestId}</strong> ha sido <strong>${status.toUpperCase()}</strong></p>
                    <p style="color: #666;">Revisado por: ${approverName}</p>
                </div>
            </div>
        `;

        return this.sendNotification({
            to: email,
            subject: `Solicitud #${requestId} - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            html
        });
    }
};

module.exports = emailService;
