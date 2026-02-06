import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText } from 'lucide-react';
import api from '../services/api';

interface PurchaseOrder {
    id: number;
    order_number: string;
    request_number: string;
    product_name: string;
    supplier_name: string;
    total_amount: number;
    status: string;
    company_name: string;
    generated_by_name: string;
    generated_at: string;
    supplier_tax_id?: string;
    supplier_contact?: string;
    unit_price?: number;
    quantity?: number;
    subtotal?: number;
    tax_amount?: number;
}

const PurchaseOrderList: React.FC = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        status: '',
        search: ''
    });

    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

    useEffect(() => {
        fetchOrders();
    }, [filter.status]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/purchase-orders', {
                params: {
                    status: filter.status
                }
            });
            setOrders(response.data.data || []);
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'GENERADA': 'bg-blue-100 text-blue-800',
            'APROBADA': 'bg-green-100 text-green-800',
            'RECHAZADA': 'bg-red-100 text-red-800',
            'CANCELADA': 'bg-gray-100 text-gray-800',
            'RECIBIDA': 'bg-indigo-100 text-indigo-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredOrders = orders.filter(order => {
        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            return order.order_number.toLowerCase().includes(searchLower) ||
                order.supplier_name.toLowerCase().includes(searchLower) ||
                (order.product_name && order.product_name.toLowerCase().includes(searchLower));
        }
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8 print:hidden">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Órdenes de Compra</h1>
                        <p className="text-gray-600 mt-1">Órdenes oficiales generadas y autorizadas</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por número, proveedor..."
                            value={filter.search}
                            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <select
                        value={filter.status}
                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Todos los estados</option>
                        <option value="GENERADA">Generada</option>
                        <option value="APROBADA">Aprobada</option>
                        <option value="RECIBIDA">Recibida</option>
                        <option value="RECHAZADA">Rechazada</option>
                    </select>

                    <button
                        onClick={() => setFilter({ status: '', search: '' })}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Filter className="w-5 h-5 mr-2" />
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No se encontraron órdenes de compra</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Número OC
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Proveedor
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Monto Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Solicitud Ref.
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha Generada
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">
                                                {order.order_number}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {order.supplier_name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {order.product_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">
                                                RD${Number(order.total_amount || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-blue-600 font-medium font-bold">
                                                {order.request_number}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(order.generated_at).toLocaleDateString('es-DO')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="text-blue-600 hover:text-blue-900 font-bold"
                                            >
                                                Ver PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Detalle / PDF Simulation */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-8 relative print:p-0 print:shadow-none print:static">
                        <button
                            onClick={() => setSelectedOrder(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 print:hidden"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Order Header */}
                        <div className="flex justify-between items-start border-b-2 border-gray-100 pb-6 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">ORDEN DE COMPRA</h2>
                                <p className="text-blue-600 font-bold text-lg">{selectedOrder.order_number}</p>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                                <p>Fecha: {new Date(selectedOrder.generated_at).toLocaleDateString('es-DO')}</p>
                                <p>Ref Request: {selectedOrder.request_number}</p>
                            </div>
                        </div>

                        {/* Supplier Info */}
                        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-700 uppercase tracking-wider mb-2 text-xs">PROVEEDOR</h3>
                                <p className="text-lg font-bold text-gray-900">{selectedOrder.supplier_name}</p>
                                <p className="text-gray-600">{selectedOrder.supplier_tax_id || 'RNC No disponible'}</p>
                                <p className="text-gray-600">{selectedOrder.supplier_contact || 'Contacto no disponible'}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-bold text-blue-700 uppercase tracking-wider mb-2 text-xs">FACTURAR A</h3>
                                <p className="font-bold text-gray-900">{selectedOrder.company_name || 'Midas Dominicana'}</p>
                                <p className="text-gray-600">Santo Domingo, República Dominicana</p>
                            </div>
                        </div>

                        {/* Items Table Container */}
                        <div className="mb-8 overflow-hidden rounded-lg border border-gray-200">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-900 text-white">
                                        <th className="px-4 py-3 text-left">Descripción</th>
                                        <th className="px-4 py-3 text-right">Cant.</th>
                                        <th className="px-4 py-3 text-right">Precio Unit.</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100 italic">
                                        <td className="px-4 py-4">{selectedOrder.product_name}</td>
                                        <td className="px-4 py-4 text-right">{selectedOrder.quantity || 1}</td>
                                        <td className="px-4 py-4 text-right">RD${Number(selectedOrder.unit_price || selectedOrder.total_amount).toLocaleString()}</td>
                                        <td className="px-4 py-4 text-right font-bold">RD${Number(selectedOrder.total_amount).toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Totals Section */}
                        <div className="flex justify-end mb-12">
                            <div className="w-64 space-y-2 px-4">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal:</span>
                                    <span>RD${Number(selectedOrder.subtotal || selectedOrder.total_amount * 0.82).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>ITBIS (18%):</span>
                                    <span>RD${Number(selectedOrder.tax_amount || selectedOrder.total_amount * 0.18).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t-2 border-gray-900">
                                    <span>TOTAL:</span>
                                    <span>RD${Number(selectedOrder.total_amount).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-12 mt-16 print:mt-24">
                            <div className="text-center">
                                <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-500">
                                    Solicitado por: {selectedOrder.generated_by_name}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-500 font-bold uppercase">
                                    Aprobado por: (Firma Digital)
                                </div>
                                {selectedOrder.status === 'APROBADA' && (
                                    <div className="text-green-600 font-serif italic text-lg mt-2 font-bold">
                                        Documento Autorizado Electrónicamente
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-12 flex justify-end gap-3 print:hidden">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={handlePrint}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-bold"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Imprimir / Guardar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderList;
