import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { parseDate } from './helpers';
import { normalizeSitesAnketaData } from './sitesAnketa';
import { normalizeDepartmentsAnketaData, parseDepartmentsInfo } from './departmentsAnketa';

export async function applyAnketaDataToCompany(
  companyId: number,
  anketaType: string,
  data: Record<string, unknown>,
) {
  if (!data || Object.keys(data).length === 0) return;

  if (anketaType === 'company') {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        inn: (data.inn as string) || undefined,
        ogrn: (data.ogrn as string) || undefined,
        okved: (data.okved as string) || undefined,
        name: (data.name as string) || undefined,
        shortName: (data.shortName as string) || undefined,
        activityType: (data.activity as string) || undefined,
        pdStartDate: data.pdStartDate ? parseDate(data.pdStartDate as string) : undefined,
        isOperator: data.isOperator !== undefined ? Boolean(data.isOperator) : undefined,
        hasCrossBorder: data.hasCrossBorder !== undefined ? Boolean(data.hasCrossBorder) : undefined,
        phone: (data.phone as string) || undefined,
        email: (data.email as string) || undefined,
        ceoName: (data.ceo as string) || undefined,
        ceoPosition: (data.ceoPosition as string) || undefined,
        legalAddress: (data.legalAddress as string) || undefined,
        city: (data.city as string) || undefined,
      },
    });
    return;
  }

  if (anketaType === 'responsible') {
    const existing = await prisma.companyResponsible.findFirst({ where: { companyId } });
    const payload = {
      companyId,
      role: 'organizer',
      fio: (data.fio as string) || null,
      position: (data.position as string) || null,
      email: (data.email as string) || null,
      phone: (data.phone as string) || null,
      isSecurity: Boolean(data.isSecurity),
      controlsCompliance: Boolean(data.controlsCompliance),
      informsEmployees: Boolean(data.informsEmployees),
      handlesRequests: Boolean(data.handlesRequests),
    };
    if (existing) {
      await prisma.companyResponsible.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.companyResponsible.create({ data: payload });
    }
    return;
  }

  if (anketaType === 'sites') {
    const normalized = normalizeSitesAnketaData(data);
    await prisma.company.update({
      where: { id: companyId },
      data: {
        sites: normalized.sites.map(s => ({
          name: s.name,
          url: s.location,
        })) as Prisma.InputJsonValue,
        apps: normalized.apps.map(a => ({
          name: a.name,
          url: a.location,
        })) as Prisma.InputJsonValue,
        hasDirectories: normalized.hasDirectories,
        contactEmail: normalized.contactEmail || null,
      },
    });
    return;
  }

  if (anketaType === 'departments') {
    const normalized = normalizeDepartmentsAnketaData(data);
    await prisma.company.update({
      where: { id: companyId },
      data: {
        offices: parseDepartmentsInfo(normalized.departmentsInfo) as Prisma.InputJsonValue,
        contactEmail: normalized.contactEmail || null,
      },
    });
  }
}
