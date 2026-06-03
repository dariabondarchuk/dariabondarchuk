import { Router } from 'express';
import crypto from 'crypto';
import { ProcessStatus, SectionStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import {
  fromClientProcessStatus,
  fromClientSectionStatus,
  mapProcess,
  writeAudit,
} from '../utils/helpers';

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

async function loadInvite(token: string) {
  return prisma.processInvite.findUnique({
    where: { token },
    include: {
      process: {
        include: {
          sections: { orderBy: { sectionNumber: 'asc' } },
          company: { select: { name: true, shortName: true } },
        },
      },
    },
  });
}

function inviteError(invite: Awaited<ReturnType<typeof loadInvite>>) {
  if (!invite) return { status: 404, message: 'Ссылка не найдена' };
  if (invite.submittedAt) return { status: 410, message: 'Анкета уже отправлена' };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { status: 410, message: 'Срок действия ссылки истёк' };
  }
  return null;
}

router.get('/survey/:token', async (req, res) => {
  const invite = await loadInvite(req.params.token);
  const err = inviteError(invite);
  if (err) return res.status(err.status).json({ error: err.message });
  if (!invite) return res.status(404).json({ error: 'Not found' });

  const p = invite.process;
  res.json({
    processName: p.name,
    companyName: p.company?.shortName || p.company?.name || 'Общекорпоративный процесс',
    comment: invite.comment,
    email: invite.email,
    sections: Object.fromEntries(
      p.sections.map(s => [
        s.sectionNumber,
        {
          status: s.status === SectionStatus.FILLED ? 'filled' : s.status === SectionStatus.FILLING ? 'filling' : 'not_filled',
          data: s.data,
        },
      ]),
    ),
  });
});

router.put('/survey/:token/sections/:sectionNumber', async (req, res) => {
  const invite = await loadInvite(req.params.token);
  const err = inviteError(invite);
  if (err) return res.status(err.status).json({ error: err.message });
  if (!invite) return res.status(404).json({ error: 'Not found' });

  const sectionNumber = Number(req.params.sectionNumber);
  const body = req.body as { data?: object };
  const section = invite.process.sections.find(s => s.sectionNumber === sectionNumber);
  if (!section) return res.status(404).json({ error: 'Section not found' });

  await prisma.processSection.update({
    where: { id: section.id },
    data: {
      status: SectionStatus.FILLING,
      data: body.data !== undefined ? (body.data as Prisma.InputJsonValue) : (section.data as Prisma.InputJsonValue),
    },
  });

  if (invite.process.status === ProcessStatus.NOT_SENT || invite.process.status === ProcessStatus.SENT) {
    await prisma.process.update({
      where: { id: invite.processId },
      data: { status: ProcessStatus.FILLING },
    });
  }

  await writeAudit(undefined, 'ProcessSection', section.id, 'UPDATE_SURVEY_SECTION', {
    source: 'public_link',
    processId: invite.processId,
    sectionNumber,
    email: invite.email,
  });

  res.json({ ok: true });
});

router.post('/survey/:token/submit', async (req, res) => {
  const invite = await loadInvite(req.params.token);
  const err = inviteError(invite);
  if (err) return res.status(err.status).json({ error: err.message });
  if (!invite) return res.status(404).json({ error: 'Not found' });

  const body = req.body as { sections?: Record<string, { data: object }> };

  if (body.sections) {
    for (const [num, payload] of Object.entries(body.sections)) {
      const sectionNumber = Number(num);
      const section = invite.process.sections.find(s => s.sectionNumber === sectionNumber);
      if (!section) continue;
      const hasData = payload.data && Object.keys(payload.data).length > 0;
      await prisma.processSection.update({
        where: { id: section.id },
        data: {
          data: payload.data as Prisma.InputJsonValue,
          status: hasData ? SectionStatus.FILLED : section.status,
        },
      });
    }
  } else {
    await prisma.processSection.updateMany({
      where: { processId: invite.processId, status: SectionStatus.FILLING },
      data: { status: SectionStatus.FILLED },
    });
  }

  await prisma.process.update({
    where: { id: invite.processId },
    data: { status: ProcessStatus.REVIEW },
  });

  await prisma.processInvite.update({
    where: { id: invite.id },
    data: { submittedAt: new Date() },
  });

  await writeAudit(undefined, 'Process', invite.processId, 'SUBMIT_SURVEY', {
    source: 'public_link',
    email: invite.email,
    processName: invite.process.name,
  });

  res.json({ ok: true, message: 'Анкета отправлена на проверку DPO' });
});

export default router;

export { SECTION_NAMES };
