import { useState, useEffect } from 'react';
import { User } from '../../types';
import api from '../../services/api';
import { SkeletonDirectoryCard } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';
import { Avatar } from '../common/Avatar';
import { showToast } from '../../utils/toast';
import { exportToExcel } from '../../utils/excelExport';

interface DirectoryProps {
  user: User;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  extension: string;
  phone?: string;
  avatar: string;
  is_online: boolean;
}

function Directory({ user: _user }: DirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      const startTime = Date.now();
      const minLoadingTime = 400;

      try {
        const response = await api.get('/employees');
        setEmployees(response.data);
      } catch (error) {
        console.error('Error loading employees:', error);
        showToast('Error cargando empleados', 'error');
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minLoadingTime - elapsed);
        setTimeout(() => setLoading(false), remaining);
      }
    };

    fetchEmployees();
  }, []);

  const departments = ['todos', ...Array.from(new Set(employees.map(e => e.department)))];

  const filteredEmployees = employees.filter(emp => {
    const searchLow = searchTerm.toLowerCase();
    const nameMatch = emp.name.toLowerCase().includes(searchLow);
    const positionMatch = (emp.position || '').toLowerCase().includes(searchLow);
    const emailMatch = (emp.email || '').toLowerCase().includes(searchLow);
    const deptMatchInSearch = (emp.department || '').toLowerCase().includes(searchLow);

    const matchesSearch = nameMatch || positionMatch || emailMatch || deptMatchInSearch;
    const matchesDept = filterDept === 'todos' || emp.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const handleExport = () => {
    const dataToExport = filteredEmployees.map(emp => ({
      Nombre: emp.name,
      Email: emp.email,
      Cargo: emp.position,
      Departamento: emp.department,
      Extension: emp.extension,
      Estado: emp.is_online ? 'En Línea' : 'Desconectado'
    }));
    exportToExcel(dataToExport, 'Directorio_Empleados');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
          <i className="fas fa-users text-primary mr-3"></i>
          Directorio de Personal
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Encuentra y conecta con tus compañeros de trabajo</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, cargo o departamento..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept === 'todos' ? 'Todos los departamentos' : dept}</option>
            ))}
          </select>
          <div className="flex space-x-2">
            <button
              onClick={handleExport}
              className="bg-[#217346] text-white px-4 py-3 rounded-lg hover:bg-[#1e6b41] transition flex items-center"
              title="Exportar a Excel"
            >
              <i className="fas fa-file-excel"></i>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-3 rounded-lg ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              <i className="fas fa-th"></i>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-3 rounded-lg ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SkeletonDirectoryCard key={i} />)}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Mostrando <span className="font-semibold">{filteredEmployees.length}</span> de{' '}
              <span className="font-semibold">{employees.length}</span> empleados
            </p>
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-3'}>
              {filteredEmployees.length === 0 ? (
                <EmptyState
                  title="No se encontraron empleados"
                  message={searchTerm ? `No hubo resultados para "${searchTerm}"` : "No hay empleados registrados."}
                  icon="fa-users-slash"
                  className="col-span-full"
                />
              ) : (
                filteredEmployees.map(emp => (
                  <div key={emp.id} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover-lift ${viewMode === 'list' ? 'flex items-center space-x-4' : ''}`}>
                    <div className={viewMode === 'grid' ? 'text-center' : 'flex-shrink-0'}>
                      <Avatar
                        src={emp.avatar}
                        name={emp.name}
                        size={viewMode === 'grid' ? 'xl' : 'lg'}
                        showStatus={true}
                        isOnline={!!emp.is_online}
                        className={viewMode === 'grid' ? 'mx-auto' : ''}
                      />
                    </div>
                    <div className={viewMode === 'grid' ? 'mt-3' : 'flex-1'}>
                      <h3 className="font-bold text-gray-800 dark:text-white truncate" title={emp.name}>{emp.name}</h3>
                      <p className={`text-sm truncate ${emp.position ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500 italic'}`} title={emp.position || ''}>
                        {emp.position || 'Sin cargo asignado'}
                      </p>
                      <span className="inline-block bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded mt-1 border border-gray-200 dark:border-gray-600">
                        {emp.department || 'General'}
                      </span>
                      <div className="mt-3 space-y-1 text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <i className="fas fa-envelope w-5 text-[#0066CC]"></i>
                          <span className="ml-2 truncate">{emp.email}</span>
                        </div>
                        {emp.extension && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <i className="fas fa-phone w-5 text-primary"></i>
                            <span className="ml-2">Ext. {emp.extension}</span>
                          </div>
                        )}
                        {emp.phone && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <i className="fas fa-mobile-alt w-5 text-green-600"></i>
                            <span className="ml-2">{emp.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => window.location.href = `mailto:${emp.email}`}
                          className="flex-1 bg-[#0066CC] text-white px-3 py-2 rounded text-xs font-semibold hover:bg-[#0052A3]"
                        >
                          <i className="fas fa-envelope mr-1"></i> Email
                        </button>
                        <button
                          onClick={() => {
                            if (!emp.phone) {
                              showToast('El usuario no tiene teléfono registrado', 'info');
                              return;
                            }
                            const phone = emp.phone.replace(/\D/g, '');
                            if (phone.length < 10) {
                              showToast('Número de teléfono inválido', 'error');
                              return;
                            }
                            window.open(`https://wa.me/${phone}`, '_blank');
                          }}
                          className={`flex-1 px-3 py-2 rounded text-xs font-semibold flex items-center justify-center transition ${emp.phone
                            ? 'bg-primary text-white hover:bg-[#009640] cursor-pointer'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          title={emp.phone ? 'Abrir chat de WhatsApp' : 'Sin número registrado'}
                        >
                          <i className="fab fa-whatsapp mr-1"></i> Chat
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Directory;
