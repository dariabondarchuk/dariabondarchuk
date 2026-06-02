import type { Company, Process, Responsible } from '../types';
import { MAIN_ANKETA_NAMES } from '../constants';

export type AnketaTypeKey = keyof typeof MAIN_ANKETA_NAMES;

interface InviteLike {
  anketaType: string;
  submittedAt?: string;
  expiresAt?: string;
}

function isFilled(type: AnketaTypeKey, company: Company, responsible?: Responsible) {
  switch (type) {
    case 'company':
      return Boolean(company.inn && company.name && company.phone && company.email && company.ceo && company.legalAddress);
    case 'responsible':
      return Boolean(responsible?.fio && responsible?.email);
    case 'sites':
      return (company.sites?.length ?? 0) > 0 || (company.apps?.length ?? 0) > 0;
    case 'departments':
      return (company.offices?.length ?? 0) > 0;
    default:
      return false;
  }
}

function isPartiallyFilled(type: AnketaTypeKey, company: Company, responsible?: Responsible) {
  if (isFilled(type, company, responsible)) return false;
  switch (type) {
    case 'company':
      return Boolean(
        company.phone || company.email || company.ceo || company.legalAddress
        || company.ogrn || company.okved,
      );
    case 'responsible':
      return Boolean(responsible?.fio || responsible?.email || responsible?.phone);
    case 'sites':
      return Boolean(company.hasDirectories || company.contactEmail);
    case 'departments':
      return Boolean(company.contactEmail);
    default:
      return false;
  }
}

function invitePending(invite: InviteLike) {
  if (invite.submittedAt) return false;
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return false;
  return true;
}

export function computeAnketaStatuses(
  companyId: number,
  company: Company,
  responsible: Responsible | undefined,
  processes: Process[],
  invites: InviteLike[],
): Record<AnketaTypeKey, string> {
  const result = {} as Record<AnketaTypeKey, string>;
  const types = Object.keys(MAIN_ANKETA_NAMES) as AnketaTypeKey[];

  for (const type of types) {
    const related = processes.filter(p => p.companyId === companyId && p.anketaType === type);
    const hasNeedCheck = related.some(p => p.status === 'need_check');
    const hasVerified = related.some(p => p.status === 'verified');
    const pendingInvite = invites.some(i => i.anketaType === type && invitePending(i));

    if (hasNeedCheck) {
      result[type] = 'need_check';
    } else if (hasVerified) {
      result[type] = 'verified';
    } else if (isFilled(type, company, responsible)) {
      result[type] = 'filled';
    } else if (pendingInvite) {
      result[type] = 'sent';
    } else if (isPartiallyFilled(type, company, responsible)) {
      result[type] = 'filling';
    } else {
      result[type] = 'not_filled';
    }
  }

  return result;
}
