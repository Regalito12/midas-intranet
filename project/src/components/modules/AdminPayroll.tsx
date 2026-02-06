import { useState, useEffect } from 'react';
import { User, PayrollSlip } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';
import { generatePayrollPDF } from '../../utils/pdfGenerator';

interface AdminPayrollProps {
    user: User;
}

interface EmployeeOption {
    id: string; // employee_id
    name: string;
    department: string;
    position: string;
    base_salary?: number; // Optional if we can fetch it
}

function AdminPayroll({ user: _user }: AdminPayrollProps) {
    const [slips, setSlips] = useState<PayrollSlip[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form data
    const [formData, setFormData] = useState({
        employee_id: '',
        month: new Date().toLocaleString('es-ES', { month: 'long' }),
        year: new Date().getFullYear(),
        period: '',
        base_salary: 0,
        bonuses: 0,
        overtime: 0,
        afp: 0,
        sfs: 0,
        isr: 0,
        other_deductions: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Transferencia'
    });

    const [calculated, setCalculated] = useState({
        gross_salary: 0,
        total_deductions: 0,
        net_salary: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Recalculate totals whenever relevant fields change
    useEffect(() => {
        const gross = Number(formData.base_salary) + Number(formData.bonuses) + Number(formData.overtime);
        const deductions = Number(formData.afp) + Number(formData.sfs) + Number(formData.isr) + Number(formData.other_deductions);
        const net = gross - deductions;

        setCalculated({
            gross_salary: gross,
            total_deductions: deductions,
            net_salary: net
        });
    }, [formData.base_salary, formData.bonuses, formData.overtime, formData.afp, formData.sfs, formData.isr, formData.other_deductions]);

    const fetchData = async () => {
        const startTime = Date.now();
        const minLoadingTime = 400;

        try {
            setLoading(true);
            const [slipsRes, employeesRes] = await Promise.all([
                api.get('/payroll'),
                api.get('/employees') // Assuming this endpoint exists return employee details
            ]);
            setSlips(slipsRes.data);

            // Map employees for the select dropdown
            // Note: backend might return different structure for employees, adapting base on standard
            const empList = employeesRes.data.map((e: any) => ({
                id: e.id,
                name: e.name,
                department: e.department,
                position: e.position
            }));
            setEmployees(empList);

        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error cargando datos', 'error');
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minLoadingTime - elapsed);
            setTimeout(() => setLoading(false), remaining);
        }
    };

    const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const empId = e.target.value;

        setFormData(prev => ({
            ...prev,
            employee_id: empId,
            // If we had base salary in employee record we could autoload it here
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'year' || name.includes('salary') || name.includes('bonuses') || name.includes('overtime') || name.includes('afp') || name.includes('sfs') || name.includes('isr') || name.includes('deductions')
                ? Number(value)
                : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.employee_id) {
            showToast('Seleccione un empleado', 'error');
            return;
        }

        const selectedEmployee = employees.find(emp => emp.id === formData.employee_id);
        if (!selectedEmployee) return;

        const payload = {
            ...formData,
            employee_name: selectedEmployee.name,
            employee_department: selectedEmployee.department,
            employee_position: selectedEmployee.position,
            gross_salary: calculated.gross_salary,
            total_deductions: calculated.total_deductions,
            net_salary: calculated.net_salary,
            status: 'Emitido'
        };

        try {
            await api.post('/payroll', payload);
            showToast('Volante de pago creado exitosamente', 'success');
            setShowModal(false);
            resetForm();
            fetchData(); // Refresh list
        } catch (error: any) {
            console.error('Error checking in:', error);
            const msg = error.response?.data?.message || 'Error creando volante';
            showToast(msg, 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            employee_id: '',
            month: new Date().toLocaleString('es-ES', { month: 'long' }),
            year: new Date().getFullYear(),
            period: '',
            base_salary: 0,
            bonuses: 0,
            overtime: 0,
            afp: 0,
            sfs: 0,
            isr: 0,
            other_deductions: 0,
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'Transferencia'
        });
    };

    const filteredSlips = slips.filter(slip =>
        slip.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slip.period.toLowerCase().includes(searchTerm.toLowerCase())
    );

    /* Auto-calculate percentages Helper */
    const calculateStandardDeductions = () => {
        const gross = Number(formData.base_salary) + Number(formData.bonuses) + Number(formData.overtime);

        // Dominican Rep standard approx: AFP 2.87%, SFS 3.04%
        // Using approximate dummy values for auto-fill convenience
        const afp = Number((gross * 0.0287).toFixed(2));
        const sfs = Number((gross * 0.0304).toFixed(2));

        // ISR is complex, just putting a placeholder if > 35000 approx
        let isr = 0;
        if (gross > 34685) {
            isr = Number(((gross - 34685) * 0.15).toFixed(2)); // Very basic approximation
        }

        setFormData(prev => ({
            ...prev,
            afp,
            sfs,
            isr
        }));
        showToast('Deducciones calculadas (Estimado)', 'info');
    };

    return (
        <div className="space-y-6 fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-file-invoice-dollar text-primary mr-3"></i>
                        Gestión de Nómina
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Crear y administrar volantes de pago
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#009640] transition flex items-center shadow-lg"
                >
                    <i className="fas fa-plus mr-2"></i>
                    Nuevo Volante
                </button>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
                <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por empleado o periodo..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <SkeletonTable />
                ) : filteredSlips.length === 0 ? (
                    <EmptyState
                        title="No hay volantes"
                        message={searchTerm ? 'No se encontraron volantes con ese criterio' : 'Comience creando un nuevo volante de pago'}
                        icon="fa-file-invoice-dollar"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Periodo</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Empleado</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Salario Neto</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Estado</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Fecha Pago</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredSlips.map((slip) => (
                                    <tr key={slip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="px-6 py-4 text-gray-800 dark:text-gray-200 font-medium">{slip.period}</td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-gray-900 dark:text-white font-medium">{slip.employee_name}</p>
                                                <p className="text-xs text-gray-500">{slip.employee_department}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-white">
                                            RD${slip.net_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                                {slip.status || 'Emitido'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                                            {new Date(slip.payment_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => generatePayrollPDF(slip)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition"
                                                title="Descargar PDF"
                                            >
                                                <i className="fas fa-file-pdf text-xl"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl scale-in max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                Generar Volante de Pago
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <i className="fas fa-times text-2xl"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Employee & Period Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Empleado *</label>
                                    <select
                                        name="employee_id"
                                        value={formData.employee_id}
                                        onChange={handleEmployeeChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        required
                                    >
                                        <option value="">Seleccionar Empleado...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                    {formData.employee_id && (
                                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                            <p>{employees.find(e => e.id === formData.employee_id)?.position}</p>
                                            <p>{employees.find(e => e.id === formData.employee_id)?.department}</p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Periodo (Texto) *</label>
                                    <input
                                        type="text"
                                        name="period"
                                        value={formData.period}
                                        onChange={handleInputChange}
                                        placeholder="Ej: 15-30 Abril 2024"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Fecha de Pago *</label>
                                    <input
                                        type="date"
                                        name="payment_date"
                                        value={formData.payment_date}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        required
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            {/* Income Section */}
                            <div>
                                <h3 className="text-lg font-bold text-green-600 mb-4 flex items-center">
                                    <i className="fas fa-plus-circle mr-2"></i> Ingresos
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salario Base *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500">RD$</span>
                                            <input
                                                type="number"
                                                name="base_salary"
                                                value={formData.base_salary}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                                min="0" step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bonificaciones</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500">RD$</span>
                                            <input
                                                type="number"
                                                name="bonuses"
                                                value={formData.bonuses}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                                min="0" step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horas Extra</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500">RD$</span>
                                            <input
                                                type="number"
                                                name="overtime"
                                                value={formData.overtime}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                                min="0" step="0.01"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 text-right">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Ingresos Brutos: </span>
                                    <span className="text-lg font-bold text-green-600">RD$ {calculated.gross_salary.toLocaleString()}</span>
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            {/* Deductions Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-red-500 flex items-center">
                                        <i className="fas fa-minus-circle mr-2"></i> Deducciones
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={calculateStandardDeductions}
                                        className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 px-3 py-1 rounded-full text-gray-700 dark:text-gray-300 transition"
                                    >
                                        <i className="fas fa-calculator mr-1"></i> Calcular (Estimado)
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AFP</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500">RD$</span>
                                            <input
                                                type="number"
                                                name="afp"
                                                value={formData.afp}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                                min="0" step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SFS</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500">RD$</span>
                                            <input
                                                type="number"
                                                name="sfs"
                                                value={formData.sfs}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                                min="0" step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ISR</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500">RD$</span>
                                            <input
                                                type="number"
                                                name="isr"
                                                value={formData.isr}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                                min="0" step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Otros Desc.</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500">RD$</span>
                                            <input
                                                type="number"
                                                name="other_deductions"
                                                value={formData.other_deductions}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                                min="0" step="0.01"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 text-right">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Deducciones: </span>
                                    <span className="text-lg font-bold text-red-500">RD$ {calculated.total_deductions.toLocaleString()}</span>
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            {/* Totals */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total a Pagar</p>
                                    <h4 className="text-3xl font-bold text-gray-800 dark:text-white">RD$ {calculated.net_salary.toLocaleString()}</h4>
                                </div>
                                <div className="space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#009640] transition shadow-lg"
                                    >
                                        <i className="fas fa-save mr-2"></i>
                                        Emitir Volante
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPayroll;
