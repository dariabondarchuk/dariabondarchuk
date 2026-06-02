import axios from 'axios';
import type { SectionData } from '../types';
import type { PublicSurveyData } from './mockSurvey';
import {
  createMockInvite,
  getMockInvites,
  mockGetSurvey,
  mockSaveSection,
  mockSubmitSurvey,
} from './mockSurvey';
import api from './client';

const publicApi = axios.create({ baseURL: '/api/public' });

function hasMockInvite(token: string) {
  return !!getMockInvites()[token];
}

export async function fetchPublicSurvey(token: string): Promise<PublicSurveyData> {
  if (hasMockInvite(token)) {
    const data = mockGetSurvey(token);
    if (!data) throw new Error('Ссылка не найдена');
    if (data.submitted) throw new Error('SUBMITTED');
    return data;
  }
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
  if (hasMockInvite(token)) {
    mockSaveSection(token, section, data);
    return;
  }
  await publicApi.put(`/survey/${token}/sections/${section}`, { data });
}

export async function submitPublicSurvey(
  token: string,
  sections?: Record<number, { data: SectionData }>,
) {
  if (hasMockInvite(token)) {
    mockSubmitSurvey(token, sections);
    return;
  }
  await publicApi.post(`/survey/${token}/submit`, { sections });
}

export async function createProcessInvite(processId: number, email?: string, comment?: string) {
  if (localStorage.getItem('token') === 'mock-dev-token') {
    return createMockInvite(processId, email, comment);
  }
  const { data } = await api.post(`/processes/${processId}/invite`, { email, comment });
  return data as { token: string; url: string; process: unknown };
}
