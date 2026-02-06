import { useState, useEffect } from 'react';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';

interface AdminDepartmentsProps {
    user: User;
}

interface Department {
    id: string;
    name: string;
    manager_id: string | null;
    manager_name: string | null;
    description: string;
    is_active: number;
}

interface SystemUser {
    id: number;
    name: string;
}

function AdminDepartments({ user }: AdminDepartmentsProps) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        manager_id: '',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const startTime = Date.now();
        const minLoadingTime = 400;

        try {
            setLoading(true);
            const [deptRes, usersRes] = await Promise.all([
                api.get('/departments'),
                api.get('/users')
            ]);
            setDepartments(deptRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error cargando datos', 'error');
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minLoadingTime - elapsed);
            setTimeout(() => setLoading(false), remaining);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments');
            setDepartments(response.data);
        } catch (error) {
            console.error(error);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingDept) {
                // Actualizar
                await api.put(`/departments/${editingDept.id}`, formData);
                showToast('Departamento actualizado exitosamente', 'success');
            } else {
                // Crear
                await api.post('/departments', formData);
                showToast('Departamento creado exitosamente', 'success');
            }

            setShowModal(false);
            resetForm();
            fetchDepartments();
        } catch (error: any) {
            console.error('Error saving department:', error);
            showToast(error.response?.data?.message || 'Error guardando departamento', 'error');
        }
    };

    const handleDelete = async (deptId: string) => {
        if (!confirm('¿Seguro que quieres eliminar este departamento?')) {
            return;
        }

        try {
            await api.delete(`/departments/${deptId}`);
            showToast('Departamento eliminado', 'success');
            fetchDepartments();
        } catch (error: any) {
            console.error('Error deleting department:', error);
            showToast(error.response?.data?.message || 'Error eliminando departamento', 'error');
        }
    };

    const openEditModal = (dept: Department) => {
        setEditingDept(dept);
        setFormData({
            name: dept.name,
            manager_id: dept.manager_id || '',
            description: dept.description || ''
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingDept(null);
        resetForm();
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            manager_id: '',
            description: ''
        });
    };

    const filteredDepartments = departments.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user.role !== 'admin' && user.role !== 'rrhh') {
        return (
            <div className="text-center py-12">
                <i className="fas fa-lock text-6xl text-gray-300 mb-4"></i>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
                <p className="text-gray-600 dark:text-gray-400">No tienes permisos para gestionar departamentos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-building text-primary mr-3"></i>
                        Gestión de Departamentos
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Administra la estructura organizacional y gerentes
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#009640] transition flex items-center shadow-lg"
                >
                    <i className="fas fa-plus mr-2"></i>
                    Nuevo Departamento
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
                        placeholder="Buscar departamentos..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <SkeletonTable />
                ) : filteredDepartments.length === 0 ? (
                    <EmptyState
                        title="No hay departamentos"
                        message={searchTerm ? 'No se encontraron departamentos' : 'Aún no hay departamentos creados'}
                        icon="fa-building"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nombre</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Gerente Asignado</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Descripción</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredDepartments.map((dept) => (
                                    <tr key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-800 dark:text-white">{dept.name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {dept.manager_name ? (
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">
                                                        <i className="fas fa-user"></i>
                                                    </div>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{dept.manager_name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                            {dept.description || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(dept)}
                                                    className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                                    title="Editar"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dept.id)}
                                                    className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                                    title="Eliminar"
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
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md scale-in">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                    {editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    required
                                    placeholder="Ej: Recursos Humanos"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gerente</label>
                                <select
                                    value={formData.manager_id}
                                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="">-- Seleccionar Gerente --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 h-24 resize-none"
                                    placeholder="Funciones principales del área..."
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-[#009640] transition"
                                >
                                    {editingDept ? 'Guardar Cambios' : 'Crear Departamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDepartments;
