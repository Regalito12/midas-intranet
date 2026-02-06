import { useState, useEffect } from 'react';
import { User } from '../../types';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

interface CalendarProps {
    user: User;
}

interface CalendarEvent {
    id: number | string;
    title: string;
    start_date: string;
    type: 'meeting' | 'holiday' | 'event' | 'birthday';
}

import { useHasPermission } from '../../hooks/useHasPermission';

function Calendar({ user }: CalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const { hasPermission } = useHasPermission(user);
    const [newEvent, setNewEvent] = useState({
        title: '',
        start_date: '',
        end_date: '',
        type: 'event',
        description: ''
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/events');
            setEvents(res.data);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calendar helper functions
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"></div>);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.start_date.startsWith(dateStr));
            const isToday = new Date().toISOString().startsWith(dateStr);

            days.push(
                <div key={day} className={`h-32 border border-gray-100 dark:border-gray-700 p-2 relative group hover:bg-gray-50 dark:hover:bg-gray-800 transition ${isToday ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'}`}>
                    <span className={`text-sm font-semibold rounded-full w-7 h-7 flex items-center justify-center ${isToday ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {day}
                    </span>

                    <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                        {dayEvents.map((evt, idx) => (
                            <div
                                key={idx}
                                className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80
                                    ${evt.type === 'holiday' ? 'bg-red-100 text-red-700' :
                                        evt.type === 'meeting' ? 'bg-blue-100 text-blue-700' :
                                            evt.type === 'birthday' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'}`}
                                title={evt.title}
                            >
                                {evt.type === 'birthday' && '🎂 '}
                                {evt.type === 'holiday' && '🏖️ '}
                                {evt.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/events', newEvent);
            showToast('Evento creado', 'success');
            setShowModal(false);
            fetchEvents();
        } catch (error) {
            showToast('Error creando evento', 'error');
        }
    };

    return (
        <div className="fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-calendar-alt text-primary mr-3"></i>
                        Calendario Corporativo
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Eventos, feriados y celebraciones</p>
                </div>
                {hasPermission('manage_attendance') && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-[#009640] transition shadow-lg flex items-center"
                    >
                        <i className="fas fa-plus mr-2"></i> Nuevo Evento
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Calendar Header */}
                <div className="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition">
                        <i className="fas fa-chevron-left text-gray-600 dark:text-gray-300"></i>
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-wide">
                        {currentDate.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition">
                        <i className="fas fa-chevron-right text-gray-600 dark:text-gray-300"></i>
                    </button>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                        <div key={day} className="py-2 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-700 gap-px">
                    {loading ? (
                        <div className="col-span-7 h-96 flex items-center justify-center bg-white dark:bg-gray-800">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        renderCalendarDays()
                    )}
                </div>
            </div>

            {/* Modal Crear Evento */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Nuevo Evento</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Título</label>
                                <input
                                    required
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Inicio</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={newEvent.start_date}
                                        onChange={e => setNewEvent({ ...newEvent, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Fin</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={newEvent.end_date}
                                        onChange={e => setNewEvent({ ...newEvent, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo</label>
                                <select
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={newEvent.type}
                                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                                >
                                    <option value="event">Evento General</option>
                                    <option value="meeting">Reunión</option>
                                    <option value="holiday">Día Feriado</option>
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-white rounded hover:bg-[#009640] transition"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Calendar;
