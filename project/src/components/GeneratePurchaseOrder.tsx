import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';

interface PurchaseRequest {
    id: number;
    request_number: string;
    product_name: string;
    description: string;
    quantity: number;
    total_estimated: number;
    company_name: string;
    cost_center_name: string;
}

const GeneratePurchaseOrder: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const navigate = useNavigate();

    const [request, setRequest] = useState<PurchaseRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        supplierName: '',
        supplierTaxId: '',
        supplierContact: '',
        unitPrice: '',
        quantity: '',
        taxRate: '18',
        currency: 'DOP',
        paymentTerms: '',
        deliveryDate: '',
        deliveryAddress: '',
        notes: ''
    });

    useEffect(() => {
        fetchRequest();
    }, [requestId]);

    const fetchRequest = async () => {
        try {
            const response = await api.get(`/purchase-requests/${requestId}`);
            const data = response.data.data;
            setRequest(data);

            // Pre-fill quantity and estimated price
            setFormData(prev => ({
                ...prev,
                quantity: data.quantity.toString(),
                unitPrice: data.estimated_price?.toString() || ''
            }));

            setLoading(false);
        } catch (err) {
            setError('Error al cargar la solicitud');
            setLoading(false);
        }
    };

    const calculateTotals = () => {
        const quantity = parseFloat(formData.quantity) || 0;
        const unitPrice = parseFloat(formData.unitPrice) || 0;
        const taxRate = parseFloat(formData.taxRate) || 0;

        const subtotal = quantity * unitPrice;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        return { subtotal, taxAmount, total };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const totals = calculateTotals();

            const payload = {
                requestId: parseInt(requestId!),
                supplierName: formData.supplierName,
                supplierTaxId: formData.supplierTaxId,
                supplierContact: formData.supplierContact,
                unitPrice: parseFloat(formData.unitPrice),
                quantity: parseFloat(formData.quantity),
                subtotal: totals.subtotal,
                taxAmount: totals.taxAmount,
                totalAmount: totals.total,
                currency: formData.currency,
                paymentTerms: formData.paymentTerms,
                deliveryDate: formData.deliveryDate,
                deliveryAddress: formData.deliveryAddress,
                notes: formData.notes
            };

            const response = await api.post('/purchase-orders', payload);

            setSuccess(true);
            setTimeout(() => {
                navigate(`/purchase-orders/${response.data.data.orderId}`);
            }, 2000);

        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al generar orden de compra');
        } finally {
            setSubmitting(false);
        }
    };

    const totals = calculateTotals();

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Solicitud no encontrada</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(`/purchases/${requestId}`)}
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Volver a solicitud
                </button>

                <h1 className="text-3xl font-bold text-gray-900">Generar Orden de Compra</h1>
                <p className="text-gray-600 mt-1">Para solicitud: {request.request_number}</p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-green-800 font-medium">¡Orden de compra generada!</h3>
                        <p className="text-green-700 text-sm mt-1">Redirigiendo...</p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-red-800 font-medium">Error</h3>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Request Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-gray-600">Producto:</dt>
                        <dd className="font-medium">{request.product_name}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-600">Empresa:</dt>
                        <dd className="font-medium">{request.company_name}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-600">Centro de Costo:</dt>
                        <dd className="font-medium">{request.cost_center_name}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-600">Monto Estimado:</dt>
                        <dd className="font-medium">RD${request.total_estimated?.toLocaleString()}</dd>
                    </div>
                </dl>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Supplier Info */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Proveedor</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre del Proveedor <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.supplierName}
                                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                RNC <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.supplierTaxId}
                                onChange={(e) => setFormData({ ...formData, supplierTaxId: e.target.value })}
                                placeholder="000-0000000-0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contacto <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.supplierContact}
                                onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
                                placeholder="Email o Teléfono"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles de Precio</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cantidad <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Precio Unitario <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.unitPrice}
                                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ITBIS (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.taxRate}
                                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="mt-6 border-t border-gray-200 pt-4">
                        <dl className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <dt className="text-gray-600">Subtotal:</dt>
                                <dd className="font-medium">RD${totals.subtotal.toLocaleString()}</dd>
                            </div>
                            <div className="flex justify-between text-sm">
                                <dt className="text-gray-600">ITBIS ({formData.taxRate}%):</dt>
                                <dd className="font-medium">RD${totals.taxAmount.toLocaleString()}</dd>
                            </div>
                            <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                                <dt>Total:</dt>
                                <dd className="text-blue-600">RD${totals.total.toLocaleString()}</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Terms & Delivery */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Condiciones y Entrega</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Términos de Pago <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.paymentTerms}
                                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Seleccione...</option>
                                <option value="Inmediato">Inmediato</option>
                                <option value="15 días">15 días</option>
                                <option value="30 días">30 días</option>
                                <option value="45 días">45 días</option>
                                <option value="60 días">60 días</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha de Entrega <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.deliveryDate}
                                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dirección de Entrega <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                rows={2}
                                value={formData.deliveryAddress}
                                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                                placeholder="Dirección completa"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notas Adicionales
                            </label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Instrucciones especiales, comentarios..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(`/purchases/${requestId}`)}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        {submitting ? 'Generando...' : 'Generar Orden de Compra'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GeneratePurchaseOrder;
