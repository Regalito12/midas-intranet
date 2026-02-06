import { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { CameraModal } from '../common/CameraModal';
import { Avatar } from '../common/Avatar';

interface ProfileProps {
    user: User;
    onUpdateUser: (user: User) => void;
}

function Profile({ user, onUpdateUser }: ProfileProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoOptionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (photoOptionsRef.current && !photoOptionsRef.current.contains(event.target as Node)) {
                setShowPhotoOptions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        location: user.location || '',
        position: user.position || '',
        department: user.department || ''
    });

    const [securityData, setSecurityData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            // Crear preview local
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const startTime = Date.now();
        const minLoadingTime = 500; // Slightly longer for actions
        setLoading(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('phone', formData.phone);
            data.append('location', formData.location);
            data.append('position', formData.position);
            data.append('department', formData.department);

            if (selectedFile) {
                data.append('avatar', selectedFile);
            } else {
                data.append('avatar', user.avatar || '');
            }

            const response = await api.put(`/users/${user.id}`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUpdateUser(response.data);
            showToast('Perfil actualizado exitosamente', 'success');
            setSelectedFile(null);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            showToast(error.response?.data?.message || 'Error actualizando perfil', 'error');
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minLoadingTime - elapsed);
            setTimeout(() => setLoading(false), remaining);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (securityData.newPassword !== securityData.confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.patch(`/users/${user.id}/password`, {
                currentPassword: securityData.currentPassword,
                newPassword: securityData.newPassword
            });
            showToast('Contraseña actualizada exitosamente', 'success');
            setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error('Error changing password:', error);
            showToast(error.response?.data?.message || 'Error actualizando contraseña', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 fade-in">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                    <i className="fas fa-user-circle text-primary mr-3"></i>
                    Mi Perfil
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona tu información personal y seguridad</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition ${activeTab === 'general'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <i className="fas fa-id-card mr-2"></i>
                        Información General
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition ${activeTab === 'security'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <i className="fas fa-lock mr-2"></i>
                        Seguridad
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'general' ? (
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="flex items-center space-x-6 mb-8">
                                <div className="relative">
                                    <div className="relative w-24 h-24">
                                        <Avatar
                                            src={previewUrl || user.avatar}
                                            name={user.name}
                                            size="2xl"
                                            className="w-full h-full"
                                            showStatus={false}
                                        />

                                        <div ref={photoOptionsRef}>
                                            <button
                                                type="button"
                                                onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                                                className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-[#009640] transition z-10"
                                                title="Cambiar foto"
                                            >
                                                <i className="fas fa-camera text-sm"></i>
                                            </button>

                                            {showPhotoOptions && (
                                                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowCamera(true);
                                                            setShowPhotoOptions(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                            <i className="fas fa-camera"></i>
                                                        </div>
                                                        Tomar foto
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            fileInputRef.current?.click();
                                                            setShowPhotoOptions(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                                            <i className="fas fa-upload"></i>
                                                        </div>
                                                        Subir foto
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{user.name}</h3>
                                    <p className="text-gray-500 dark:text-gray-400">{user.position || 'Empleado'} - {user.department || 'General'}</p>
                                    {selectedFile && (
                                        <p className="text-sm text-primary mt-1">
                                            <i className="fas fa-check-circle mr-1"></i>
                                            Nueva foto seleccionada
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        placeholder="+1 (809) 000-0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ubicación / Oficina</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        placeholder="Ej. Edificio A, Piso 2"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#009640] transition flex items-center disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save mr-2"></i>
                                            Guardar Cambios
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleChangePassword} className="space-y-6 max-w-md mx-auto">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contraseña Actual</label>
                                <input
                                    type="password"
                                    value={securityData.currentPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={securityData.newPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Confirmar Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={securityData.confirmPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#0066CC] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0052A3] transition flex items-center justify-center disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            Actualizando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-key mr-2"></i>
                                            Actualizar Contraseña
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            {showCamera && (
                <CameraModal
                    onCapture={(file) => {
                        setSelectedFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setPreviewUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                        setShowCamera(false);
                    }}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </div>
    );
}

export default Profile;
