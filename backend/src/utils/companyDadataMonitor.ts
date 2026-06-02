import { prisma } from './prisma';
import { formatDate } from './helpers';
import type { CompanyDadataPatch } from './dadata';

export interface CompanyDadataSnapshot {
  name: string;
  shortName: string;
  inn: string;
  ogrn: string;
  okved: string;
  ceoName: string;
  ceoPosition: string;
  phone: string;
  email: string;
  legalAddress: string;
  postalAddress: string;
  city: string;
}

export interface DadataChangeEventDraft {
  eventType: string;
  oldValue: string;
  newValue: string;
}

function norm(value: string | null | undefined) {
  return (value ?? '').trim();
}

function fmtCeo(name: string, position: string) {
  const n = norm(name);
  const p = norm(position);
  if (n && p) return `${n}, ${p}`;
  return n || p;
}

function fmtContacts(phone: string, email: string) {
  return [norm(phone), norm(email)].filter(Boolean).join('; ');
}

export function companyToSnapshot(company: {
  name: string;
  shortName: string | null;
  inn: string;
  ogrn: string | null;
  okved: string | null;
  ceoName: string | null;
  ceoPosition: string | null;
  phone: string | null;
  email: string | null;
  legalAddress: string | null;
  postalAddress: string | null;
  city: string | null;
}): CompanyDadataSnapshot {
  return {
    name: norm(company.name),
    shortName: norm(company.shortName),
    inn: norm(company.inn),
    ogrn: norm(company.ogrn),
    okved: norm(company.okved),
    ceoName: norm(company.ceoName),
    ceoPosition: norm(company.ceoPosition),
    phone: norm(company.phone),
    email: norm(company.email),
    legalAddress: norm(company.legalAddress),
    postalAddress: norm(company.postalAddress),
    city: norm(company.city),
  };
}

export function patchToSnapshot(patch: CompanyDadataPatch): CompanyDadataSnapshot {
  return {
    name: norm(patch.name),
    shortName: norm(patch.shortName),
    inn: norm(patch.inn),
    ogrn: norm(patch.ogrn),
    okved: norm(patch.okved),
    ceoName: norm(patch.ceo),
    ceoPosition: norm(patch.ceoPosition),
    phone: norm(patch.phone),
    email: norm(patch.email),
    legalAddress: norm(patch.legalAddress),
    postalAddress: norm(patch.postalAddress),
    city: norm(patch.city),
  };
}

export function detectDadataChanges(
  before: CompanyDadataSnapshot,
  after: CompanyDadataSnapshot,
): DadataChangeEventDraft[] {
  const events: DadataChangeEventDraft[] = [];

  const oldCeo = fmtCeo(before.ceoName, before.ceoPosition);
  const newCeo = fmtCeo(after.ceoName, after.ceoPosition);
  if (oldCeo && newCeo && oldCeo !== newCeo) {
    events.push({ eventType: 'ceo_change', oldValue: oldCeo, newValue: newCeo });
  }

  const oldAddr = before.legalAddress || before.postalAddress;
  const newAddr = after.legalAddress || after.postalAddress;
  if (oldAddr && newAddr && oldAddr !== newAddr) {
    events.push({ eventType: 'address_change', oldValue: oldAddr, newValue: newAddr });
  }

  if (before.okved && after.okved && before.okved !== after.okved) {
    events.push({ eventType: 'okved_change', oldValue: before.okved, newValue: after.okved });
  }

  const oldContact = fmtContacts(before.phone, before.email);
  const newContact = fmtContacts(after.phone, after.email);
  if (oldContact && newContact && oldContact !== newContact) {
    events.push({ eventType: 'contact_change', oldValue: oldContact, newValue: newContact });
  }

  return events;
}

export function mapMonitorEventRow(e: {
  id: number;
  companyId: number;
  eventDate: Date;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  isRead: boolean;
}) {
  return {
    id: e.id,
    date: formatDate(e.eventDate),
    companyId: e.companyId,
    type: e.eventType,
    old: e.oldValue ?? '',
    newVal: e.newValue ?? '',
    read: e.isRead,
  };
}

export async function createDadataMonitorEvents(
  companyId: number,
  changes: DadataChangeEventDraft[],
) {
  if (!changes.length) return [];

  const created = [];
  for (const change of changes) {
    const duplicate = await prisma.monitorEvent.findFirst({
      where: {
        companyId,
        eventType: change.eventType,
        oldValue: change.oldValue,
        newValue: change.newValue,
        isRead: false,
      },
    });
    if (duplicate) continue;

    const event = await prisma.monitorEvent.create({
      data: {
        companyId,
        eventDate: new Date(),
        eventType: change.eventType,
        oldValue: change.oldValue,
        newValue: change.newValue,
        isRead: false,
      },
    });
    created.push(mapMonitorEventRow(event));
  }
  return created;
}

export function buildCompanyUpdateFromPatch(
  existing: CompanyDadataSnapshot,
  patch: CompanyDadataPatch,
) {
  return {
    name: patch.name || existing.name,
    shortName: patch.shortName || existing.shortName,
    inn: patch.inn || existing.inn,
    ogrn: patch.ogrn || existing.ogrn,
    okved: patch.okved || existing.okved,
    ceoName: patch.ceo || existing.ceoName,
    ceoPosition: patch.ceoPosition || existing.ceoPosition,
    phone: patch.phone || existing.phone,
    email: patch.email || existing.email,
    legalAddress: patch.legalAddress || existing.legalAddress,
    postalAddress: patch.postalAddress || existing.postalAddress,
    city: patch.city || existing.city,
  };
}
