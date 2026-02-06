import { useState, useEffect } from 'react';
import { User, Module } from '../../types';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HomeProps {
  user: User;
  onNavigate: (module: Module) => void;
}

interface SystemStats {
  employees: number;
  news: number;
  requests: { total: number; pending: number };
  tickets: { total: number; open: number };
  attendance: number;
  interactions: { reactions: number; comments: number };
}

function Home({ user, onNavigate }: HomeProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [ticketsData, setTicketsData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const startTime = Date.now();
    const minLoadingTime = 400; // Minimum loading time in ms

    try {
      const [statsRes, attendanceRes, ticketsRes] = await Promise.all([
        api.get('/analytics/stats'),
        api.get('/analytics/attendance-chart'),
        api.get('/analytics/tickets-distribution')
      ]);

      setStats(statsRes.data);
      setAttendanceData(attendanceRes.data);
      setTicketsData(ticketsRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showToast('Error cargando dashboard', 'error');
    } finally {
      // Ensure minimum loading time for better UX
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  // Datos para gráfico de asistencia (últimos 7 días)
  const attendanceChartData = {
    labels: attendanceData.slice(-7).map(d => new Date(d.date).toLocaleDateString('es-DO', { weekday: 'short' })),
    datasets: [{
      label: 'Asistencias',
      data: attendanceData.slice(-7).map(d => d.count),
      borderColor: 'var(--primary-color)',
      backgroundColor: 'rgba(0, 183, 79, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  };

  // Datos para gráfico de tickets por categoría
  const ticketsChartData = {
    labels: ticketsData.map(t => t.category),
    datasets: [{
      data: ticketsData.map(t => t.count),
      backgroundColor: [
        'var(--primary-color)', // 00B74F (Verde Midas)
        '#0066CC', // Azul Institucional
        '#F59E0B', // Amarillo Alerta
        '#EF4444', // Rojo Error
        '#8B5CF6', // Violeta
        '#10B981', // Verde Esmeralda
        '#6366F1'  // Indigo
      ],
    }]
  };

  // Datos para gráfico de solicitudes
  const requestsChartData = {
    labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
    datasets: [{
      label: 'Solicitudes',
      data: stats ? [stats.requests.pending, stats.requests.total - stats.requests.pending, 0] : [0, 0, 0],
      backgroundColor: ['#F59E0B', '#10B981', '#EF4444'],
      borderWidth: 0,
    }]
  };

  const quickAccess = [
    { label: 'Nueva Solicitud', icon: 'fa-shopping-cart', color: 'bg-primary', module: 'requests' as Module },
    { label: 'Ver Volantes', icon: 'fa-money-bill-wave', color: 'bg-[#0066CC]', module: 'payroll' as Module },
    { label: 'Marcar Asistencia', icon: 'fa-clock', color: 'bg-yellow-500', module: 'attendance' as Module },
    { label: 'Crear Ticket IT', icon: 'fa-headset', color: 'bg-purple-500', module: 'helpdesk' as Module },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img
            src={user?.avatar || 'https://i.pravatar.cc/150?img=1'}
            alt={user?.name || 'Usuario'}
            className="w-16 h-16 rounded-full border-4 border-primary shadow-lg hover:scale-105 transition-transform duration-300"
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Bienvenido, {user?.name?.split(' ')[0] || 'Usuario'} 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {user?.position || ''} {user?.department ? `- ${user.department}` : ''}
            </p>
          </div>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('es-DO', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-2xl font-bold text-primary">
            {new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[
          { title: 'Total Empleados', value: stats?.employees || 0, icon: 'fa-users', bgColor: 'bg-blue-500' },
          { title: 'Noticias', value: stats?.news || 0, icon: 'fa-newspaper', bgColor: 'bg-green-500' },
          { title: 'Solicitudes Pendientes', value: stats?.requests.pending || 0, icon: 'fa-shopping-cart', bgColor: 'bg-yellow-500' },
          { title: 'Tickets Abiertos', value: stats?.tickets.open || 0, icon: 'fa-headset', bgColor: 'bg-purple-500' },
        ].map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover-lift cursor-pointer border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} w-14 h-14 rounded-full flex items-center justify-center shadow-lg`}>
                <i className={`fas ${stat.icon} text-white text-2xl`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 slide-up">
        {/* Attendance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              <i className="fas fa-chart-line text-primary mr-2"></i>
              Asistencia (Últimos 7 días)
            </h3>
          </div>
          <div style={{ height: '250px' }}>
            {attendanceData.length > 0 ? (
              <Line
                data={attendanceChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(156, 163, 175, 0.1)' },
                      ticks: { color: 'rgb(156, 163, 175)' }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: 'rgb(156, 163, 175)' }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No hay datos de asistencia
              </div>
            )}
          </div>
        </div>

        {/* Tickets Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              <i className="fas fa-chart-pie text-[#0066CC] mr-2"></i>
              Tickets por Categoría
            </h3>
          </div>
          <div style={{ height: '250px' }}>
            {ticketsData.length > 0 ? (
              <Doughnut
                data={ticketsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: 'rgb(156, 163, 175)' }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No hay tickets registrados
              </div>
            )}
          </div>
        </div>

        {/* Requests Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              <i className="fas fa-chart-bar text-[#F59E0B] mr-2"></i>
              Estado de Solicitudes
            </h3>
          </div>
          <div style={{ height: '250px' }}>
            <Bar
              data={requestsChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(156, 163, 175, 0.1)' },
                    ticks: { color: 'rgb(156, 163, 175)' }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { color: 'rgb(156, 163, 175)' }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <i className="fas fa-rocket text-[#8B5CF6] mr-2"></i>
            Acceso Rápido
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickAccess.map((item, i) => (
              <button
                key={i}
                onClick={() => onNavigate(item.module)}
                className={`${item.color} text-white p-4 rounded-xl hover-lift transition-all text-left shadow-lg opacity-90 hover:opacity-100`}
              >
                <i className={`fas ${item.icon} text-2xl mb-2`}></i>
                <p className="text-sm font-semibold">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="bg-gradient-to-r from-primary to-[#0066CC] rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">Sistema Activo</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="opacity-75 text-sm">Empleados</p>
                <p className="text-3xl font-bold">{stats?.employees || 0}</p>
              </div>
              <div>
                <p className="opacity-75 text-sm">Noticias</p>
                <p className="text-3xl font-bold">{stats?.news || 0}</p>
              </div>
              <div>
                <p className="opacity-75 text-sm">Solicitudes</p>
                <p className="text-3xl font-bold">{stats?.requests.total || 0}</p>
              </div>
              <div>
                <p className="opacity-75 text-sm">Interacciones</p>
                <p className="text-3xl font-bold">{(stats?.interactions.reactions || 0) + (stats?.interactions.comments || 0)}</p>
              </div>
            </div>
          </div>
          <div className="hidden lg:block text-8xl opacity-20">
            <i className="fas fa-chart-line"></i>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
