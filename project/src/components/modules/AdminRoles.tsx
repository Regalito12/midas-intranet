import { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';

interface Permission {
    id: number;
    code: string;
    name: string;
    module: string;
    description: string;
}

interface Role {
    id: number;
    name: string;
    description: string;
    is_system: boolean;
    permissions: string; // Comma separated codes from backend
}

function AdminRoles() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rolesRes, permsRes] = await Promise.all([
                api.get('/roles'),
                api.get('/roles/permissions')
            ]);
            setRoles(rolesRes.data);
            setPermissions(permsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Error cargando roles y permisos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionToggle = (code: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(code)
                ? prev.permissions.filter(p => p !== code)
                : [...prev.permissions, code]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, formData);
                showToast('Rol actualizado exitosamente', 'success');
            } else {
                await api.post('/roles', formData);
                showToast('Rol creado exitosamente', 'success');
            }
            setShowModal(false);
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error guardando rol', 'error');
        }
    };

    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || '',
            permissions: role.permissions ? role.permissions.split(',') : []
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingRole(null);
        setFormData({ name: '', description: '', permissions: [] });
        setShowModal(true);
    };

    const handleDelete = async (id: number, isSystem: boolean = false) => {
        if (isSystem) {
            showToast('No se pueden eliminar roles de sistema por seguridad', 'warning');
            return;
        }
        if (!confirm('¿Seguro que quieres eliminar este rol? Esta acción afectará a todos los usuarios asignados.')) return;
        try {
            await api.delete(`/roles/${id}`);
            showToast('Rol eliminado exitosamente', 'success');
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error eliminando rol', 'error');
        }
    };

    // Group permissions by module
    const groupedPermissions = permissions.reduce((acc, curr) => {
        if (!acc[curr.module]) acc[curr.module] = [];
        acc[curr.module].push(curr);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-user-shield text-primary mr-3"></i>
                        Gestión de Roles y Permisos
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Configura el acceso dinámico al sistema</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#009640] transition flex items-center"
                >
                    <i className="fas fa-plus mr-2"></i> Nuevo Rol
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <SkeletonTable />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nombre</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Descripción</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Permisos</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {roles.map(role => (
                                    <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="px-6 py-4">
                                            <span className={`font-semibold ${role.is_system ? 'text-primary' : 'text-gray-800 dark:text-white'}`}>
                                                {role.name} {role.is_system && <i className="fas fa-check-circle text-xs" title="Rol de Sistema"></i>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{role.description}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {role.permissions ? role.permissions.split(',').slice(0, 3).map(p => (
                                                    <span key={p} className="text-[10px] bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{p}</span>
                                                )) : <span className="text-xs text-gray-400 italic">Sin permisos</span>}
                                                {role.permissions && role.permissions.split(',').length > 3 && (
                                                    <span className="text-[10px] text-gray-400">+{role.permissions.split(',').length - 3} más</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => openEditModal(role)} className="text-blue-600 hover:text-blue-800 p-2"><i className="fas fa-edit"></i></button>
                                            <button
                                                onClick={() => handleDelete(role.id, role.is_system)}
                                                className={`p-2 transition-colors ${role.is_system ? 'text-gray-300 cursor-not-allowed hover:text-gray-400' : 'text-red-600 hover:text-red-800'}`}
                                                title={role.is_system ? "Este es un rol del sistema y está protegido" : "Eliminar rol"}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl scale-in overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                {editingRole ? `Editando Rol: ${editingRole.name}` : 'Nuevo Rol Personalizado'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Rol</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        disabled={editingRole?.is_system}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">Seleccionar Permisos por Módulo</h3>
                                <div className="space-y-6">
                                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                                        <div key={module} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                                            <h4 className="text-sm font-bold text-primary uppercase mb-3 flex items-center">
                                                <i className="fas fa-cube mr-2"></i> {module}
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {perms.map((p: Permission) => (
                                                    <label key={p.code} className="flex items-start space-x-3 cursor-pointer group">
                                                        <div className="pt-0.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.permissions.includes(p.code)}
                                                                onChange={() => handlePermissionToggle(p.code)}
                                                                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-primary transition">{p.name}</p>
                                                            <p className="text-[10px] text-gray-500 dark:text-gray-500 leading-tight">{p.description}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                            <div>
                                {editingRole && !editingRole.is_system && (
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            handleDelete(editingRole.id);
                                        }}
                                        className="text-red-600 hover:text-red-800 font-semibold flex items-center px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                    >
                                        <i className="fas fa-trash-alt mr-2"></i> Eliminar Rol
                                    </button>
                                )}
                            </div>
                            <div className="flex space-x-3">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition">Cancelar</button>
                                <button onClick={handleSubmit} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-[#009640] transition">Guardar Rol</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminRoles;
