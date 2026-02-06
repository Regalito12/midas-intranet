import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import { User } from '../../types';
import { SkeletonTable } from '../common/Skeletons';
import { useHasPermission } from '../../hooks/useHasPermission';

interface AdminMatrixProps {
    user: User;
}

interface Level {
    id: number;
    name: string;
    rank: number;
    description: string;
}

interface MatrixRule {
    id: number;
    department: string;
    min_amount: number;
    max_amount: number;
    approval_level_id: number;
    level_name: string;
    approver_role: string;
}

interface Budget {
    id: number;
    cost_center_id: number;
    cost_center_name: string;
    year: number;
    total_amount: number;
    committed_amount: number;
    spent_amount: number;
    amount_allocated: number; // Backward compatibility or UI alias
}

interface CostCenter {
    id: number;
    code: string;
    name: string;
}

function AdminMatrix({ user }: AdminMatrixProps) {
    const { hasPermission } = useHasPermission(user);
    const hasManageMatrix = hasPermission('manage_matrix');
    const hasViewBudgets = hasPermission('view_budgets') || hasPermission('manage_budgets');
    const hasManageBudgets = hasPermission('manage_budgets');
    const [activeTab, setActiveTab] = useState<'matrix' | 'budgets' | 'levels' | 'cost-centers'>('matrix');
    const [levels, setLevels] = useState<Level[]>([]);
    const [matrix, setMatrix] = useState<MatrixRule[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [showMatrixForm, setShowMatrixForm] = useState(false);
    const [editingRule, setEditingRule] = useState<MatrixRule | null>(null);
    const [newMatrixRule, setNewMatrixRule] = useState({
        department: 'Todos',
        min_amount: 0,
        max_amount: 9999999,
        approval_level_id: 1,
        approver_role: ''
    });

    const [showBudgetForm, setShowBudgetForm] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [newBudget, setNewBudget] = useState({
        cost_center_id: 0,
        year: new Date().getFullYear(),
        amount_allocated: 0
    });

    const [showLevelForm, setShowLevelForm] = useState(false);
    const [editingLevel, setEditingLevel] = useState<Level | null>(null);
    const [newLevel, setNewLevel] = useState({
        name: '',
        rank: 0,
        description: ''
    });

    const [showCCForm, setShowCCForm] = useState(false);
    const [editingCC, setEditingCC] = useState<CostCenter | null>(null);
    const [newCC, setNewCC] = useState({
        code: '',
        name: ''
    });

    useEffect(() => {
        fetchData();
        // Redirect if starting on a tab without permission
        if (activeTab === 'budgets' && !hasViewBudgets) setActiveTab('matrix');
        if (activeTab === 'levels' && !hasManageMatrix) setActiveTab('matrix');
        if (activeTab === 'cost-centers' && !hasManageBudgets) setActiveTab('matrix');
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [levelsRes, matrixRes, budgetsRes, costCentersRes, deptsRes] = await Promise.all([
                api.getApprovalLevels(),
                api.getMatrix(),
                api.getBudgetsBalances(),
                api.getCostCenters(),
                api.get('/departments')
            ]);

            // Cleanse Matrix Data (Cast Decimal strings to Numbers)
            const cleansedMatrix = matrixRes.data.map((rule: any) => ({
                ...rule,
                min_amount: Number(rule.min_amount),
                max_amount: Number(rule.max_amount)
            }));

            // Cleanse Budget Data (Map total_amount to amount_allocated for UI consistency)
            const cleansedBudgets = budgetsRes.data.map((b: any) => ({
                ...b,
                amount_allocated: Number(b.total_amount || b.amount_allocated || 0),
                amount_reserved: Number(b.committed_amount || b.amount_reserved || 0),
                amount_spent: Number(b.spent_amount || b.amount_spent || 0)
            }));

            setLevels(levelsRes.data);
            setMatrix(cleansedMatrix);
            setBudgets(cleansedBudgets);
            setCostCenters(costCentersRes.data);
            setDepartments(deptsRes.data);
        } catch (error) {
            console.error('Error fetching config data:', error);
            showToast('Error cargando configuraciones', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMatrixRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRule) {
                await api.updateMatrixRule(editingRule.id, newMatrixRule);
                showToast('Regla actualizada correctamente', 'success');
            } else {
                await api.createMatrixRule(newMatrixRule);
                showToast('Regla de matriz creada correctamente', 'success');
            }
            setShowMatrixForm(false);
            setEditingRule(null);
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al procesar regla', 'error');
        }
    };

    const handleCreateBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBudget) {
                await api.updateBudget(editingBudget.id, { amount_allocated: newBudget.amount_allocated });
                showToast('Presupuesto actualizado', 'success');
            } else {
                await api.createBudget(newBudget);
                showToast('Presupuesto creado', 'success');
            }
            setShowBudgetForm(false);
            setEditingBudget(null);
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al procesar presupuesto', 'error');
        }
    };

    const handleCreateLevel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingLevel) {
                await api.updateApprovalLevel(editingLevel.id, newLevel);
                showToast('Nivel actualizado', 'success');
            } else {
                await api.createApprovalLevel(newLevel);
                showToast('Nivel creado correctamente', 'success');
            }
            setShowLevelForm(false);
            setEditingLevel(null);
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al procesar nivel', 'error');
        }
    };

    const handleCreateCC = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCC) {
                await api.updateCostCenter(editingCC.id, newCC);
                showToast('Centro de costo actualizado', 'success');
            } else {
                await api.createCostCenter(newCC);
                showToast('Centro de costo creado', 'success');
            }
            setShowCCForm(false);
            setEditingCC(null);
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al procesar centro de costo', 'error');
        }
    };

    /* No full-screen return here, the loading state will be handled inside the body */

    return (
        <div className="space-y-6 fade-in">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                    <i className="fas fa-table text-primary mr-3"></i>
                    Configuración de Gobernanza
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de matriz de aprobación, niveles y presupuestos</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('matrix')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'matrix' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Matriz de Aprobación
                </button>
                {hasViewBudgets && (
                    <button
                        onClick={() => setActiveTab('budgets')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'budgets' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Presupuestos
                    </button>
                )}
                {hasManageMatrix && (
                    <button
                        onClick={() => setActiveTab('levels')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'levels' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Niveles y Rangos
                    </button>
                )}
                {hasManageBudgets && (
                    <button
                        onClick={() => setActiveTab('cost-centers')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'cost-centers' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Centros de Costo
                    </button>
                )}
            </div>

            {/* Matrix Tab */}
            {activeTab === 'matrix' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-6">
                            <SkeletonTable />
                        </div>
                    ) : (
                        <>
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Reglas de la Matriz</h2>
                                {hasManageMatrix && (
                                    <button
                                        onClick={() => setShowMatrixForm(true)}
                                        className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all"
                                    >
                                        <i className="fas fa-plus mr-2"></i> Nueva Regla
                                    </button>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-xs uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Departamento</th>
                                            <th className="px-6 py-4">Rango de Monto</th>
                                            <th className="px-6 py-4">Nivel Requerido</th>
                                            <th className="px-6 py-4">Rol Aprobador</th>
                                            <th className="px-6 py-4">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {matrix.map((rule) => (
                                            <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">{rule.department}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    RD$ {rule.min_amount.toLocaleString()} - {rule.max_amount > 9999998 ? '∞' : `RD$ ${rule.max_amount.toLocaleString()}`}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">
                                                        {rule.level_name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{rule.approver_role}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    {hasManageMatrix && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingRule(rule);
                                                                    setNewMatrixRule({
                                                                        department: rule.department,
                                                                        min_amount: rule.min_amount,
                                                                        max_amount: rule.max_amount,
                                                                        approval_level_id: rule.approval_level_id,
                                                                        approver_role: rule.approver_role
                                                                    });
                                                                    setShowMatrixForm(true);
                                                                }}
                                                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                            >
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('¿Estás seguro de eliminar esta regla?')) {
                                                                        try {
                                                                            await api.deleteMatrixRule(rule.id);
                                                                            showToast('Regla eliminada', 'success');
                                                                            fetchData();
                                                                        } catch (error) {
                                                                            showToast('Error al eliminar', 'error');
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Budgets Tab */}
            {activeTab === 'budgets' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-48 bg-gray-100 dark:bg-gray-700/50 animate-pulse rounded-2xl"></div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Estado de Presupuestos ({new Date().getFullYear()})</h2>
                                {hasManageBudgets && (
                                    <button
                                        onClick={() => {
                                            setEditingBudget(null);
                                            setNewBudget({ cost_center_id: costCenters[0]?.id || 0, year: new Date().getFullYear(), amount_allocated: 0 });
                                            setShowBudgetForm(true);
                                        }}
                                        className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all"
                                    >
                                        <i className="fas fa-plus mr-2"></i> Nuevo Presupuesto
                                    </button>
                                )}
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {budgets.map((b) => {
                                    const spentPercent = (b.amount_spent / b.amount_allocated) * 100;
                                    const reservedPercent = (b.amount_reserved / b.amount_allocated) * 100;
                                    return (
                                        <div key={b.id} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 relative group">
                                            {hasManageBudgets && (
                                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingBudget(b);
                                                            setNewBudget({ cost_center_id: b.cost_center_id, year: b.year, amount_allocated: b.amount_allocated });
                                                            setShowBudgetForm(true);
                                                        }}
                                                        className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                                                    >
                                                        <i className="fas fa-edit text-xs"></i>
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('¿Eliminar este presupuesto?')) {
                                                                try {
                                                                    await api.deleteBudget(b.id);
                                                                    showToast('Presupuesto eliminado', 'success');
                                                                    fetchData();
                                                                } catch (error) {
                                                                    showToast('Error al eliminar', 'error');
                                                                }
                                                            }
                                                        }}
                                                        className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                                    >
                                                        <i className="fas fa-trash text-xs"></i>
                                                    </button>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="font-bold text-gray-800 dark:text-white">{b.cost_center_name}</h3>
                                                <span className="text-xs text-gray-500">{b.year}</span>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-500">Utilizado</span>
                                                        <span className="font-bold">{spentPercent.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary" style={{ width: `${Math.min(spentPercent, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-500">Reservado (En flujo)</span>
                                                        <span className="font-bold">{reservedPercent.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-yellow-500" style={{ width: `${Math.min(reservedPercent, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                                                    <span className="text-xs text-gray-500">Monto Asignado:</span>
                                                    <span className="text-sm font-bold">RD$ {b.amount_allocated.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Levels Tab */}
            {activeTab === 'levels' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-6 space-y-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700/50 animate-pulse rounded-2xl ml-16 relative">
                                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Escalafón de Autoridad</h2>
                                {hasManageMatrix && (
                                    <button
                                        onClick={() => {
                                            setEditingLevel(null);
                                            setNewLevel({ name: '', rank: levels.length + 1, description: '' });
                                            setShowLevelForm(true);
                                        }}
                                        className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all"
                                    >
                                        <i className="fas fa-plus mr-2"></i> Nuevo Nivel
                                    </button>
                                )}
                            </div>
                            <div className="p-6">
                                <div className="relative">
                                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-700"></div>
                                    <div className="space-y-8">
                                        {levels.map((level) => (
                                            <div key={level.id} className="relative flex items-center pl-16 group">
                                                <div className="absolute left-4 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-lg shadow-primary/30 z-10 border-4 border-white dark:border-gray-800">
                                                    {level.rank}
                                                </div>
                                                <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 dark:text-white">{level.name}</h3>
                                                        <p className="text-sm text-gray-500 mt-1">{level.description}</p>
                                                    </div>
                                                    {hasManageMatrix && (
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingLevel(level);
                                                                    setNewLevel({ name: level.name, rank: level.rank, description: level.description });
                                                                    setShowLevelForm(true);
                                                                }}
                                                                className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                                                            >
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('¿Eliminar este nivel? (Esto puede afectar reglas de matriz)')) {
                                                                        try {
                                                                            await api.deleteApprovalLevel(level.id);
                                                                            showToast('Nivel eliminado', 'success');
                                                                            fetchData();
                                                                        } catch (error) {
                                                                            showToast('Error al eliminar', 'error');
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Cost Centers Tab */}
            {activeTab === 'cost-centers' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-6">
                            <SkeletonTable />
                        </div>
                    ) : (
                        <>
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Centros de Costo</h2>
                                <button
                                    onClick={() => {
                                        setEditingCC(null);
                                        setNewCC({ code: '', name: '' });
                                        setShowCCForm(true);
                                    }}
                                    className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all"
                                >
                                    <i className="fas fa-plus mr-2"></i> Nuevo Centro
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-xs uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Código</th>
                                            <th className="px-6 py-4">Nombre</th>
                                            <th className="px-6 py-4">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {costCenters.map((cc) => (
                                            <tr key={cc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 font-mono text-sm font-bold">{cc.code}</td>
                                                <td className="px-6 py-4 text-gray-800 dark:text-white font-semibold">{cc.name}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCC(cc);
                                                                setNewCC({ code: cc.code, name: cc.name });
                                                                setShowCCForm(true);
                                                            }}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('¿Desactivar este centro de costo?')) {
                                                                    try {
                                                                        await api.deleteCostCenter(cc.id);
                                                                        showToast('Centro desactivado', 'success');
                                                                        fetchData();
                                                                    } catch (error) {
                                                                        showToast('Error al desactivar', 'error');
                                                                    }
                                                                }
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Matrix Form Modal */}
            {showMatrixForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl scale-in border border-gray-100 dark:border-gray-700">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                            {editingRule ? 'Editar Regla de Matriz' : 'Nueva Regla de Matriz'}
                        </h3>
                        <form onSubmit={handleCreateMatrixRule} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Departamento</label>
                                <select
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newMatrixRule.department}
                                    onChange={(e) => setNewMatrixRule({ ...newMatrixRule, department: e.target.value })}
                                >
                                    <option value="GLOBAL">Global (Todos)</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nivel</label>
                                <select
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newMatrixRule.approval_level_id}
                                    onChange={(e) => setNewMatrixRule({ ...newMatrixRule, approval_level_id: parseInt(e.target.value) })}
                                >
                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name} (Rango {l.rank})</option>)}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Monto Mínimo</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newMatrixRule.min_amount}
                                    onChange={(e) => setNewMatrixRule({ ...newMatrixRule, min_amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Monto Máximo</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newMatrixRule.max_amount}
                                    onChange={(e) => setNewMatrixRule({ ...newMatrixRule, max_amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rol Aprobador (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Gerente IT"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newMatrixRule.approver_role}
                                    onChange={(e) => setNewMatrixRule({ ...newMatrixRule, approver_role: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2 flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowMatrixForm(false);
                                        setEditingRule(null);
                                    }}
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all"
                                >
                                    {editingRule ? 'Actualizar Regla' : 'Guardar Regla'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Budget Form Modal */}
            {showBudgetForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl scale-in border border-gray-100 dark:border-gray-700">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                            {editingBudget ? 'Editar Presupuesto' : 'Asignar Presupuesto'}
                        </h3>
                        <form onSubmit={handleCreateBudget} className="space-y-4">
                            {!editingBudget && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Centro de Costo</label>
                                    <select
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                        value={newBudget.cost_center_id}
                                        onChange={(e) => setNewBudget({ ...newBudget, cost_center_id: parseInt(e.target.value) })}
                                    >
                                        <option value={0}>Seleccione...</option>
                                        {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name} ({cc.code})</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Año</label>
                                <input
                                    type="number"
                                    disabled={!!editingBudget}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm disabled:opacity-50"
                                    value={newBudget.year}
                                    onChange={(e) => setNewBudget({ ...newBudget, year: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Monto Asignado</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newBudget.amount_allocated}
                                    onChange={(e) => setNewBudget({ ...newBudget, amount_allocated: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowBudgetForm(false);
                                        setEditingBudget(null);
                                    }}
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all"
                                >
                                    {editingBudget ? 'Actualizar' : 'Asignar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Level Form Modal */}
            {showLevelForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl scale-in border border-gray-100 dark:border-gray-700">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                            {editingLevel ? 'Editar Nivel' : 'Nuevo Nivel'}
                        </h3>
                        <form onSubmit={handleCreateLevel} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre del Nivel</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Gerente"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newLevel.name}
                                    onChange={(e) => setNewLevel({ ...newLevel, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rango (Orden)</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newLevel.rank}
                                    onChange={(e) => setNewLevel({ ...newLevel, rank: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm h-24"
                                    value={newLevel.description}
                                    onChange={(e) => setNewLevel({ ...newLevel, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLevelForm(false);
                                        setEditingLevel(null);
                                    }}
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all"
                                >
                                    {editingLevel ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showCCForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl scale-in border border-gray-100 dark:border-gray-700">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                            {editingCC ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}
                        </h3>
                        <form onSubmit={handleCreateCC} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Código (ID Contable)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: IT-001"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newCC.code}
                                    onChange={(e) => setNewCC({ ...newCC, code: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Tecnología"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm"
                                    value={newCC.name}
                                    onChange={(e) => setNewCC({ ...newCC, name: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCCForm(false);
                                        setEditingCC(null);
                                    }}
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all"
                                >
                                    {editingCC ? 'Actualizar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminMatrix;
