import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Header from './dashboard/Header';
import Sidebar from './dashboard/Sidebar';
import Footer from './common/Footer';
import Home from './modules/Home';
import News from './modules/News';
import Requests from './modules/Requests';
import Payroll from './modules/Payroll';
import Directory from './modules/Directory';
import Attendance from './modules/Attendance';
import HelpDesk from './modules/HelpDesk';
import Policies from './modules/Policies';
import Admin from './modules/Admin';
import AdminUsers from './modules/AdminUsers';
import AdminNews from './modules/AdminNews';
import AdminDocuments from './modules/AdminDocuments';
import AdminDepartments from './modules/AdminDepartments';
import AdminRoles from './modules/AdminRoles';
import AdminConfig from './modules/AdminConfig';
import AdminPayroll from './modules/AdminPayroll';
import Analytics from './modules/Analytics';
import Profile from './modules/Profile';
import Supervision from './modules/Supervision';
import AdminMatrix from './modules/AdminMatrix';
import AdminBackup from './modules/AdminBackup';
import Calendar from './modules/Calendar';
import OrgChart from './modules/OrgChart';
import NotFound from './NotFound';
import PurchaseRequestList from './PurchaseRequestList';
import PurchaseRequestForm from './PurchaseRequestForm';
import PurchaseRequestDetail from './PurchaseRequestDetail';
import GeneratePurchaseOrder from './GeneratePurchaseOrder';
import PurchaseDashboard from './PurchaseDashboard';
import PurchaseReports from './PurchaseReports';
import PurchaseOrderList from './PurchaseOrderList';
import AdminAuditLog from './modules/AdminAuditLog';
import BudgetPlanning from './modules/BudgetPlanning';
import { User, Module } from '../types';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

import { useHasPermission } from '../hooks/useHasPermission';

function Dashboard({ user, onLogout, onUpdateUser }: DashboardProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useHasPermission(user);

  const getActiveModuleFromPath = (pathname: string): Module => {
    const path = pathname.split('/')[1] || 'home';
    const validModules: Module[] = [
      'home', 'news', 'requests', 'payroll', 'directory', 'attendance',
      'helpdesk', 'policies', 'admin', 'admin-users', 'analytics',
      'profile', 'calendar', 'org-chart', 'budget-planning', 'purchases', 'purchase-orders',
      'purchase-dashboard', 'purchase-reports'
    ];
    if (validModules.includes(path as Module)) {
      return path as Module;
    }
    return 'home';
  };

  const activeModule = getActiveModuleFromPath(location.pathname);

  const handleNavigate = (module: Module) => {
    if (module === 'home') navigate('/');
    else navigate(`/${module}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Header
        user={user}
        onLogout={onLogout}
        onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onNavigate={handleNavigate}
      />

      <div className="flex pt-16 flex-1">
        <Sidebar
          user={user}
          activeModule={activeModule}
          onModuleChange={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className={`flex-1 transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} outline-none`}
        >
          <div className="p-4 lg:p-6 fade-in flex-1">
            <Routes>
              <Route path="/" element={<Home user={user} onNavigate={handleNavigate} />} />
              <Route path="/home" element={<Home user={user} onNavigate={handleNavigate} />} />
              <Route path="/news" element={<News user={user} />} />
              <Route path="/calendar" element={<Calendar user={user} />} />
              <Route path="/org-chart" element={<OrgChart user={user} />} />
              <Route path="/requests" element={<Requests user={user} />} />

              {/* Budget Planning (New Module) */}
              <Route path="/budget-planning" element={<BudgetPlanning user={user} />} />

              {/* Purchase Module Routes */}
              <Route path="/purchases" element={<PurchaseRequestList />} />
              <Route path="/purchases/new" element={<PurchaseRequestForm />} />
              <Route path="/purchases/:id" element={<PurchaseRequestDetail />} />
              <Route path="/purchases/:requestId/generate-order" element={<GeneratePurchaseOrder />} />
              <Route path="/purchase-dashboard" element={<PurchaseDashboard />} />
              <Route path="/purchase-reports" element={<PurchaseReports />} />
              <Route path="/purchase-orders" element={<PurchaseOrderList />} />


              {/* Rutas protegidas por Permisos */}
              <Route path="/payroll" element={hasPermission('view_payroll') ? <Payroll user={user} /> : <Navigate to="/" />} />
              <Route path="/directory" element={hasPermission('view_directory') ? <Directory user={user} /> : <Navigate to="/" />} />
              <Route path="/attendance" element={hasPermission('view_attendance') ? <Attendance user={user} /> : <Navigate to="/" />} />
              <Route path="/helpdesk" element={hasPermission('view_helpdesk') ? <HelpDesk user={user} /> : <Navigate to="/" />} />
              <Route path="/policies" element={hasPermission('view_policies') ? <Policies user={user} /> : <Navigate to="/" />} />

              {/* Rutas Administrativas */}
              <Route path="/admin" element={hasPermission('admin_users') ? <Admin user={user} /> : <Navigate to="/" />} />
              <Route path="/admin-users" element={hasPermission('admin_users') ? <AdminUsers user={user} /> : <Navigate to="/" />} />
              <Route path="/admin-matrix" element={hasPermission('admin_users') ? <AdminMatrix user={user} /> : <Navigate to="/" />} />
              <Route path="/supervision" element={hasPermission('admin_users') ? <Supervision user={user} /> : <Navigate to="/" />} />
              <Route path="/admin-audit" element={hasPermission('admin_users') ? <AdminAuditLog user={user} /> : <Navigate to="/" />} />
              <Route path="/admin-news" element={hasPermission('manage_news') ? <AdminNews user={user} /> : <Navigate to="/" />} />
              <Route path="/admin-documents" element={hasPermission('manage_policies') ? <AdminDocuments user={user} /> : <Navigate to="/" />} />
              <Route path="/admin-departments" element={hasPermission('admin_users') ? <AdminDepartments user={user} /> : <Navigate to="/" />} />
              <Route path="/admin-roles" element={hasPermission('admin_roles') ? <AdminRoles /> : <Navigate to="/" />} />
              <Route path="/admin-config" element={hasPermission('admin_users') ? <AdminConfig user={user} /> : <Navigate to="/" />} />
              <Route path="/admin-payroll" element={hasPermission('manage_payroll') ? <AdminPayroll user={user} /> : <Navigate to="/" />} />
              <Route path="/analytics" element={hasPermission('view_analytics') ? <Analytics user={user} /> : <Navigate to="/" />} />
              <Route path="/admin-backup" element={hasPermission('admin_users') ? <AdminBackup user={user} /> : <Navigate to="/" />} />

              <Route path="/profile" element={<Profile user={user} onUpdateUser={onUpdateUser} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
