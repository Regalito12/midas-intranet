import { useState, useEffect } from 'react';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';

interface PolicysProps {
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
  updated_at: string | null;
  is_active: number;
}

function Policies({ user: _user }: PolicysProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const categories = [
    { id: 'todos', name: 'Todos', icon: 'fa-list', count: 0 },
    { id: 'politica', name: 'Políticas', icon: 'fa-file-alt', count: 0 },
    { id: 'manual', name: 'Manuales', icon: 'fa-book', count: 0 },
    { id: 'procedimiento', name: 'Procedimientos', icon: 'fa-tasks', count: 0 },
    { id: 'normativa', name: 'Normativas', icon: 'fa-balance-scale', count: 0 },
  ];

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    const startTime = Date.now();
    const minLoadingTime = 400;

    try {
      const response = await api.get('/policies');
      setPolicies(response.data);

      // Update category counts
      categories.forEach(cat => {
        if (cat.id === 'todos') {
          cat.count = response.data.length;
        } else {
          cat.count = response.data.filter((p: Policy) => p.category === cat.id).length;
        }
      });
    } catch (error) {
      console.error('Error loading policies:', error);
      showToast('Error cargando políticas', 'error');
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };



  const filteredPolicies = selectedCategory === 'todos'
    ? policies
    : policies.filter(p => p.category === selectedCategory);

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return { icon: 'fa-file-pdf', color: 'text-red-500' };
      case 'doc': case 'docx': return { icon: 'fa-file-word', color: 'text-blue-500' };
      case 'xls': case 'xlsx': return { icon: 'fa-file-excel', color: 'text-green-500' };
      default: return { icon: 'fa-file', color: 'text-gray-500' };
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryLabel = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.name : category;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
          <i className="fas fa-folder-open text-primary mr-3"></i>
          Políticas y Procedimientos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Accede a documentos corporativos y políticas de la empresa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de categorías */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              <i className="fas fa-folder text-primary mr-2"></i>
              Categorías
            </h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition ${selectedCategory === cat.id ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  <i className={`fas ${cat.icon} mr-2`}></i>
                  <span className="text-sm">{cat.name} ({cat.count})</span>
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-3 rounded-lg ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                <i className="fas fa-list"></i>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-3 rounded-lg ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                <i className="fas fa-th"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Área principal de documentos */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <SkeletonTable />
            ) : filteredPolicies.length === 0 ? (
              <EmptyState
                title="No se encontraron documentos"
                message="No hay políticas o documentos disponibles en esta categoría."
                icon="fa-folder-open"
              />
            ) : (
              <div className={viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                {filteredPolicies.map(doc => {
                  const iconData = getIcon(doc.file_type);
                  const isNew = new Date(doc.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                  return (
                    <div
                      key={doc.id}
                      className={`border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover-lift bg-white dark:bg-gray-800 ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}
                    >
                      <div className={`flex items-center space-x-4 ${viewMode === 'grid' ? 'mb-3' : 'flex-1'}`}>
                        <div className={`text-4xl ${iconData.color}`}>
                          <i className={`fas ${iconData.icon}`}></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{doc.title}</h3>
                            {isNew && (
                              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full font-semibold">NUEVO</span>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{doc.description}</p>
                          )}
                          <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                            <span><i className="fas fa-tag mr-1"></i>{getCategoryLabel(doc.category)}</span>
                            <span>{doc.version}</span>
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>{new Date(doc.created_at).toLocaleDateString('es-DO')}</span>
                          </div>
                          {doc.uploaded_by_name && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              <i className="fas fa-user mr-1"></i>Por: {doc.uploaded_by_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`flex ${viewMode === 'grid' ? 'justify-end' : ''} items-center space-x-2`}>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#009640] transition inline-flex items-center"
                        >
                          <i className="fas fa-download mr-1"></i> Descargar
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

  );
}

export default Policies;
