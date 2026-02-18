/**
 * ============================================
 * MIDAS INTRANET - Enterprise API Client
 * ============================================
 * Axios instance with:
 * - Automatic token refresh with rotation
 * - Request queuing during refresh
 * - Secure token storage
 * - Error handling
 */

import axios from 'axios';

const host = typeof window !== 'undefined' ? window.location.hostname : '172.16.45.2';
export const BASE_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    : `http://${host}:3001`;

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || `${BASE_URL}/api`,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// =============================================
// TOKEN MANAGEMENT
// =============================================
const TokenService = {
    getAccessToken: () => localStorage.getItem('accessToken'),
    getRefreshToken: () => localStorage.getItem('refreshToken'),

    setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    },

    clearTokens: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('midas_user');
    },

    isTokenExpired: (token: string): boolean => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // Add 10 second buffer
            return payload.exp * 1000 < Date.now() + 10000;
        } catch {
            return true;
        }
    }
};

// =============================================
// REQUEST INTERCEPTOR - Add token
// =============================================
api.interceptors.request.use((config) => {
    const token = TokenService.getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// =============================================
// RESPONSE INTERCEPTOR - Auto-refresh
// =============================================
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (except for login/refresh endpoints)
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest.url?.includes('/auth/refresh')
        ) {
            if (isRefreshing) {
                // Queue this request until refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = TokenService.getRefreshToken();

            if (!refreshToken) {
                TokenService.clearTokens();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                const response = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    { refreshToken }
                );

                const { accessToken, refreshToken: newRefreshToken } = response.data;

                TokenService.setTokens(accessToken, newRefreshToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

                processQueue(null, accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                TokenService.clearTokens();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Handle other errors
        return Promise.reject(error);
    }
);

// =============================================
// API SERVICE METHODS
// =============================================
const apiService = {
    // Auth
    login: (username: string, password: string) =>
        api.post('/auth/login', { username, password }),

    logout: () => api.post('/auth/logout'),

    getMe: () => api.get('/auth/me'),

    // Requests
    getAllRequests: () => api.get('/requests'),
    getRequestsByUser: (userId: string) => api.get(`/requests/user/${userId}`),
    getRequestItems: (requestId: string) => api.get(`/requests/${requestId}/items`),
    createRequest: (data: unknown) => api.post('/requests', data),
    updateRequestStatus: (id: string, status: string, comment?: string) =>
        api.patch(`/requests/${id}/status`, { status, comment }),
    deleteRequest: (id: string) => api.delete(`/requests/${id}`),

    // Notifications
    getNotifications: () => api.get('/notifications'),
    markNotificationRead: (id: number) => api.put(`/notifications/${id}/read`),
    markAllNotificationsRead: () => api.put('/notifications/read-all'),

    // Analytics
    getStats: () => api.get('/analytics/stats'),

    // Backoffice Supervision
    getBottlenecks: () => api.get('/supervision/bottlenecks'),
    forceOverride: (id: string, data: { reason: string; target_status: string }) =>
        api.post(`/supervision/force-override/${id}`, data),
    getAuditHistory: () => api.get('/supervision/audit-history'),
    getBudgetDashboard: () => api.get('/budget/dashboard'),

    // Backoffice Configuration
    getRules: () => api.get('/backoffice/rules'),
    createRule: (data: unknown) => api.post('/backoffice/rules', data),

    getWorkflows: () => api.get('/backoffice/workflows'),
    createWorkflow: (data: unknown) => api.post('/backoffice/workflows', data),
    getWorkflowSteps: (workflowId: string) => api.get(`/backoffice/workflows/steps/${workflowId}`),
    createWorkflowStep: (data: unknown) => api.post('/backoffice/workflows/steps', data),

    getMatrix: () => api.get('/backoffice/matrix'),
    createMatrixRule: (data: unknown) => api.post('/backoffice/matrix', data),
    updateMatrixRule: (id: number, data: unknown) => api.put(`/backoffice/matrix/${id}`, data),
    deleteMatrixRule: (id: number) => api.delete(`/backoffice/matrix/${id}`),

    getApprovalLevels: () => api.get('/backoffice/levels'),
    createApprovalLevel: (data: unknown) => api.post('/backoffice/levels', data),
    updateApprovalLevel: (id: number, data: unknown) => api.put(`/backoffice/levels/${id}`, data),
    deleteApprovalLevel: (id: number) => api.delete(`/backoffice/levels/${id}`),

    getBudgetsBalances: () => api.get('/backoffice/budgets'),
    getCostCenters: () => api.get('/backoffice/cost-centers'),
    createBudget: (data: unknown) => api.post('/backoffice/budgets', data),
    updateBudget: (id: number, data: unknown) => api.put(`/backoffice/budgets/${id}`, data),
    deleteBudget: (id: number) => api.delete(`/backoffice/budgets/${id}`),
    createCostCenter: (data: unknown) => api.post('/backoffice/cost-centers', data),
    updateCostCenter: (id: number, data: unknown) => api.put(`/backoffice/cost-centers/${id}`, data),
    deleteCostCenter: (id: number) => api.delete(`/backoffice/cost-centers/${id}`),

    // Project Planning (New Budget Module)
    listProjects: (filters?: any) => api.get('/budget/projects', { params: filters }),
    getProjectById: (id: number) => api.get(`/budget/projects/${id}`),
    createProject: (data: any) => api.post('/budget/projects', data),
    updateProject: (id: number, data: any) => api.put(`/budget/projects/${id}`, data),
    submitProject: (id: number) => api.post(`/budget/projects/${id}/submit`),
    approveProject: (id: number, notes?: string) => api.post(`/budget/projects/${id}/approve`, { notes }),
    rejectProject: (id: number, reason: string) => api.post(`/budget/projects/${id}/reject`, { reason }),
    deleteProject: (id: number) => api.delete(`/budget/projects/${id}`),
    duplicateProject: (id: number) => api.post(`/budget/projects/${id}/duplicate`),
    getPendingProjectApprovals: () => api.get('/budget/projects/pending-approvals'),
    getProjectSummary: (id: number) => api.get(`/budget/projects/${id}/summary`),
    getProjectPurchaseRequests: (id: number) => api.get(`/budget/projects/${id}/purchase-requests`),
    getAreaProjectDashboard: (areaId: number) => api.get(`/budget/projects/dashboard/${areaId}`),
    completeProject: (id: number, notes?: string) => api.post(`/budget/projects/${id}/complete`, { completion_notes: notes }),
    cancelProject: (id: number, reason: string) => api.post(`/budget/projects/${id}/cancel`, { cancellation_reason: reason }),

    // Configuration
    getConfig: () => api.get('/config'),
    updateConfig: (data: unknown) => api.put('/config', data),

    // Purchase Requests
    reassignRequest: (id: number, data: { newProjectId: number; justification: string }) => api.patch(`/purchase-requests/${id}/reassign-project`, data),

    // Attendance (Admin)
    updateAttendance: (id: string, data: unknown) => api.put(`/attendance/${id}`, data)
};

// Export TokenService for use in auth components
export { TokenService };

// Assign helper methods to the axios instance
Object.assign(api, apiService);

export default api as typeof api & typeof apiService;
