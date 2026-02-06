import { User, Module } from '../../types';
import { useHasPermission } from '../../hooks/useHasPermission';

interface SidebarProps {
  user: User;
  activeModule: Module;
  onModuleChange: (module: Module) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface MenuItem {
  id: Module;
  label: string;
  icon: string;
  badge?: number;
  roles?: User['role'][];
  adminOnly?: boolean;
  permission?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Dashboard',
    icon: 'fa-home',
  },
  {
    id: 'news',
    label: 'Noticias',
    icon: 'fa-newspaper',
    permission: 'view_news'
  },
  {
    id: 'purchases' as Module,
    label: 'Solicitudes de Compra',
    icon: 'fa-shopping-cart',
    permission: 'view_own_requests'
  },
  {
    id: 'purchase-orders' as Module,
    label: 'Órdenes de Compra',
    icon: 'fa-file-invoice-dollar',
    permission: 'purchase.order.view'
  },
  {
    id: 'purchase-dashboard' as Module,
    label: 'Dashboard Compras',
    icon: 'fa-chart-pie',
    permission: 'view_analytics'
  },
  {
    id: 'purchase-reports' as Module,
    label: 'Reportes Compras',
    icon: 'fa-file-alt',
    permission: 'view_analytics'
  },
  {
    id: 'payroll',
    label: 'Volantes de Pago',
    icon: 'fa-money-bill-wave',
    permission: 'view_payroll'
  },
  {
    id: 'directory',
    label: 'Directorio',
    icon: 'fa-users',
    permission: 'view_directory'
  },
  {
    id: 'attendance',
    label: 'Asistencia',
    icon: 'fa-clock',
    permission: 'view_attendance'
  },
  {
    id: 'calendar' as Module,
    label: 'Calendario',
    icon: 'fa-calendar-alt',
    permission: 'view_directory'
  },
  {
    id: 'org-chart' as Module,
    label: 'Organigrama',
    icon: 'fa-sitemap',
    permission: 'view_directory'
  },
  {
    id: 'helpdesk',
    label: 'Mesa de Ayuda IT',
    icon: 'fa-headset',
    permission: 'view_helpdesk'
  },
  {
    id: 'policies',
    label: 'Políticas',
    icon: 'fa-folder-open',
    permission: 'view_policies'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'fa-chart-line',
    permission: 'view_analytics'
  },
  {
    id: 'admin-users' as Module,
    label: 'Gestión Usuarios',
    icon: 'fa-users-cog',
    permission: 'admin_users'
  },
  {
    id: 'admin-matrix' as Module,
    label: 'Matriz de Aprobación',
    icon: 'fa-project-diagram',
    permission: 'admin_users'
  },
  {
    id: 'supervision' as Module,
    label: 'Torre de Supervisión',
    icon: 'fa-eye',
    permission: 'admin_users'
  },
  {
    id: 'admin-audit' as Module,
    label: 'Log de Auditoría',
    icon: 'fa-shield-alt',
    permission: 'admin_users'
  },
  {
    id: 'admin',
    label: 'Herramientas Admin',
    icon: 'fa-tools',
    permission: 'admin_users'
  },
  {
    id: 'budget-planning' as Module,
    label: 'Presupuesto',
    icon: 'fa-wallet',
    permission: 'project.planning.view'
  },
];


function Sidebar({
  user,
  activeModule,
  onModuleChange,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const { hasPermission } = useHasPermission(user);

  const handleModuleChange = (module: Module) => {
    onModuleChange(module);
    onMobileClose();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-[#F3F4F6] dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <div className="flex-1 overflow-y-auto py-6 scrollbar-thin">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            // Check if user has access to this menu item
            if (item.permission && !hasPermission(item.permission)) return null;

            return (
              <button
                key={item.id}
                onClick={() => handleModuleChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeModule === item.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                  } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <i className={`fas ${item.icon} text-lg`}></i>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="bg-[#EF4444] text-white text-xs font-bold rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-gray-300 dark:border-gray-800 p-4">
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-full items-center justify-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition"
        >
          <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'}`}></i>
          {!collapsed && <span className="text-sm font-medium">Contraer</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileClose}
        ></div>
      )}

      <aside
        role="navigation"
        aria-label="Navegación principal"
        className={`fixed top-16 bottom-0 left-0 z-40 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'
          } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default Sidebar;
