import { prisma } from '../utils/prisma';

export async function writeAudit(
  userId: number | undefined,
  entityType: string,
  entityId: number,
  action: string,
  changes: object,
  ipAddress?: string,
) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      entityType,
      entityId,
      action,
      changes,
      ipAddress: ipAddress ?? null,
    },
  });
}

export function formatDate(d: Date | null | undefined) {
  if (!d) return '';
  return d.toLocaleDateString('ru-RU');
}

export function parseDate(value: string | undefined | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const PROCESS_STATUS_MAP: Record<string, string> = {
  NOT_SENT: 'not_sent', SENT: 'sent', FILLING: 'filling', REVIEW: 'review', ACCEPTED: 'accepted', RETURNED: 'returned',
};
const PROCESS_STATUS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(PROCESS_STATUS_MAP).map(([k, v]) => [v, k]),
);

const SECTION_STATUS_MAP: Record<string, string> = {
  NOT_FILLED: 'not_filled', FILLING: 'filling', FILLED: 'filled',
};
const SECTION_STATUS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_STATUS_MAP).map(([k, v]) => [v, k]),
);

export function toClientProcessStatus(s: string) {
  return PROCESS_STATUS_MAP[s] ?? s.toLowerCase();
}

export function fromClientProcessStatus(s: string) {
  return PROCESS_STATUS_REVERSE[s] ?? s.toUpperCase();
}

export function toClientSectionStatus(s: string) {
  return SECTION_STATUS_MAP[s] ?? s.toLowerCase();
}

export function fromClientSectionStatus(s: string) {
  return SECTION_STATUS_REVERSE[s] ?? s.toUpperCase();
}

export function mapCompany(c: Record<string, unknown>) {
  return {
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    inn: c.inn,
    ogrn: c.ogrn,
    okved: c.okved,
    activity: c.activityType,
    ceo: c.ceoName,
    ceoPosition: c.ceoPosition,
    phone: c.phone,
    email: c.email,
    legalAddress: c.legalAddress,
    postalAddress: c.postalAddress,
    city: c.city,
    pdStartDate: c.pdStartDate ? (c.pdStartDate as Date).toISOString().slice(0, 10) : '',
    isOperator: c.isOperator,
    hasCrossBorder: c.hasCrossBorder,
    contactEmail: c.contactEmail,
    offices: c.offices ?? [],
    sites: c.sites ?? [],
    apps: c.apps ?? [],
  };
}

export function mapResponsible(r: Record<string, unknown>) {
  return {
    id: r.id,
    companyId: r.companyId,
    role: r.role,
    fio: r.fio,
    position: r.position,
    email: r.email,
    phone: r.phone,
    isSecurity: r.isSecurity,
    controlsCompliance: r.controlsCompliance,
    informsEmployees: r.informsEmployees,
    handlesRequests: r.handlesRequests,
  };
}

export function mapProcess(p: Record<string, unknown> & { sections?: Array<Record<string, unknown>> }) {
  const sections: Record<number, { status: string; data: unknown }> = {};
  for (const s of p.sections ?? []) {
    sections[s.sectionNumber as number] = {
      status: toClientSectionStatus(s.status as string),
      data: s.data ?? {},
    };
  }
  return {
    id: p.id,
    companyId: p.companyId,
    name: p.name,
    tags: p.tags ?? [],
    status: toClientProcessStatus(p.status as string),
    sentTo: p.sentTo ?? '',
    sentAt: formatDate(p.sentAt as Date | null),
    sections,
  };
}
