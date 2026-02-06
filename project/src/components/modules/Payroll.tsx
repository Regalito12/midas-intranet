import { useState, useEffect } from 'react';
import { User, PayrollSlip } from '../../types';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { SkeletonCard, SkeletonTable } from '../common/Skeletons';
import { generatePayrollPDF } from '../../utils/pdfGenerator';

interface PayrollProps {
  user: User;
}

function Payroll({ user }: PayrollProps) {
  const [payrollSlips, setPayrollSlips] = useState<PayrollSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchPayrollSlips();
  }, []);

  const fetchPayrollSlips = async () => {
    const startTime = Date.now();
    const minLoadingTime = 400;

    try {
      // Si es empleado, traer solo sus volantes, si es admin/rrhh traer todos
      const endpoint = user.role === 'empleado'
        ? `/payroll/employee/${user.id}`
        : '/payroll';
      const response = await api.get(endpoint);
      setPayrollSlips(response.data);
    } catch (error) {
      console.error('Error loading payroll slips:', error);
      showToast('Error cargando volantes de pago', 'error');
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  const handleViewSlip = (slip: PayrollSlip) => {
    setSelectedSlip(slip);
    setShowDetails(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <i className="fas fa-money-bill-wave text-primary mr-3"></i>
            Volantes de Pago
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Consulta y descarga tus volantes de pago</p>
        </div>

        {/* Toggle de vista */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Vista:</span>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            title="Vista de lista"
          >
            <i className="fas fa-list"></i>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            title="Vista de cuadrícula"
          >
            <i className="fas fa-th"></i>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <SkeletonTable />
          )
        ) : payrollSlips.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">No hay volantes disponibles</p>
        ) : viewMode === 'grid' ? (
          /* Vista Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {payrollSlips.map((slip) => (
              <div key={slip.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover-lift bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-[#0066CC] rounded-full flex items-center justify-center text-white text-2xl">
                    <i className="fas fa-file-invoice-dollar"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">{slip.month} {slip.year}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{slip.period}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Salario Neto</p>
                  <p className="text-3xl font-bold text-primary">
                    RD${slip.net_salary.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewSlip(slip)}
                    className="flex-1 bg-[#0066CC] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0052A3] transition"
                  >
                    <i className="fas fa-eye mr-2"></i>
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Vista Lista (Tabla) */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Período</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Empleado</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Salario Bruto</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Deducciones</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Salario Neto</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Fecha Pago</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Acción</th>
                </tr>
              </thead>
              <tbody>
                {payrollSlips.map((slip) => (
                  <tr key={slip.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-[#0066CC] rounded-full flex items-center justify-center text-white">
                          <i className="fas fa-file-invoice-dollar text-sm"></i>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{slip.month} {slip.year}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{slip.period}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-800 dark:text-white">{slip.employee_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{slip.employee_department}</p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-green-600">
                        RD${slip.gross_salary.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-red-500">
                        -RD${slip.total_deductions.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-primary text-lg">
                        RD${slip.net_salary.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(slip.payment_date).toLocaleDateString('es-DO')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleViewSlip(slip)}
                        className="bg-[#0066CC] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0052A3] transition text-sm"
                      >
                        <i className="fas fa-eye mr-1"></i>
                        Ver
                      </button>
                      <button
                        onClick={() => generatePayrollPDF(slip)}
                        className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition"
                        title="Descargar PDF"
                      >
                        <i className="fas fa-file-pdf text-lg"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal con vista profesional del volante */}
      {showDetails && selectedSlip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header del modal */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between print:hidden">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Volante de Pago</h2>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition"
                >
                  <i className="fas fa-print mr-2"></i>
                  Imprimir
                </button>
                <button
                  onClick={() => generatePayrollPDF(selectedSlip)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <i className="fas fa-file-pdf mr-2"></i>
                  Descargar PDF
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>
            </div>

            {/* Documento del volante - Vista profesional */}
            <div className="p-8 bg-white" id="payslip-document">
              {/* Encabezado de la empresa */}
              <div className="border-b-4 border-primary pb-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-black text-gray-800">MIDAS</h1>
                    <p className="text-sm text-gray-600">Intranet Corporativa</p>
                    <p className="text-sm text-gray-600">RNC: 000-0000000-0</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Volante de Pago</p>
                    <p className="text-lg font-bold text-gray-800">{selectedSlip.period}</p>
                  </div>
                </div>
              </div>

              {/* Información del empleado */}
              <div className="bg-gradient-to-r from-primary/10 to-[#0066CC]/10 rounded-lg p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase">Datos del Empleado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Nombre</p>
                    <p className="font-semibold text-gray-800">{selectedSlip.employee_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Posición</p>
                    <p className="font-semibold text-gray-800">{selectedSlip.employee_position}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Departamento</p>
                    <p className="font-semibold text-gray-800">{selectedSlip.employee_department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fecha de Pago</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(selectedSlip.payment_date).toLocaleDateString('es-DO')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Desglose de pago */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Ingresos */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center border-b pb-2">
                    <i className="fas fa-plus-circle text-green-500 mr-2"></i>
                    INGRESOS
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Salario Base</span>
                      <span className="font-semibold">RD${selectedSlip.base_salary.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bonificaciones</span>
                      <span className="font-semibold">RD${selectedSlip.bonuses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Horas Extras</span>
                      <span className="font-semibold">RD${selectedSlip.overtime.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t-2 border-green-500">
                      <span className="font-bold text-gray-800">TOTAL INGRESOS</span>
                      <span className="font-bold text-green-600">RD${selectedSlip.gross_salary.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Deducciones */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center border-b pb-2">
                    <i className="fas fa-minus-circle text-red-500 mr-2"></i>
                    DEDUCCIONES
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">AFP (7.10%)</span>
                      <span className="font-semibold">RD${selectedSlip.afp.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">SFS (3.04%)</span>
                      <span className="font-semibold">RD${selectedSlip.sfs.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ISR</span>
                      <span className="font-semibold">RD${selectedSlip.isr.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Otras Deducciones</span>
                      <span className="font-semibold">RD${selectedSlip.other_deductions.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t-2 border-red-500">
                      <span className="font-bold text-gray-800">TOTAL DEDUCCIONES</span>
                      <span className="font-bold text-red-600">RD${selectedSlip.total_deductions.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salario neto destacado */}
              <div className="bg-gradient-to-r from-primary to-[#0066CC] rounded-xl p-6 text-white text-center mb-6">
                <p className="text-sm opacity-90 mb-2">SALARIO NETO A RECIBIR</p>
                <p className="text-5xl font-black">RD${selectedSlip.net_salary.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                <p className="text-sm opacity-90 mt-2">Método de pago: {selectedSlip.payment_method}</p>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
                <p>Este documento es un comprobante de pago. Guárdelo para sus registros.</p>
                <p className="mt-1">Generado el {new Date().toLocaleDateString('es-DO')} - Sistema MIDAS Intranet</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payslip-document,
          #payslip-document * {
            visibility: visible;
          }
          #payslip-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Payroll;
