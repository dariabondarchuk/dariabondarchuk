import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { mapCompany, mapResponsible, parseDate, writeAudit } from '../utils/helpers';

const router = Router();

router.get('/', authMiddleware, async (_req, res) => {
  const companies = await prisma.company.findMany({
    include: { responsibles: true },
    orderBy: { id: 'asc' },
  });
  res.json(companies.map(mapCompany));
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
    contactEmail: (body.contactEmail as string) ?? existing.contactEmail,
    offices: (body.offices ?? existing.offices) as Prisma.InputJsonValue,
    sites: (body.sites ?? existing.sites) as Prisma.InputJsonValue,
    apps: (body.apps ?? existing.apps) as Prisma.InputJsonValue,
  };

  const updated = await prisma.company.update({ where: { id }, data });
  await writeAudit(req.userId, 'Company', id, 'UPDATE', { old: existing, new: updated }, req.ip);
  res.json(mapCompany(updated as unknown as Record<string, unknown>));
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

export default router;
