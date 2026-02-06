import { useState, useEffect } from 'react';
import { User } from '../../types';
import { useHasPermission } from '../../hooks/useHasPermission';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';

interface HelpDeskProps {
  user: User;
}

interface ITTicket {
  id: string;
  ticket_number: string;
  requester_id: string;
  requester_name: string;
  requester_department: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
  resolution_time_hours: number | null;
}

interface TicketComment {
  id: number;
  ticket_id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  text: string;
  is_internal: boolean;
  created_at: string;
}

function HelpDesk({ user }: HelpDeskProps) {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITTicket | null>(null);
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const { hasPermission } = useHasPermission(user);

  const [formData, setFormData] = useState({
    category: 'hardware',
    title: '',
    description: '',
    priority: 'media' as 'baja' | 'media' | 'alta' | 'urgente',
  });

  const categories = [
    { id: 'hardware', label: 'Hardware', icon: 'fa-laptop', color: 'bg-blue-500' },
    { id: 'software', label: 'Software', icon: 'fa-desktop', color: 'bg-green-500' },
    { id: 'red', label: 'Red/Internet', icon: 'fa-wifi', color: 'bg-purple-500' },
    { id: 'accesos', label: 'Accesos/Permisos', icon: 'fa-key', color: 'bg-yellow-500' },
    { id: 'email', label: 'Correo', icon: 'fa-envelope', color: 'bg-red-500' },
    { id: 'impresora', label: 'Impresoras', icon: 'fa-print', color: 'bg-pink-500' },
  ];

  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todos');

  useEffect(() => {
    fetchTickets();
    if (hasPermission('manage_tickets')) {
      fetchTechnicians();
    }
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchComments(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    const startTime = Date.now();
    const minLoadingTime = 400;

    try {
      const endpoint = hasPermission('manage_tickets')
        ? '/tickets'
        : '/tickets/user/' + user.id;
      const response = await api.get(endpoint);
      setTickets(response.data);
    } catch (error) {
      console.error('Error loading tickets:', error);
      showToast('Error cargando tickets', 'error');
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/employees');
      // Filtramos por rol de soporte si existe o mostramos todos para asignar
      setTechnicians(response.data.filter((e: any) => e.role === 'soporte' || e.role === 'admin'));
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const fetchComments = async (ticketId: string) => {
    setLoadingComments(true);
    try {
      const response = await api.get(`/tickets/${ticketId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;

    try {
      await api.post(`/tickets/${selectedTicket.id}/comments`, {
        author_id: user.id,
        author_name: user.name,
        author_avatar: user.avatar,
        text: newComment,
        is_internal: false
      });
      setNewComment('');
      fetchComments(selectedTicket.id);
    } catch (error) {
      showToast('Error enviando comentario', 'error');
    }
  };

  const handleUpdateStatus = async (ticketId: string, updates: any) => {
    try {
      await api.patch('/tickets/' + ticketId + '/status', updates);
      showToast('Ticket actualizado', 'success');
      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      showToast('Error actualizando ticket', 'error');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este ticket permanentemente?')) return;
    try {
      await api.delete('/tickets/' + ticketId);
      showToast('Ticket eliminado', 'success');
      setSelectedTicket(null);
      await fetchTickets();
    } catch (error) {
      showToast('Error eliminando ticket', 'error');
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = filterStatus === 'todos' || t.status === filterStatus;
    const matchesPriority = filterPriority === 'todos' || t.priority === filterPriority;
    return matchesStatus && matchesPriority;
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newTicket = {
        requester_id: user.id,
        requester_name: user.name,
        requester_department: user.department || 'General',
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
      };

      const response = await api.post('/tickets', newTicket);
      showToast('Ticket ' + response.data.ticket_number + ' creado exitosamente', 'success');
      setShowNewTicket(false);
      setFormData({ category: 'hardware', title: '', description: '', priority: 'media' });
      await fetchTickets();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      const msg = error.response?.data?.message || 'Error creando ticket';
      showToast(msg, 'error');
    }
  };

  const statusColors: Record<string, string> = {
    abierto: 'bg-blue-100 text-blue-800',
    asignado: 'bg-indigo-100 text-indigo-800',
    en_progreso: 'bg-orange-100 text-orange-800',
    resuelto: 'bg-green-100 text-green-800',
    cerrado: 'bg-gray-100 text-gray-800',
  };

  const priorityColors: Record<string, string> = {
    baja: 'bg-green-100 text-green-800',
    media: 'bg-yellow-100 text-yellow-800',
    alta: 'bg-orange-100 text-orange-800',
    urgente: 'bg-red-100 text-red-800',
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      abierto: 'Abierto',
      asignado: 'Asignado',
      en_progreso: 'En Progreso',
      resuelto: 'Resuelto',
      cerrado: 'Cerrado',
    };
    return labels[status] || status;
  };

  const stats = {
    total: tickets.length,
    abiertos: tickets.filter(t => t.status === 'abierto' || t.status === 'en_progreso' || t.status === 'asignado').length,
    resueltos: tickets.filter(t => t.status === 'resuelto').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <i className="fas fa-headset text-primary mr-3"></i>
            Mesa de Ayuda IT
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Soporte técnico y resolución de incidencias</p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="btn-midas px-6 py-3 rounded-lg font-semibold flex items-center space-x-2"
        >
          <i className="fas fa-plus"></i>
          <span>Nuevo Ticket</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Tickets</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
              <i className="fas fa-ticket-alt text-white"></i>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Activos</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{stats.abiertos}</p>
            </div>
            <div className="bg-orange-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
              <i className="fas fa-clock text-white"></i>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Resueltos</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{stats.resueltos}</p>
            </div>
            <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
              <i className="fas fa-check-circle text-white"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de tickets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Explorar Tickets</h2>

          <div className="flex flex-wrap gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-sm"
            >
              <option value="todos">Todos los estados</option>
              <option value="abierto">Abierto</option>
              <option value="asignado">Asignado</option>
              <option value="en_progreso">En Progreso</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-sm"
            >
              <option value="todos">Todas las prioridades</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>

            {(filterStatus !== 'todos' || filterPriority !== 'todos') && (
              <button
                onClick={() => { setFilterStatus('todos'); setFilterPriority('todos'); }}
                className="text-red-500 hover:text-red-700 text-sm font-semibold px-2"
              >
                <i className="fas fa-times mr-1"></i> Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <SkeletonTable />
          ) : filteredTickets.length === 0 ? (
            <EmptyState
              title="No se encontraron tickets"
              message="No hay incidencias que coincidan con los filtros seleccionados."
              icon="fa-search"
            />
          ) : (
            <div className="space-y-4">
              {filteredTickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover-lift transition bg-white dark:bg-gray-800 cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br ${categories.find(c => c.id === ticket.category)?.color || 'from-gray-400 to-gray-600'}`}>
                        <i className={`fas ${categories.find(c => c.id === ticket.category)?.icon || 'fa-ticket-alt'}`}></i>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <span className="font-bold text-gray-800 dark:text-gray-200">{ticket.ticket_number}</span>
                          <span className={`inline-flex px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${statusColors[ticket.status]}`}>
                            {getStatusLabel(ticket.status)}
                          </span>
                          <span className={`inline-flex px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${priorityColors[ticket.priority]}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-1">{ticket.title}</h3>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span><i className="fas fa-user mr-1"></i>{ticket.requester_name}</span>
                          <span><i className="fas fa-clock mr-1"></i>{new Date(ticket.created_at).toLocaleDateString()}</span>
                          {ticket.assigned_to_name && (
                            <span className="text-primary font-medium">
                              <i className="fas fa-user-shield mr-1"></i>{ticket.assigned_to_name}
                            </span>
                          )}
                          {ticket.status === 'resuelto' && ticket.resolution_time_hours !== null && (
                            <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                              <i className="fas fa-stopwatch mr-1"></i>{ticket.resolution_time_hours}h
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Detalle Ticket / Chat */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Detalle */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg text-white bg-gradient-to-br ${categories.find(c => c.id === selectedTicket.category)?.color || 'from-primary to-green-600'}`}>
                  <i className={`fas ${categories.find(c => c.id === selectedTicket.category)?.icon || 'fa-ticket-alt'} text-xl`}></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold dark:text-white">{selectedTicket.ticket_number}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Creado por {selectedTicket.requester_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <i className="fas fa-times text-xl text-gray-500"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Información del Ticket (Lateral en Desktop) */}
              <div className="w-full md:w-80 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                <section className="mb-6">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Información</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500">Asunto</label>
                      <p className="font-semibold dark:text-white">{selectedTicket.title}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Descripción</label>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 italic">"{selectedTicket.description}"</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Estado</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColors[selectedTicket.status]}`}>
                          {getStatusLabel(selectedTicket.status)}
                        </div>
                        {selectedTicket.status === 'resuelto' && selectedTicket.resolution_time_hours !== null && (
                          <div className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-green-200">
                            Resuelto en {selectedTicket.resolution_time_hours} horas
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <hr className="my-6 border-gray-200 dark:border-gray-700" />

                <section>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Gestión</h4>
                  <div className="space-y-4">
                    {hasPermission('manage_tickets') ? (
                      <>
                        <div>
                          <label className="text-xs text-gray-500 block mb-2">Asignar Técnico</label>
                          <select
                            value={selectedTicket.assigned_to_id || ''}
                            onChange={(e) => {
                              const tech = technicians.find(t => t.id == e.target.value);
                              handleUpdateStatus(selectedTicket.id, {
                                assigned_to_id: tech?.id || null,
                                assigned_to_name: tech?.name || null,
                                status: tech ? 'asignado' : 'abierto'
                              });
                            }}
                            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg p-2 dark:text-white"
                          >
                            <option value="">Sin asignar</option>
                            {technicians.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-2">Cambiar Estado</label>
                          <select
                            value={selectedTicket.status}
                            onChange={(e) => handleUpdateStatus(selectedTicket.id, { status: e.target.value })}
                            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg p-2 dark:text-white"
                          >
                            <option value="abierto">Abierto</option>
                            <option value="asignado">Asignado</option>
                            <option value="en_progreso">En Progreso</option>
                            <option value="resuelto">Resuelto</option>
                            <option value="cerrado">Cerrado</option>
                          </select>
                        </div>
                        {selectedTicket.status === 'resuelto' && (
                          <button
                            onClick={() => handleDeleteTicket(selectedTicket.id)}
                            className="w-full mt-4 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-bold text-sm transition border border-red-200"
                          >
                            <i className="fas fa-trash-alt mr-2"></i>
                            Eliminar Ticket
                          </button>
                        )}
                      </>
                    ) : (
                      <div>
                        <label className="text-xs text-gray-500">Técnico Asignado</label>
                        <p className="font-semibold text-primary">{selectedTicket.assigned_to_name || 'Pendiente de asignación'}</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Chat / Comentarios */}
              <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Conversación</h4>

                  {loadingComments ? (
                    <div className="flex items-center justify-center h-full">
                      <i className="fas fa-spinner fa-spin text-primary text-2xl"></i>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-10">
                      <i className="fas fa-comments text-4xl text-gray-300 mb-2"></i>
                      <p className="text-gray-500 italic">No hay mensajes aún.</p>
                    </div>
                  ) : (
                    comments.map(comment => (
                      <div
                        key={comment.id}
                        className={`flex ${comment.author_id == user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl p-4 ${comment.author_id == user.id
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-white dark:bg-gray-800 dark:text-white rounded-tl-none shadow-sm'
                          }`}>
                          <div className="flex items-center justify-between mb-1 gap-4">
                            <span className="text-[10px] font-bold uppercase opacity-80">{comment.author_name}</span>
                            <span className="text-[10px] opacity-60">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Área de envío */}
                {selectedTicket.status !== 'cerrado' && selectedTicket.status !== 'resuelto' ? (
                  <form onSubmit={handleSubmitComment} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-end space-x-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escribe un mensaje para IT..."
                      rows={2}
                      className="flex-1 bg-gray-100 dark:bg-gray-900 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary dark:text-white resize-none"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="bg-primary text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-center text-xs font-medium">
                    Este ticket está {selectedTicket.status}. No se admiten nuevos mensajes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo ticket */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Nuevo Ticket de Soporte</h2>
              <button onClick={() => setShowNewTicket(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Categoría del Incidente *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`p-4 rounded-xl border-2 transition ${formData.category === cat.id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-gray-100 dark:border-gray-700 hover:border-primary/50'}`}
                    >
                      <div className={`${cat.color} w-10 h-10 rounded-full flex items-center justify-center text-white mx-auto mb-2 shadow-md`}>
                        <i className={`fas ${cat.icon}`}></i>
                      </div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{cat.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Asunto *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  required
                  placeholder="Ej: Mi monitor no enciende"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción Detallada *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  rows={4}
                  required
                  placeholder="Describe qué pasó y qué has intentado hacer..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Prioridad *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="baja">Baja (No urgente, consulta)</option>
                  <option value="media">Media (Afecta mi trabajo individual)</option>
                  <option value="alta">Alta (Crítico para el departamento)</option>
                  <option value="urgente">Urgente (Bloqueo total, emergencia)</option>
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewTicket(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 btn-midas px-6 py-3 rounded-lg font-semibold shadow-xl shadow-primary/20">
                  Abrir Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HelpDesk;
