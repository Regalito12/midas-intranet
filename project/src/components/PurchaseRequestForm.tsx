import React, { useState, useEffect } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';

interface Company {
    id: number;
    name: string;
}

interface CostCenter {
    id: number;
    code: string;
    name: string;
}

interface BudgetCheck {
    hasBudget: boolean;
    available: number;
    sufficient: boolean;
    warning: string | null;
}

interface PurchaseRequestItem {
    productName: string;
    description: string;
    quantity: string;
    estimatedPrice: string;
}

interface PurchaseRequestFormProps {
    onClose?: () => void;
    onSuccess?: () => void;
}

const PurchaseRequestForm: React.FC<PurchaseRequestFormProps> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        companyId: '',
        costCenterId: '',
        assignmentType: 'PROYECTO',
        assignmentReference: '',
        plannedProjectId: '',
        unplannedJustification: ''
    });

    const [items, setItems] = useState<PurchaseRequestItem[]>([
        { productName: '', description: '', quantity: '1', estimatedPrice: '' }
    ]);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [budgetCheck, setBudgetCheck] = useState<BudgetCheck | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCompanies();
        fetchCostCenters();
        fetchProjects();
    }, []);

    const calculateTotal = () => {
        return items.reduce((sum, item) => {
            const q = parseFloat(item.quantity || '0');
            const p = parseFloat(item.estimatedPrice || '0');
            return sum + (q * p);
        }, 0);
    };

    useEffect(() => {
        const total = calculateTotal();
        if (formData.costCenterId && total > 0) {
            checkBudget(total);
        } else {
            setBudgetCheck(null);
        }
    }, [formData.costCenterId, items]);

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/companies');
            setCompanies(response.data.data || []);
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    const fetchCostCenters = async () => {
        try {
            const response = await api.get('/cost-centers');
            setCostCenters(response.data.data || []);
        } catch (err) {
            console.error('Error fetching cost centers:', err);
        }
    };

    const fetchProjects = async () => {
        try {
            // Fetch approved projects only
            const response = await api.listProjects({ status: 'APROBADO' });
            setProjects(response.data || []);
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const checkBudget = async (amount: number) => {
        try {
            const response = await api.get(`/budgets/availability/${formData.costCenterId}?amount=${amount}`);
            setBudgetCheck(response.data.data);
        } catch (err) {
            console.error('Error checking budget:', err);
            setBudgetCheck(null);
        }
    };

    const addItem = () => {
        setItems([...items, { productName: '', description: '', quantity: '1', estimatedPrice: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof PurchaseRequestItem, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles([...files, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validar items
        const invalidItem = items.find(item => !item.productName || !item.description || !item.quantity || !item.estimatedPrice);
        if (invalidItem) {
            setError('Por favor complete todos los campos obligatorios de los productos/servicios');
            setLoading(false);
            return;
        }

        try {
            const formDataToSend = new FormData();

            // Partes obligatorias de la cabecera
            formDataToSend.append('companyId', formData.companyId);
            formDataToSend.append('costCenterId', formData.costCenterId);
            formDataToSend.append('assignmentType', formData.assignmentType);
            formDataToSend.append('assignmentReference', formData.assignmentReference);

            if (formData.assignmentType === 'PROYECTO' && formData.plannedProjectId) {
                formDataToSend.append('plannedProjectId', formData.plannedProjectId);
            }
            if (formData.assignmentType !== 'PROYECTO' && formData.unplannedJustification) {
                formDataToSend.append('unplannedJustification', formData.unplannedJustification);
            }

            // Los items van como JSON
            formDataToSend.append('items', JSON.stringify(items));

            // Adjuntos
            files.forEach(file => {
                formDataToSend.append('attachments', file);
            });

            await api.post('/purchase-requests', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccess(true);
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    window.location.href = '/purchases';
                }
            }, 1000);

        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al crear la solicitud');
        } finally {
            setLoading(false);
        }
    };

    const totalEstimated = calculateTotal();

    return (
        <div className={`bg-white dark:bg-gray-800 ${onClose ? 'px-6 md:px-10 pb-12 scroll-smooth' : 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-full'}`}>
            {/* Header - Only show if not in modal */}
            {!onClose && (
                <div className="mb-8 border-b pb-6 dark:border-gray-700">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center">
                        <i className="fas fa-file-invoice-dollar text-primary mr-4 drop-shadow-sm"></i>
                        Nueva Solicitud de Compra
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Complete los detalles de su solicitud para iniciar el proceso corporativo de aprobación</p>
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start animate-fade-in">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-green-800 font-bold">¡Solicitud creada exitosamente!</h3>
                        <p className="text-green-700 text-sm mt-1">La solicitud ha sido enviada al flujo de aprobación.</p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start animate-shake">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-red-800 font-bold">Error al crear solicitud</h3>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 pb-4">
                {/* Company and Cost Center */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                        <i className="fas fa-info-circle mr-2 text-primary"></i>
                        Información General
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Empresa <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.companyId}
                                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            >
                                <option value="">Seleccione una empresa</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Centro de Costo <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.costCenterId}
                                onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            >
                                <option value="">Seleccione un centro de costo</option>
                                {costCenters.map(cc => (
                                    <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Assignment Type */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                        <i className="fas fa-tag mr-2 text-primary"></i>
                        Tipo de Asignación
                    </h2>

                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                            {['PROYECTO', 'RECURRENTE', 'TAREA_INTERNA'].map((type) => (
                                <label key={type} className={`
                                    flex items-center px-4 py-2 rounded-xl border-2 transition-all cursor-pointer
                                    ${formData.assignmentType === type
                                        ? 'border-primary bg-primary/5 text-primary font-bold'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500'}
                                `}>
                                    <input
                                        type="radio"
                                        value={type}
                                        checked={formData.assignmentType === type}
                                        onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value })}
                                        className="sr-only"
                                    />
                                    <span>{type.replace('_', ' ')}</span>
                                </label>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {formData.assignmentType === 'PROYECTO' ? (
                                <>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Seleccionar Proyecto Aprobado <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.plannedProjectId}
                                        onChange={(e) => {
                                            const selectedProject = projects.find(p => p.id === Number(e.target.value));
                                            setFormData({
                                                ...formData,
                                                plannedProjectId: e.target.value,
                                                assignmentReference: selectedProject ? selectedProject.project_code : ''
                                            });
                                        }}
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="">-- Seleccione Proyecto --</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.project_code} - {p.project_name} (Disp: RD${Number(p.available_amount || p.budgeted_amount).toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                    {projects.length === 0 && (
                                        <p className="text-xs text-orange-500">No tiene proyectos aprobados disponibles. Contacte a su gerente.</p>
                                    )}

                                    {/* Real-time Budget Feedback (M-003) */}
                                    {(() => {
                                        const selectedProject = projects.find(p => p.id === Number(formData.plannedProjectId));
                                        if (selectedProject) {
                                            const currentTotal = calculateTotal();
                                            const budgeted = Number(selectedProject.budgeted_amount || 0);
                                            const used = Number(selectedProject.committed_amount || 0) + Number(selectedProject.spent_amount || 0);
                                            // available variable removed
                                            const willUse = used + currentTotal;
                                            const percentUsed = Math.min((used / budgeted) * 100, 100);
                                            const percentNew = Math.min(((willUse - used) / budgeted) * 100, 100 - percentUsed);
                                            const isOver = willUse > budgeted;

                                            return (
                                                <div className={`mt-3 p-3 rounded-xl border ${isOver ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900' : 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700'}`}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-bold text-gray-600 dark:text-gray-400">Estado del Presupuesto</span>
                                                        <span className={isOver ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400 font-bold'}>
                                                            {isOver ? 'Excede Presupuesto' : 'Disponible'}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                                        <div className="h-full bg-blue-500" style={{ width: `${percentUsed}%` }} title="Usado Previamente"></div>
                                                        <div className={`h-full ${isOver ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${percentNew}%` }} title="Esta Solicitud"></div>
                                                    </div>
                                                    <div className="flex justify-between text-xs mt-1.5 text-gray-500 dark:text-gray-400 font-mono">
                                                        <span>Uso: {(willUse / budgeted * 100).toFixed(1)}%</span>
                                                        <span className={isOver ? 'text-red-500 font-bold' : ''}>
                                                            Restante: RD${(Math.max(0, budgeted - willUse)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {isOver && (
                                                        <p className="text-xs text-red-500 mt-2 font-bold animate-pulse">
                                                            ⚠️ Esta solicitud excede el presupuesto disponible del proyecto.
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </>
                            ) : (
                                <>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Justificación de Gasto No Planificado <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.unplannedJustification}
                                        onChange={(e) => setFormData({ ...formData, unplannedJustification: e.target.value })}
                                        placeholder="Explique por qué este gasto no estaba en presupuesto..."
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all h-24"
                                    />
                                    <p className="text-xs text-gray-400">Mínimo 50 caracteres para aprobación.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Products / Services List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
                            <i className="fas fa-shopping-basket mr-2 text-primary"></i>
                            Productos / Servicios Solicitados
                        </h2>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-2 text-xs font-bold text-primary hover:text-[#009641] bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-full transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar Producto
                        </button>
                    </div>

                    {items.map((item, index) => (
                        <div key={index} className="bg-white dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm relative group animate-scale-in">
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Nombre del Producto/Servicio <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={item.productName}
                                            onChange={(e) => updateItem(index, 'productName', e.target.value)}
                                            placeholder="Ej: Laptops Dell XPS 15"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Cantidad <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Descripción Detallada <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={item.description}
                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            placeholder="Especificaciones técnicas..."
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Precio Unitario <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">RD$</span>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={item.estimatedPrice}
                                                onChange={(e) => updateItem(index, 'estimatedPrice', e.target.value)}
                                                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total Summary & Budget Check */}
                <div className="flex flex-col md:flex-row gap-6 mt-8">
                    {/* Budget Warning */}
                    <div className="flex-1">
                        {budgetCheck && (
                            <div className={`p-4 rounded-2xl flex items-start animate-fade-in h-full ${budgetCheck.sufficient
                                ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/20'
                                : 'bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/20'
                                }`}>
                                <AlertCircle className={`w-6 h-6 mt-0.5 mr-3 flex-shrink-0 ${budgetCheck.sufficient ? 'text-green-600' : 'text-orange-600'
                                    }`} />
                                <div>
                                    <h3 className={`font-bold text-sm ${budgetCheck.sufficient ? 'text-green-800 dark:text-green-400' : 'text-orange-800 dark:text-orange-400'
                                        }`}>
                                        {budgetCheck.sufficient ? 'Presupuesto Validado' : 'Fondos Insuficientes'}
                                    </h3>
                                    <p className="text-xs mt-1 opacity-80 font-medium">
                                        {budgetCheck.warning || `Saldo disponible: RD$${budgetCheck.available.toLocaleString('es-DO')}`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Total Card */}
                    <div className="w-full md:w-72 bg-primary dark:bg-primary/20 p-6 rounded-2xl text-white shadow-lg shadow-primary/20">
                        <label className="text-xs font-bold uppercase opacity-80">Total Estimado Solicitud</label>
                        <div className="text-3xl font-black mt-1 flex items-center tracking-tight">
                            <span className="text-lg mr-1 opacity-70">RD$</span>
                            {totalEstimated.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* File Attachments */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                        <i className="fas fa-paperclip mr-2 text-primary"></i>
                        Evidencia y Soporte (Cotizaciones/Facturas)
                    </h2>

                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-primary transition-all group cursor-pointer bg-white dark:bg-gray-900">
                            <Upload className="w-10 h-10 text-gray-300 group-hover:text-primary mx-auto mb-3 transition-colors" />
                            <label className="cursor-pointer">
                                <span className="text-primary font-bold hover:underline">Seleccionar archivos</span>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-gray-500 mt-2 font-medium">Formatos: PDF, JPG, PNG, XLSX (Máx. 10MB)</p>
                        </div>

                        {files.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm animate-scale-in">
                                        <div className="flex items-center truncate">
                                            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center mr-3 text-primary">
                                                <i className="fas fa-file-alt"></i>
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-bold truncate text-gray-700 dark:text-gray-300">{file.name}</p>
                                                <p className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeFile(index)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t dark:border-gray-700 mt-6 sticky bottom-0 bg-white dark:bg-gray-800 pb-2 z-10">
                    <button
                        type="button"
                        onClick={onClose || (() => window.location.href = '/purchases')}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading || success}
                        className="px-8 py-2.5 bg-primary hover:bg-[#009641] text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Crear Solicitud
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PurchaseRequestForm;
