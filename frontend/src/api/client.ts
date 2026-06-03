import axios from 'axios';
import type { AppState } from '../types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
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

function postFormData(url: string, formData: FormData) {
  return api.post(url, formData);
}

function putFormData(url: string, formData: FormData) {
  return api.put(url, formData);
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function fetchAppState(): Promise<Partial<AppState>> {
  const [companies, processes, rknNotifications, journalEntries, monitorEvents, documents] = await Promise.all([
    api.get('/companies'),
    api.get('/processes'),
    api.get('/rkn'),
    api.get('/journal'),
    api.get('/monitor'),
    api.get('/documents'),
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
  addProcess: (payload: { companyId?: number | null; name?: string; isCorporate?: boolean }) =>
    api.post('/processes', payload),
  addCorporateProcess: (name?: string) => api.post('/processes/corporate', { name }),
  prefillProcessFromAnkety: (processId: number) => api.post(`/processes/${processId}/prefill-from-ankety`),
  updateProcessSection: (processId: number, section: number, status: string, data: object) =>
    api.put(`/processes/${processId}/sections/${section}`, { status, data }),
  updateProcess: (id: number, data: object) => api.put(`/processes/${id}`, data),
  deleteProcess: (id: number) => api.delete(`/processes/${id}`),
  addJournal: (formData: FormData) => postFormData('/journal', formData),
  getJournalEntries: () => api.get('/journal'),
  updateJournal: (id: number, data: object) => api.put(`/journal/${id}`, data),
  uploadJournalFile: (id: number, formData: FormData) => postFormData(`/journal/${id}/files`, formData),
  downloadJournalFile: (id: number, kind: 'content' | 'answer') =>
    api.get(`/journal/${id}/files/${kind}/download`, { responseType: 'blob' }),
  downloadJournalArchive: (id: number) =>
    api.get(`/journal/${id}/archive`, { responseType: 'blob' }),
  deleteJournalFile: (id: number, kind: 'content' | 'answer') =>
    api.delete(`/journal/${id}/files/${kind}`),
  uploadJournalAdditionalFiles: (id: number, formData: FormData) =>
    postFormData(`/journal/${id}/additional-files`, formData),
  downloadJournalAdditionalFile: (id: number, index: number) =>
    api.get(`/journal/${id}/additional-files/${index}/download`, { responseType: 'blob' }),
  deleteJournalAdditionalFile: (id: number, index: number) =>
    api.delete(`/journal/${id}/additional-files/${index}`),
  replaceDocument: (id: number, formData: FormData) => putFormData(`/documents/${id}`, formData),
  downloadDocumentsArchive: (companyId: number, types?: string) =>
    api.get('/documents/archive', { responseType: 'blob', params: { companyId, types } }),
  getRknNotifications: () => api.get('/rkn'),
  createRknNotification: (companyId: number) =>
    api.post(`/companies/${companyId}/rkn-notification`),
  uploadRknDocument: (notificationId: number, formData: FormData) =>
    postFormData(`/rkn/${notificationId}/documents`, formData),
  downloadRknDocument: (notificationId: number, docId: number) =>
    api.get(`/rkn/${notificationId}/documents/${docId}/download`, { responseType: 'blob' }),
  downloadRknArchive: (notificationId: number) =>
    api.get(`/rkn/${notificationId}/documents/archive`, { responseType: 'blob' }),
  deleteRknDocument: (notificationId: number, docId: number) =>
    api.delete(`/rkn/${notificationId}/documents/${docId}`),
  markRead: (id: number) => api.put(`/monitor/${id}/read`),
  addMonitorEvent: (data: object) => api.post('/monitor', data),
  syncCompanyFromDadata: (id: number, query?: string) =>
    api.post<{ company: unknown; events: unknown[] }>(`/companies/${id}/sync-dadata`, { query, branch_type: 'MAIN' }),
  checkDadataChanges: () => api.post<{ checked: number; changed: number; events: unknown[]; companies: unknown[] }>(
    '/companies/check-dadata-changes',
  ),
  addCompanyFromDadata: (query: string) => api.post('/companies/from-dadata', { query, branch_type: 'MAIN' }),
  deleteCompany: (id: number) => api.delete(`/companies/${id}`),
  addDocument: (formData: FormData) => postFormData('/documents', formData),
  deleteDocument: (id: number) => api.delete(`/documents/${id}`),
  downloadDocument: (id: number) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  getAuditLog: (params?: { limit?: number; offset?: number; entityType?: string }) =>
    api.get<{ total: number; items: unknown[] }>('/audit', { params }),
  getAuditEntityTypes: () => api.get<{ value: string; label: string }[]>('/audit/entity-types'),
};
