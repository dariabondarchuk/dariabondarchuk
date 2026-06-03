import { Router } from 'express';
import crypto from 'crypto';
import { Prisma, ProcessStatus, SectionStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { fromClientProcessStatus, fromClientSectionStatus, mapProcess, writeAudit } from '../utils/helpers';
import { applyAnketaDataToCompany } from '../utils/applyAnketaData';
import { applyProcessAnketaPrefill } from '../utils/processPrefillFromAnkety';

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
  const isCorporate = req.query.isCorporate === 'true';
  const processes = await prisma.process.findMany({
    where: isCorporate
      ? { isCorporate: true }
      : companyId
        ? { companyId, isCorporate: false }
        : undefined,
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    orderBy: { id: 'asc' },
  });
  res.json(processes.map(p => mapProcess(p as unknown as Record<string, unknown> & { sections?: Array<Record<string, unknown>> })));
});

async function createProcessRecord(
  data: { companyId: number | null; isCorporate: boolean; name?: string },
) {
  return prisma.process.create({
    data: {
      companyId: data.companyId,
      isCorporate: data.isCorporate,
      name: data.name || 'Новый процесс',
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
}

async function respondCreatedProcess(
  req: AuthRequest,
  res: import('express').Response,
  process: Awaited<ReturnType<typeof createProcessRecord>>,
) {
  await writeAudit(req.userId, 'Process', process.id, 'CREATE', { name: process.name }, req.ip);

  let prefilled = process;
  let appliedSections: number[] = [];
  try {
    const prefillResult = await applyProcessAnketaPrefill(process.id);
    prefilled = prefillResult.process ?? process;
    appliedSections = prefillResult.appliedSections;
  } catch (err) {
    console.error('[process-create prefill]', err);
  }

  const mapped = mapProcess(
    prefilled as unknown as Record<string, unknown> & { sections?: Array<Record<string, unknown>> },
  );
  res.status(201).json({ ...mapped, prefillAppliedSections: appliedSections });
}

router.post('/corporate', authMiddleware, async (req: AuthRequest, res) => {
  const body = req.body as { name?: string };
  try {
    const process = await createProcessRecord({
      companyId: null,
      isCorporate: true,
      name: body.name,
    });
    await respondCreatedProcess(req, res, process);
  } catch (err) {
    console.error('[process-create corporate]', err);
    res.status(500).json({ error: 'Не удалось создать общекорпоративный процесс' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const body = req.body as { companyId?: number | null; name?: string; isCorporate?: boolean };
  const isCorporate = body.isCorporate === true;
  if (!isCorporate && (body.companyId == null || Number.isNaN(Number(body.companyId)))) {
    return res.status(400).json({ error: 'Укажите компанию для процесса' });
  }

  try {
    const process = await createProcessRecord({
      companyId: isCorporate ? null : Number(body.companyId),
      isCorporate,
      name: body.name,
    });
    await respondCreatedProcess(req, res, process);
  } catch (err) {
    console.error('[process-create]', err);
    res.status(500).json({ error: 'Не удалось создать процесс' });
  }
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
  const existingProcess = await prisma.process.findUnique({ where: { id: processId } });
  if (!existingProcess) return res.status(404).json({ error: 'Not found' });

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
      sentTo: body.email || existingProcess.sentTo,
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

router.post('/:id/prefill-from-ankety', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.process.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.anketaType) {
    return res.status(400).json({ error: 'Подстановка доступна только для процессов обработки ПДн' });
  }

  const { process, appliedSections } = await applyProcessAnketaPrefill(id);
  if (!process) return res.status(404).json({ error: 'Not found' });

  await writeAudit(req.userId, 'Process', id, 'PREFILL_FROM_ANKETY', { appliedSections }, req.ip);

  const mapped = mapProcess(process as unknown as Record<string, unknown> & { sections?: Array<Record<string, unknown>> });
  res.json({ ...mapped, prefillAppliedSections: appliedSections });
});

router.post('/:id/verify', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.process.findUnique({
    where: { id },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== ProcessStatus.NEED_CHECK) {
    return res.status(400).json({ error: 'Process is not awaiting verification' });
  }

  const sectionData = existing.sections[0]?.data as Record<string, unknown> | undefined;
  if (existing.anketaType && sectionData && existing.companyId != null) {
    await applyAnketaDataToCompany(existing.companyId, existing.anketaType, sectionData);
  }

  const updated = await prisma.process.update({
    where: { id },
    data: { status: ProcessStatus.VERIFIED },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });
  await writeAudit(req.userId, 'Process', id, 'VERIFY', { status: 'VERIFIED', anketaType: existing.anketaType }, req.ip);
  res.json(mapProcess(updated as unknown as Record<string, unknown> & { sections?: Array<Record<string, unknown>> }));
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.process.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Процесс не найден' });
  if (existing.anketaType) {
    return res.status(400).json({ error: 'Анкету удаляйте в разделе «Анкеты»' });
  }

  await prisma.process.delete({ where: { id } });
  await writeAudit(req.userId, 'Process', id, 'DELETE', {
    name: existing.name,
    companyId: existing.companyId,
    isCorporate: existing.isCorporate,
  }, req.ip);
  res.json({ ok: true });
});

export default router;
