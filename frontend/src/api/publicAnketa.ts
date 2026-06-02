import axios from 'axios';
import api from './client';
import type { CompanyDadataPatch } from './dadata';

const publicApi = axios.create({ baseURL: '/api/public' });

export async function sendAllAnketaInvitesEmail(
  companyId: number,
  tokens: string[],
  email: string,
) {
  const { data } = await api.post(`/companies/${companyId}/anketa-invite-all/send-email`, {
    tokens,
    email,
  });
  return data as { emailSent: boolean; email: string };
}

export async function createAllAnketaInvites(
  companyId: number,
  email?: string,
  comment?: string,
) {
  const { data } = await api.post(`/companies/${companyId}/anketa-invite-all`, {
    email,
    comment,
  });
  return data as {
    invites: { anketaType: string; token: string; url: string; name: string }[];
    emailSent: boolean;
    email: string | null;
  };
}

export async function createAnketaInvite(
  companyId: number,
  anketaType: string,
  email?: string,
  comment?: string,
) {
  const { data } = await api.post(`/companies/${companyId}/anketa-invite`, {
    anketaType,
    email,
    comment,
  });
  return data as { token: string; url: string; anketaType: string; emailSent: boolean; email: string | null };
}

export async function sendAnketaInviteEmail(companyId: number, token: string, email?: string) {
  const { data } = await api.post(`/companies/${companyId}/anketa-invite/${token}/send-email`, { email });
  return data as { emailSent: boolean; email: string; url: string };
}

export async function lookupPublicAnketaParty(token: string, query: string): Promise<CompanyDadataPatch> {
  const { data } = await publicApi.post<CompanyDadataPatch>(`/anketa/${token}/dadata/party`, {
    query,
    branch_type: 'MAIN',
  });
  return data;
}

export async function fetchPublicAnketa(token: string) {
  try {
    const { data } = await publicApi.get(`/anketa/${token}`);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 410) {
      throw new Error('SUBMITTED');
    }
    const msg = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
    throw new Error(msg || 'Ссылка не найдена');
  }
}

export async function savePublicAnketa(token: string, data: Record<string, unknown>) {
  await publicApi.put(`/anketa/${token}`, { data });
}

export async function submitPublicAnketa(token: string, data: Record<string, unknown>) {
  const { data: res } = await publicApi.post(`/anketa/${token}/submit`, { data });
  return res;
}

export async function verifyProcess(processId: number) {
  const { data } = await api.post(`/processes/${processId}/verify`);
  return { process: data };
}

export async function fetchAnketaStatuses(companyId: number) {
  const { data } = await api.get(`/companies/${companyId}/anketa-statuses`);
  return data as Record<string, string>;
}

export async function verifyCompanyAnketa(companyId: number, anketaType: string) {
  const { data } = await api.post(`/companies/${companyId}/anketa/${anketaType}/verify`);
  return data as { ok: boolean; status: string; processId: number };
}
