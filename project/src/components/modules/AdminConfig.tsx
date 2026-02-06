import { useState, useEffect } from 'react';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { useConfig } from '../../context/ConfigContext';

interface AdminConfigProps {
    user: User;
}

function AdminConfig({ user }: AdminConfigProps) {
    const { config, refreshConfig } = useConfig();
    const [formData, setFormData] = useState({ ...config });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFormData({ ...config });
    }, [config]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const startTime = Date.now();
        const minLoadingTime = 500;
        setSaving(true);

        try {
            await api.put('/config', formData);
            await refreshConfig(); // Recargar contexto para aplicar cambios
            showToast('Configuración guardada y aplicada', 'success');
        } catch (error: any) {
            console.error('Error saving config:', error);
            showToast('Error guardando configuración', 'error');
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minLoadingTime - elapsed);
            setTimeout(() => setSaving(false), remaining);
        }
    };

    if (user.role !== 'admin') {
        return (
            <div className="text-center py-12">
                <i className="fas fa-lock text-6xl text-gray-300 mb-4"></i>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
                <p className="text-gray-600 dark:text-gray-400">Solo administradores pueden cambiar la configuración global.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                    <i className="fas fa-paint-brush text-primary mr-3"></i>
                    Configuración Visual
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Personaliza la apariencia y datos de la empresa
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Formulario */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 border-b pb-2 border-gray-100 dark:border-gray-700">
                        Ajustes Generales
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre de la Empresa</label>
                            <input
                                type="text"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo de la Empresa</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            try {
                                                const res = await api.post('/upload', formData, {
                                                    headers: { 'Content-Type': 'multipart/form-data' }
                                                });
                                                setFormData(prev => ({ ...prev, company_logo: res.data.fileUrl }));
                                                showToast('Logo subido correctamente', 'success');
                                            } catch (error) {
                                                console.error('Upload error:', error);
                                                showToast('Error subiendo logo', 'error');
                                            }
                                        }
                                    }}
                                    className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Recomendado: Imagen PNG transparente (200x50px)</p>
                            {formData.company_logo && (
                                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg inline-block">
                                    <img src={formData.company_logo} alt="Logo Preview" className="h-8 object-contain" />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color Primario</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="color"
                                        value={formData.primary_color}
                                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                        className="h-10 w-10 p-1 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formData.primary_color}
                                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 uppercase"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color Secundario</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="color"
                                        value={formData.secondary_color}
                                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                                        className="h-10 w-10 p-1 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formData.secondary_color}
                                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-6 border-gray-100 dark:border-gray-700">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4 uppercase tracking-wider">Seguridad y Red</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rango de IP Autorizado (Asistencia)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: 192.168.1 o 'any' para desactivar"
                                    value={formData.allowed_ip_range || ''}
                                    onChange={(e) => setFormData({ ...formData, allowed_ip_range: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Restringe el marcaje de asistencia a IPs que contengan este prefijo.</p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-[#009640] transition shadow-lg disabled:opacity-50"
                                style={{ backgroundColor: formData.primary_color }}
                            >
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Previsualización Live */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                        Previsualización
                    </h3>

                    {/* Mock Sidebar Item */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-500 mb-2">Así se verán tus botones:</p>
                        <button
                            className="px-6 py-2 text-white rounded-lg font-semibold shadow-md transition transform hover:scale-105"
                            style={{ backgroundColor: formData.primary_color }}
                        >
                            Botón Principal
                        </button>
                    </div>

                    {/* Mock Navbar */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-500 mb-2">Así se verá tu barra lateral:</p>
                        <div
                            className="h-24 w-full rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-inner"
                            style={{ backgroundColor: formData.secondary_color }}
                        >
                            {formData.company_logo ? (
                                <img src={formData.company_logo} alt="Logo" className="h-12 object-contain" />
                            ) : (
                                formData.company_name
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminConfig;
