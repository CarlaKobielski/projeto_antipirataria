import axios from 'axios';
import { useAuthStore } from '../store/auth';

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const { refreshToken, logout, login } = useAuthStore.getState();

            if (refreshToken && !error.config._retry) {
                error.config._retry = true;
                try {
                    const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
                    login(
                        useAuthStore.getState().user!,
                        data.data.accessToken,
                        data.data.refreshToken
                    );
                    error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
                    return api(error.config);
                } catch {
                    logout();
                }
            } else {
                logout();
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    logout: (refreshToken: string) =>
        api.post('/auth/logout', { refreshToken }),
};

// Detections API
export const detectionsApi = {
    getAll: (params?: { page?: number; status?: string; minScore?: number }) =>
        api.get('/detections', { params }),
    getById: (id: string) => api.get(`/detections/${id}`),
    updateStatus: (id: string, status: string) =>
        api.patch(`/detections/${id}/status`, { status }),
    getStats: () => api.get('/detections/stats'),
};

// Cases API
export const casesApi = {
    getAll: (params?: { page?: number; status?: string }) =>
        api.get('/cases', { params }),
    getById: (id: string) => api.get(`/cases/${id}`),
    updateStatus: (id: string, status: string, notes?: string) =>
        api.patch(`/cases/${id}/status`, { status, notes }),
    assignAnalyst: (id: string, analystId: string) =>
        api.patch(`/cases/${id}/assign`, { analystId }),
    getStats: () => api.get('/cases/stats'),
};

// Takedowns API
export const takedownsApi = {
    getAll: (params?: { page?: number; status?: string }) =>
        api.get('/takedowns', { params }),
    getById: (id: string) => api.get(`/takedowns/${id}`),
    create: (caseId: string, platform: string, templateId: string) =>
        api.post('/takedowns', { caseId, platform, templateId }),
    retry: (id: string) => api.post(`/takedowns/${id}/retry`),
    getTemplates: (platform?: string) =>
        api.get('/takedowns/templates', { params: { platform } }),
};

// Reports API
export const reportsApi = {
    getDashboard: () => api.get('/reports/dashboard'),
    getTrend: (days?: number) => api.get('/reports/trend', { params: { days } }),
};

export default api;
