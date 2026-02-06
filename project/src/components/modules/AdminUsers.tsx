import { useState, useEffect } from 'react';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';

interface AdminUsersProps {
    user: User;
}

interface SystemUser {
    id: number;
    username: string;
    name: string;
    email: string;
    role: string;
    department: string;
    position: string;
    phone: string;
    avatar: string;
    created_at: string;
    status?: string;
}



function AdminUsers({ user }: AdminUsersProps) {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [roles, setRoles] = useState<{ id: number; name: string; color?: string; value?: string }[]>([]);
    const [availableDepartments, setAvailableDepartments] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        email: '',
        role: 'empleado',
        department: '',
        position: '',
        phone: '',
        status: 'activo'
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const startTime = Date.now();
        const minLoadingTime = 400;

        try {
            const [usersRes, rolesRes, deptsRes] = await Promise.all([
                api.get('/users'),
                api.get('/roles'),
                api.get('/departments')
            ]);

            setUsers(usersRes.data);

            // Map roles to match expectations or use directly
            const mappedRoles = rolesRes.data.map((r: any) => ({
                id: r.id,
                name: r.name,
                value: r.name.toLowerCase(), // fallback to name-based value
                color: r.name.toLowerCase() === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
            }));
            setRoles(mappedRoles);
            setAvailableDepartments(deptsRes.data);

        } catch (error) {
            console.error('Error loading initial data:', error);
            showToast('Error cargando datos del sistema', 'error');
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minLoadingTime - elapsed);
            setTimeout(() => setLoading(false), remaining);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error refreshing users:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingUser) {
                // Actualizar usuario existente
                await api.put(`/users/${editingUser.id}`, formData);
                showToast('Usuario actualizado exitosamente', 'success');
            } else {
                // Crear nuevo usuario
                if (!formData.password) {
                    showToast('La contraseña es requerida', 'error');
                    return;
                }
                await api.post('/users', formData);
                showToast('Usuario creado exitosamente', 'success');
            }

            setShowModal(false);
            resetForm();
            fetchUsers();
        } catch (error: any) {
            console.error('Error saving user:', error);
            showToast(error.response?.data?.message || 'Error guardando usuario', 'error');
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm('¿Seguro que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await api.delete(`/users/${userId}`);
            showToast('Usuario eliminado', 'success');
            fetchUsers();
        } catch (error: any) {
            console.error('Error deleting user:', error);
            showToast(error.response?.data?.message || 'Error eliminando usuario', 'error');
        }
    };

    const handleResetPassword = async (userId: number, userName: string) => {
        const newPassword = prompt(`Ingresa la nueva contraseña para ${userName}:`);
        if (newPassword === null) return; // Cancelado

        if (newPassword.length < 6) {
            showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        if (!confirm(`¿Estás seguro de resetear la contraseña de ${userName}?`)) {
            return;
        }

        try {
            await api.patch(`/users/${userId}/reset-password`, { newPassword });
            showToast(`Contraseña de ${userName} reseteada exitosamente`, 'success');
        } catch (error) {
            console.error('Error resetting password:', error);
            showToast('Error reseteando contraseña', 'error');
        }
    };

    const openEditModal = (userToEdit: SystemUser) => {
        setEditingUser(userToEdit);
        setFormData({
            username: userToEdit.username,
            password: '',
            name: userToEdit.name,
            email: userToEdit.email,
            role: userToEdit.role,
            department: userToEdit.department || '',
            position: userToEdit.position || '',
            phone: userToEdit.phone || '',
            status: userToEdit.status || 'activo'
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingUser(null);
        resetForm();
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            name: '',
            email: '',
            role: 'empleado',
            department: '',
            position: '',
            phone: '',
            status: 'activo'
        });
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleInfo = (roleName: string) => {
        const found = roles.find(r => (r.value === roleName || r.name.toLowerCase() === roleName.toLowerCase()));
        return found || { name: roleName, color: 'bg-gray-100 text-gray-800' };
    };

    if (user.role !== 'admin') {
        return (
            <div className="text-center py-12">
                <i className="fas fa-lock text-6xl text-gray-300 mb-4"></i>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
                <p className="text-gray-600 dark:text-gray-400">Solo los administradores pueden acceder a esta sección.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-users-cog text-primary mr-3"></i>
                        Gestión de Usuarios
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Administra los usuarios del sistema
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#009640] transition flex items-center shadow-lg"
                >
                    <i className="fas fa-user-plus mr-2"></i>
                    Nuevo Usuario
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
                        placeholder="Buscar usuarios..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <SkeletonTable />
                ) : filteredUsers.length === 0 ? (
                    <EmptyState
                        title="No hay usuarios"
                        message={searchTerm ? 'No se encontraron usuarios con ese criterio' : 'Aún no hay usuarios registrados'}
                        icon="fa-users"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Usuario</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Rol</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Departamento</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Creado</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=00B74F&color=fff`}
                                                    alt={u.name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-white">{u.name}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">@{u.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleInfo(u.role).color}`}>
                                                {getRoleInfo(u.role).name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {u.department || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {new Date(u.created_at).toLocaleDateString('es-DO')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                                    title="Editar"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleResetPassword(u.id, u.name)}
                                                    className="text-yellow-600 hover:text-yellow-800 p-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition"
                                                    title="Resetear contraseña"
                                                >
                                                    <i className="fas fa-key"></i>
                                                </button>
                                                {String(u.id) !== String(user.id) && (
                                                    <button
                                                        onClick={() => handleDelete(u.id)}
                                                        className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                                        title="Eliminar"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                )}
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg scale-in">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                    {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        required
                                        disabled={!!editingUser}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {editingUser ? 'Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        required={!editingUser}
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol *</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    >
                                        {roles.map(r => (
                                            <option key={r.id} value={r.value || r.name.toLowerCase()}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departamento</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="">-- Sin Departamento --</option>
                                        {availableDepartments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {editingUser && (
                                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estado de la cuenta</label>
                                    <div className="flex items-center space-x-4">
                                        <select
                                            value={formData.status || 'activo'}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 font-bold transition-colors ${(formData.status === 'inactivo')
                                                ? 'bg-red-50 text-red-700 border-red-300 focus:ring-red-500'
                                                : 'bg-green-50 text-green-700 border-green-300 focus:ring-green-500'
                                                }`}
                                        >
                                            <option value="activo">Activo (Acceso Permitido)</option>
                                            <option value="inactivo">Inactivo (Acceso Bloqueado)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Posición</label>
                                    <input
                                        type="text"
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
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
                                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminUsers;
