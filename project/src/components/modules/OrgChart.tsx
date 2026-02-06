import { useState, useEffect } from 'react';
import { User } from '../../types';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

interface OrgChartProps {
    user: User;
}

interface EmployeeNode {
    id: number | string;
    name: string;
    position: string;
    department: string;
    avatar: string;
    email?: string;
    phone?: string;
    ext?: string;
    children?: EmployeeNode[];
    isDepartment?: boolean;
}

interface Department {
    id: string;
    name: string;
    manager_id: string | number | null;
}

function OrgChart({ user }: OrgChartProps) {
    const [tree, setTree] = useState<EmployeeNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeNode | null>(null);

    useEffect(() => {
        fetchOrgData();
    }, []);

    const fetchOrgData = async () => {
        try {
            setLoading(true);
            const [employeesRes, departmentsRes] = await Promise.all([
                api.get('/employees'),
                api.get('/departments')
            ]);

            const employees = employeesRes.data;
            const departments: Department[] = departmentsRes.data;

            const root: EmployeeNode = {
                id: 'root',
                name: 'MIDAS Intranet',
                position: 'Corporativo',
                department: '',
                avatar: 'https://ui-avatars.com/api/?name=MIDAS+Intranet&background=0D8ABC&color=fff',
                children: []
            };

            departments.forEach(dept => {
                const manager = employees.find((e: any) =>
                    e.user_id == dept.manager_id || (dept.manager_id && e.user_id === parseInt(dept.manager_id.toString()))
                );

                let deptNode: EmployeeNode;

                if (manager) {
                    deptNode = {
                        id: manager.id,
                        name: manager.name,
                        position: manager.position || 'Gerente',
                        department: dept.name,
                        avatar: manager.avatar || '',
                        email: manager.email || '',
                        phone: manager.phone || '',
                        ext: manager.ext || '',
                        children: []
                    };
                } else {
                    deptNode = {
                        id: dept.id,
                        name: dept.name,
                        position: 'Departamento',
                        department: dept.name,
                        avatar: `https://ui-avatars.com/api/?name=${dept.name}&background=random`,
                        isDepartment: true,
                        children: []
                    };
                }

                const deptEmployees = employees.filter((e: any) =>
                    e.department === dept.name &&
                    e.id !== (manager ? manager.id : -1)
                );

                deptNode.children = deptEmployees.map((e: any) => ({
                    id: e.id,
                    name: e.name,
                    position: e.position,
                    department: e.department,
                    avatar: e.avatar,
                    email: e.email || '',
                    phone: e.phone || '',
                    ext: e.ext || '',
                    children: []
                }));

                root.children?.push(deptNode);
            });

            setTree(root);
        } catch (error) {
            console.error('Error loading org chart:', error);
            showToast('Error cargando organigrama', 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderNode = (node: EmployeeNode, isRoot = false) => {
        const isCurrentUser = !node.isDepartment && node.name === user.name;

        return (
            <div key={node.id} className={`flex flex-col items-center ${!isRoot ? 'mt-12' : ''}`}>
                <div
                    onClick={() => !node.isDepartment && setSelectedEmployee(node)}
                    className={`
                        relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 
                        ${isCurrentUser ? 'border-primary shadow-primary/30' : 'border-gray-200 dark:border-gray-700'}
                        ${!node.isDepartment ? 'hover:shadow-2xl hover:scale-105 cursor-pointer' : ''}
                        transition-all duration-300 min-w-[280px]
                    `}
                >
                    {isCurrentUser && (
                        <div className="absolute -top-3 -right-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            Tú
                        </div>
                    )}
                    <div className="flex flex-col items-center space-y-3">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-700 shadow-md">
                            <img
                                src={node.avatar || `https://ui-avatars.com/api/?name=${node.name}&background=random`}
                                alt={node.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">{node.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{node.position}</p>
                            <p className="text-xs text-primary font-semibold mt-1">{node.department}</p>
                        </div>
                        {!node.isDepartment && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmployee(node);
                                }}
                                className="text-xs text-primary hover:text-[#009640] font-semibold flex items-center"
                            >
                                <i className="fas fa-info-circle mr-1"></i>
                                Ver detalles
                            </button>
                        )}
                    </div>
                </div>

                {node.children && node.children.length > 0 && (
                    <div className="relative mt-8">
                        <div className="absolute top-0 left-1/2 w-px h-8 bg-gray-300 dark:bg-gray-600 -translate-x-1/2"></div>
                        <div className="flex gap-8 pt-8">
                            {node.children.map((child, idx) => (
                                <div key={child.id} className="relative">
                                    {idx === 0 && node.children!.length > 1 && (
                                        <div className="absolute top-0 left-1/2 w-full h-px bg-gray-300 dark:bg-gray-600"></div>
                                    )}
                                    <div className="absolute top-0 left-1/2 w-px h-8 bg-gray-300 dark:bg-gray-600 -translate-x-1/2"></div>
                                    {renderNode(child)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-sitemap text-primary mr-3"></i>
                        Organigrama Corporativo
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Estructura organizacional de MIDAS</p>
                </div>
                <button
                    onClick={fetchOrgData}
                    className="bg-white dark:bg-gray-800 px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all text-primary border border-gray-100 dark:border-gray-700 font-semibold"
                >
                    <i className="fas fa-sync-alt mr-2"></i>
                    Actualizar
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto p-8">
                {tree && renderNode(tree, true)}
            </div>

            {/* Employee Detail Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md scale-in">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Información del Empleado</h3>
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow-lg mb-4">
                                    <img
                                        src={selectedEmployee.avatar || `https://ui-avatars.com/api/?name=${selectedEmployee.name}&background=random`}
                                        alt={selectedEmployee.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedEmployee.name}</h2>
                                <p className="text-gray-600 dark:text-gray-400">{selectedEmployee.position}</p>
                                <span className="inline-block mt-2 px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                                    {selectedEmployee.department}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {selectedEmployee.email && (
                                    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <i className="fas fa-envelope text-primary"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                            <a href={`mailto:${selectedEmployee.email}`} className="text-sm font-semibold text-gray-800 dark:text-white hover:text-primary">
                                                {selectedEmployee.email}
                                            </a>
                                        </div>
                                    </div>
                                )}
                                {selectedEmployee.phone && (
                                    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <i className="fas fa-phone text-primary"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                                            <a href={`tel:${selectedEmployee.phone}`} className="text-sm font-semibold text-gray-800 dark:text-white hover:text-primary">
                                                {selectedEmployee.phone}
                                            </a>
                                        </div>
                                    </div>
                                )}
                                {selectedEmployee.ext && (
                                    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <i className="fas fa-hashtag text-primary"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Extensión</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedEmployee.ext}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <a
                                    href={`mailto:${selectedEmployee.email}`}
                                    className="flex-1 bg-primary text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#009640] transition text-center"
                                >
                                    <i className="fas fa-envelope mr-2"></i>
                                    Enviar Email
                                </a>
                                {selectedEmployee.phone && (
                                    <a
                                        href={`tel:${selectedEmployee.phone}`}
                                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition text-center"
                                    >
                                        <i className="fas fa-phone mr-2"></i>
                                        Llamar
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OrgChart;
