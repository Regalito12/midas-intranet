import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminProps {
  user: User;
}

interface SystemStats {
  employees: number;
  news: number;
  requests: { total: number; pending: number };
  tickets: { total: number; open: number };
}

import { useHasPermission } from '../../hooks/useHasPermission';

function Admin({ user }: AdminProps) {
  const { hasPermission } = useHasPermission(user);
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/analytics/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSystemReport = async () => {
    try {
      showToast('Generando reporte...', 'info');

      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 183, 79);
      doc.text('MIDAS - Reporte del Sistema', 105, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado: ${new Date().toLocaleString('es-DO')}`, 105, 28, { align: 'center' });
      doc.text(`Por: ${user.name}`, 105, 34, { align: 'center' });

      // Line
      doc.setDrawColor(0, 183, 79);
      doc.setLineWidth(0.5);
      doc.line(20, 38, 190, 38);

      // Stats
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Estadísticas Generales', 20, 48);

      const statsData = stats ? [
        ['Empleados Registrados', stats.employees.toString()],
        ['Noticias Publicadas', stats.news.toString()],
        ['Solicitudes Totales', stats.requests.total.toString()],
        ['Solicitudes Pendientes', stats.requests.pending.toString()],
        ['Tickets Totales', stats.tickets.total.toString()],
        ['Tickets Abiertos', stats.tickets.open.toString()],
      ] : [];

      autoTable(doc, {
        startY: 54,
        head: [['Métrica', 'Valor']],
        body: statsData,
        theme: 'grid',
        headStyles: { fillColor: [0, 183, 79] },
      });

      // Footer
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('MIDAS Intranet - Sistema de Gestión Empresarial', 105, finalY + 20, { align: 'center' });

      // Save
      doc.save(`MIDAS_Reporte_Sistema_${new Date().getTime()}.pdf`);
      showToast('Reporte generado exitosamente', 'success');
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('Error generando reporte', 'error');
    }
  };

  const generateEmployeesReport = async () => {
    try {
      showToast('Generando reporte de empleados...', 'info');

      const response = await api.get('/employees');
      const employees = response.data;

      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 102, 204);
      doc.text('MIDAS - Directorio de Empleados', 105, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado: ${new Date().toLocaleString('es-DO')}`, 105, 28, { align: 'center' });

      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.5);
      doc.line(20, 32, 190, 32);

      // Table
      const employeesData = employees.map((emp: any) => [
        emp.name,
        emp.position,
        emp.department,
        emp.email,
        emp.phone
      ]);

      autoTable(doc, {
        startY: 38,
        head: [['Nombre', 'Cargo', 'Departamento', 'Email', 'Teléfono']],
        body: employeesData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204] },
        styles: { fontSize: 8 },
      });

      // Save
      doc.save(`MIDAS_Empleados_${new Date().getTime()}.pdf`);
      showToast('Reporte generado exitosamente', 'success');
    } catch (error) {
      console.error('Error generating employees report:', error);
      showToast('Error generando reporte', 'error');
    }
  };

  const generateRequestsReport = async () => {
    try {
      showToast('Generando reporte de solicitudes...', 'info');

      const response = await api.get('/requests');
      const requests = response.data;

      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(245, 158, 11);
      doc.text('MIDAS - Reporte de Solicitudes', 105, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado: ${new Date().toLocaleString('es-DO')}`, 105, 28, { align: 'center' });

      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.line(20, 32, 190, 32);

      // Table
      const requestsData = requests.map((req: any) => [
        req.id,
        req.requester_name,
        req.type,
        `RD$${req.total.toLocaleString()}`,
        req.status,
        new Date(req.date).toLocaleDateString('es-DO')
      ]);

      autoTable(doc, {
        startY: 38,
        head: [['ID', 'Solicitante', 'Tipo', 'Monto', 'Estado', 'Fecha']],
        body: requestsData,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 8 },
      });

      // Save
      doc.save(`MIDAS_Solicitudes_${new Date().getTime()}.pdf`);
      showToast('Reporte generado exitosamente', 'success');
    } catch (error) {
      console.error('Error generating requests report:', error);
      showToast('Error generando reporte', 'error');
    }
  };

  /* New State for Dynamic Data */
  const [recentActivity, setRecentActivity] = useState<{ user: string; action: string; time: string; icon: string; type: string; color: string }[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ name: string; status: string; uptime: string; color: string }[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [activityRes, healthRes] = await Promise.all([
        api.get('/analytics/recent-activity'),
        api.get('/analytics/health')
      ]);

      /* Map activity to UI format */
      const mappedActivity = activityRes.data.map((item: any) => ({
        user: item.user,
        action: item.action,
        time: formatTimeAgo(item.time),
        icon: getIconForType(item.type),
        color: getColorForType(item.type)
      }));

      setRecentActivity(mappedActivity);
      setSystemHealth(healthRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Hace unos momentos';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'noticia': return 'fa-newspaper';
      case 'ticket': return 'fa-headset';
      case 'solicitud': return 'fa-shopping-cart';
      default: return 'fa-info-circle';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'noticia': return 'bg-blue-500';
      case 'ticket': return 'bg-purple-500';
      case 'solicitud': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const statCards = [
    { label: 'Usuarios Activos', value: stats?.employees || 0, icon: 'fa-users', color: 'bg-blue-500', change: '+12 este mes' },
    { label: 'Solicitudes Pendientes', value: stats?.requests.pending || 0, icon: 'fa-shopping-cart', color: 'bg-yellow-500', change: `${stats?.requests.total || 0} totales` },
    { label: 'Tickets Abiertos', value: stats?.tickets.open || 0, icon: 'fa-headset', color: 'bg-purple-500', change: `${stats?.tickets.total || 0} totales` },
    { label: 'Noticias', value: stats?.news || 0, icon: 'fa-newspaper', color: 'bg-green-500', change: 'Publicadas' },
  ];

  /* REMOVED HARDCODED DATA: recentActivity, systemHealth */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
          <i className="fas fa-cog text-primary mr-3"></i>
          Panel de Administración
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona y monitorea la plataforma</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover-lift border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className={`${stat.color} w-12 h-12 rounded-full flex items-center justify-center`}>
                    <i className={`fas ${stat.icon} text-white text-xl`}></i>
                  </div>
                  <i className="fas fa-ellipsis-v text-gray-400"></i>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Reportes PDF */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              <i className="fas fa-file-pdf text-red-500 mr-3"></i>
              Generar Reportes PDF
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={generateSystemReport}
                className="bg-primary text-white p-4 rounded-xl hover-lift transition-all duration-200"
              >
                <i className="fas fa-chart-bar text-3xl mb-2"></i>
                <p className="font-semibold">Reporte del Sistema</p>
                <p className="text-xs opacity-75 mt-1">Estadísticas generales</p>
              </button>

              <button
                onClick={generateEmployeesReport}
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 rounded-xl hover-lift transition-all duration-200"
              >
                <i className="fas fa-users text-3xl mb-2"></i>
                <p className="font-semibold">Directorio de Empleados</p>
                <p className="text-xs opacity-75 mt-1">Lista completa</p>
              </button>

              <button
                onClick={generateRequestsReport}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-xl hover-lift transition-all duration-200"
              >
                <i className="fas fa-shopping-cart text-3xl mb-2"></i>
                <p className="font-semibold">Reporte de Solicitudes</p>
                <p className="text-xs opacity-75 mt-1">Todas las solicitudes</p>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Gestión de Contenido */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
          <i className="fas fa-edit text-purple-500 mr-3"></i>
          Gestión de Contenido
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin-news')}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 rounded-xl hover-lift transition-all duration-200"
          >
            <i className="fas fa-newspaper text-3xl mb-2"></i>
            <p className="font-semibold">Noticias y Avisos</p>
            <p className="text-xs opacity-75 mt-1">Publicar para empleados</p>
          </button>


          {hasPermission('admin_users') && (
            <button
              onClick={() => navigate('/admin-matrix')}
              className="bg-gradient-to-r from-indigo-500 to-indigo-700 text-white p-4 rounded-xl hover-lift transition-all duration-200"
            >
              <i className="fas fa-chess-king text-3xl mb-2"></i>
              <p className="font-semibold">Matriz y Gobernanza</p>
              <p className="text-xs opacity-75 mt-1">Configurar aprobaciones</p>
            </button>
          )}
          <button
            onClick={() => navigate('/admin-documents')}
            className="bg-gradient-to-r from-teal-500 to-teal-700 text-white p-4 rounded-xl hover-lift transition-all duration-200"
          >
            <i className="fas fa-file-alt text-3xl mb-2"></i>
            <p className="font-semibold">Gestionar Documentos</p>
            <p className="text-xs opacity-75 mt-1">Políticas, manuales y normas</p>
          </button>

          <button
            onClick={() => navigate('/admin-departments')}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 rounded-xl hover-lift transition-all duration-200"
          >
            <i className="fas fa-building text-3xl mb-2"></i>
            <p className="font-semibold">Departamentos</p>
            <p className="text-xs opacity-75 mt-1">Estructura y gerentes</p>
          </button>

          <button
            onClick={() => navigate('/admin-roles')}
            className="bg-gradient-to-r from-purple-500 to-purple-700 text-white p-4 rounded-xl hover-lift transition-all duration-200"
          >
            <i className="fas fa-user-shield text-3xl mb-2"></i>
            <p className="font-semibold">Gestión de Roles</p>
            <p className="text-xs opacity-75 mt-1">Permisos dinámicos</p>
          </button>

          <button
            onClick={() => navigate('/admin-payroll')}
            className="bg-gradient-to-r from-green-500 to-green-700 text-white p-4 rounded-xl hover-lift transition-all duration-200"
          >
            <i className="fas fa-file-invoice-dollar text-3xl mb-2"></i>
            <p className="font-semibold">Gestionar Nómina</p>
            <p className="text-xs opacity-75 mt-1">Crear volantes de pago</p>
          </button>
        </div>
      </div>

      {/* Configuración */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
          <i className="fas fa-cogs text-gray-500 mr-3"></i>
          Configuración del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/admin-config')}
            className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4 rounded-xl hover-lift transition-all duration-200"
          >
            <i className="fas fa-paint-brush text-3xl mb-2"></i>
            <p className="font-semibold">Apariencia y Marca</p>
            <p className="text-xs opacity-75 mt-1">Logo, colores y nombre</p>
          </button>

          <button
            onClick={() => navigate('/admin-backup')}
            className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white p-4 rounded-xl hover-lift transition-all duration-200"
          >
            <i className="fas fa-database text-3xl mb-2"></i>
            <p className="font-semibold">Respaldos y Datos</p>
            <p className="text-xs opacity-75 mt-1">Generar y descargar backups</p>
          </button>

          <button
            onClick={() => navigate('/supervision')}
            className="bg-gradient-to-r from-orange-400 to-orange-600 text-white p-4 rounded-xl hover-lift transition-all duration-200"
          >
            <i className="fas fa-tower-observation text-3xl mb-2"></i>
            <p className="font-semibold">Supervisión Gerencial</p>
            <p className="text-xs opacity-75 mt-1">Cuellos de botella y Overrides</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <i className="fas fa-chart-line text-primary mr-3"></i>
            Actividad Reciente
          </h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center space-x-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 fade-in">
                  <div className={`${activity.color} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
                    <i className={`fas ${activity.icon} text-white`}></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{activity.user}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{activity.action}</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{activity.time}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <i className="fas fa-history text-4xl mb-3 opacity-30"></i>
                <p>No hay actividad reciente</p>
              </div>
            )}
          </div>
        </div>

        {/* System Health Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <i className="fas fa-server text-blue-500 mr-3"></i>
            Estado del Sistema
          </h2>
          <div className="space-y-4">
            {systemHealth.map((system, i) => (
              <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`${system.color} w-3 h-3 rounded-full animate-pulse`}></div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{system.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Uptime: {system.uptime}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${system.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  system.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                  {system.status === 'online' ? 'En línea' : system.status === 'warning' ? 'Advertencia' : 'Error'}
                </span>
              </div>
            ))}
            {systemHealth.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500 mx-auto mb-2"></div>
                <p>Verificando estado...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;
