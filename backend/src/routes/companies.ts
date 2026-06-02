import { Router } from 'express';
import { Prisma, ProcessStatus, SectionStatus } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { mapCompany, mapResponsible, parseDate, writeAudit } from '../utils/helpers';
import { isValidAnketaType, MAIN_ANKETA_NAMES } from '../utils/anketaTypes';
import { sendAnketaBulkInviteEmail, sendAnketaInviteEmail } from '../utils/mail';
import { computeAnketaStatuses } from '../utils/anketaStatus';
import { findPartyByQuery } from '../utils/dadata';
import {
  buildCompanyUpdateFromPatch,
  companyToSnapshot,
  createDadataMonitorEvents,
  detectDadataChanges,
  mapMonitorEventRow,
  patchToSnapshot,
} from '../utils/companyDadataMonitor';

const router = Router();

router.get('/', authMiddleware, async (_req, res) => {
  const companies = await prisma.company.findMany({
    include: { responsibles: true },
    orderBy: { id: 'asc' },
  });
  res.json(companies.map(mapCompany));
});

router.post('/from-dadata', authMiddleware, async (req: AuthRequest, res) => {
  const body = req.body as { query?: string };
  if (!body.query?.trim()) {
    return res.status(400).json({ error: 'Укажите ИНН, ОГРН или название организации' });
  }

  try {
    const patch = await findPartyByQuery({ query: body.query.trim(), branch_type: 'MAIN' });
    if (!patch.inn) {
      return res.status(400).json({ error: 'DaData не вернула ИНН организации' });
    }

    const existing = await prisma.company.findUnique({ where: { inn: patch.inn } });
    if (existing) {
      return res.status(409).json({
        error: `Компания с ИНН ${patch.inn} уже есть в реестре`,
        companyId: existing.id,
      });
    }

    const company = await prisma.company.create({
      data: {
        name: patch.name || patch.shortName || `ИНН ${patch.inn}`,
        shortName: patch.shortName || patch.name,
        inn: patch.inn,
        ogrn: patch.ogrn || null,
        okved: patch.okved || null,
        ceoName: patch.ceo || null,
        ceoPosition: patch.ceoPosition || null,
        phone: patch.phone || null,
        email: patch.email || null,
        legalAddress: patch.legalAddress || null,
        postalAddress: patch.postalAddress || null,
        city: patch.city || null,
      },
    });

    const rknNotification = await prisma.rknNotification.create({
      data: { companyId: company.id, status: 'NOT_SUBMITTED' },
    });

    await writeAudit(req.userId, 'Company', company.id, 'CREATE', { source: 'dadata', inn: patch.inn }, req.ip);

    res.status(201).json({
      company: mapCompany(company as unknown as Record<string, unknown>),
      rknNotification: {
        id: rknNotification.id,
        companyId: rknNotification.companyId,
        dateSubmit: '',
        dateChange: '',
        status: 'not_submitted',
        files: [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка DaData';
    const status = message.includes('не настроен') ? 503 : message.includes('не найдена') ? 404 : 502;
    res.status(status).json({ error: message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const company = await prisma.company.findUnique({
    where: { id },
    include: { responsibles: true },
  });
  if (!company) return res.status(404).json({ error: 'Not found' });
  res.json(mapCompany(company as unknown as Record<string, unknown>));
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const data = {
    name: (body.name as string) ?? existing.name,
    shortName: (body.shortName as string) ?? existing.shortName,
    inn: (body.inn as string) ?? existing.inn,
    ogrn: (body.ogrn as string) ?? existing.ogrn,
    okved: (body.okved as string) ?? existing.okved,
    activityType: (body.activity as string) ?? (body.activityType as string) ?? existing.activityType,
    ceoName: (body.ceo as string) ?? (body.ceoName as string) ?? existing.ceoName,
    ceoPosition: (body.ceoPosition as string) ?? existing.ceoPosition,
    phone: (body.phone as string) ?? existing.phone,
    email: (body.email as string) ?? existing.email,
    legalAddress: (body.legalAddress as string) ?? existing.legalAddress,
    postalAddress: (body.postalAddress as string) ?? existing.postalAddress,
    city: (body.city as string) ?? existing.city,
    pdStartDate: body.pdStartDate !== undefined ? parseDate(body.pdStartDate as string) : existing.pdStartDate,
    isOperator: body.isOperator !== undefined ? Boolean(body.isOperator) : existing.isOperator,
    hasCrossBorder: body.hasCrossBorder !== undefined ? Boolean(body.hasCrossBorder) : existing.hasCrossBorder,
    hasDirectories: body.hasDirectories !== undefined ? Boolean(body.hasDirectories) : existing.hasDirectories,
    contactEmail: (body.contactEmail as string) ?? existing.contactEmail,
    offices: (body.offices ?? existing.offices) as Prisma.InputJsonValue,
    sites: (body.sites ?? existing.sites) as Prisma.InputJsonValue,
    apps: (body.apps ?? existing.apps) as Prisma.InputJsonValue,
  };

  const updated = await prisma.company.update({ where: { id }, data });
  await writeAudit(req.userId, 'Company', id, 'UPDATE', { old: existing, new: updated }, req.ip);
  res.json(mapCompany(updated as unknown as Record<string, unknown>));
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Компания не найдена' });

  await prisma.company.delete({ where: { id } });
  await writeAudit(req.userId, 'Company', id, 'DELETE', { name: existing.name, inn: existing.inn }, req.ip);
  res.json({ ok: true });
});

router.post('/check-dadata-changes', authMiddleware, async (req: AuthRequest, res) => {
  const companies = await prisma.company.findMany({
    where: { inn: { not: '' } },
    orderBy: { id: 'asc' },
  });

  const allEvents: ReturnType<typeof mapMonitorEventRow>[] = [];
  const updatedCompanies: ReturnType<typeof mapCompany>[] = [];
  let checked = 0;
  let changed = 0;

  for (const company of companies) {
    const query = company.inn?.trim() || company.ogrn?.trim();
    if (!query) continue;
    checked += 1;

    try {
      const patch = await findPartyByQuery({ query, branch_type: 'MAIN' });
      const before = companyToSnapshot(company);
      const after = patchToSnapshot(patch);
      const changes = detectDadataChanges(before, after);
      if (!changes.length) continue;

      const updated = await prisma.company.update({
        where: { id: company.id },
        data: buildCompanyUpdateFromPatch(before, patch),
      });

      const events = await createDadataMonitorEvents(company.id, changes);
      if (events.length) {
        changed += 1;
        allEvents.push(...events);
        updatedCompanies.push(mapCompany(updated as unknown as Record<string, unknown>));
        await writeAudit(req.userId, 'Company', company.id, 'DADATA_AUTO_SYNC', {
          query,
          changes: changes.map(c => c.eventType),
        }, req.ip);
      }
    } catch (err) {
      console.error(`[dadata-check] company ${company.id}:`, err);
    }
  }

  res.json({ checked, changed, events: allEvents, companies: updatedCompanies });
});

router.post('/:id/sync-dadata', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const body = req.body as { query?: string; branch_type?: 'MAIN' | 'BRANCH'; type?: 'LEGAL' | 'INDIVIDUAL' };
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Компания не найдена' });

  const query = body.query?.trim() || existing.inn?.trim() || existing.ogrn?.trim();
  if (!query) {
    return res.status(400).json({ error: 'Укажите ИНН или ОГРН для поиска в DaData' });
  }

  try {
    const patch = await findPartyByQuery({
      query,
      branch_type: body.branch_type,
      type: body.type,
    });

    const before = companyToSnapshot(existing);
    const after = patchToSnapshot(patch);
    const changes = detectDadataChanges(before, after);

    const updated = await prisma.company.update({
      where: { id },
      data: buildCompanyUpdateFromPatch(before, patch),
    });

    const events = await createDadataMonitorEvents(id, changes);

    await writeAudit(req.userId, 'Company', id, 'SYNC_DADATA', { query, patch, events: events.length }, req.ip);
    res.json({
      company: mapCompany(updated as unknown as Record<string, unknown>),
      events,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка DaData';
    const status = message.includes('не настроен') ? 503 : message.includes('не найдена') ? 404 : 502;
    res.status(status).json({ error: message });
  }
});

router.get('/:id/responsible', authMiddleware, async (req, res) => {
  const companyId = Number(req.params.id);
  const resp = await prisma.companyResponsible.findFirst({ where: { companyId } });
  res.json(resp ? mapResponsible(resp as unknown as Record<string, unknown>) : null);
});

router.put('/:id/responsible', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const existing = await prisma.companyResponsible.findFirst({ where: { companyId } });
  const data = {
    companyId,
    role: (body.role as string) ?? 'organizer',
    fio: (body.fio as string) ?? null,
    position: (body.position as string) ?? null,
    email: (body.email as string) ?? null,
    phone: (body.phone as string) ?? null,
    isSecurity: Boolean(body.isSecurity),
    controlsCompliance: Boolean(body.controlsCompliance),
    informsEmployees: Boolean(body.informsEmployees),
    handlesRequests: Boolean(body.handlesRequests),
  };

  const updated = existing
    ? await prisma.companyResponsible.update({ where: { id: existing.id }, data })
    : await prisma.companyResponsible.create({ data });

  await writeAudit(req.userId, 'CompanyResponsible', updated.id, existing ? 'UPDATE' : 'CREATE', { data }, req.ip);
  res.json(mapResponsible(updated as unknown as Record<string, unknown>));
});

router.get('/:id/anketa-statuses', authMiddleware, async (req, res) => {
  const companyId = Number(req.params.id);
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return res.status(404).json({ error: 'Not found' });

  const responsible = await prisma.companyResponsible.findFirst({ where: { companyId } });
  const processes = await prisma.process.findMany({
    where: { companyId, anketaType: { not: null } },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });
  const invites = await prisma.anketaInvite.findMany({ where: { companyId } });

  const mappedCompany = mapCompany(company as unknown as Record<string, unknown>);
  const mappedResp = responsible ? mapResponsible(responsible as unknown as Record<string, unknown>) : null;
  const mappedProcesses = processes.map(p => ({
    companyId: p.companyId,
    anketaType: p.anketaType ?? undefined,
    status: p.status,
    sections: Object.fromEntries(
      p.sections.map(s => [s.sectionNumber, { data: s.data as Record<string, unknown> }]),
    ),
  }));

  res.json(computeAnketaStatuses(
    companyId,
    mappedCompany as unknown as Parameters<typeof computeAnketaStatuses>[1],
    mappedResp as unknown as Parameters<typeof computeAnketaStatuses>[2],
    mappedProcesses,
    invites,
  ));
});

router.post('/:id/anketa/:anketaType/verify', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = Number(req.params.id);
  const anketaType = String(req.params.anketaType);
  if (!isValidAnketaType(anketaType)) {
    return res.status(400).json({ error: 'Некорректный тип анкеты' });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return res.status(404).json({ error: 'Компания не найдена' });

  const needCheck = await prisma.process.findFirst({
    where: { companyId, anketaType, status: ProcessStatus.NEED_CHECK },
    orderBy: { id: 'desc' },
  });

  if (needCheck) {
    await prisma.process.update({
      where: { id: needCheck.id },
      data: { status: ProcessStatus.VERIFIED },
    });
    await writeAudit(req.userId, 'Process', needCheck.id, 'VERIFY', { anketaType, source: 'anketa_modal' }, req.ip);
    return res.json({ ok: true, status: 'verified', processId: needCheck.id });
  }

  const existing = await prisma.process.findFirst({
    where: { companyId, anketaType },
    orderBy: { id: 'desc' },
  });

  if (existing) {
    await prisma.process.update({
      where: { id: existing.id },
      data: { status: ProcessStatus.VERIFIED },
    });
    await writeAudit(req.userId, 'Process', existing.id, 'VERIFY', { anketaType, source: 'anketa_modal' }, req.ip);
    return res.json({ ok: true, status: 'verified', processId: existing.id });
  }

  const anketaName = MAIN_ANKETA_NAMES[anketaType] || anketaType;
  const created = await prisma.process.create({
    data: {
      companyId,
      name: anketaName,
      tags: ['Анкета'],
      anketaType,
      status: ProcessStatus.VERIFIED,
      sections: {
        create: [{
          sectionNumber: 1,
          sectionName: anketaName,
          status: SectionStatus.FILLED,
          data: {},
        }],
      },
    },
  });
  await writeAudit(req.userId, 'Process', created.id, 'VERIFY', { anketaType, source: 'anketa_modal' }, req.ip);
  res.json({ ok: true, status: 'verified', processId: created.id });
});

router.post('/:id/anketa-invite', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const companyId = Number(req.params.id);
    const body = req.body as { anketaType?: string; email?: string; comment?: string };
    if (!body.anketaType || !isValidAnketaType(body.anketaType)) {
      return res.status(400).json({ error: 'Некорректный тип анкеты' });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ error: 'Компания не найдена' });

    const email = body.email?.trim() || null;
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.anketaInvite.create({
      data: {
        companyId,
        anketaType: body.anketaType,
        token,
        email,
        comment: body.comment?.trim() || null,
        expiresAt,
      },
    });

    await writeAudit(req.userId, 'AnketaInvite', companyId, 'CREATE', { anketaType: body.anketaType, token, email }, req.ip);

    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
    const url = `${baseUrl}/anketa/${token}`;
    const anketaName = MAIN_ANKETA_NAMES[body.anketaType] || body.anketaType;

    let emailSent = false;
    if (email) {
      try {
        const result = await sendAnketaInviteEmail({
          to: email,
          anketaName,
          companyName: company.shortName || company.name,
          url,
          comment: body.comment,
        });
        emailSent = result.sent;
      } catch (err) {
        console.error('[mail] Failed to send anketa invite:', err);
      }
    }

    res.status(201).json({
      token,
      url,
      anketaType: body.anketaType,
      emailSent,
      email,
    });
  } catch (err) {
    console.error('[anketa-invite]', err);
    res.status(500).json({ error: 'Не удалось сформировать ссылку' });
  }
});

router.post('/:id/anketa-invite-all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const companyId = Number(req.params.id);
    const body = req.body as { email?: string; comment?: string };

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ error: 'Компания не найдена' });

    const email = body.email?.trim() || null;
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const comment = body.comment?.trim() || null;

    const anketaTypes = Object.keys(MAIN_ANKETA_NAMES);
    const invites: { anketaType: string; token: string; url: string; name: string }[] = [];

    for (const anketaType of anketaTypes) {
      const token = crypto.randomUUID();
      await prisma.anketaInvite.create({
        data: {
          companyId,
          anketaType,
          token,
          email,
          comment,
          expiresAt,
        },
      });
      invites.push({
        anketaType,
        token,
        url: `${baseUrl}/anketa/${token}`,
        name: MAIN_ANKETA_NAMES[anketaType],
      });
    }

    await writeAudit(
      req.userId,
      'AnketaInvite',
      companyId,
      'CREATE_BULK',
      { anketaTypes, count: invites.length, email },
      req.ip,
    );

    let emailSent = false;
    if (email) {
      try {
        const result = await sendAnketaBulkInviteEmail({
          to: email,
          companyName: company.shortName || company.name,
          invites: invites.map(inv => ({ anketaName: inv.name, url: inv.url })),
          comment: comment ?? undefined,
        });
        emailSent = result.sent;
      } catch (err) {
        console.error('[mail] Failed to send bulk anketa invite:', err);
      }
    }

    res.status(201).json({ invites, emailSent, email });
  } catch (err) {
    console.error('[anketa-invite-all]', err);
    res.status(500).json({ error: 'Не удалось сформировать ссылки' });
  }
});

router.post('/:id/anketa-invite-all/send-email', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = Number(req.params.id);
  const body = req.body as { email?: string; tokens?: string[] };

  const email = body.email?.trim();
  if (!email) return res.status(400).json({ error: 'Email сотрудника обязателен' });

  const tokens = Array.isArray(body.tokens) ? body.tokens.filter(Boolean) : [];
  if (!tokens.length) return res.status(400).json({ error: 'Не указаны приглашения' });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return res.status(404).json({ error: 'Компания не найдена' });

  const invites = await prisma.anketaInvite.findMany({
    where: { companyId, token: { in: tokens } },
  });
  if (!invites.length) return res.status(404).json({ error: 'Приглашения не найдены' });

  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
  const comment = invites[0]?.comment ?? undefined;

  try {
    const result = await sendAnketaBulkInviteEmail({
      to: email,
      companyName: company.shortName || company.name,
      invites: invites.map(inv => ({
        anketaName: MAIN_ANKETA_NAMES[inv.anketaType] || inv.anketaType,
        url: `${baseUrl}/anketa/${inv.token}`,
      })),
      comment: comment ?? undefined,
    });
    if (!result.sent) {
      return res.status(503).json({ error: 'SMTP не настроен', emailSent: false, email });
    }
    await prisma.anketaInvite.updateMany({
      where: { id: { in: invites.map(i => i.id) } },
      data: { email },
    });
    res.json({ emailSent: true, email });
  } catch (err) {
    console.error('[mail] Failed to send bulk anketa invite:', err);
    res.status(502).json({ error: 'Не удалось отправить письмо. Проверьте настройки SMTP.' });
  }
});

router.post('/:id/anketa-invite/:token/send-email', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = Number(req.params.id);
  const token = String(req.params.token);
  const body = req.body as { email?: string };

  const invite = await prisma.anketaInvite.findFirst({
    where: { companyId, token },
  });
  if (!invite) return res.status(404).json({ error: 'Приглашение не найдено' });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return res.status(404).json({ error: 'Not found' });

  const email = body.email?.trim() || invite.email;
  if (!email) return res.status(400).json({ error: 'Email сотрудника обязателен' });

  if (email !== invite.email) {
    await prisma.anketaInvite.update({ where: { id: invite.id }, data: { email } });
  }

  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
  const url = `${baseUrl}/anketa/${token}`;
  const anketaName = MAIN_ANKETA_NAMES[invite.anketaType] || invite.anketaType;

  try {
    const result = await sendAnketaInviteEmail({
      to: email,
      anketaName,
      companyName: company.shortName || company.name,
      url,
      comment: invite.comment ?? undefined,
    });
    if (!result.sent) {
      return res.status(503).json({ error: 'SMTP не настроен', url, emailSent: false, email });
    }
    res.json({ emailSent: true, email, url });
  } catch (err) {
    console.error('[mail] Failed to resend anketa invite:', err);
    res.status(502).json({ error: 'Не удалось отправить письмо. Проверьте настройки SMTP.' });
  }
});

export default router;
