import { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';
import api from '../../services/api';

function AdminNewsCategories() {
    const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', color: '#00B74F' });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await api.get('/news-categories');
            setCategories(res.data);
        } catch (error) {
            showToast('Error cargando categorías', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/news-categories', newCategory);
            showToast('Categoría creada', 'success');
            setShowModal(false);
            setNewCategory({ name: '', color: '#00B74F' });
            fetchCategories();
        } catch (error) {
            showToast('Error creando categoría', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que quieres eliminar esta categoría?')) return;
        try {
            await api.delete(`/news-categories/${id}`);
            showToast('Categoría eliminada', 'success');
            fetchCategories();
        } catch (error) {
            showToast('Error eliminando categoría', 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Categorías de Noticias</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="text-primary hover:bg-primary/10 p-2 rounded-lg transition"
                >
                    <i className="fas fa-plus mr-1"></i> Nueva
                </button>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded"></div>)}
                </div>
            ) : (
                <div className="space-y-2">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg group">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(cat.id)}
                                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 text-left">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Nueva Categoría</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm mb-1 dark:text-gray-300">Nombre</label>
                                <input
                                    type="text"
                                    value={newCategory.name}
                                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1 dark:text-gray-300">Color</label>
                                <input
                                    type="color"
                                    value={newCategory.color}
                                    onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                                    className="w-full h-10 p-1 rounded-lg cursor-pointer"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminNewsCategories;
