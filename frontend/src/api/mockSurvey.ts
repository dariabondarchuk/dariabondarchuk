import type { Process, SectionData } from '../types';
import { initialState } from '../store';

export interface PublicSurveyData {
  processName: string;
  companyName: string;
  comment?: string;
  email?: string;
  sections: Record<number, { status: string; data: SectionData }>;
  submitted?: boolean;
}

export interface MockInvite {
  token: string;
  processId: number;
  email?: string;
  comment?: string;
  createdAt: string;
  submittedAt?: string;
}

const INVITES_KEY = 'pdn_invites';
const CACHE_KEY = 'pdn_app_cache';

export function getMockInvites(): Record<string, MockInvite> {
  try {
    return JSON.parse(localStorage.getItem(INVITES_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveMockInvite(invite: MockInvite) {
  const all = getMockInvites();
  all[invite.token] = invite;
  localStorage.setItem(INVITES_KEY, JSON.stringify(all));
}

export function ensureMockCache(): Process[] {
  const cache = getMockAppCache();
  if (cache) return cache.processes;
  saveMockAppCache(initialState.processes);
  return initialState.processes;
}

export function getMockAppCache(): { processes: Process[] } | null {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveMockAppCache(processes: Process[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ processes }));
}

export function mockGetSurvey(token: string): PublicSurveyData | null {
  const invite = getMockInvites()[token];
  if (!invite) return null;
  if (invite.submittedAt) {
    return { processName: '', companyName: '', sections: {}, submitted: true };
  }
  const processes = ensureMockCache();
  const process = processes.find(p => p.id === invite.processId);
  if (!process) return null;
  return {
    processName: process.name,
    companyName: 'ПАО Самолёт',
    comment: invite.comment,
    email: invite.email,
    sections: process.sections,
  };
}

export function mockSaveSection(token: string, section: number, data: SectionData) {
  const invite = getMockInvites()[token];
  if (!invite) throw new Error('Invite not found');
  const processes = [...ensureMockCache()];
  const process = processes.find(p => p.id === invite.processId);
  if (!process) throw new Error('Process not found');
  process.sections[section] = { status: 'filling', data: { ...process.sections[section]?.data, ...data } };
  if (process.status === 'not_sent' || process.status === 'sent') process.status = 'filling';
  saveMockAppCache(processes);
}

export function mockSubmitSurvey(token: string, sections?: Record<number, { data: SectionData }>) {
  const invite = getMockInvites()[token];
  if (!invite) throw new Error('Invite not found');
  const processes = [...ensureMockCache()];
  const process = processes.find(p => p.id === invite.processId);
  if (!process) throw new Error('Process not found');

  if (sections) {
    for (const [num, payload] of Object.entries(sections)) {
      const n = Number(num);
      const hasData = payload.data && Object.keys(payload.data).length > 0;
      process.sections[n] = {
        status: hasData ? 'filled' : (process.sections[n]?.status || 'not_filled'),
        data: payload.data,
      };
    }
  }

  process.status = 'review';
  process.sentAt = new Date().toLocaleDateString('ru-RU');
  invite.submittedAt = new Date().toISOString();
  saveMockAppCache(processes);
  saveMockInvite(invite);
}

export function createMockInvite(processId: number, email?: string, comment?: string) {
  const token = crypto.randomUUID();
  saveMockInvite({ token, processId, email, comment, createdAt: new Date().toISOString() });

  const processes = [...ensureMockCache()];
  const process = processes.find(p => p.id === processId);
  if (process) {
    process.status = 'sent';
    process.sentTo = email || process.sentTo;
    process.sentAt = new Date().toLocaleDateString('ru-RU');
    saveMockAppCache(processes);
  }

  return { token, url: `${window.location.origin}/survey/${token}` };
}
