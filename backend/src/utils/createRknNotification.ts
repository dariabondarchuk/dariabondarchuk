import { prisma } from './prisma';
import { formatDate, writeAudit } from './helpers';

export function mapRknNotificationRow(n: {
  id: number;
  companyId: number;
  submitDate: Date | null;
  changeDate: Date | null;
  status: string;
  documents: { id: number; fileName: string; uploadDate: Date; isCurrent: boolean; version: number }[];
}) {
  return {
    id: n.id,
    companyId: n.companyId,
    dateSubmit: formatDate(n.submitDate),
    dateChange: formatDate(n.changeDate),
    status: n.status === 'SUBMITTED' ? 'submitted' : n.status === 'NOT_SUBMITTED' ? 'not_submitted' : 'needs_update',
    files: n.documents.map(d => ({
      id: d.id,
      name: d.fileName,
      date: formatDate(d.uploadDate),
      current: d.isCurrent,
      version: d.version,
    })),
  };
}

export async function createRknNotificationForCompany(
  companyId: number,
  audit?: { userId?: number; ip?: string },
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return { ok: false as const, status: 404, body: { error: 'Компания не найдена' } };
  }

  const existing = await prisma.rknNotification.findFirst({ where: { companyId } });
  if (existing) {
    return {
      ok: false as const,
      status: 409,
      body: {
        error: 'Уведомление для этой компании уже есть в реестре',
        notificationId: existing.id,
      },
    };
  }

  const notification = await prisma.rknNotification.create({
    data: { companyId },
    include: { documents: { orderBy: { version: 'desc' } } },
  });

  if (audit?.userId) {
    await writeAudit(audit.userId, 'RknNotification', notification.id, 'CREATE', { companyId }, audit.ip);
  }

  return { ok: true as const, status: 201, body: mapRknNotificationRow(notification) };
}
