import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

interface BottleneckItem {
    id: string;
    type: string;
    total: number;
    status: string;
    created_at: string;
    department: string;
    hours_waiting: number;
    workflow_name: string;
    pending_approver: string;
    approver_role: string;
}

interface AuditItem {
    id: number;
    request_id: string;
    action: string;
    actor_name: string;
    comment: string;
    created_at: string;
    request_type: string;
    requester_name: string;
}

interface BudgetData {
    id: number;
    cost_center_name: string;
    total_amount: number;
    committed_amount: number;
    spent_amount: number;
    available: number;
    usage_percentage: number;
}

function Supervision() {
    const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);
    const [auditHistory, setAuditHistory] = useState<AuditItem[]>([]);
    const [budgetData, setBudgetData] = useState<{ budgets: BudgetData[], totals: any } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [overrideReason, setOverrideReason] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [blRes, auditRes, budgetRes] = await Promise.all([
                api.getBottlenecks(),
                api.getAuditHistory(),
                api.get('/budget/dashboard')
            ]);
            setBottlenecks(blRes.data);
            setAuditHistory(auditRes.data);
            setBudgetData(budgetRes.data);
        } catch (error) {
            console.error('Error fetching supervision data:', error);
            showToast('Error cargando datos de supervisión', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOverride = async () => {
        if (!selectedRequestId || overrideReason.length < 10) {
            showToast('La justificación debe ser más detallada', 'warning');
            return;
        }

        try {
            await api.forceOverride(selectedRequestId, {
                reason: overrideReason,
                target_status: 'aprobado'
            });
            showToast('Solicitud aprobada por override administrativo', 'success');
            setShowOverrideModal(false);
            setOverrideReason('');
            fetchData();
        } catch (error) {
            console.error('Error in override:', error);
            showToast('Error al forzar decisión', 'error');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-DO', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-tower-observation text-primary mr-3"></i>
                        Torre de Control de Gestión
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">Supervisión de flujos, cuellos de botella y auditoría corporativa</p>
                </div>
                <button
                    onClick={fetchData}
                    className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-sm hover:shadow-md transition-all text-primary border border-gray-100 dark:border-gray-700"
                >
                    <i className="fas fa-sync-alt"></i>
                </button>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Lead Time Promedio</p>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-bold text-gray-800 dark:text-white">42.5h</span>
                        <span className="text-xs font-bold text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">-12% vs mes anterior</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-tight">Tiempo desde solicitud a aprobación final</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Solicitudes Estancadas (&gt;48h)</p>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-bold text-gray-800 dark:text-white">{bottlenecks.filter(b => b.hours_waiting > 48).length}</span>
                        {bottlenecks.filter(b => b.hours_waiting > 48).length > 0 && (
                            <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full animate-pulse">Acción Requerida</span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-tight">Requieren override o seguimiento manual</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Presupuesto Comprometido</p>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-bold text-gray-800 dark:text-white">
                            RD$ {budgetData?.totals?.committed ? (budgetData.totals.committed / 1000000).toFixed(1) + 'M' : '0.0M'}
                        </span>
                        <span className="text-xs font-bold text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Global Anual</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-tight">Fondos reservados para órdenes de compra pendientes</p>
                </div>
            </div>

            {/* Bottlenecks Table */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-hourglass-half text-yellow-500 mr-3"></i>
                        Cuellos de Botella Detectados
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Solicitud / Tipo</th>
                                <th className="px-6 py-4">Departamento</th>
                                <th className="px-6 py-4">Monto</th>
                                <th className="px-6 py-4">Esperando en</th>
                                <th className="px-6 py-4">Tiempo Transcurrido</th>
                                <th className="px-6 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {bottlenecks.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-800 dark:text-white">{item.id}</p>
                                        <p className="text-xs text-gray-500">{item.type}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.department}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-semibold">RD$ {item.total.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-medium">
                                            {item.pending_approver}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-bold ${item.hours_waiting > 48 ? 'text-red-500' : 'text-yellow-600'}`}>
                                            {item.hours_waiting} horas
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => {
                                                setSelectedRequestId(item.id);
                                                setShowOverrideModal(true);
                                            }}
                                            className="text-primary hover:bg-primary/10 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                        >
                                            <i className="fas fa-bolt mr-2"></i>
                                            Override
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {bottlenecks.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <i className="fas fa-check-circle text-4xl mb-3 text-green-500 opacity-30"></i>
                                        <p>No se detectan cuellos de botella activos.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit History */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-history text-blue-500 mr-3"></i>
                        Historial de Auditoría de Gestión
                    </h2>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {auditHistory.map((audit) => (
                            <div key={audit.id} className="flex gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${audit.action === 'ADMIN_OVERRIDE' ? 'bg-orange-500' :
                                    audit.action === 'APPROVED' ? 'bg-green-500' : 'bg-blue-500'
                                    } text-white`}>
                                    <i className={`fas ${audit.action === 'ADMIN_OVERRIDE' ? 'fa-bolt' : 'fa-check'}`}></i>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-800 dark:text-white">{audit.actor_name}</span>
                                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
                                            {audit.action}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {formatDate(audit.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{audit.comment}"</p>
                                    <p className="text-xs text-primary mt-2">Relacionado a: {audit.request_type} - Ref: {audit.request_id}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Override Modal */}
            {showOverrideModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 scale-in">
                        <div className="flex items-center text-orange-500 mb-4">
                            <i className="fas fa-exclamation-triangle text-3xl mr-3"></i>
                            <h3 className="text-2xl font-bold">Override Administrativo</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                            Estás a punto de forzar la aprobación de la solicitud <strong>{selectedRequestId}</strong>.
                            Esta acción saltará los pasos restantes y quedará registrada permanentemente en la auditoría.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Justificación de Emergencia</label>
                                <textarea
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all h-32"
                                    placeholder="Explica por qué es necesario forzar esta decisión..."
                                ></textarea>
                                <p className="text-right text-[10px] text-gray-400 mt-1">{overrideReason.length}/10 min caracteres</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowOverrideModal(false)}
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleOverride}
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                                    disabled={overrideReason.length < 10}
                                >
                                    Confirmar Force
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Supervision;
