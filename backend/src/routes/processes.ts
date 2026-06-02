import { Router } from 'express';
import crypto from 'crypto';
import { ProcessStatus, SectionStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { fromClientProcessStatus, fromClientSectionStatus, mapProcess, writeAudit } from '../utils/helpers';

const router = Router();

const SECTION_NAMES: Record<number, string> = {
  1: 'Информация о процессе',
  2: 'Цель обработки и физ. лица',
  3: 'Сотрудники и отделы',
  4: 'Источники ПДн',
  5: 'Перечень данных, основания, сроки',
  6: 'Хранение бумажных документов',
  7: 'Информационные системы',
  8: 'Третьи лица',
  9: 'Дополнительная информация',
};

router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
  const processes = await prisma.process.findMany({
    where: companyId ? { companyId } : undefined,
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    orderBy: { id: 'asc' },
  });
  res.json(processes.map(p => mapProcess(p as unknown as Record<string, unknown> & { sections?: Array<Record<string, unknown>> })));
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { companyId, name } = req.body as { companyId: number; name?: string };
  const process = await prisma.process.create({
    data: {
      companyId: Number(companyId),
      name: name || 'Новый процесс',
      tags: [],
      status: ProcessStatus.NOT_SENT,
      sections: {
        create: Array.from({ length: 9 }, (_, i) => ({
          sectionNumber: i + 1,
          sectionName: SECTION_NAMES[i + 1]!,
          status: SectionStatus.NOT_FILLED,
          data: {},
        })),
      },
    },
    include: { sections: true },
  });
  await writeAudit(req.userId, 'Process', process.id, 'CREATE', { name: process.name }, req.ip);
  res.status(201).json(mapProcess(process as unknown as Record<string, unknown> & { sections?: Array<Record<string, unknown>> }));
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const existing = await prisma.process.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.process.update({
    where: { id },
    data: {
      name: (body.name as string) ?? existing.name,
      tags: (body.tags as string[]) ?? existing.tags,
      status: body.status ? (fromClientProcessStatus(body.status as string) as ProcessStatus) : existing.status,
      sentTo: body.sentTo !== undefined ? (body.sentTo as string) : existing.sentTo,
      sentAt: body.sentAt !== undefined ? (body.sentAt ? new Date(body.sentAt as string) : null) : existing.sentAt,
    },
    include: { sections: true },
  });
  await writeAudit(req.userId, 'Process', id, 'UPDATE', { old: existing, new: updated }, req.ip);
  res.json(mapProcess(updated as unknown as Record<string, unknown> & { sections?: Array<Record<string, unknown>> }));
});

router.put('/:id/sections/:sectionNumber', authMiddleware, async (req: AuthRequest, res) => {
  const processId = Number(req.params.id);
  const sectionNumber = Number(req.params.sectionNumber);
  const body = req.body as { status?: string; data?: object };
  const section = await prisma.processSection.findUnique({
    where: { processId_sectionNumber: { processId, sectionNumber } },
  });
  if (!section) return res.status(404).json({ error: 'Section not found' });

  const updated = await prisma.processSection.update({
    where: { id: section.id },
    data: {
      status: body.status ? (fromClientSectionStatus(body.status) as SectionStatus) : section.status,
      data: body.data !== undefined ? (body.data as Prisma.InputJsonValue) : (section.data as Prisma.InputJsonValue),
    },
  });
  await writeAudit(req.userId, 'ProcessSection', updated.id, 'UPDATE', { sectionNumber, data: body.data }, req.ip);

  const process = await prisma.process.findUnique({
    where: { id: processId },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });
  res.json(mapProcess(process as unknown as Record<string, unknown> & { sections?: Array<Record<string, unknown>> }));
});

router.post('/:id/invite', authMiddleware, async (req: AuthRequest, res) => {
  const processId = Number(req.params.id);
  const body = req.body as { email?: string; comment?: string };
  const process = await prisma.process.findUnique({ where: { id: processId } });
  if (!process) return res.status(404).json({ error: 'Not found' });

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.processInvite.create({
    data: {
      processId,
      token,
      email: body.email || null,
      comment: body.comment || null,
      expiresAt,
    },
  });

  const updated = await prisma.process.update({
    where: { id: processId },
    data: {
      status: ProcessStatus.SENT,
      sentTo: body.email || process.sentTo,
      sentAt: new Date(),
    },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });

  await writeAudit(req.userId, 'ProcessInvite', processId, 'CREATE', { email: body.email, token }, req.ip);

  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
  res.status(201).json({
    token,
    url: `${baseUrl}/survey/${token}`,
    process: mapProcess(updated as unknown as Record<string, unknown> & { sections?: Array<Record<string, unknown>> }),
  });
});

export default router;
