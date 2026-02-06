const pool = require('../config/db');
const logger = require('../config/logger');

// Obtener estadísticas generales del sistema
exports.getSystemStats = async (req, res) => {
    try {
        // Contar empleados
        const [employeesCount] = await pool.query('SELECT COUNT(*) as total FROM employees');

        // Contar noticias
        const [newsCount] = await pool.query('SELECT COUNT(*) as total FROM news');

        // Contar solicitudes
        const [requestsCount] = await pool.query('SELECT COUNT(*) as total FROM requests');
        const [pendingRequests] = await pool.query("SELECT COUNT(*) as total FROM requests WHERE status = 'pendiente'");

        // Contar tickets
        const [ticketsCount] = await pool.query('SELECT COUNT(*) as total FROM it_tickets');
        const [openTickets] = await pool.query("SELECT COUNT(*) as total FROM it_tickets WHERE status = 'abierto'");

        // Asistencia del mes actual
        const [attendanceMonth] = await pool.query(
            `SELECT COUNT(*) as total FROM attendance 
             WHERE MONTH(date) = MONTH(CURRENT_DATE()) 
             AND YEAR(date) = YEAR(CURRENT_DATE())`
        );

        // Total de reacciones
        const [reactionsCount] = await pool.query('SELECT COUNT(*) as total FROM news_reactions');

        // Total de comentarios
        const [commentsCount] = await pool.query('SELECT COUNT(*) as total FROM news_comments');

        res.json({
            employees: employeesCount[0].total,
            news: newsCount[0].total,
            requests: {
                total: requestsCount[0].total,
                pending: pendingRequests[0].total
            },
            tickets: {
                total: ticketsCount[0].total,
                open: openTickets[0].total
            },
            attendance: attendanceMonth[0].total,
            interactions: {
                reactions: reactionsCount[0].total,
                comments: commentsCount[0].total
            }
        });
    } catch (error) {
        logger.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ message: 'Error obteniendo estadísticas', error: error.message });
    }
};

// Obtener datos para gráficos de solicitudes por mes
exports.getRequestsChart = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                MONTH(date) as month,
                MONTHNAME(date) as month_name,
                COUNT(*) as count
             FROM requests
             WHERE YEAR(date) = YEAR(CURRENT_DATE())
             GROUP BY MONTH(date), MONTHNAME(date)
             ORDER BY MONTH(date)`
        );

        res.json(rows);
    } catch (error) {
        logger.error('Error obteniendo datos de solicitudes:', error);
        res.status(500).json({ message: 'Error obteniendo datos', error: error.message });
    }
};

// Obtener datos para gráfico de asistencia
exports.getAttendanceChart = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                DATE_FORMAT(date, '%Y-%m-%d') as date,
                COUNT(*) as count
             FROM attendance
             WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
             GROUP BY date
             ORDER BY date`
        );

        res.json(rows);
    } catch (error) {
        logger.error('Error obteniendo datos de asistencia:', error);
        res.status(500).json({ message: 'Error obteniendo datos', error: error.message });
    }
};

// Obtener distribución de tickets por categoría
exports.getTicketsDistribution = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT category, COUNT(*) as count
             FROM it_tickets
             GROUP BY category`
        );

        res.json(rows);
    } catch (error) {
        logger.error('Error obteniendo distribución de tickets:', error);
        res.status(500).json({ message: 'Error obteniendo datos', error: error.message });
    }
};

// Obtener actividad reciente
exports.getRecentActivity = async (req, res) => {
    try {
        // Últimas noticias
        const [recentNews] = await pool.query(
            `SELECT 'noticia' as type, author as user, title as action, date as time
             FROM news
             ORDER BY date DESC
             LIMIT 5`
        );

        // Últimas solicitudes
        const [recentRequests] = await pool.query(
            `SELECT 'solicitud' as type, requester_name as user, 
                    CONCAT('Creó solicitud de ', type) as action, date as time
             FROM requests
             ORDER BY date DESC
             LIMIT 5`
        );

        // Últimos tickets
        const [recentTickets] = await pool.query(
            `SELECT 'ticket' as type, requester_name as user, 
                    CONCAT('Abrió ticket: ', title) as action, created_at as time
             FROM it_tickets
             ORDER BY created_at DESC
             LIMIT 5`
        );

        // Combinar y ordenar
        const allActivity = [...recentNews, ...recentRequests, ...recentTickets]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);

        res.json(allActivity);
    } catch (error) {
        logger.error('Error obteniendo actividad reciente:', error);
        res.status(500).json({ message: 'Error obteniendo actividad', error: error.message });
    }
};

// Obtener estado del sistema
exports.getSystemHealth = async (req, res) => {
    try {
        // 1. Verificar BD
        let dbStatus = 'online';
        try {
            await pool.query('SELECT 1');
        } catch (e) {
            dbStatus = 'offline';
        }

        // 2. Mock de otros servicios (se podrían implementar verificaciones reales)
        // Por ahora simulamos que están ok si la app corre
        const systemHealth = [
            {
                name: 'Servidor Principal',
                status: 'online',
                uptime: `${Math.floor(process.uptime() / 60)} min`, // Uptime real del proceso Node
                color: 'bg-green-500'
            },
            {
                name: 'Base de Datos',
                status: dbStatus,
                uptime: dbStatus === 'online' ? '99.9%' : '0%',
                color: dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
            },
            {
                name: 'Sistema de Correo',
                status: 'online',
                uptime: '99.5%',
                color: 'bg-green-500'
            },
            {
                name: 'Sistema de Backup',
                status: 'warning',
                uptime: '95.2%',
                color: 'bg-yellow-500'
            }
        ];

        res.json(systemHealth);
    } catch (error) {
        logger.error('Error obteniendo estado del sistema:', error);
        res.status(500).json({ message: 'Error obteniendo estado', error: error.message });
    }
};
