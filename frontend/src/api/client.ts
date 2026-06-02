import axios from 'axios';
import type { AppState } from '../types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'mock-dev-token') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function fetchAppState(): Promise<Partial<AppState>> {
  const token = localStorage.getItem('token');
  if (token === 'mock-dev-token') {
    throw new Error('mock mode');
  }

  const [companies, processes, rknNotifications, journalEntries, monitorEvents, documents] = await Promise.all([
    api.get('/companies'),
    api.get('/processes'),
    api.get('/rkn'),
    api.get('/journal'),
    api.get('/monitor'),
    api.get('/documents?companyId=1'),
  ]);

  const responsibles = [];
  for (const c of companies.data) {
    const { data: resp } = await api.get(`/companies/${c.id}/responsible`);
    if (resp) responsibles.push(resp);
  }

  return {
    companies: companies.data,
    responsibles,
    processes: processes.data,
    rknNotifications: rknNotifications.data,
    journalEntries: journalEntries.data,
    monitorEvents: monitorEvents.data,
    documents: documents.data,
    nextId: 1000,
  };
}

export const apiActions = {
  updateCompany: (id: number, data: object) => api.put(`/companies/${id}`, data),
  updateResponsible: (companyId: number, data: object) => api.put(`/companies/${companyId}/responsible`, data),
  addProcess: (companyId: number, name?: string) => api.post('/processes', { companyId, name }),
  updateProcessSection: (processId: number, section: number, status: string, data: object) =>
    api.put(`/processes/${processId}/sections/${section}`, { status, data }),
  updateProcess: (id: number, data: object) => api.put(`/processes/${id}`, data),
  addJournal: (formData: FormData) =>
    api.post('/journal', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateJournal: (id: number, data: object) => api.put(`/journal/${id}`, data),
  uploadJournalAnswerFile: (id: number, formData: FormData) =>
    api.post(`/journal/${id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  markRead: (id: number) => api.put(`/monitor/${id}/read`),
  getAuditLog: (params?: { limit?: number; entityType?: string }) => api.get('/audit', { params }),
};
