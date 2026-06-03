import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { isValidAnketaType } from './anketaTypes';

export async function resetCompanyAnketaData(companyId: number, anketaType: string) {
  if (!isValidAnketaType(anketaType)) {
    throw new Error('Некорректный тип анкеты');
  }

  const processes = await prisma.process.findMany({
    where: { companyId, anketaType },
    select: { id: true },
  });
  if (processes.length) {
    const ids = processes.map(p => p.id);
    await prisma.processInvite.deleteMany({ where: { processId: { in: ids } } });
    await prisma.processSection.deleteMany({ where: { processId: { in: ids } } });
    await prisma.process.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.anketaInvite.deleteMany({ where: { companyId, anketaType } });

  if (anketaType === 'company') {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        ogrn: null,
        okved: null,
        activityType: null,
        ceoName: null,
        ceoPosition: null,
        phone: null,
        email: null,
        legalAddress: null,
        postalAddress: null,
        city: null,
        pdStartDate: null,
        isOperator: false,
        hasCrossBorder: false,
        contactEmail: null,
      },
    });
    return;
  }

  if (anketaType === 'responsible') {
    await prisma.companyResponsible.deleteMany({ where: { companyId } });
    return;
  }

  if (anketaType === 'sites') {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        sites: [] as Prisma.InputJsonValue,
        apps: [] as Prisma.InputJsonValue,
        hasDirectories: false,
        contactEmail: null,
      },
    });
    return;
  }

  if (anketaType === 'departments') {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        offices: [] as Prisma.InputJsonValue,
        contactEmail: null,
      },
    });
  }
}
