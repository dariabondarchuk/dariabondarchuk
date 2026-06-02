import axios from 'axios';
import type { SectionData } from '../types';
import api from './client';

export interface PublicSurveyData {
  processName: string;
  companyName: string;
  comment?: string;
  email?: string;
  sections: Record<number, { status: string; data: SectionData }>;
  submitted?: boolean;
}

const publicApi = axios.create({ baseURL: '/api/public' });

export async function fetchPublicSurvey(token: string): Promise<PublicSurveyData> {
  try {
    const { data } = await publicApi.get(`/survey/${token}`);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 410) {
      throw new Error('SUBMITTED');
    }
    const msg = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
    throw new Error(msg || 'Ссылка не найдена');
  }
}

export async function savePublicSection(token: string, section: number, data: SectionData) {
  await publicApi.put(`/survey/${token}/sections/${section}`, { data });
}

export async function submitPublicSurvey(
  token: string,
  sections?: Record<number, { data: SectionData }>,
) {
  await publicApi.post(`/survey/${token}/submit`, { sections });
}

export async function createProcessInvite(processId: number, email?: string, comment?: string) {
  const { data } = await api.post(`/processes/${processId}/invite`, { email, comment });
  return data as { token: string; url: string; process: unknown };
}
