import { useState, useEffect } from 'react';
import { User } from '../../types';
import { useHasPermission } from '../../hooks/useHasPermission';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonRequestCard } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';
import { exportToExcel } from '../../utils/excelExport';

interface RequestsProps {
  user: User;
}

interface RequestItem {
  id?: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PurchaseRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  type: string;
  justification: string;
  priority: string;
  status: string;
  internal_status?: string;
  date: string;
  total: number;
  items_count: number;
  cost_center_id?: number;
}

function Requests({ user }: RequestsProps) {
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [costCenters, setCostCenters] = useState<{ id: number, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useHasPermission(user);

  // Carrito de compras temporal
  const [cart, setCart] = useState<RequestItem[]>([]);
  const [currentItem, setCurrentItem] = useState<RequestItem>({
    product_name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0
  });

  const [formData, setFormData] = useState({
    type: 'Compras',
    justification: '',
    priority: 'media' as 'baja' | 'media' | 'alta' | 'urgente',
    cost_center_id: ''
  });

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const response = await api.getCostCenters();
      setCostCenters(response.data);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    }
  };

  const fetchRequests = async () => {
    const startTime = Date.now();
    const minLoadingTime = 400;

    try {
      // Admin and RRHH see all requests, employees only see theirs
      const response = hasPermission('approve_requests')
        ? await api.getAllRequests()
        : await api.getRequestsByUser(user.id);

      setRequests(response.data);
    } catch (error) {
      console.error('Error loading requests:', error);
      showToast('Error cargando solicitudes', 'error');
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  // Filtered Requests
  const filteredRequests = requests.filter(req => {
    const matchesDate = filterDate ? new Date(req.date).toISOString().split('T')[0] === filterDate : true;
    const matchesStatus = filterStatus === 'todos' || req.status === filterStatus;
    return matchesDate && matchesStatus;
  });


  const handleAddToCart = () => {
    if (!currentItem.product_name || currentItem.quantity <= 0) {
      showToast('Complete los datos del producto', 'error');
      return;
    }

    const total = currentItem.quantity * currentItem.unit_price;
    const newItem = { ...currentItem, total_price: total };

    setCart([...cart, newItem]);
    setCurrentItem({
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    });
    showToast('Producto agregado al carrito', 'success');
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    showToast('Producto eliminado', 'success');
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast('Agregue al menos un producto', 'error');
      return;
    }

    if (!formData.cost_center_id && formData.type === 'Compras') {
      showToast('Seleccione un centro de costo', 'error');
      return;
    }

    try {
      const newRequest = {
        requester_id: user.id,
        requester_name: user.name,
        requester_avatar: user.avatar,
        department: user.department || 'General',
        type: formData.type,
        justification: formData.justification,
        priority: formData.priority,
        items: cart,
        total: calculateCartTotal(),
        cost_center_id: formData.cost_center_id
      };

      const response = await api.createRequest(newRequest);
      showToast(`Solicitud creada: ${cart.length} productos, Total: RD$${response.data.total.toLocaleString()}`, 'success');

      setShowNewRequestModal(false);
      setCart([]);
      setFormData({
        type: 'Compras',
        justification: '',
        priority: 'media',
        cost_center_id: ''
      });
      await fetchRequests();
    } catch (error: any) {
      console.error('Error creating request:', error);
      const msg = error.response?.data?.message || 'Error creando solicitud';
      showToast(msg, 'error');
    }
  };

  const handleExport = () => {
    const dataToExport = requests.map(req => ({
      ID: req.id,
      Fecha: new Date(req.date).toLocaleDateString(),
      Solicitante: req.requester_name,
      Tipo: req.type,
      Justificación: req.justification,
      Prioridad: req.priority,
      Items: req.items_count,
      Total: req.total,
      Estado: req.status
    }));
    exportToExcel(dataToExport, 'Solicitudes_Compra');
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!confirm(`¿Estás seguro de ${newStatus === 'aprobado' ? 'APROBAR' : 'RECHAZAR'} esta solicitud?`)) return;

    try {
      await api.updateRequestStatus(id, newStatus);
      showToast(`Solicitud ${newStatus === 'aprobado' ? 'aprobada' : 'rechazada'} exitosamente`, 'success');
      fetchRequests();
    } catch (error: any) {
      console.error('Error updating status:', error);
      const msg = error.response?.data?.message || 'Error actualizando estado';
      showToast(msg, 'error');
    }
  };

  const handleViewDetails = async (req: PurchaseRequest) => {
    setSelectedRequest(req);
    setLoadingItems(true);
    try {
      const response = await api.getRequestItems(req.id);
      setRequestItems(response.data);
    } catch (error) {
      console.error('Error loading items:', error);
      showToast('Error cargando detalles', 'error');
    } finally {
      setLoadingItems(false);
    }
  };

  const statusColors: Record<string, string> = {
    'pendiente': 'bg-yellow-100 text-yellow-800',
    'en_revision': 'bg-blue-100 text-blue-800',
    'accion_requerida': 'bg-orange-100 text-orange-800 animate-pulse',
    'revision_financiera': 'bg-purple-100 text-purple-800',
    'aprobado': 'bg-green-100 text-green-800',
    'rechazado': 'bg-red-100 text-red-800',
    'finalizada': 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    'pendiente': 'Pendiente',
    'en_revision': 'En Revisión',
    'accion_requerida': 'Acción Requerida',
    'revision_financiera': 'Revisión Financiera',
    'aprobado': 'Aprobada',
    'rechazado': 'Rechazada',
    'finalizada': 'Finalizada',
  };

  const priorityColors: Record<string, string> = {
    baja: 'bg-green-100 text-green-800',
    media: 'bg-yellow-100 text-yellow-800',
    alta: 'bg-orange-100 text-orange-800',
    urgente: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <i className="fas fa-shopping-cart text-primary mr-3"></i>
            Solicitudes de Compra
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona tus solicitudes de compra y equipamiento</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="bg-[#217346] text-white px-4 py-3 rounded-lg font-semibold flex items-center hover:bg-[#1e6b41] transition"
          >
            <i className="fas fa-file-excel mr-2"></i>
            <span>Exportar</span>
          </button>
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="btn-midas px-6 py-3 rounded-lg font-semibold flex items-center space-x-2"
          >
            <i className="fas fa-plus"></i>
            <span>Nueva Solicitud</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Solicitudes', value: requests.length, icon: 'fa-file-invoice', color: 'bg-blue-500' },
          { label: 'Pendientes', value: requests.filter(r => r.status === 'pendiente').length, icon: 'fa-clock', color: 'bg-yellow-500' },
          { label: 'Aprobadas', value: requests.filter(r => r.status === 'aprobado').length, icon: 'fa-check-circle', color: 'bg-green-500' },
          { label: 'Monto Total', value: `RD$${requests.reduce((sum, r) => sum + r.total, 0).toLocaleString()}`, icon: 'fa-dollar-sign', color: 'bg-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} w-12 h-12 rounded-full flex items-center justify-center`}>
                <i className={`fas ${stat.icon} text-white`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300"><i className="fas fa-filter mr-1"></i> Filtrar por:</label>
        </div>
        <div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>
        {(filterDate || filterStatus !== 'todos') && (
          <button
            onClick={() => { setFilterDate(''); setFilterStatus('todos'); }}
            className="text-red-500 hover:text-red-700 text-sm font-semibold"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
        {loading ? (
          <div className="space-y-4 fade-in">
            {[...Array(4)].map((_, i) => <SkeletonRequestCard key={i} />)}
          </div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title="No se encontraron solicitudes"
            message="No hay solicitudes que coincidan con los filtros seleccionados."
            icon="fa-filter"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Items</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Monto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Prioridad</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200 font-medium">{req.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{new Date(req.date).toLocaleDateString('es-DO')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="capitalize">{req.type}</span>
                      {user.role === 'admin' && req.cost_center_id && (
                        <p className="text-[10px] text-primary font-bold">CC: {costCenters.find(c => c.id === req.cost_center_id)?.name || req.cost_center_id}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{req.items_count} productos</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">RD${req.total.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${priorityColors[req.priority]}`}>
                        {(req?.priority || 'normal').charAt(0).toUpperCase() + (req?.priority || 'normal').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusColors[req.status] || 'bg-gray-100'}`}>
                        {statusLabels[req.status] || req.status}
                      </span>
                      {user.role === 'admin' && req.internal_status && (
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Interno: {req.internal_status}</p>
                      )}
                      {(req.status === 'pendiente' || req.status === 'en_revision') && (
                        <p className="text-[10px] text-primary mt-1 font-bold italic">
                          Esperando: {req.internal_status?.split('_').slice(1).join(' ') || 'REVISIÓN'}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(req)}
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition"
                          title="Ver Detalles"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        {(hasPermission('approve_requests') || (user.position && req.internal_status?.includes(user.position.toUpperCase()))) && (req.status === 'pendiente' || req.status === 'en_revision') && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'aprobado')}
                              className="bg-green-100 text-green-700 hover:bg-green-200 p-2 rounded-lg transition"
                              title="Aprobar"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'rechazado')}
                              className="bg-red-100 text-red-700 hover:bg-red-200 p-2 rounded-lg transition"
                              title="Rechazar"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Solicitud con Carrito */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scale-in">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Nueva Solicitud de Compra</h2>
              <button
                onClick={() => {
                  setShowNewRequestModal(false);
                  setCart([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tipo de Compra *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="Compras">Compras y Equipamiento</option>
                    <option value="Servicios">Servicios Generales</option>
                    <option value="Digital">Licencias Software</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Centro de Costo *</label>
                  <select
                    value={formData.cost_center_id}
                    onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Seleccione un centro...</option>
                    {costCenters.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Prioridad *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Agregar Productos - Carrito */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/50">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                  <i className="fas fa-cart-plus mr-2 text-primary"></i>
                  Agregar Productos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nombre del Producto *</label>
                    <input
                      type="text"
                      value={currentItem.product_name}
                      onChange={(e) => setCurrentItem({ ...currentItem, product_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      placeholder="Ej: Laptop Dell XPS 15"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                    <input
                      type="text"
                      value={currentItem.description}
                      onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      placeholder="Especificaciones adicionales"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cantidad *</label>
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Precio Unitario (RD$) *</label>
                    <input
                      type="number"
                      value={currentItem.unit_price}
                      onChange={(e) => setCurrentItem({ ...currentItem, unit_price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full bg-[#0066CC] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0052A3] transition"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Agregar al Carrito (RD${(currentItem.quantity * currentItem.unit_price).toLocaleString()})
                </button>
              </div>

              {/* Carrito de Compras */}
              {cart.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-700/50">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                    <i className="fas fa-shopping-cart mr-2 text-primary"></i>
                    Carrito ({cart.length} productos)
                  </h3>
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-600/50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 dark:text-white">{item.product_name}</h4>
                          {item.description && <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>}
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.quantity} x RD${item.unit_price.toLocaleString()} = RD${item.total_price.toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(index)}
                          className="text-red-500 hover:text-red-700 ml-4"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-800 dark:text-white">Total:</span>
                      <span className="text-3xl font-bold text-primary">RD${calculateCartTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Justificación */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Justificación *</label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  rows={3}
                  required
                  placeholder="Explica por qué necesitas estos productos"
                ></textarea>
              </div>

              {/* Botones */}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRequestModal(false);
                    setCart([]);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cart.length === 0}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${cart.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'btn-midas'
                    }`}
                >
                  Enviar Solicitud ({cart.length} productos)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Detalle de Solicitud */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden scale-in">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Detalle de Solicitud #{selectedRequest.id}</h3>
                <p className="text-sm text-gray-500">{new Date(selectedRequest.date).toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
            </div>

            {/* Timeline de Estado */}
            <div className="px-6 py-8 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                {/* Progress Bar Background */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 dark:bg-gray-700 -translate-y-1/2 rounded-full"></div>

                {/* Progress Bar Active */}
                <div
                  className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-1000"
                  style={{
                    width: selectedRequest.status === 'pendiente' ? '0%' :
                      selectedRequest.status === 'en_revision' || selectedRequest.status === 'revision_financiera' ? '33%' :
                        selectedRequest.status === 'aprobado' || selectedRequest.status === 'rechazado' ? '66%' :
                          selectedRequest.status === 'finalizada' ? '100%' : '0%'
                  }}
                ></div>

                {/* Steps */}
                <div className="relative flex justify-between items-center">
                  {[
                    { key: 'solicitado', label: 'Solicitado', icon: 'fa-paper-plane', status: ['pendiente', 'en_revision', 'revision_financiera', 'aprobado', 'rechazado', 'finalizada'] },
                    { key: 'revision', label: 'En Revisión', icon: 'fa-search-dollar', status: ['en_revision', 'revision_financiera', 'aprobado', 'rechazado', 'finalizada'] },
                    { key: 'decision', label: 'Decisión', icon: 'fa-gavel', status: ['aprobado', 'rechazado', 'finalizada'] },
                    { key: 'finalizado', label: 'Finalizado', icon: 'fa-check-double', status: ['finalizada'] }
                  ].map((step, i) => {
                    const isActive = step.status.includes(selectedRequest.status);
                    const isCompleted = isActive && (
                      (i === 0 && selectedRequest.status !== 'pendiente') ||
                      (i === 1 && !['en_revision', 'revision_financiera'].includes(selectedRequest.status)) ||
                      (i === 2 && selectedRequest.status === 'finalizada') ||
                      (i === 3 && selectedRequest.status === 'finalizada')
                    );

                    return (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-primary text-white scale-110 shadow-lg shadow-green-200' : 'bg-white dark:bg-gray-700 text-gray-400 border-2 border-gray-100 dark:border-gray-600'
                          }`}>
                          {isCompleted ? <i className="fas fa-check"></i> : <i className={`fas ${step.icon}`}></i>}
                        </div>
                        <p className={`text-[10px] mt-2 font-bold uppercase tracking-tighter ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Info General */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 uppercase font-bold">Solicitante</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{selectedRequest.requester_name}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 uppercase font-bold">Centro de Costo</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {costCenters.find(c => c.id === selectedRequest.cost_center_id)?.name || selectedRequest.cost_center_id || 'No especificado'}
                  </p>
                </div>
              </div>

              {/* Justificación */}
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Justificación</p>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl italic text-gray-700 dark:text-gray-300 border-l-4 border-primary">
                  "{selectedRequest.justification}"
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-3">Lista de Productos / Servicios</p>
                {loadingItems ? (
                  <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : (
                  <div className="space-y-3">
                    {requestItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div>
                          <p className="font-bold text-gray-800 dark:text-white">{item.product_name}</p>
                          <p className="text-xs text-gray-500">{item.quantity} unidades x RD${item.unit_price.toLocaleString()}</p>
                        </div>
                        <p className="font-bold text-primary">RD${item.total_price.toLocaleString()}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-xl border border-primary/20 mt-4">
                      <span className="font-bold text-primary">TOTAL SOLICITADO</span>
                      <span className="text-2xl font-black text-primary">RD${selectedRequest.total.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-6 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Requests;
