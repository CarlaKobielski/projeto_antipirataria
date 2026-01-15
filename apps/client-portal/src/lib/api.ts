import axios from 'axios';
import { useAuthStore } from '../store/auth';

// Construct base URL: if VITE_API_URL is just a host, prepend https://
const baseURL = import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL.startsWith('http')
        ? import.meta.env.VITE_API_URL
        : `https://${import.meta.env.VITE_API_URL}`)
    : '/api/v1';

const api = axios.create({ baseURL: baseURL.endsWith('/api/v1') ? baseURL : `${baseURL}/api/v1`, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (email: string, password: string) => api.post('/auth/login', { email, password }),
    logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

export const worksApi = {
    getAll: (params?: { page?: number; search?: string }) => api.get('/works', { params }),
    getById: (id: string) => api.get(`/works/${id}`),
    create: (data: { title: string; author?: string; isbn?: string; excerpt?: string; keywords?: string[] }) => api.post('/works', data),
    update: (id: string, data: any) => api.patch(`/works/${id}`, data),
    delete: (id: string) => api.delete(`/works/${id}`),
    getStats: () => api.get('/works/stats'),
};

export const detectionsApi = {
    getAll: (params?: { page?: number; status?: string; workId?: string }) => api.get('/detections', { params }),
    getStats: () => api.get('/detections/stats'),
};

export const reportsApi = {
    getDashboard: () => api.get('/reports/dashboard'),
    getTrend: (days?: number) => api.get('/reports/trend', { params: { days } }),
    exportCSV: (type: string) => api.get(`/reports/export?type=${type}`, { responseType: 'blob' }),
};

export const billingApi = {
    getPlans: () => api.get('/plans'),
    getSubscription: () => api.get('/subscriptions/me'),
    createSubscription: (planId: string) => api.post('/subscriptions', { planId }),
    changePlan: (planId: string) => api.patch('/subscriptions/me', { planId }),
    cancelSubscription: () => api.delete('/subscriptions/me'),
    reactivateSubscription: () => api.post('/subscriptions/me/reactivate'),
    getPortalSession: (returnUrl: string) => api.post('/billing/portal-session', { returnUrl }),
    getInvoices: () => api.get('/billing/invoices'),
};

export default api;
