import { Router } from 'express';
import { ProcessStatus, SectionStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { MAIN_ANKETA_NAMES } from '../utils/anketaTypes';
import { mergeAnketaInviteData } from '../utils/anketaInvitePrefill';
import { findPartyByQuery } from '../utils/dadata';
import { writeAudit } from '../utils/helpers';

const router = Router();

async function loadInvite(token: string) {
  return prisma.anketaInvite.findUnique({
    where: { token },
    include: { company: true },
  });
}

async function loadResponsible(companyId: number) {
  return prisma.companyResponsible.findFirst({ where: { companyId } });
}

function inviteError(invite: Awaited<ReturnType<typeof loadInvite>>) {
  if (!invite) return { status: 404, message: 'Ссылка не найдена' };
  if (invite.submittedAt) return { status: 410, message: 'Анкета уже отправлена' };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { status: 410, message: 'Срок действия ссылки истёк' };
  }
  return null;
}

router.get('/anketa/:token', async (req, res) => {
  const invite = await loadInvite(req.params.token);
  const err = inviteError(invite);
  if (err) return res.status(err.status).json({ error: err.message });
  if (!invite) return res.status(404).json({ error: 'Not found' });

  const responsible = await loadResponsible(invite.companyId);
  const data = mergeAnketaInviteData(
    invite.anketaType,
    invite.company,
    responsible,
    invite.data,
  );

  res.json({
    anketaType: invite.anketaType,
    anketaName: MAIN_ANKETA_NAMES[invite.anketaType] || invite.anketaType,
    companyName: invite.company.shortName || invite.company.name,
    comment: invite.comment,
    email: invite.email,
    data,
  });
});

router.post('/anketa/:token/dadata/party', async (req, res) => {
  const invite = await loadInvite(req.params.token);
  const err = inviteError(invite);
  if (err) return res.status(err.status).json({ error: err.message });
  if (!invite) return res.status(404).json({ error: 'Not found' });

  const body = req.body as { query?: string; branch_type?: 'MAIN' | 'BRANCH' };
  try {
    const data = await findPartyByQuery({
      query: body.query ?? '',
      branch_type: body.branch_type,
    });
    res.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка DaData';
    const status = message.includes('не настроен') ? 503 : message.includes('не найдена') ? 404 : 502;
    res.status(status).json({ error: message });
  }
});

router.put('/anketa/:token', async (req, res) => {
  const invite = await loadInvite(req.params.token);
  const err = inviteError(invite);
  if (err) return res.status(err.status).json({ error: err.message });
  if (!invite) return res.status(404).json({ error: 'Not found' });

  const body = req.body as { data?: object };
  await prisma.anketaInvite.update({
    where: { id: invite.id },
    data: { data: (body.data ?? invite.data) as Prisma.InputJsonValue },
  });
  await writeAudit(undefined, 'AnketaInvite', invite.id, 'SAVE_ANKETA_DRAFT', {
    source: 'public_link',
    anketaType: invite.anketaType,
    email: invite.email,
    companyId: invite.companyId,
  });
  res.json({ ok: true });
});

router.post('/anketa/:token/submit', async (req, res) => {
  const invite = await loadInvite(req.params.token);
  const err = inviteError(invite);
  if (err) return res.status(err.status).json({ error: err.message });
  if (!invite) return res.status(404).json({ error: 'Not found' });

  const body = req.body as { data?: object };
  const submittedData = body.data ?? invite.data;

  const anketaName = MAIN_ANKETA_NAMES[invite.anketaType] || invite.anketaType;

  const process = await prisma.process.create({
    data: {
      companyId: invite.companyId,
      name: anketaName,
      tags: [],
      anketaType: invite.anketaType,
      status: ProcessStatus.NEED_CHECK,
      sentTo: invite.email,
      sentAt: new Date(),
      sections: {
        create: [{
          sectionNumber: 1,
          sectionName: anketaName,
          status: SectionStatus.FILLED,
          data: submittedData as Prisma.InputJsonValue,
        }],
      },
    },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });

  await prisma.anketaInvite.update({
    where: { id: invite.id },
    data: {
      submittedAt: new Date(),
      processId: process.id,
      data: submittedData as Prisma.InputJsonValue,
    },
  });

  await writeAudit(undefined, 'AnketaInvite', invite.id, 'SUBMIT_ANKETA', {
    source: 'public_link',
    anketaType: invite.anketaType,
    email: invite.email,
    companyId: invite.companyId,
    processId: process.id,
  });

  res.json({ ok: true, message: 'Анкета отправлена на проверку DPO', processId: process.id });
});

export default router;
