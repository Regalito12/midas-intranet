export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  department: string;
  position: string;
  avatar: string;
  phone?: string;
  extension?: string;
  location?: string;
  joinDate?: string;
  supervisor?: string;
  department_id?: number;
}

export type NewsCategory = 'general' | 'rrhh' | 'it' | 'eventos' | 'logros';

export interface News {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: NewsCategory;
  image: string;
  author: string;
  date: string;
  attachments?: { name: string; url: string }[];
}

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  requester: string;
  requesterAvatar: string;
  department: string;
  type: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
  justification: string;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  status: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';
  date: string;
}

export interface PayrollSlip {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_position: string;
  employee_department: string;
  month: string;
  year: number;
  period: string;
  payment_date: string;
  base_salary: number;
  bonuses: number;
  overtime: number;
  gross_salary: number;
  afp: number;
  sfs: number;
  isr: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  payment_method: string;
  status: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  extension: string;
  position: string;
  department: string;
  location: string;
  avatar: string;
  joinDate: string;
  supervisor?: string;
  isOnline?: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  status: 'completo' | 'tardanza' | 'ausencia';
}

export type Module =
  | 'home'
  | 'news'
  | 'requests'
  | 'payroll'
  | 'directory'
  | 'attendance'
  | 'helpdesk'
  | 'policies'
  | 'admin'
  | 'admin-users'
  | 'analytics'
  | 'profile'
  | 'calendar'
  | 'org-chart'
  | 'budget-planning'
  | 'purchases'
  | 'purchase-orders'
  | 'purchase-dashboard'
  | 'purchase-reports';

export interface Ticket {
  id: string;
  ticketNumber: string;
  requester: string;
  requesterAvatar: string;
  category: string;
  subject: string;
  description: string;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  status: 'nuevo' | 'asignado' | 'en_proceso' | 'esperando' | 'resuelto' | 'cerrado';
  assignedTo?: string;
  assignedToAvatar?: string;
  createdAt: string;
  updatedAt: string;
  comments?: { author: string; text: string; date: string }[];
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'xls' | 'folder';
  category: string;
  version: string;
  size: string;
  lastUpdated: string;
  isNew: boolean;
  isFavorite: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location?: string;
}
