import { useState, useEffect } from 'react';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';

interface AdminBackupProps {
    user: User;
}

interface BackupFile {
    name: string;
    size: number;
    created_at: string;
    path: string;
}

function AdminBackup({ user }: AdminBackupProps) {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const response = await api.get('/backups');
            setBackups(response.data);
        } catch (error) {
            console.error('Error fetching backups:', error);
            showToast('Error cargando backups', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        if (!confirm('¿Deseas generar un nuevo respaldo de la base de datos? Esto podría tomar unos segundos.')) return;

        setCreating(true);
        try {
            await api.post('/backups/create');
            showToast('Respaldo generado correctamente', 'success');
            fetchBackups();
        } catch (error) {
            console.error('Error creating backup:', error);
            showToast('Error generando respaldo', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleDownload = async (filename: string) => {
        try {
            // Usamos window.open para descargar el archivo directamente
            const token = localStorage.getItem('token');
            const host = window.location.hostname;
            // const downloadUrl = `http://${host}:3001/api/backups/download/${filename}?token=${token}`; 

            // Mejor approach: Request con blob (ya manejado por api.get abajo)
            const response = await api.get(`/backups/download/${filename}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download error:', error);
            showToast('Error descargando archivo', 'error');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (user.role !== 'admin') {
        return (
            <div className="text-center py-12">
                <i className="fas fa-lock text-6xl text-gray-300 mb-4"></i>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
                <p className="text-gray-600 dark:text-gray-400">Solo administradores pueden gestionar respaldos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-database text-primary mr-3"></i>
                        Respaldo de Base de Datos
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Genera y descarga copias de seguridad del sistema
                    </p>
                </div>
                <button
                    onClick={handleCreateBackup}
                    disabled={creating}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#009640] transition flex items-center shadow-lg disabled:opacity-50"
                >
                    {creating ? (
                        <>
                            <i className="fas fa-circle-notch fa-spin mr-2"></i>
                            Generando...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-plus-circle mr-2"></i>
                            Generar Nuevo Respaldo
                        </>
                    )}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <SkeletonTable />
                ) : backups.length === 0 ? (
                    <EmptyState
                        title="No hay respaldos"
                        message="Aún no se han generado copias de seguridad."
                        icon="fa-database"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Archivo</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Tamaño</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Fecha de Creación</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {backups.map((file) => (
                                    <tr key={file.name} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <i className="fas fa-file-code text-blue-500 text-xl"></i>
                                                <span className="font-semibold text-gray-800 dark:text-white">{file.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {formatSize(file.size)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {new Date(file.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDownload(file.name)}
                                                className="text-primary hover:text-[#009640] font-semibold flex items-center ml-auto gap-2 px-3 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/10 transition"
                                            >
                                                <i className="fas fa-download"></i>
                                                Descargar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Información Importante</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        Los respaldos contienen una copia completa de la base de datos en formato SQL.
                        Para restaurar un respaldo, contacte al administrador del sistema o use una herramienta de gestión de bases de datos como phpMyAdmin o Workbench.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdminBackup;
