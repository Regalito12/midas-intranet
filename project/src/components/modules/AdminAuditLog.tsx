import { useState, useEffect } from 'react';
import { User } from '../../types';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';
import { exportToExcel } from '../../utils/excelExport';

interface AdminAuditLogProps {
    user: User;
}
import { Avatar } from '../common/Avatar';

interface AuditLog {
    id: string;
    created_at: string;
    user_id: number;
    username: string;
    full_name: string;
    avatar: string | null;
    ip_address: string | null;
    user_agent: string | null;
    action: string;
    entity: string;
    entity_id: string | null;
    details: string | null;
    severity?: 'info' | 'warning' | 'critical';
}

interface AuditStats {
    summary: {
        total_actions: number;
        unique_users: number;
        critical_count: number;
        warning_count: number;
        approvals: number;
        rejections: number;
    };
    topUsers: Array<{ user_name: string; action_count: number }>;
    actionDistribution: Array<{ action_type: string; count: number }>;
}

function AdminAuditLog({ user }: AdminAuditLogProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [filters, setFilters] = useState({
        actionType: '',
        entityType: '',
        severity: '',
        startDate: '',
        endDate: ''
    });
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.actionType) params.append('actionType', filters.actionType);
            if (filters.entityType) params.append('entityType', filters.entityType);
            if (filters.severity) params.append('severity', filters.severity);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await api.get(`/audit/logs?${params.toString()}`);
            setLogs(response.data);
        } catch (error) {
            console.error('Error loading audit logs:', error);
            showToast('Error cargando logs de auditoría', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const response = await api.get('/audit/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleFilter = () => {
        fetchLogs();
        fetchStats();
    };

    const handleReset = () => {
        setFilters({
            actionType: '',
            entityType: '',
            severity: '',
            startDate: '',
            endDate: ''
        });
        setTimeout(() => {
            fetchLogs();
            fetchStats();
        }, 100);
    };

    const handleExport = () => {
        const dataToExport = logs.map(log => ({
            Fecha: new Date(log.created_at).toLocaleString('es-DO'),
            Usuario: log.username || 'Sistema',
            Acción: log.action,
            Entidad: log.entity,
            'ID Entidad': log.entity_id || '-',
            Detalles: log.details || '-',
            Severidad: (log.severity || 'info').toUpperCase(),
            IP: log.ip_address || '-'
        }));
        exportToExcel(dataToExport, 'Auditoria_Sistema');
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500 text-white';
            case 'warning': return 'bg-yellow-500 text-white';
            default: return 'bg-blue-500 text-white';
        }
    };

    const getActionIcon = (actionType: string) => {
        const action = actionType.toUpperCase();
        if (action.includes('CREATE') || action.includes('CREATED')) return 'fa-plus-circle';
        if (action.includes('UPDATE') || action.includes('UPDATED')) return 'fa-edit';
        if (action.includes('DELETE') || action.includes('DELETED')) return 'fa-trash';
        if (action.includes('APPROVE') || action.includes('APPROVED')) return 'fa-check-circle';
        if (action.includes('REJECT') || action.includes('REJECTED')) return 'fa-times-circle';
        if (action.includes('SUBMIT') || action.includes('SUBMITTED')) return 'fa-paper-plane';
        if (action.includes('SPENT')) return 'fa-money-bill-wave';
        if (action.includes('COMMITTED') || action.includes('RESERVE')) return 'fa-lock';
        if (action.includes('LOGIN')) return 'fa-sign-in-alt';
        if (action.includes('EXPORT')) return 'fa-download';
        return 'fa-info-circle';
    };

    const renderJsonValue = (value: string | null) => {
        if (!value) return null;
        try {
            const parsed = JSON.parse(value);
            return <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">{JSON.stringify(parsed, null, 2)}</pre>;
        } catch (e) {
            return <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">{value}</p>;
        }
    };

    if (user.role !== 'admin') {
        return (
            <div className="text-center py-12">
                <i className="fas fa-shield-alt text-6xl text-gray-300 mb-4"></i>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
                <p className="text-gray-600 dark:text-gray-400">Solo administradores pueden acceder al log de auditoría.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-shield-alt text-primary mr-3"></i>
                        Log de Auditoría Empresarial
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Trazabilidad completa de todas las acciones del sistema
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="text-[#217346] hover:text-[#1e6b41] font-semibold flex items-center"
                >
                    <i className="fas fa-file-excel mr-2"></i>
                    Exportar a Excel
                </button>
            </div>

            {/* Stats Cards */}
            {!statsLoading && stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Total Acciones', value: stats.summary.total_actions, icon: 'fa-list', color: 'bg-blue-500' },
                        { label: 'Usuarios Únicos', value: stats.summary.unique_users, icon: 'fa-users', color: 'bg-purple-500' },
                        { label: 'Críticas', value: stats.summary.critical_count, icon: 'fa-exclamation-triangle', color: 'bg-red-500' },
                        { label: 'Advertencias', value: stats.summary.warning_count, icon: 'fa-exclamation-circle', color: 'bg-yellow-500' },
                        { label: 'Aprobaciones', value: stats.summary.approvals, icon: 'fa-check-circle', color: 'bg-green-500' },
                        { label: 'Rechazos', value: stats.summary.rejections, icon: 'fa-times-circle', color: 'bg-orange-500' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stat.value}</p>
                                </div>
                                <div className={`${stat.color} w-10 h-10 rounded-full flex items-center justify-center`}>
                                    <i className={`fas ${stat.icon} text-white`}></i>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Acción</label>
                        <select
                            value={filters.actionType}
                            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">Todas</option>
                            <option value="CREATE">Crear</option>
                            <option value="UPDATE">Actualizar</option>
                            <option value="DELETE">Eliminar</option>
                            <option value="APPROVE">Aprobar</option>
                            <option value="REJECT">Rechazar</option>
                            <option value="LOGIN">Login</option>
                            <option value="EXPORT">Exportar</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entidad</label>
                        <select
                            value={filters.entityType}
                            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">Todas</option>
                            <option value="request">Solicitud</option>
                            <option value="user">Usuario</option>
                            <option value="purchase_order">Orden de Compra</option>
                            <option value="budget">Presupuesto Global</option>
                            <option value="budget_project">Presupuesto Proyecto</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severidad</label>
                        <select
                            value={filters.severity}
                            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">Todas</option>
                            <option value="info">Info</option>
                            <option value="warning">Advertencia</option>
                            <option value="critical">Crítico</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                    <button
                        onClick={handleReset}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        Limpiar
                    </button>
                    <button
                        onClick={handleFilter}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-[#009640] transition"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <SkeletonTable />
                ) : logs.length === 0 ? (
                    <EmptyState
                        title="No hay registros"
                        message="No se encontraron logs de auditoría con los filtros seleccionados"
                        icon="fa-clipboard-list"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Fecha/Hora</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Usuario</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acción</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Entidad</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Severidad</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">IP</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Detalles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                                            {new Date(log.created_at).toLocaleString('es-DO')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <Avatar
                                                    src={log.avatar}
                                                    name={log.full_name || log.username || 'Sistema'}
                                                    size="sm"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                        {log.full_name || log.username || 'Sistema'}
                                                    </span>
                                                    {log.full_name && log.full_name !== log.username && (
                                                        <span className="text-xs text-gray-500 font-mono">@{log.username}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <i className={`fas ${getActionIcon(log.action)} text-gray-500`}></i>
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{log.action}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark-text-gray-400">
                                            {log.entity}
                                            {log.entity_id && <span className="text-xs text-gray-400 block">ID: {log.entity_id.substring(0, 8)}...</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(log.severity || 'info')}`}>
                                                {(log.severity || 'info').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                                            {log.ip_address || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="text-primary hover:text-[#009640] font-semibold"
                                            >
                                                <i className="fas fa-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl scale-in max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Detalles de Auditoría</h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Usuario</p>
                                    <p className="text-lg text-gray-800 dark:text-gray-200">{selectedLog.username || 'Sistema'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Fecha/Hora</p>
                                    <p className="text-lg text-gray-800 dark:text-gray-200">{new Date(selectedLog.created_at).toLocaleString('es-DO')}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Acción</p>
                                    <p className="text-lg text-gray-800 dark:text-gray-200">{selectedLog.action}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Entidad</p>
                                    <p className="text-lg text-gray-800 dark:text-gray-200">{selectedLog.entity}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">IP</p>
                                    <p className="text-lg text-gray-800 dark:text-gray-200 font-mono">{selectedLog.ip_address || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Severidad</p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(selectedLog.severity || 'info')}`}>
                                        {(selectedLog.severity || 'info').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            {selectedLog.details && (
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Detalles</p>
                                    {renderJsonValue(selectedLog.details)}
                                </div>
                            )}
                            {selectedLog.user_agent && (
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">User Agent</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg font-mono break-all">{selectedLog.user_agent}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminAuditLog;
