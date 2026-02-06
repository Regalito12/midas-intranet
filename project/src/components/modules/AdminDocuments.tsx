import { useState, useEffect } from 'react';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';

interface AdminDocumentsProps {
    user: User;
}

interface Policy {
    id: string;
    title: string;
    description: string;
    category: string;
    version: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_by: string;
    uploaded_by_name: string;
    created_at: string;
    is_active: number;
}

function AdminDocuments({ user }: AdminDocumentsProps) {
    const [documents, setDocuments] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDoc, setEditingDoc] = useState<Policy | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'politica',
        version: '1.0',
        file_url: '',
        file_type: 'pdf',
        file_size: 0
    });

    const categories = [
        { value: 'politica', label: 'Políticas' },
        { value: 'manual', label: 'Manuales' },
        { value: 'procedimiento', label: 'Procedimientos' },
        { value: 'normativa', label: 'Normativas' }
    ];

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        const startTime = Date.now();
        const minLoadingTime = 400;

        try {
            const response = await api.get('/policies');
            setDocuments(response.data);
        } catch (error) {
            console.error('Error loading documents:', error);
            showToast('Error cargando documentos', 'error');
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minLoadingTime - elapsed);
            setTimeout(() => setLoading(false), remaining);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingDoc) {
                // Actualizar
                await api.put(`/policies/${editingDoc.id}`, {
                    ...formData
                });
                showToast('Documento actualizado exitosamente', 'success');
            } else {
                // Crear
                const payload = {
                    ...formData,
                    uploaded_by: user.id,
                    uploaded_by_name: user.name
                };
                await api.post('/policies', payload);
                showToast('Documento publicado exitosamente', 'success');
            }

            setShowModal(false);
            resetForm();
            fetchDocuments();
        } catch (error: any) {
            console.error('Error saving document:', error);
            showToast(error.response?.data?.message || 'Error guardando documento', 'error');
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm('¿Seguro que quieres eliminar este documento? Se ocultará de la lista pública.')) {
            return;
        }

        try {
            await api.delete(`/policies/${docId}`);
            showToast('Documento eliminado', 'success');
            fetchDocuments();
        } catch (error: any) {
            console.error('Error deleting document:', error);
            showToast(error.response?.data?.message || 'Error eliminando documento', 'error');
        }
    };

    const openEditModal = (doc: Policy) => {
        setEditingDoc(doc);
        setFormData({
            title: doc.title,
            description: doc.description,
            category: doc.category,
            version: doc.version,
            file_url: doc.file_url,
            file_type: doc.file_type,
            file_size: doc.file_size
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingDoc(null);
        resetForm();
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            category: 'politica',
            version: '1.0',
            file_url: '',
            file_type: 'pdf',
            file_size: 0
        });
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'pdf': return 'fa-file-pdf text-red-500';
            case 'doc': case 'docx': return 'fa-file-word text-blue-500';
            case 'xls': case 'xlsx': return 'fa-file-excel text-green-500';
            default: return 'fa-file text-gray-500';
        }
    };

    if (user.role !== 'admin' && user.role !== 'rrhh') {
        return (
            <div className="text-center py-12">
                <i className="fas fa-lock text-6xl text-gray-300 mb-4"></i>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
                <p className="text-gray-600 dark:text-gray-400">No tienes permisos para gestionar documentos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-folder-open text-primary mr-3"></i>
                        Gestión de Documentos
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Administra políticas, manuales y procedimientos de la empresa
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#009640] transition flex items-center shadow-lg"
                >
                    <i className="fas fa-file-upload mr-2"></i>
                    Nuevo Documento
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
                        placeholder="Buscar documentos..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>

            {/* Documents Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <SkeletonTable />
                ) : filteredDocs.length === 0 ? (
                    <EmptyState
                        title="No hay documentos"
                        message={searchTerm ? 'No se encontraron documentos con ese criterio' : 'Aún no hay documentos activos'}
                        icon="fa-folder-open"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Documento</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Categoría</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Versión</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Subido Por</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <i className={`fas ${getFileIcon(doc.file_type)} text-xl`}></i>
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-white">{doc.title}</p>
                                                    <p className="text-xs text-gray-500 line-clamp-1">{doc.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs capitalize">
                                                {doc.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            v{doc.version}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {doc.uploaded_by_name} <br />
                                            <span className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center space-x-2">
                                                <a
                                                    href={doc.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                                                    title="Ver Documento"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </a>
                                                <button
                                                    onClick={() => openEditModal(doc)}
                                                    className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                                    title="Editar"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg scale-in max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                    {editingDoc ? 'Editar Documento' : 'Nuevo Documento'}
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Título del Documento *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    required
                                    placeholder="Ej: Manual de Empleado 2024"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none h-24"
                                    placeholder="Breve descripción del contenido..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoría *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Versión</label>
                                    <input
                                        type="text"
                                        value={formData.version}
                                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        placeholder="1.0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Archivo del Documento (PDF/DOC) *</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const formData = new FormData();
                                                formData.append('file', file);
                                                try {
                                                    const res = await api.post('/upload', formData, {
                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                    });
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        file_url: res.data.fileUrl,
                                                        file_size: res.data.size, // Real size from backend
                                                        file_type: res.data.filename.split('.').pop() || 'pdf'
                                                    }));
                                                    showToast('Archivo subido correctamente', 'success');
                                                } catch (error) {
                                                    console.error('Upload error:', error);
                                                    showToast('Error subiendo archivo', 'error');
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
                                {formData.file_url && (
                                    <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center">
                                        <i className="fas fa-check-circle mr-2"></i>
                                        Archivo cargado: <a href={formData.file_url} target="_blank" rel="noreferrer" className="underline ml-1">Ver archivo</a>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Archivo</label>
                                    <select
                                        value={formData.file_type}
                                        onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="pdf">PDF</option>
                                        <option value="doc">Word (DOC/DOCX)</option>
                                        <option value="xls">Excel (XLS/XLSX)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
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
                                    {editingDoc ? 'Guardar Cambios' : 'Publicar Documento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDocuments;
