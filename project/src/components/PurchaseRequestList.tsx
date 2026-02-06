import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Filter, Download, X } from 'lucide-react';
import PurchaseRequestForm from './PurchaseRequestForm';

interface PurchaseRequest {
    id: number;
    request_number: string;
    product_name: string;
    description: string;
    quantity: number;
    estimated_price: number;
    total_estimated: number;
    status: string;
    company_name: string;
    cost_center_name: string;
    created_at: string;
}

const PurchaseRequestList: React.FC = () => {
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        status: '',
        search: ''
    });
    const [activeTab, setActiveTab] = useState<'my-requests' | 'pending-approvals'>('my-requests');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, [activeTab, filter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const endpoint = activeTab === 'my-requests'
                ? '/api/purchase-requests/my-requests'
                : '/api/purchase-requests/pending-approvals';

            const params = new URLSearchParams();
            if (filter.status) params.append('status', filter.status);

            const response = await api.get(`${endpoint}?${params.toString()}`);
            setRequests(response.data.data || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'SOLICITADO': 'bg-blue-100 text-blue-800',
            'LIBERADO': 'bg-purple-100 text-purple-800',
            'APROBADO': 'bg-green-100 text-green-800',
            'RECHAZADO': 'bg-red-100 text-red-800',
            'EN_COMPRAS': 'bg-yellow-100 text-yellow-800',
            'ORDEN_GENERADA': 'bg-indigo-100 text-indigo-800',
            'CERRADO': 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const filteredRequests = requests.filter((req: PurchaseRequest) => {
        const matchesSearch = !filter.search ||
            req.request_number.toLowerCase().includes(filter.search.toLowerCase()) ||
            req.product_name.toLowerCase().includes(filter.search.toLowerCase()) ||
            req.description.toLowerCase().includes(filter.search.toLowerCase());

        return matchesSearch;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                            <i className="fas fa-shopping-cart text-primary mr-3"></i>
                            Solicitudes de Compra
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona tus requerimientos y el flujo de aprobación corporativo</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center px-6 py-3 bg-primary hover:bg-[#009641] text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nueva Solicitud
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('my-requests')}
                            className={`${activeTab === 'my-requests'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all`}
                        >
                            Mis Solicitudes
                        </button>
                        <button
                            onClick={() => setActiveTab('pending-approvals')}
                            className={`${activeTab === 'pending-approvals'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all flex items-center`}
                        >
                            Pendientes de Aprobar
                            {activeTab === 'pending-approvals' && requests.length > 0 && (
                                <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2.5 rounded-full text-xs font-bold animate-pulse">
                                    {requests.length}
                                </span>
                            )}
                        </button>
                    </nav>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por número, producto..."
                            value={filter.search}
                            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <select
                        value={filter.status}
                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                        className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none text-gray-700 dark:text-gray-300 transition-all font-medium"
                    >
                        <option value="">Todos los estados</option>
                        <option value="SOLICITADO">Solicitado</option>
                        <option value="LIBERADO">Liberado</option>
                        <option value="APROBADO">Aprobado</option>
                        <option value="RECHAZADO">Rechazado</option>
                        <option value="EN_COMPRAS">En Compras</option>
                        <option value="ORDEN_GENERADA">Orden Generada</option>
                        <option value="CERRADO">Cerrado</option>
                    </select>

                    <button
                        onClick={() => setFilter({ status: '', search: '' })}
                        className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-bold transition-all"
                    >
                        <Filter className="w-5 h-5 mr-2" />
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
                        <p className="mt-4 text-gray-500 font-medium">Cargando solicitudes...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-20 px-4">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fas fa-box-open text-gray-300 text-3xl"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">No hay registros</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">No se encontraron solicitudes que coincidan con tus criterios.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 text-primary font-bold hover:underline"
                        >
                            Crear mi primera solicitud
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Número</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Producto</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Centro Costo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Cant.</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Monto Total</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                                    <th className="px-3 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredRequests.map((request: PurchaseRequest) => (
                                    <tr key={request.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-primary">#{request.request_number}</span>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">
                                                {new Date(request.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{request.product_name}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[250px]">{request.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">{request.cost_center_name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-gray-700 dark:text-gray-300 text-sm">
                                            {request.quantity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white text-sm">
                                            RD$ {request.total_estimated?.toLocaleString() || '0'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full ${getStatusColor(request.status)}`}>
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => window.location.href = `/purchases/${request.id}`}
                                                className="p-2 text-gray-400 hover:text-primary transition-colors"
                                                title="Ver Detalle"
                                            >
                                                <i className="fas fa-chevron-right"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* New Purchase Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 overflow-hidden transition-all duration-300">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
                        onClick={() => setIsModalOpen(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 animate-scale-in flex flex-col max-h-[90vh] border border-white/20">
                        {/* Modal Header */}
                        <div className="px-10 py-8 border-b dark:border-gray-700 flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-20 rounded-t-[2.5rem] shadow-sm">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Nueva Solicitud de Compra</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Gestiona tus requerimientos de forma rápida y segura</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-12 h-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all active:scale-95 bg-gray-50 dark:bg-gray-900/50"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <PurchaseRequestForm
                                onClose={() => setIsModalOpen(false)}
                                onSuccess={() => {
                                    setIsModalOpen(false);
                                    fetchRequests();
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Summary */}
            {!loading && filteredRequests.length > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl gap-4 border border-gray-100 dark:border-gray-700">
                    <div className="text-sm font-medium text-gray-500">
                        Mostrando <span className="text-gray-900 dark:text-white font-bold">{filteredRequests.length}</span> solicitudes activas
                    </div>
                    <button className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 transition-all active:scale-95 shadow-xs">
                        <Download className="w-4 h-4 mr-2 text-primary" />
                        Exportar Listado (Excel)
                    </button>
                </div>
            )}
        </div>
    );
};

export default PurchaseRequestList;
