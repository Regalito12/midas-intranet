import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, FileText, Download, Check, Clock,
    AlertCircle, CheckCircle2, XCircle, Paperclip
} from 'lucide-react';
import api from '../services/api';

interface PurchaseRequest {
    id: number;
    request_number: string;
    total_estimated: number;
    items: any[];
    product_name?: string;
    description?: string;
    quantity?: number;
    estimated_price?: number;
    status: string;
    company_name: string;
    cost_center_name: string;
    cost_center_code: string;
    assignment_type: string;
    assignment_reference: string;
    requester_name: string;
    requester_email: string;
    released_by: number | null;
    released_at: string | null;
    released_notes: string | null;
    approved_by: number | null;
    approved_at: string | null;
    rejected_by: number | null;
    rejected_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    attachments: any[];
    approvals: any[];
    availableActions: any[];
    planned_project_id?: number;
}

const PurchaseRequestDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<PurchaseRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState<{ type: string; open: boolean }>({
        type: '',
        open: false
    });
    const [actionNotes, setActionNotes] = useState('');
    const [processingAction, setProcessingAction] = useState(false);

    /* Component Implementation for PurchaseRequestDetail with Reassign Feature */

    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState('');

    useEffect(() => {
        fetchRequest();
        fetchProjects();
    }, [id]);

    const fetchProjects = async () => {
        try {
            const response = await api.listProjects({ status: 'APROBADO' });
            setProjects(response.data.data || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const fetchRequest = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/purchase-requests/${id}`);
            setRequest(response.data.data);
            if (response.data.data.planned_project_id) {
                setSelectedProject(String(response.data.data.planned_project_id));
            }
        } catch (error) {
            console.error('Error fetching request:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string) => {
        setProcessingAction(true);
        try {
            if (action === 'REASIGNAR') {
                await api.reassignRequest(Number(id), {
                    newProjectId: Number(selectedProject),
                    justification: actionNotes
                });
            } else {
                const endpoint = `/purchase-requests/${id}/${action.toLowerCase()}`;
                const payload = action === 'RECHAZAR'
                    ? { reason: actionNotes }
                    : { notes: actionNotes };
                await api.post(endpoint, payload);
            }

            setActionModal({ type: '', open: false });
            setActionNotes('');
            fetchRequest(); // Refresh data

        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al procesar la acción');
        } finally {
            setProcessingAction(false);
        }
    };

    const getStatusIcon = (status: string) => {
        const icons: Record<string, JSX.Element> = {
            'SOLICITADO': <Clock className="w-5 h-5 text-blue-500" />,
            'LIBERADO': <Check className="w-5 h-5 text-purple-500" />,
            'APROBADO': <CheckCircle2 className="w-5 h-5 text-green-500" />,
            'RECHAZADO': <XCircle className="w-5 h-5 text-red-500" />,
            'EN_COMPRAS': <FileText className="w-5 h-5 text-yellow-500" />,
            'ORDEN_GENERADA': <Check className="w-5 h-5 text-indigo-500" />,
            'CERRADO': <Check className="w-5 h-5 text-gray-500" />
        };
        return icons[status] || icons['SOLICITADO'];
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

    const getApprovalStatusIcon = (status: string) => {
        if (status === 'APROBADO') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        if (status === 'RECHAZADO') return <XCircle className="w-5 h-5 text-red-500" />;
        return <Clock className="w-5 h-5 text-yellow-500" />;
    };

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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitud no encontrada</h2>
                    <button
                        onClick={() => navigate('/purchases')}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        Volver a solicitudes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/purchases')}
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Volver a solicitudes
                </button>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{request.request_number}</h1>
                        <p className="text-gray-600 mt-1">{request.items?.[0]?.product_name || request.product_name || 'Solicitud de Compra'}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(request.status)}`}>
                        {request.status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Details Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Detalles de la Solicitud</h2>
                            {/* Admin Action: Reassign */}
                            <button
                                onClick={() => setActionModal({ type: 'REASIGNAR', open: true })}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                ✏️ Corregir Proyecto
                            </button>
                        </div>

                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Solicitante</dt>
                                <dd className="mt-1 text-sm text-gray-900">{request.requester_name}</dd>
                                <dd className="text-xs text-gray-500">{request.requester_email}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Fecha de Solicitud</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {new Date(request.created_at).toLocaleString('es-DO')}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Empresa</dt>
                                <dd className="mt-1 text-sm text-gray-900">{request.company_name}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Centro de Costo</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {request.cost_center_code} - {request.cost_center_name}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Tipo de Asignación</dt>
                                <dd className="mt-1 text-sm text-gray-900">{request.assignment_type}</dd>
                            </div>
                            {request.assignment_reference && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Referencia</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{request.assignment_reference}</dd>
                                </div>
                            )}
                        </dl>

                        {/* Items Table */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Productos / Servicios</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Producto/Servicio</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Cant.</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">P. Unitario</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {request.items && request.items.length > 0 ? (
                                            request.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 whitespace-normal">
                                                        <div className="text-sm font-bold text-gray-900">{item.product_name}</div>
                                                        <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm text-gray-900 font-medium">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                                                        RD${item.estimated_price?.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                                                        RD${item.total_estimated?.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            /* Fallback for old requests */
                                            <tr>
                                                <td className="px-4 py-3 whitespace-normal">
                                                    <div className="text-sm font-bold text-gray-900">{request.product_name}</div>
                                                    <div className="text-xs text-gray-500 mt-1 font-italic">{request.description}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-900 font-medium">
                                                    {request.quantity}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-900">
                                                    RD${request.estimated_price?.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                                                    RD${request.total_estimated?.toLocaleString()}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="bg-blue-50/50">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-4 text-right text-sm font-bold text-gray-900 uppercase">Total Estimado</td>
                                            <td className="px-4 py-4 text-right text-lg font-black text-blue-700">
                                                RD${request.total_estimated?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Attachments */}
                    {request.attachments && request.attachments.length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Adjuntos</h2>
                            <div className="space-y-2">
                                {request.attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center">
                                            <Paperclip className="w-5 h-5 text-gray-400 mr-3" />
                                            <span className="text-sm text-gray-900">{file.file_name}</span>
                                        </div>
                                        <button className="text-blue-600 hover:text-blue-700">
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rejection Reason */}
                    {request.rejected_at && request.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                    <h3 className="text-red-800 font-medium">Solicitud Rechazada</h3>
                                    <p className="text-red-700 text-sm mt-1">{request.rejection_reason}</p>
                                    <p className="text-red-600 text-xs mt-2">
                                        {new Date(request.rejected_at).toLocaleString('es-DO')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Actions */}
                    {request.availableActions && request.availableActions.length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
                            <div className="space-y-2">
                                {request.availableActions.map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActionModal({ type: action.action, open: true })}
                                        className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${action.action === 'RECHAZAR'
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                                {request.status === 'APROBADO' && (
                                    <button
                                        onClick={() => navigate(`/purchases/${id}/generate-order`)}
                                        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FileText className="w-5 h-5" />
                                        Generar Orden de Compra
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Approval Timeline */}
                    {request.approvals && request.approvals.length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline de Aprobaciones</h2>
                            <div className="space-y-4">
                                {request.approvals.map((approval, index) => (
                                    <div key={index} className="flex items-start">
                                        <div className="flex-shrink-0">
                                            {getApprovalStatusIcon(approval.approval_status)}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm font-medium text-gray-900">
                                                Nivel {approval.approval_level}: {approval.required_role_name}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {approval.approval_status === 'PENDIENTE' && 'Pendiente de aprobación'}
                                                {approval.approval_status === 'APROBADO' && approval.approval_date &&
                                                    `Aprobado el ${new Date(approval.approval_date).toLocaleDateString('es-DO')}`}
                                                {approval.approval_status === 'RECHAZADO' && 'Rechazado'}
                                            </p>
                                            {approval.notes && (
                                                <p className="text-xs text-gray-600 mt-1 italic">{approval.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Status History */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Estados</h2>
                        <div className="space-y-3">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    {getStatusIcon('SOLICITADO')}
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">Solicitado</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(request.created_at).toLocaleString('es-DO')}
                                    </p>
                                </div>
                            </div>

                            {request.released_at && (
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        {getStatusIcon('LIBERADO')}
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Liberado</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(request.released_at).toLocaleString('es-DO')}
                                        </p>
                                        {request.released_notes && (
                                            <p className="text-xs text-gray-600 mt-1 italic">{request.released_notes}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {request.approved_at && (
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        {getStatusIcon('APROBADO')}
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Aprobado</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(request.approved_at).toLocaleString('es-DO')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Modal */}
            {actionModal.open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {actionModal.type === 'RECHAZAR' ? 'Rechazar Solicitud' :
                                actionModal.type === 'REASIGNAR' ? 'Reasignar Proyecto' :
                                    `${actionModal.type} Solicitud`}
                        </h3>

                        {actionModal.type === 'REASIGNAR' ? (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nuevo Proyecto
                                </label>
                                <select
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione un proyecto...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.code} - {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        <textarea
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            placeholder={
                                actionModal.type === 'RECHAZAR' ? 'Motivo del rechazo...' :
                                    actionModal.type === 'REASIGNAR' ? 'Justificación del cambio de proyecto...' :
                                        'Notas o comentarios...'
                            }
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                            required={actionModal.type === 'RECHAZAR' || actionModal.type === 'REASIGNAR'}
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setActionModal({ type: '', open: false });
                                    setActionNotes('');
                                }}
                                disabled={processingAction}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleAction(actionModal.type)}
                                disabled={
                                    processingAction ||
                                    (actionModal.type === 'RECHAZAR' && !actionNotes) ||
                                    (actionModal.type === 'REASIGNAR' && (!selectedProject || !actionNotes))
                                }
                                className={`px-4 py-2 rounded-lg text-white ${actionModal.type === 'RECHAZAR'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    } disabled:opacity-50`}
                            >
                                {processingAction ? 'Procesando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseRequestDetail;
