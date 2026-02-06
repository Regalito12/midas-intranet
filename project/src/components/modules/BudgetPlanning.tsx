import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import { User } from '../../types';
import { SkeletonTable } from '../common/Skeletons';

interface BudgetPlanningProps {
    user: User;
}

interface ProjectItem {
    id?: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    phase: string;
    tempId?: string;
}

interface Project {
    id?: number;
    project_code?: string;
    project_name: string;
    project_type: string;
    area_id: number;
    cost_center_id: number;
    description: string;
    project_objective: string;
    institutional_objective: string;
    expected_roi?: string;
    start_date: string;
    end_date: string;
    execution_quarter: string;
    fiscal_year: number;
    status?: string;
    budgeted_amount?: number;
    items: ProjectItem[];
}

export default function BudgetPlanning({ user }: BudgetPlanningProps) {
    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'approvals' | 'view'>('list');
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [costCenters, setCostCenters] = useState<any[]>([]);
    const [viewProject, setViewProject] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Derived State for KPIs
    const filteredProjects = projects.filter(p =>
        p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.project_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalBudget = projects.reduce((sum, p) => sum + Number(p.budgeted_amount || 0), 0);
    const pendingProjects = projects.filter(p => p.status === 'PENDIENTE_APROBACION' || p.status === 'PENDIENTE_DIRECTOR').length;
    const myDrafts = projects.filter(p => p.status === 'BORRADOR').length;

    // View State
    const [linkedPurchases, setLinkedPurchases] = useState<any[]>([]);
    const [viewTab, setViewTab] = useState<'info' | 'purchases'>('info');

    // Form State
    const [formData, setFormData] = useState<Project>({
        project_name: '',
        project_type: 'Operativo',
        area_id: user.department_id || 0,
        cost_center_id: 0,
        description: '',
        project_objective: '',
        institutional_objective: '',
        start_date: '',
        end_date: '',
        execution_quarter: 'Q1',
        fiscal_year: new Date().getFullYear(),
        items: []
    });

    const [items, setItems] = useState<ProjectItem[]>([
        { item_name: '', quantity: 1, unit_price: 0, subtotal: 0, phase: 'Q1', tempId: Math.random().toString(36).substr(2, 9) }
    ]);

    useEffect(() => {
        fetchData();
        loadConfig();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.listProjects();
            // The API returns { success: true, data: [...], ... }
            setProjects(res.data.data || []);
        } catch (error) {
            console.error(error);
            showToast('Error cargando proyectos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadConfig = async () => {
        try {
            const ccRes = await api.getCostCenters();
            setCostCenters(ccRes.data);
        } catch (error) {
            console.error('Error loading config', error);
        }
    };

    // Calculations
    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const handleItemChange = (index: number, field: keyof ProjectItem, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        // Auto-calculate subtotal
        newItems[index].subtotal = newItems[index].quantity * newItems[index].unit_price;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { item_name: '', quantity: 1, unit_price: 0, subtotal: 0, phase: formData.execution_quarter, tempId: Math.random().toString(36).substr(2, 9) }]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (calculateTotal() <= 0) {
                showToast('El presupuesto total debe ser mayor a 0', 'error');
                return;
            }

            const payload = { ...formData, items };
            await api.createProject(payload);
            showToast('Proyecto creado correctamente', 'success');
            setActiveTab('list');
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error creando proyecto', 'error');
        }
    };

    const handleDeleteProject = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este borrador? Esta acción no se puede deshacer.')) return;

        try {
            await api.deleteProject(id);
            showToast('Proyecto eliminado correctamente', 'success');
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error eliminando proyecto', 'error');
        }
    };

    const handleDuplicateProject = async (id: number) => {
        if (!confirm('¿Desea duplicar este proyecto? Se creará un nuevo borrador con la misma información.')) return;

        try {
            await api.duplicateProject(id);
            showToast('Proyecto duplicado correctamente', 'success');
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error duplicando proyecto', 'error');
        }
    };

    const handleCompleteProject = async (id: number) => {
        const notes = prompt('Notas de cierre (opcional):');
        if (notes === null) return; // User cancelled

        try {
            await api.completeProject(id, notes || undefined);
            showToast('Proyecto marcado como COMPLETADO', 'success');
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error completando proyecto', 'error');
        }
    };

    const handleCancelProject = async (id: number) => {
        const reason = prompt('Razón de cancelación (mínimo 20 caracteres):');
        if (!reason) return;

        if (reason.length < 20) {
            showToast('La razón debe tener al menos 20 caracteres', 'error');
            return;
        }

        try {
            await api.cancelProject(id, reason);
            showToast('Proyecto cancelado', 'success');
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error cancelando proyecto', 'error');
        }
    };

    const handleExportExcel = () => {
        if (!viewProject || !viewProject.items || viewProject.items.length === 0) {
            showToast('No hay datos para exportar', 'warning');
            return;
        }

        const wb = XLSX.utils.book_new();

        // Prepare data for Excel
        const data = [
            ['Proyecto:', viewProject.project_name],
            ['Código:', viewProject.project_code],
            ['Tipo:', viewProject.project_type],
            ['Presupuesto Total:', viewProject.budgeted_amount],
            ['Estado:', viewProject.status],
            [''], // Empty row
            ['Partidas Presupuestarias'],
            ['Ítem / Concepto', 'Cantidad', 'Precio Unitario', 'Subtotal', 'Fase']
        ];

        viewProject.items.forEach((item: any) => {
            data.push([
                item.item_name,
                item.quantity,
                item.unit_price,
                item.subtotal,
                item.phase
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Presupuesto");
        XLSX.writeFile(wb, `Presupuesto_${viewProject.project_code || 'Export'}.xlsx`);
    };

    const loadProjectDetails = async (projectId: number) => {
        setLoading(true);
        setViewTab('info'); // Reset tab
        setLinkedPurchases([]); // Reset purchases
        try {
            const [resProject, resPurchases] = await Promise.all([
                api.getProjectById(projectId),
                api.getProjectPurchaseRequests(projectId).catch(() => ({ data: [] }))
            ]);

            setViewProject(resProject.data);
            setLinkedPurchases(resPurchases.data || []);
            setActiveTab('view'); // Virtual tab for viewing
        } catch (error) {
            showToast('Error cargando detalles', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-project-diagram text-primary mr-3"></i>
                        Planificación de Proyectos
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión presupuestaria basada en proyectos y actividades</p>
                </div>

                {activeTab === 'list' && (
                    <button
                        onClick={() => {
                            setFormData({ ...formData, items: [] });
                            setItems([{ item_name: '', quantity: 1, unit_price: 0, subtotal: 0, phase: 'Q1', tempId: Math.random().toString(36).substr(2, 9) }]);
                            setActiveTab('create');
                        }}
                        className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-plus"></i>
                        Nuevo Proyecto
                    </button>
                )}
                {activeTab !== 'list' && (
                    <button
                        onClick={() => setActiveTab('list')}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>
                        Volver al Listado
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            {activeTab === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:shadow-md transition-all">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Presupuesto Global</p>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-1">
                                RD$ {totalBudget.toLocaleString()}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            <i className="fas fa-wallet"></i>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:shadow-md transition-all">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Proyectos Pendientes</p>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-1">
                                {pendingProjects}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            <i className="fas fa-clock"></i>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:shadow-md transition-all">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Mis Borradores</p>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-1">
                                {myDrafts}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            <i className="fas fa-file-alt"></i>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            {activeTab === 'list' && (
                <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        placeholder="Buscar por código, nombre o tipo..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:bg-gray-800 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            {/* Content Switcher */}
            {activeTab === 'list' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {loading ? <div className="p-6"><SkeletonTable /></div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-400">
                                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider w-12 text-center">#</th>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Código</th>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Nombre</th>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Descripción</th>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tipo</th>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-right">Presupuesto</th>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredProjects.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500 text-sm">
                                                No hay proyectos registrados
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProjects.map((project, idx) => (
                                            <tr key={project.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                                                <td className="px-4 py-4 text-center">
                                                    <span className="text-gray-400 text-xs font-mono font-medium">
                                                        {idx + 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                                        {project.project_code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                        {project.project_name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs text-gray-500 dark:text-gray-500 max-w-xs truncate">
                                                        {project.description || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                        ${project.project_type === 'TECNOLOGÍA' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                            project.project_type === 'INFRAESTRUCTURA' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                                project.project_type === 'OPERATIVO' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                    'bg-gray-50 text-gray-700 border-gray-100'}`}>
                                                        {project.project_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-mono font-medium text-gray-800 dark:text-gray-200">
                                                        RD$ {Number(project.budgeted_amount).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className={`w-1.5 h-1.5 rounded-full mr-2
                                                            ${project.status === 'APROBADO' ? 'bg-green-500' :
                                                                project.status === 'BORRADOR' ? 'bg-gray-400' :
                                                                    project.status === 'PENDIENTE_APROBACION' ? 'bg-yellow-500' :
                                                                        'bg-red-500'}`}></div>
                                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                            {project.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => loadProjectDetails(project.id)}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Ver Detalle"
                                                        >
                                                            <i className="fas fa-eye text-sm"></i>
                                                        </button>
                                                        {project.status === 'BORRADOR' && (
                                                            <>
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm('¿Duplicar este proyecto?')) {
                                                                            try {
                                                                                await api.duplicateProject(project.id);
                                                                                showToast('Compromiso duplicado', 'success');
                                                                                fetchData();
                                                                            } catch (e) {
                                                                                showToast('Error duplicando', 'error');
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                                    title="Duplicar"
                                                                >
                                                                    <i className="fas fa-copy text-sm"></i>
                                                                </button>
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm('¿Eliminar este borrador?')) {
                                                                            try {
                                                                                await api.deleteProject(project.id);
                                                                                showToast('Borrador eliminado', 'success');
                                                                                fetchData();
                                                                            } catch (e: any) {
                                                                                showToast('Error: ' + (e.response?.data?.message || 'Falló al eliminar'), 'error');
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Eliminar"
                                                                >
                                                                    <i className="fas fa-trash text-sm"></i>
                                                                </button>
                                                            </>
                                                        )}
                                                        {(project.status === 'APROBADO' || project.status === 'EN_EJECUCION') && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCompleteProject(project.id);
                                                                    }}
                                                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                                    title="Completar Proyecto"
                                                                >
                                                                    <i className="fas fa-check-circle text-sm"></i>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCancelProject(project.id);
                                                                    }}
                                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Cancelar Proyecto"
                                                                >
                                                                    <i className="fas fa-ban text-sm"></i>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Create Form */}
            {activeTab === 'create' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* General Info Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md border border-gray-100 dark:border-gray-700">
                            <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-4">
                                <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-blue-600 text-white flex items-center justify-center text-lg shadow-lg shadow-blue-500/30">1</span>
                                Información General
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Nombre del Proyecto</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                                        placeholder="Ej: Renovación de Servidores"
                                        value={formData.project_name}
                                        onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Tipo de Proyecto</label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                                            value={formData.project_type}
                                            onChange={e => setFormData({ ...formData, project_type: e.target.value })}
                                        >
                                            <option value="Operativo">Operativo (OPEX)</option>
                                            <option value="Inversión">Inversión (CAPEX)</option>
                                            <option value="Estratégico">Estratégico</option>
                                        </select>
                                        <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Descripción</label>
                                    <textarea
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium h-28 resize-none"
                                        placeholder="Describa el alcance y justificación del proyecto..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    ></textarea>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Centro de Costo</label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                                            value={formData.cost_center_id}
                                            onChange={e => setFormData({ ...formData, cost_center_id: Number(e.target.value) })}
                                        >
                                            <option value={0}>Seleccione...</option>
                                            {costCenters.map(cc => (
                                                <option key={cc.id} value={cc.id}>{cc.name} ({cc.code})</option>
                                            ))}
                                        </select>
                                        <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Trimestre Ejecución</label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                                            value={formData.execution_quarter}
                                            onChange={e => setFormData({ ...formData, execution_quarter: e.target.value })}
                                        >
                                            <option value="Q1">Q1 (Ene-Mar)</option>
                                            <option value="Q2">Q2 (Abr-Jun)</option>
                                            <option value="Q3">Q3 (Jul-Sep)</option>
                                            <option value="Q4">Q4 (Oct-Dic)</option>
                                        </select>
                                        <i className="fas fa-calendar absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Objetivo del Proyecto</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium" value={formData.project_objective} onChange={e => setFormData({ ...formData, project_objective: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Objetivo Institucional</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium" value={formData.institutional_objective} onChange={e => setFormData({ ...formData, institutional_objective: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* Items Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
                                <h2 className="text-2xl font-black flex items-center gap-3 text-gray-800 dark:text-white">
                                    <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-500 to-green-600 text-white flex items-center justify-center text-lg shadow-lg shadow-green-500/30">2</span>
                                    Partidas Presupuestarias
                                </h2>
                                <button
                                    onClick={addItem}
                                    className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold border border-green-200 hover:bg-green-100 transition-all flex items-center gap-2"
                                >
                                    <i className="fas fa-plus"></i> Agregar Partida
                                </button>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <table className="w-full text-left bg-white dark:bg-gray-800">
                                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Concepto / Ítem</th>
                                            <th className="px-6 py-4 w-32 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Cant.</th>
                                            <th className="px-6 py-4 w-48 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Precio Unit. (RD$)</th>
                                            <th className="px-6 py-4 w-48 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Subtotal</th>
                                            <th className="px-4 py-4 w-16 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {items.map((item, index) => (
                                            <tr key={item.id || item.tempId || index} className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Descripción del gasto o servicio..."
                                                        className="w-full p-2 bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 rounded-lg text-gray-800 dark:text-white text-sm transition-all focus:ring-2 focus:ring-blue-100 outline-none"
                                                        value={item.item_name}
                                                        onChange={e => handleItemChange(index, 'item_name', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="w-full p-2 text-center bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 rounded-lg text-gray-800 dark:text-white text-sm transition-all focus:ring-2 focus:ring-blue-100 outline-none"
                                                        value={item.quantity}
                                                        onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                                                    />
                                                </td>
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-full p-2 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 rounded-lg text-gray-800 dark:text-white text-sm transition-all focus:ring-2 focus:ring-blue-100 outline-none"
                                                        value={item.unit_price}
                                                        onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))}
                                                    />
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono font-bold text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-900/50">
                                                    {item.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-2 py-3 text-center">
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        disabled={items.length === 1}
                                                        className={`p-2 rounded-lg transition-all ${items.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Total Estimado:
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-lg text-primary">
                                                RD$ {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-primary/10 sticky top-6">
                            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Resumen del Presupuesto</h3>
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Total Partidas</span>
                                    <span className="font-bold">{items.length}</span>
                                </div>
                                <div className="h-px bg-gray-100 dark:bg-gray-700"></div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-lg font-bold text-gray-800 dark:text-gray-200">Total General</span>
                                    <span className="text-2xl font-black text-primary">
                                        RD$ {calculateTotal().toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleSubmit}
                                className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white rounded-xl font-bold shadow-xl shadow-primary/20 transition-all transform hover:scale-[1.02]"
                            >
                                Guardar Planificación
                            </button>
                            <p className="text-xs text-center text-gray-400 mt-4">
                                El proyecto se guardará como BORRADOR hasta que sea enviado a aprobación.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
                <ProjectApprovals
                    user={user}
                    onView={(id) => loadProjectDetails(id)}
                    onAction={() => setActiveTab('approvals')} // Reload after action
                />
            )}

            {/* View Project Details Modal/View */}
            {activeTab === 'view' && viewProject && (
                <>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-8 border-b border-gray-100 dark:border-gray-700 pb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{viewProject.project_name}</h2>
                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg font-mono text-sm font-bold">
                                        {viewProject.project_code}
                                    </span>
                                </div>
                                <p className="text-gray-500">{viewProject.description}</p>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider mb-2
                                ${viewProject.status === 'APROBADO' ? 'bg-green-100 text-green-700' :
                                        viewProject.status === 'BORRADOR' ? 'bg-gray-100 text-gray-600' :
                                            'bg-yellow-100 text-yellow-700'}`}>
                                    {viewProject.status}
                                </span>
                                <div className="text-3xl font-black text-primary">
                                    RD$ {Number(viewProject.budgeted_amount).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Tools */}
                        <div className="flex justify-end gap-3 mb-6">
                            <button
                                onClick={handleExportExcel}
                                className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl font-bold hover:bg-green-100 transition-all flex items-center gap-2"
                            >
                                <i className="fas fa-file-excel"></i>
                                Exportar Excel
                            </button>
                        </div>

                    </div>

                    {/* Tabs for Details View */}
                    <div className="flex border-b border-gray-100 dark:border-gray-700 mb-6">
                        <button
                            onClick={() => setViewTab('info')}
                            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${viewTab === 'info'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className="fas fa-info-circle mr-2"></i>
                            Información General
                        </button>
                        <button
                            onClick={() => setViewTab('purchases')}
                            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${viewTab === 'purchases'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className="fas fa-shopping-cart mr-2"></i>
                            Compras Vinculadas
                            {linkedPurchases.length > 0 && (
                                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                    {linkedPurchases.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* INFO TAB CONTENT */}
                    {viewTab === 'info' && (
                        <>
                            {/* Actions Panel */}
                            <div className="mb-6 p-4 rounded-xl flex justify-between items-center gap-4">
                                {/* Submit Action (Draft) */}
                                {viewProject.status === 'BORRADOR' && (
                                    <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex justify-between items-center border border-blue-100 dark:border-blue-800">
                                        <div className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                                            <i className="fas fa-info-circle mr-2"></i>
                                            Este proyecto está en borrador. Debe enviarlo para iniciar el flujo de aprobación.
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (confirm('¿Enviar a aprobación? No podrá editarlo después.')) {
                                                    try {
                                                        await api.submitProject(viewProject.id);
                                                        showToast('Enviado a aprobación', 'success');
                                                        loadProjectDetails(viewProject.id);
                                                    } catch (e) { showToast('Error enviando', 'error'); }
                                                }
                                            }}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all"
                                        >
                                            Enviar a Aprobación
                                        </button>
                                    </div>
                                )}

                                {/* Approval Actions (Pending) */}
                                {(viewProject.status === 'PENDIENTE_APROBACION' || viewProject.status === 'PENDIENTE_DIRECTOR') && (
                                    <div className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl flex justify-between items-center border border-yellow-100 dark:border-yellow-800">
                                        <div className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">
                                            <i className="fas fa-clock mr-2"></i>
                                            Este proyecto requiere su aprobación.
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    const reason = prompt('Razón del rechazo:');
                                                    if (reason) {
                                                        try {
                                                            await api.rejectProject(viewProject.id, reason);
                                                            showToast('Proyecto rechazado', 'success');
                                                            loadProjectDetails(viewProject.id);
                                                        } catch (e) { showToast('Error rechazando', 'error'); }
                                                    }
                                                }}
                                                className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition-all"
                                            >
                                                Rechazar
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await api.approveProject(viewProject.id, 'Aprobado desde panel web');
                                                        showToast('Proyecto aprobado', 'success');
                                                        loadProjectDetails(viewProject.id);
                                                    } catch (e) { showToast('Error aprobando', 'error'); }
                                                }}
                                                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition-all"
                                            >
                                                Aprobar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Items Table View */}
                            <div className="mt-8">
                                <h3 className="text-lg font-bold mb-4">Desglose de Partidas</h3>
                                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs uppercase">
                                            <tr>
                                                <th className="px-6 py-3">Concepto</th>
                                                <th className="px-6 py-3 text-right">Cantidad</th>
                                                <th className="px-6 py-3 text-right">Precio Unit.</th>
                                                <th className="px-6 py-3 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {viewProject.items?.map((item: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="px-6 py-4">{item.item_name}</td>
                                                    <td className="px-6 py-4 text-right">{item.quantity}</td>
                                                    <td className="px-6 py-4 text-right">RD$ {Number(item.unit_price).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right font-bold">RD$ {Number(item.subtotal).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-gray-50 dark:bg-gray-900 font-bold">
                                                <td colSpan={3} className="px-6 py-4 text-right uppercase text-xs tracking-wider text-gray-500">Total Presupuestado</td>
                                                <td className="px-6 py-4 text-right text-lg text-primary">
                                                    RD$ {Number(viewProject.budgeted_amount).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* PURCHASES TAB CONTENT */}
                    {viewTab === 'purchases' && (
                        <div className="mt-6 animate-fadeIn">
                            {linkedPurchases.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                        <i className="fas fa-shopping-cart"></i>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Sin compras vinculadas</h3>
                                    <p className="text-gray-500 text-sm mt-1">
                                        Este proyecto no tiene solicitudes de compra asociadas aún.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs uppercase">
                                            <tr>
                                                <th className="px-6 py-3">Código Solicitud</th>
                                                <th className="px-6 py-3">Fecha</th>
                                                <th className="px-6 py-3">Estado</th>
                                                <th className="px-6 py-3">Solicitante</th>
                                                <th className="px-6 py-3 text-right">Monto Estimado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {linkedPurchases.map((pr: any) => (
                                                <tr key={pr.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                                                            {pr.request_code}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {new Date(pr.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                            ${pr.status === 'APROBADO' ? 'bg-green-50 text-green-700 border-green-100' :
                                                                pr.status === 'SOLICITADO' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                    pr.status === 'RECHAZADO' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                        'bg-gray-50 text-gray-700 border-gray-100'}`}>
                                                            {pr.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">
                                                                <i className="fas fa-user"></i>
                                                            </div>
                                                            {pr.created_by_name || 'Usuario'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-sm">
                                                        RD$ {Number(pr.estimated_total || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

        </div>
    );
}

// Sub-component for Approvals
function ProjectApprovals({ onView }: { user: User, onView: (id: number) => void, onAction: () => void }) {
    const [approvals, setApprovals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getPendingProjectApprovals().then(res => {
            setApprovals(res.data.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-10 text-center"><SkeletonTable /></div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <i className="fas fa-check-circle text-primary"></i>
                Proyectos Pendientes de Aprobación
            </h2>
            {approvals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No tiene aprobaciones pendientes.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {approvals.map(p => (
                        <div key={p.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white">{p.project_name}</h3>
                                <p className="text-sm text-gray-500 mb-1">{p.project_code} • {p.project_type}</p>
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                                    {p.status}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="block font-black text-primary text-lg mb-2">
                                    RD$ {Number(p.budgeted_amount).toLocaleString()}
                                </div>
                                <button
                                    onClick={() => onView(p.id)}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-all"
                                >
                                    Revisar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
