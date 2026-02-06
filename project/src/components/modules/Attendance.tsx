import { useState, useEffect } from 'react';
import { User } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonTable } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';
import { exportToExcel } from '../../utils/excelExport';

interface AttendanceProps {
  user: User;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_department: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  hours_worked: number;
  status: string;
  notes: string | null;
}

import { useHasPermission } from '../../hooks/useHasPermission';

function Attendance({ user }: AttendanceProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<string | null>(null);
  const [todayCheckOut, setTodayCheckOut] = useState<string | null>(null);

  const { hasPermission } = useHasPermission(user);

  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({
    check_in: '',
    check_out: '',
    status: 'presente'
  });

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  useEffect(() => {
    // Actualizar cada segundo para el segundero, pero podríamos optimizar si no lo mostramos
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAttendance();
    checkTodayStatus();
  }, []);

  const fetchAttendance = async () => {
    const startTime = Date.now();
    const minLoadingTime = 400;

    try {
      const endpoint = !hasPermission('manage_attendance')
        ? `/attendance/employee/${user.id}`
        : '/attendance';
      const response = await api.get(endpoint);
      setRecords(response.data);
    } catch (error) {
      console.error('Error loading attendance:', error);
      showToast('Error cargando asistencia', 'error');
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  const checkTodayStatus = async () => {
    try {
      const response = await api.get(`/attendance/today/${user.id}`);
      const data = response.data;
      setHasCheckedIn(data.hasCheckedIn);
      setHasCheckedOut(data.hasCheckedOut);
      setTodayCheckIn(data.check_in);
      setTodayCheckOut(data.check_out);
    } catch (error) {
      console.error('Error checking today status:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      const response = await api.post('/attendance/check-in', {
        employee_id: user.id,
        employee_name: user.name,
        employee_department: user.department || 'General'
      });

      showToast(response.data.message, 'success');
      setHasCheckedIn(true);
      setTodayCheckIn(response.data.check_in);
      await fetchAttendance();
    } catch (error: any) {
      console.error('Error checking in:', error);
      const msg = error.response?.data?.message || 'Error marcando entrada';
      showToast(msg, 'error');
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await api.post('/attendance/check-out', {
        employee_id: user.id
      });

      showToast(response.data.message, 'success');
      setHasCheckedOut(true);
      setTodayCheckOut(response.data.check_out);
      await fetchAttendance();
    } catch (error: any) {
      console.error('Error checking out:', error);
      const msg = error.response?.data?.message || 'Error marcando salida';
      showToast(msg, 'error');
    }
  };

  const handleEditClick = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditForm({
      check_in: record.check_in || '',
      check_out: record.check_out || '',
      status: record.status || 'presente'
    });
  };

  const handleUpdateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      await api.updateAttendance(editingRecord.id, editForm);
      showToast('Registro actualizado exitosamente', 'success');
      setEditingRecord(null);
      fetchAttendance();
    } catch (error) {
      console.error('Error updating attendance:', error);
      showToast('Error al actualizar registro', 'error');
    }
  };

  const calculateStats = () => {
    const thisMonth = records.filter(r => {
      const recordDate = new Date(r.date);
      const now = new Date();
      return recordDate.getMonth() === now.getMonth() &&
        recordDate.getFullYear() === now.getFullYear();
    });

    const daysWorked = thisMonth.filter(r => r.check_in).length;
    const totalHours = thisMonth.reduce((sum, r) => sum + (r.hours_worked || 0), 0);
    const avgCheckIn = thisMonth.length > 0 ? '08:15' : '--:--';
    const lateCount = thisMonth.filter(r => {
      if (!r.check_in) return false;
      const [hours] = (r.check_in || '00:00').split(':').map(Number);
      return hours >= 9;
    }).length;

    return { daysWorked, totalHours, avgCheckIn, lateCount };
  };

  const stats = calculateStats();

  const handleExport = () => {
    const dataToExport = records.map(rec => ({
      Fecha: new Date(rec.date).toLocaleDateString(),
      Empleado: rec.employee_name,
      Departamento: rec.employee_department,
      Entrada: rec.check_in || '--:--',
      Salida: rec.check_out || '--:--',
      Horas: rec.hours_worked,
      Estado: rec.status,
      Notas: rec.notes || ''
    }));
    exportToExcel(dataToExport, 'Reporte_Asistencia');
  };

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg"></div>);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const record = records.find(r => r.date.split('T')[0] === dateStr);

      let statusColor = 'bg-gray-100 dark:bg-gray-700';

      if (record) {
        if (record.status === 'ausente') {
          statusColor = 'bg-red-500 shadow-red-200';
        } else if (record.check_in) {
          const [h] = record.check_in.split(':').map(Number);
          if (h >= 9) {
            statusColor = 'bg-yellow-500 shadow-yellow-200';
          } else {
            statusColor = 'bg-green-500 shadow-green-200';
          }
        }
      }

      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 p-2 rounded-xl border transition-all relative group ${isToday ? 'border-primary ring-1 ring-primary' : 'border-gray-100 dark:border-gray-700'
            } hover:shadow-md dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800`}
        >
          <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
            {day}
          </span>
          {record && (
            <div className="mt-1 space-y-1">
              <div className={`w-full h-1.5 rounded-full ${statusColor}`}></div>
              <p className="text-[10px] font-bold text-gray-800 dark:text-gray-200 truncate">
                {record.check_in || '--:--'}
              </p>
            </div>
          )}
          {isToday && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
          <i className="fas fa-clock text-primary mr-3"></i>
          Control de Asistencia
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Registra tu entrada y salida diaria</p>
      </div>

      {/* Reloj y botones de marcaje */}
      <div className="bg-gradient-to-br from-primary to-[#0066CC] rounded-xl shadow-lg p-8 text-white">
        <div className="text-center mb-6">
          <p className="text-6xl font-bold mb-2">
            {currentTime.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xl">
            {currentTime.toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={handleCheckIn}
            disabled={hasCheckedIn}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition flex items-center justify-center space-x-3 ${hasCheckedIn
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-white text-primary hover:bg-green-50'
              }`}
          >
            <i className="fas fa-sign-in-alt text-2xl"></i>
            <span>{hasCheckedIn ? 'Entrada Marcada' : 'Marcar Entrada'}</span>
          </button>
          <button
            onClick={handleCheckOut}
            disabled={!hasCheckedIn || hasCheckedOut}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition flex items-center justify-center space-x-3 ${!hasCheckedIn || hasCheckedOut
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-white text-red-600 hover:bg-red-50'
              }`}
          >
            <i className="fas fa-sign-out-alt text-2xl"></i>
            <span>{hasCheckedOut ? 'Salida Marcada' : 'Marcar Salida'}</span>
          </button>
        </div>
        {todayCheckIn && (
          <p className="text-center mt-4 text-sm opacity-90">
            <i className="fas fa-info-circle mr-2"></i>
            Entrada: {todayCheckIn} {todayCheckOut && `| Salida: ${todayCheckOut}`}
          </p>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Días Trabajados', value: `${stats.daysWorked}`, icon: 'fa-calendar-check', color: 'bg-green-500' },
          { label: 'Horas Totales', value: `${Number(stats?.totalHours || 0).toFixed(1)}h`, icon: 'fa-clock', color: 'bg-blue-500' },
          { label: 'Promedio Entrada', value: stats.avgCheckIn, icon: 'fa-sign-in-alt', color: 'bg-purple-500' },
          { label: 'Tardanzas', value: `${stats.lateCount}`, icon: 'fa-exclamation-triangle', color: 'bg-yellow-500' },
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
      {/* Historial */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Registro Mensual</h2>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded-md text-sm font-bold transition ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500'}`}
              >
                <i className="fas fa-calendar-alt mr-1"></i> Calendario
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-bold transition ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500'}`}
              >
                <i className="fas fa-list mr-1"></i> Lista
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-1">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="text-gray-400 hover:text-primary"><i className="fas fa-chevron-left"></i></button>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[120px] text-center capitalize">
                {currentMonth.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="text-gray-400 hover:text-primary"><i className="fas fa-chevron-right"></i></button>
            </div>
            <button
              onClick={handleExport}
              className="text-[#217346] hover:text-[#1e6b41] font-semibold flex items-center text-sm"
            >
              <i className="fas fa-file-excel mr-2"></i>
              Excel
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonTable />
        ) : viewMode === 'calendar' ? (
          <div className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {renderCalendar()}
            </div>
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs font-bold">
              <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span> A tiempo</div>
              <div className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span> Tardanza (9:00+)</div>
              <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span> Ausencia</div>
              <div className="flex items-center"><span className="w-3 h-3 bg-gray-100 dark:bg-gray-700 rounded-full mr-2"></span> No laborado</div>
            </div>
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            title="Sin registros"
            message="No hay registros de asistencia para el periodo seleccionado."
            icon="fa-calendar-times"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Entrada</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Salida</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Total Horas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Estado</th>
                  {hasPermission('manage_attendance') && (
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                      {new Date(rec.date).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {rec.check_in || '--:--'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {rec.check_out || '--:--'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {rec.hours_worked > 0 ? `${rec.hours_worked}h` : '--'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${rec.status === 'presente'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {rec.status === 'presente' ? 'Presente' : 'Ausente'}
                      </span>
                    </td>
                    {hasPermission('manage_attendance') && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditClick(rec)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                          title="Editar Registro"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        }
      </div >

      {/* Modal Editar Asistencia */}
      {
        editingRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md scale-in">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Editar Asistencia</h3>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleUpdateAttendance} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Entrada</label>
                  <input
                    type="time"
                    value={editForm.check_in}
                    onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Salida</label>
                  <input
                    type="time"
                    value={editForm.check_out}
                    onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Estado</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="presente">Presente</option>
                    <option value="ausente">Ausente</option>
                    <option value="permiso">Permiso</option>
                    <option value="vacaciones">Vacaciones</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-[#009640]"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default Attendance;
