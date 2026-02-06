import React, { useState, useEffect } from 'react';
import {
    TrendingUp, DollarSign, FileText, CheckCircle,
    Clock, BarChart3
} from 'lucide-react';
import api from '../services/api';

interface DashboardStats {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    totalOrders: number;
    totalSpent: number;
    totalCommitted: number;
    budgetAvailable: number;
}

const PurchaseDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        totalOrders: 0,
        totalSpent: 0,
        totalCommitted: 0,
        budgetAvailable: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch all data in parallel
            const [requestsRes, ordersRes] = await Promise.all([
                api.get('/purchase-requests'), // Changed from /my-requests to see all in general dashboard
                api.get('/purchase-orders')
            ]);

            const requests = requestsRes.data.data || [];
            const orders = ordersRes.data.data || [];

            // Calculate stats
            const pending = requests.filter((r: any) =>
                ['SOLICITADO', 'LIBERADO'].includes(r.status)
            ).length;

            const approved = requests.filter((r: any) =>
                r.status === 'APROBADO'
            ).length;

            const totalSpent = orders
                .filter((o: any) => o.status === 'APROBADA')
                .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

            const totalCommitted = orders
                .filter((o: any) => o.status === 'GENERADA')
                .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

            setStats({
                totalRequests: requests.length,
                pendingRequests: pending,
                approvedRequests: approved,
                totalOrders: orders.length,
                totalSpent,
                totalCommitted,
                budgetAvailable: 0 // Would come from budget API
            });

            // Get recent items (last 5)
            setRecentRequests(requests.slice(0, 5));
            setRecentOrders(orders.slice(0, 5));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard de Compras</h1>
                <p className="text-gray-600 mt-1">Resumen y métricas del módulo de compras</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Solicitudes"
                    value={stats.totalRequests}
                    icon={FileText}
                    color="text-blue-600"
                    subtitle="Todas las solicitudes"
                />
                <StatCard
                    title="Pendientes"
                    value={stats.pendingRequests}
                    icon={Clock}
                    color="text-yellow-600"
                    subtitle="En espera de acción"
                />
                <StatCard
                    title="Aprobadas"
                    value={stats.approvedRequests}
                    icon={CheckCircle}
                    color="text-green-600"
                    subtitle="Listas para OC"
                />
                <StatCard
                    title="Órdenes Generadas"
                    value={stats.totalOrders}
                    icon={FileText}
                    color="text-purple-600"
                    subtitle="Total de OC"
                />
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Gastado</h3>
                        <DollarSign className="w-8 h-8 opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">RD${stats.totalSpent.toLocaleString()}</p>
                    <p className="text-sm opacity-90 mt-1">Órdenes aprobadas</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Comprometido</h3>
                        <TrendingUp className="w-8 h-8 opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">RD${stats.totalCommitted.toLocaleString()}</p>
                    <p className="text-sm opacity-90 mt-1">Órdenes generadas</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Total</h3>
                        <BarChart3 className="w-8 h-8 opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">
                        RD${(stats.totalSpent + stats.totalCommitted).toLocaleString()}
                    </p>
                    <p className="text-sm opacity-90 mt-1">Gastado + Comprometido</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Requests */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Solicitudes Recientes
                    </h2>

                    {recentRequests.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No hay solicitudes</p>
                    ) : (
                        <div className="space-y-3">
                            {recentRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                    onClick={() => window.location.href = `/purchases/${request.id}`}
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 text-sm">
                                            {request.request_number}
                                        </p>
                                        <p className="text-xs text-gray-600 truncate">
                                            {request.product_name}
                                        </p>
                                    </div>
                                    <div className="text-right ml-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${request.status === 'APROBADO'
                                            ? 'bg-green-100 text-green-800'
                                            : request.status === 'RECHAZADO'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {request.status}
                                        </span>
                                        <p className="text-xs text-gray-600 mt-1">
                                            RD${request.total_estimated?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Órdenes Recientes
                    </h2>

                    {recentOrders.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No hay órdenes</p>
                    ) : (
                        <div className="space-y-3">
                            {recentOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                    onClick={() => window.location.href = `/purchase-orders/${order.id}`}
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 text-sm">
                                            {order.order_number}
                                        </p>
                                        <p className="text-xs text-gray-600 truncate">
                                            {order.supplier_name}
                                        </p>
                                    </div>
                                    <div className="text-right ml-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === 'APROBADA'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {order.status}
                                        </span>
                                        <p className="text-xs text-gray-600 mt-1">
                                            RD${order.total_amount?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => window.location.href = '/purchases/new'}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-center font-medium"
                    >
                        Nueva Solicitud
                    </button>
                    <button
                        onClick={() => window.location.href = '/purchases'}
                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center font-medium"
                    >
                        Ver Todas las Solicitudes
                    </button>
                    <button
                        onClick={() => window.location.href = '/purchase-orders'}
                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center font-medium"
                    >
                        Ver Órdenes de Compra
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseDashboard;
