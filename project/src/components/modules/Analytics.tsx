import { useEffect, useState } from 'react';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';

interface AnalyticsProps {
  user: User;
}

interface SystemStats {
  employees: number;
  news: number;
  requests: { total: number; pending: number };
  tickets: { total: number; open: number };
  attendance: number;
  interactions: { reactions: number; comments: number };
}

function Analytics({ user: _user }: AnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const startTime = Date.now();
    const minLoadingTime = 400;

    try {
      const response = await api.get('/analytics/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      showToast('Error cargando estadísticas', 'error');
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No se pudieron cargar las estadísticas</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total Empleados', value: stats.employees, icon: 'fa-users', color: 'bg-blue-500' },
    { label: 'Noticias Publicadas', value: stats.news, icon: 'fa-newspaper', color: 'bg-green-500' },
    { label: 'Solicitudes Totales', value: stats.requests.total, icon: 'fa-shopping-cart', color: 'bg-yellow-500', sublabel: `${stats.requests.pending} pendientes` },
    { label: 'Tickets IT', value: stats.tickets.total, icon: 'fa-headset', color: 'bg-purple-500', sublabel: `${stats.tickets.open} abiertos` },
    { label: 'Registros de Asistencia', value: stats.attendance, icon: 'fa-clock', color: 'bg-indigo-500', sublabel: 'Este mes' },
    { label: 'Reacciones', value: stats.interactions.reactions, icon: 'fa-heart', color: 'bg-red-500' },
    { label: 'Comentarios', value: stats.interactions.comments, icon: 'fa-comment', color: 'bg-pink-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
          <i className="fas fa-chart-line text-primary mr-3"></i>
          Analytics y Estadísticas
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Métricas en tiempo real del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover-lift border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className={`${card.color} w-12 h-12 rounded-full flex items-center justify-center`}>
                <i className={`fas ${card.icon} text-white text-xl`}></i>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{card.label}</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{card.value}</p>
            {card.sublabel && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{card.sublabel}</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-primary to-[#0066CC] rounded-xl shadow-sm p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">Sistema Activo</h3>
            <p className="opacity-90">
              {stats.employees} empleados &bull; {stats.news} noticias &bull; {stats.requests.total} solicitudes
            </p>
            <p className="text-sm opacity-75 mt-2">
              {stats.interactions.reactions + stats.interactions.comments} interacciones totales en noticias
            </p>
          </div>
          <div className="text-6xl opacity-20">
            <i className="fas fa-chart-bar"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <i className="fas fa-tasks text-primary mr-3"></i>
            Estado de Solicitudes
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="font-semibold text-gray-800 dark:text-white">Pendientes</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.requests.pending}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold text-gray-800 dark:text-white">Procesadas</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.requests.total - stats.requests.pending}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <i className="fas fa-headset text-[#0066CC] mr-3"></i>
            Mesa de Ayuda
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-semibold text-gray-800 dark:text-white">Tickets Abiertos</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.tickets.open}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold text-gray-800 dark:text-white">Resueltos</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.tickets.total - stats.tickets.open}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
