import React, { useState, useEffect } from 'react';
import {
    FileDown, Filter, Search,
    Table
} from 'lucide-react';
import api from '../services/api';

interface ReportFilter {
    dateFrom: string;
    dateTo: string;
    status: string;
    companyId: string;
    costCenterId: string;
}

const PurchaseReports: React.FC = () => {
    const [filters, setFilters] = useState<ReportFilter>({
        dateFrom: '',
        dateTo: '',
        status: '',
        companyId: '',
        costCenterId: ''
    });

    const [companies, setCompanies] = useState<any[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState<'requests' | 'orders'>('requests');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const compRes = await api.get('/companies');
            setCompanies(compRes.data.data || []);
        } catch (error) {
            console.error('Error fetching filter data:', error);
        }
    };

    const handleFetchReport = async () => {
        setLoading(true);
        try {
            const endpoint = reportType === 'requests'
                ? '/purchase-requests'
                : '/purchase-orders';

            const response = await api.get(endpoint, { params: filters });
            setData(response.data.data || []);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        // Logic for Excel export would go here
        // For now, we simulate a CSV download
        const headers = reportType === 'requests'
            ? ['Número', 'Producto', 'Solicitante', 'Estado', 'Monto', 'Fecha']
            : ['Número OC', 'Proveedor', 'Estado', 'Monto Total', 'Fecha'];

        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

        data.forEach(item => {
            const row = reportType === 'requests'
                ? [item.request_number, item.product_name, item.requester_name, item.status, item.total_estimated, item.created_at]
                : [item.order_number, item.supplier_name, item.status, item.total_amount, item.generated_at];
            csvContent += row.join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reportes de Compras</h1>
                    <p className="text-gray-600 mt-1">Generación de informes y exportación de datos</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={exportToExcel}
                        disabled={data.length === 0}
                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <FileDown className="w-5 h-5 mr-2" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* Filters Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex items-center gap-2 mb-6 text-gray-700 font-semibold">
                    <Filter className="w-5 h-5" />
                    <h2>Filtros del Informe</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reporte</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="requests">Solicitudes</option>
                            <option value="orders">Órdenes de Compra</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                        <select
                            value={filters.companyId}
                            onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todas</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos</option>
                            {reportType === 'requests' ? (
                                <>
                                    <option value="SOLICITADO">Solicitado</option>
                                    <option value="LIBERADO">Liberado</option>
                                    <option value="APROBADO">Aprobado</option>
                                    <option value="RECHAZADO">Rechazado</option>
                                </>
                            ) : (
                                <>
                                    <option value="GENERADA">Generada</option>
                                    <option value="APROBADA">Aprobada</option>
                                    <option value="CERRADA">Cerrada</option>
                                </>
                            )}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleFetchReport}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                    >
                        <Search className="w-4 h-4 mr-2" />
                        Generar Informe
                    </button>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-20">
                        <Table className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No hay datos que coincidan con los filtros</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-bottom border-gray-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {reportType === 'requests' ? 'Número' : 'Número OC'}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {reportType === 'requests' ? 'Producto' : 'Proveedor'}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {reportType === 'requests' ? 'Solicitante' : 'Monto'}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                                            {reportType === 'requests' ? item.request_number : item.order_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {reportType === 'requests' ? item.product_name : item.supplier_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {reportType === 'requests'
                                                ? item.requester_name
                                                : `RD$${(item.total_amount || 0).toLocaleString()}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'APROBADO' || item.status === 'APROBADA'
                                                ? 'bg-green-100 text-green-800'
                                                : item.status === 'RECHAZADO'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(item.created_at || item.generated_at).toLocaleDateString('es-DO')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseReports;
