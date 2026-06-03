import type { Company, CompanyResponsible } from '@prisma/client';
import { isValidAnketaType } from './anketaTypes';

type CompanyRow = Company;
type ResponsibleRow = CompanyResponsible | null;

function mapSitesRows(rows: unknown): { name: string; location: string }[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(row => {
      const r = row as Record<string, unknown>;
      const name = String(r.name || '').trim();
      if (!name) return null;
      return {
        name,
        location: String(r.location ?? r.url ?? '').trim(),
      };
    })
    .filter((x): x is { name: string; location: string } => x !== null);
}

function officesToDepartmentsInfo(offices: unknown): string {
  if (!Array.isArray(offices)) return '';
  return offices
    .map(o => {
      const row = o as { name?: string };
      return row.name?.trim();
    })
    .filter((n): n is string => Boolean(n))
    .join('; ');
}

export function buildAnketaInvitePrefill(
  anketaType: string,
  company: CompanyRow,
  responsible: ResponsibleRow,
): Record<string, unknown> {
  if (!isValidAnketaType(anketaType)) return {};

  switch (anketaType) {
    case 'company':
      return {
        inn: company.inn || '',
        ogrn: company.ogrn || '',
        okved: company.okved || '',
        name: company.name || '',
        shortName: company.shortName || '',
        activity: company.activityType || '',
        pdStartDate: company.pdStartDate
          ? company.pdStartDate.toISOString().slice(0, 10)
          : undefined,
        phone: company.phone || '',
        email: company.email || '',
        ceo: company.ceoName || '',
        ceoPosition: company.ceoPosition || '',
        legalAddress: company.legalAddress || '',
        postalAddress: company.postalAddress || '',
        city: company.city || '',
        isOperator: company.isOperator,
        hasCrossBorder: company.hasCrossBorder,
        contactEmail: company.contactEmail || '',
      };
    case 'responsible':
      if (!responsible) {
        return {
          fio: '',
          position: '',
          email: '',
          phone: '',
          isSecurity: false,
          controlsCompliance: false,
          informsEmployees: false,
          handlesRequests: false,
        };
      }
      return {
        fio: responsible.fio || '',
        position: responsible.position || '',
        email: responsible.email || '',
        phone: responsible.phone || '',
        isSecurity: responsible.isSecurity,
        controlsCompliance: responsible.controlsCompliance,
        informsEmployees: responsible.informsEmployees,
        handlesRequests: responsible.handlesRequests,
      };
    case 'sites':
      return {
        sites: mapSitesRows(company.sites),
        apps: mapSitesRows(company.apps),
        hasDirectories: company.hasDirectories,
        contactEmail: company.contactEmail || '',
      };
    case 'departments':
      return {
        departmentsInfo: officesToDepartmentsInfo(company.offices),
        contactEmail: company.contactEmail || '',
      };
    default:
      return {};
  }
}

export function mergeAnketaInviteData(
  anketaType: string,
  company: CompanyRow,
  responsible: ResponsibleRow,
  saved: unknown,
): Record<string, unknown> {
  const prefill = buildAnketaInvitePrefill(anketaType, company, responsible);
  const draft = saved && typeof saved === 'object' && !Array.isArray(saved)
    ? (saved as Record<string, unknown>)
    : {};
  return { ...prefill, ...draft };
}
