import { Prisma, ProcessStatus, SectionStatus } from '@prisma/client';
import { prisma } from './prisma';
import { computeAnketaStatuses } from './anketaStatus';
import { buildAnketaInvitePrefill } from './anketaInvitePrefill';
import { MAIN_ANKETA_NAMES } from './anketaTypes';
import { normalizeSitesAnketaData } from './sitesAnketa';
import { normalizeDepartmentsAnketaData } from './departmentsAnketa';

type AnketaTypeKey = keyof typeof MAIN_ANKETA_NAMES;

const ANKETA_TYPES = Object.keys(MAIN_ANKETA_NAMES) as AnketaTypeKey[];

export function isSectionDataEmpty(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return true;
  const obj = data as Record<string, unknown>;
  return Object.values(obj).every(v => {
    if (v == null || v === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    if (typeof v === 'boolean') return false;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) return true;
    return false;
  });
}

function sectionStatusForData(data: Record<string, unknown>): SectionStatus {
  return isSectionDataEmpty(data) ? SectionStatus.NOT_FILLED : SectionStatus.FILLING;
}

export function buildProcessPrefillFromVerifiedAnkety(
  company: {
    email?: string | null;
    contactEmail?: string | null;
    offices?: unknown;
  },
  verifiedPayloads: Partial<Record<AnketaTypeKey, Record<string, unknown>>>,
): Record<number, Record<string, unknown>> {
  const result: Record<number, Record<string, unknown>> = {};

  if (verifiedPayloads.responsible) {
    const d = verifiedPayloads.responsible;
    const s1: Record<string, unknown> = {};
    const fio = String(d.fio || '').trim();
    if (fio) s1.contactName = fio;
    const pos = String(d.position || '').trim();
    if (pos) s1.contactPosition = pos;
    const email = String(d.email || '').trim();
    if (email) s1.contactEmail = email;
    const extra: { email: string }[] = [];
    const companyEmail = String(company.email || '').trim();
    if (companyEmail && companyEmail !== email) extra.push({ email: companyEmail });
    if (extra.length) s1.additionalContacts = extra;
    if (Object.keys(s1).length) result[1] = s1;
  }

  if (verifiedPayloads.departments) {
    const normalized = normalizeDepartmentsAnketaData(verifiedPayloads.departments);
    const employees: string[] = [];
    if (normalized.departmentsInfo) {
      normalized.departmentsInfo
        .split(';')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(e => employees.push(e));
    }
    if (Array.isArray(company.offices)) {
      for (const row of company.offices as { name?: string }[]) {
        const n = row.name?.trim();
        if (n && !employees.includes(n)) employees.push(n);
      }
    }
    if (employees.length) {
      result[3] = { employeesInvolved: employees, employees: employees.join('; ') };
    }
  }

  if (verifiedPayloads.sites) {
    const normalized = normalizeSitesAnketaData(verifiedPayloads.sites);
    const methods: string[] = [];
    if (normalized.sites.length) methods.push('website');
    if (normalized.apps.length) methods.push('mobile_app');

    const s4: Record<string, unknown> = {};
    if (methods.length) s4.collectionMethods = methods;
    if (Object.keys(s4).length) result[4] = s4;

    const systems: string[] = [];
    for (const s of normalized.sites) {
      if (s.name) systems.push(s.location ? `${s.name} (${s.location})` : s.name);
    }
    for (const a of normalized.apps) {
      if (a.name) systems.push(a.location ? `${a.name} — ${a.location}` : `${a.name} (приложение)`);
    }
    if (systems.length) {
      result[7] = {
        informationSystemsUsage: 'used',
        informationSystems: systems,
        systems: systems.join('; '),
      };
    }
  }

  return result;
}

export async function loadVerifiedAnketaPayloads(companyId: number) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return null;

  const responsible = await prisma.companyResponsible.findFirst({ where: { companyId } });
  const processes = await prisma.process.findMany({
    where: { companyId },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });
  const invites = await prisma.anketaInvite.findMany({ where: { companyId } });

  const statuses = computeAnketaStatuses(
    companyId,
    company as Parameters<typeof computeAnketaStatuses>[1],
    responsible as Parameters<typeof computeAnketaStatuses>[2],
    processes as Parameters<typeof computeAnketaStatuses>[3],
    invites,
  );
  const verifiedPayloads: Partial<Record<AnketaTypeKey, Record<string, unknown>>> = {};

  for (const type of ANKETA_TYPES) {
    if (statuses[type] !== 'verified') continue;

    const anketaProcess = processes
      .filter(p => p.anketaType === type && p.status === ProcessStatus.VERIFIED)
      .sort((a, b) => b.id - a.id)[0];

    const sectionData = anketaProcess?.sections[0]?.data;
    if (sectionData && !isSectionDataEmpty(sectionData)) {
      verifiedPayloads[type] = sectionData as Record<string, unknown>;
    } else {
      verifiedPayloads[type] = buildAnketaInvitePrefill(type, company, responsible);
    }
  }

  return { company, responsible, verifiedPayloads, verifiedCount: Object.keys(verifiedPayloads).length };
}

function mergeVerifiedPayloads(
  target: Partial<Record<AnketaTypeKey, Record<string, unknown>>>,
  incoming: Partial<Record<AnketaTypeKey, Record<string, unknown>>>,
) {
  for (const type of ANKETA_TYPES) {
    const data = incoming[type];
    if (!data) continue;

    if (!target[type]) {
      target[type] = { ...data };
      continue;
    }

    if (type === 'sites') {
      const existing = normalizeSitesAnketaData(target.sites!);
      const added = normalizeSitesAnketaData(data);
      const siteNames = new Set(existing.sites.map(s => s.name));
      const appNames = new Set(existing.apps.map(a => a.name));
      target.sites = {
        sites: [
          ...existing.sites,
          ...added.sites.filter(s => s.name && !siteNames.has(s.name)),
        ],
        apps: [
          ...existing.apps,
          ...added.apps.filter(a => a.name && !appNames.has(a.name)),
        ],
        hasDirectories: existing.hasDirectories || added.hasDirectories,
        contactEmail: existing.contactEmail || added.contactEmail,
      };
    } else if (type === 'departments') {
      const existing = normalizeDepartmentsAnketaData(target.departments!);
      const added = normalizeDepartmentsAnketaData(data);
      const parts = new Set(
        [...existing.departmentsInfo.split(';'), ...added.departmentsInfo.split(';')]
          .map(s => s.trim())
          .filter(Boolean),
      );
      target.departments = {
        departmentsInfo: [...parts].join('; '),
        contactEmail: existing.contactEmail || added.contactEmail,
      };
    } else if (type === 'responsible') {
      const cur = target.responsible as Record<string, unknown>;
      if (!cur.fio && data.fio) target.responsible = { ...data };
    }
  }
}

export async function loadVerifiedAnketaPayloadsCorporate() {
  const companies = await prisma.company.findMany({ orderBy: { id: 'asc' } });
  const verifiedPayloads: Partial<Record<AnketaTypeKey, Record<string, unknown>>> = {};
  const allOffices: { name?: string; address?: string }[] = [];

  for (const company of companies) {
    const loaded = await loadVerifiedAnketaPayloads(company.id);
    if (!loaded?.verifiedCount) continue;
    mergeVerifiedPayloads(verifiedPayloads, loaded.verifiedPayloads);
    if (Array.isArray(company.offices)) {
      allOffices.push(...(company.offices as { name?: string; address?: string }[]));
    }
  }

  return {
    company: { email: null, contactEmail: null, offices: allOffices },
    verifiedPayloads,
    verifiedCount: Object.keys(verifiedPayloads).length,
  };
}

export async function applyProcessAnketaPrefill(processId: number) {
  const process = await prisma.process.findUnique({
    where: { id: processId },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });
  if (!process || process.anketaType) {
    return { process, appliedSections: [] as number[] };
  }

  const loaded = process.isCorporate
    ? await loadVerifiedAnketaPayloadsCorporate()
    : process.companyId
      ? await loadVerifiedAnketaPayloads(process.companyId)
      : null;
  if (!loaded || loaded.verifiedCount === 0) {
    return { process, appliedSections: [] as number[] };
  }

  const prefill = buildProcessPrefillFromVerifiedAnkety(loaded.company, loaded.verifiedPayloads);
  const appliedSections: number[] = [];

  for (const section of process.sections) {
    const patch = prefill[section.sectionNumber];
    if (!patch || !isSectionDataEmpty(section.data)) continue;

    await prisma.processSection.update({
      where: { id: section.id },
      data: {
        data: patch as Prisma.InputJsonValue,
        status: sectionStatusForData(patch),
      },
    });
    appliedSections.push(section.sectionNumber);
  }

  const updated = await prisma.process.findUnique({
    where: { id: processId },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });

  return { process: updated, appliedSections };
}
