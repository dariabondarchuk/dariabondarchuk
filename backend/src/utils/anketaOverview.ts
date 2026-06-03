import { MAIN_ANKETA_NAMES } from './anketaTypes';

type AnketaTypeKey = keyof typeof MAIN_ANKETA_NAMES;
import { computeAnketaStatuses } from './anketaStatus';

export type AnketaDisplayStatus = 'filled' | 'not_filled' | 'partial';

export function toAnketaDisplayStatus(raw: string): AnketaDisplayStatus {
  if (raw === 'not_filled' || raw === 'sent') return 'not_filled';
  if (raw === 'filling') return 'partial';
  return 'filled';
}

interface InviteLike {
  anketaType: string;
  createdAt?: Date | string;
  submittedAt?: Date | string | null;
}

interface ProcessLike {
  anketaType?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface AnketaOverviewCompanyInput {
  createdAt?: Date | string;
  updatedAt?: Date | string;
  anketaMeta?: Record<string, { customName?: string }> | null;
  inn?: string;
  name?: string;
  phone?: string;
  email?: string;
  ceo?: string;
  ceoName?: string;
  legalAddress?: string;
  ogrn?: string;
  okved?: string;
  hasDirectories?: boolean;
  contactEmail?: string;
  sites?: unknown[];
  apps?: unknown[];
  offices?: unknown[];
}

function toTime(value: Date | string | undefined | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function formatIsoDate(value: Date | string | number | undefined | null): string | null {
  const t = typeof value === 'number' ? value : toTime(value);
  if (t == null) return null;
  return new Date(t).toISOString();
}

function resolveAnketaDates(
  type: string,
  rawStatus: string,
  invites: InviteLike[],
  processes: ProcessLike[],
  company: AnketaOverviewCompanyInput,
) {
  if (rawStatus === 'not_filled') {
    return { createdAt: null, updatedAt: null };
  }

  const stamps: number[] = [];
  for (const invite of invites.filter(i => i.anketaType === type)) {
    const c = toTime(invite.createdAt);
    const s = toTime(invite.submittedAt);
    if (c != null) stamps.push(c);
    if (s != null) stamps.push(s);
  }
  for (const proc of processes.filter(p => p.anketaType === type)) {
    const c = toTime(proc.createdAt);
    const u = toTime(proc.updatedAt);
    if (c != null) stamps.push(c);
    if (u != null) stamps.push(u);
  }
  const companyCreated = toTime(company.createdAt);
  const companyUpdated = toTime(company.updatedAt);
  if (companyCreated != null) stamps.push(companyCreated);
  if (companyUpdated != null) stamps.push(companyUpdated);

  if (!stamps.length) {
    return { createdAt: null, updatedAt: null };
  }

  return {
    createdAt: formatIsoDate(Math.min(...stamps)),
    updatedAt: formatIsoDate(Math.max(...stamps)),
  };
}

export interface AnketaOverviewItem {
  anketaType: AnketaTypeKey;
  name: string;
  rawStatus: string;
  displayStatus: AnketaDisplayStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export function buildAnketaOverview(
  companyId: number,
  company: AnketaOverviewCompanyInput,
  responsible: Parameters<typeof computeAnketaStatuses>[2],
  processes: Parameters<typeof computeAnketaStatuses>[3],
  invites: Parameters<typeof computeAnketaStatuses>[4],
): AnketaOverviewItem[] {
  const statuses = computeAnketaStatuses(
    companyId,
    company as Parameters<typeof computeAnketaStatuses>[1],
    responsible,
    processes,
    invites,
  );
  const meta = (company.anketaMeta ?? {}) as Record<string, { customName?: string }>;
  const types = Object.keys(MAIN_ANKETA_NAMES) as AnketaTypeKey[];

  return types.map(type => {
    const rawStatus = statuses[type] || 'not_filled';
    const displayStatus = toAnketaDisplayStatus(rawStatus);
    const dates = resolveAnketaDates(type, rawStatus, invites, processes, company);
    const defaultName = MAIN_ANKETA_NAMES[type];
    const customName = meta[type]?.customName?.trim();
    return {
      anketaType: type,
      name: customName || defaultName,
      rawStatus,
      displayStatus,
      createdAt: dates.createdAt,
      updatedAt: dates.updatedAt,
    };
  });
}
