import { useState, useEffect } from 'react';
import { User, News } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';
import AdminNewsCategories from './AdminNewsCategories';

interface AdminNewsProps {
    user: User;
}

function AdminNews({ user }: AdminNewsProps) {
    const [newsList, setNewsList] = useState<News[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingNews, setEditingNews] = useState<News | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        excerpt: '',
        category: '',
        image: '',
        author: user.name
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const startTime = Date.now();
        const minLoadingTime = 400;

        try {
            const [newsRes, catsRes] = await Promise.all([
                api.get('/news'),
                api.get('/news-categories')
            ]);

            // Ordenar por fecha descendente
            const sorted = newsRes.data.sort((a: News, b: News) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            setNewsList(sorted);
            setCategories(catsRes.data);

            if (catsRes.data.length > 0 && !formData.category) {
                setFormData(prev => ({ ...prev, category: catsRes.data[0].id }));
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error cargando información', 'error');
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minLoadingTime - elapsed);
            setTimeout(() => setLoading(false), remaining);
        }
    };

    const fetchNews = fetchData; // Alias for backward compatibility in the component

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingNews) {
                // Actualizar
                await api.put(`/news/${editingNews.id}`, {
                    ...formData
                });
                showToast('Noticia actualizada exitosamente', 'success');
            } else {
                // Crear
                const payload = {
                    ...formData,
                    author: user.name // Asegurar que el autor sea el usuario actual
                };
                await api.post('/news', payload);
                showToast('Noticia publicada exitosamente', 'success');
            }

            setShowModal(false);
            resetForm();
            fetchNews();
        } catch (error: any) {
            console.error('Error saving news:', error);
            showToast(error.response?.data?.message || 'Error guardando noticia', 'error');
        }
    };

    const handleDelete = async (newsId: string) => {
        if (!confirm('¿Seguro que quieres eliminar esta noticia? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await api.delete(`/news/${newsId}`);
            showToast('Noticia eliminada', 'success');
            fetchNews();
        } catch (error: any) {
            console.error('Error deleting news:', error);
            showToast(error.response?.data?.message || 'Error eliminando noticia', 'error');
        }
    };

    const openEditModal = (item: News) => {
        setEditingNews(item);
        setFormData({
            title: item.title,
            content: item.content,
            excerpt: item.excerpt || '',
            category: item.category || (categories[0]?.id || ''),
            image: item.image || '',
            author: item.author
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingNews(null);
        resetForm();
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            content: '',
            excerpt: '',
            category: categories[0]?.id || '',
            image: '',
            author: user.name
        });
    };

    const filteredNews = newsList.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user.role !== 'admin' && user.role !== 'rrhh') {
        // Permitimos RRHH también ya que suelen gestionar noticias
        return (
            <div className="text-center py-12">
                <i className="fas fa-lock text-6xl text-gray-300 mb-4"></i>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
                <p className="text-gray-600 dark:text-gray-400">No tienes permisos para gestionar noticias.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                                <i className="fas fa-newspaper text-primary mr-3"></i>
                                Gestión de Noticias
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Publica y edita comunicados para la empresa
                            </p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#009640] transition flex items-center shadow-lg"
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Nueva Noticia
                        </button>
                    </div>

                    {/* Search */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 mb-6">
                        <div className="relative">
                            <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar noticias..."
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-80">
                    <AdminNewsCategories />
                </div>
            </div>

            {/* News Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <SkeletonTable />
                ) : filteredNews.length === 0 ? (
                    <EmptyState
                        title="No hay noticias"
                        message={searchTerm ? 'No se encontraron noticias con ese criterio' : 'Aún no hay noticias publicadas'}
                        icon="fa-newspaper"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Título</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Categoría</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Autor</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Fecha</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredNews.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                {item.image && (
                                                    <img
                                                        src={item.image}
                                                        alt={item.title}
                                                        className="w-12 h-12 rounded-lg object-cover"
                                                    />
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-white line-clamp-1">{item.title}</p>
                                                    <p className="text-xs text-gray-500 line-clamp-1">{item.excerpt}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {item.author}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {new Date(item.date).toLocaleDateString('es-DO')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                                    title="Editar"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl scale-in max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                    {editingNews ? 'Editar Noticia' : 'Nueva Noticia'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Título *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    required
                                    placeholder="Ej: Nueva alianza estratégica..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoría *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imagen de Portada</label>
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
                                                        setFormData(prev => ({ ...prev, image: res.data.fileUrl }));
                                                        showToast('Imagen subida correctamente', 'success');
                                                    } catch (error) {
                                                        console.error('Upload error:', error);
                                                        showToast('Error subiendo imagen', 'error');
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
                                    {formData.image && (
                                        <div className="mt-2 relative group w-24 h-16">
                                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, image: '' })}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                                            >
                                                Ã—
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resumen Corto</label>
                                <textarea
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 h-20 resize-none"
                                    placeholder="Se mostrará en la tarjeta de previsualización..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contenido Completo *</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 h-40"
                                    required
                                    placeholder="Escribe el contenido de la noticia aquí..."
                                />
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
                                    {editingNews ? 'Guardar Cambios' : 'Publicar Noticia'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminNews;
