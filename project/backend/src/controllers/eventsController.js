const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que la tabla existe
const ensureTableExists = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS events (
                id INT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                type ENUM('meeting', 'holiday', 'event', 'deadline') DEFAULT 'event',
                location VARCHAR(255),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (error) {
        logger.error('Error creating events table:', error);
    }
};

ensureTableExists();

// Obtener todos los eventos (públicos)
exports.getEvents = async (req, res) => {
    try {
        // 1. Obtener eventos manuales
        const [events] = await pool.query('SELECT * FROM events ORDER BY start_date ASC');

        // 2. Obtener cumpleaños (si hay fecha de nacimiento en empleados)
        // Asumimos que la tabla empleados tiene 'birth_date'
        // Si no existe birth_date, esta query podría fallar, así que lo envolvemos en try/catch opcional o verificamos
        let birthdays = [];
        try {
            const [emps] = await pool.query("SELECT id, name, birth_date FROM employees WHERE birth_date IS NOT NULL");

            // Transformar cumpleaños al año actual para mostrar en calendario
            const currentYear = new Date().getFullYear();
            birthdays = emps.map(emp => {
                const birth = new Date(emp.birth_date);
                // Crear fecha para este año
                const thisYearBirth = new Date(currentYear, birth.getMonth(), birth.getDate());

                return {
                    id: `bd-${emp.id}`,
                    title: `🎂 Cumpleaños de ${emp.name.split(' ')[0]}`,
                    start_date: thisYearBirth,
                    end_date: thisYearBirth,
                    type: 'birthday',
                    is_birthday: true
                };
            });
        } catch (err) {
            console.warn('No birth_date column or employees table issue:', err.message);
        }

        res.json([...events, ...birthdays]);
    } catch (error) {
        logger.error('Error fetching events:', error);
        res.status(500).json({ message: 'Error cargando eventos' });
    }
};

// Crear evento
exports.createEvent = async (req, res) => {
    const { title, description, start_date, end_date, type, location } = req.body;
    const userId = req.user.id;

    try {
        await pool.query(`
            INSERT INTO events (title, description, start_date, end_date, type, location, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [title, description, start_date, end_date, type, location, userId]);

        res.json({ message: 'Evento creado exitosamente' });
    } catch (error) {
        logger.error('Error creating event:', error);
        res.status(500).json({ message: 'Error creando evento' });
    }
};

// Eliminar evento
exports.deleteEvent = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM events WHERE id = ?', [id]);
        res.json({ message: 'Evento eliminado' });
    } catch (error) {
        logger.error('Error deleting event:', error);
        res.status(500).json({ message: 'Error eliminando evento' });
    }
};
