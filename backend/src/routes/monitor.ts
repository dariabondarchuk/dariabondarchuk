import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { formatDate, parseDate, writeAudit } from '../utils/helpers';

const router = Router();

router.get('/', authMiddleware, async (_req, res) => {
  const events = await prisma.monitorEvent.findMany({
    include: { company: true },
    orderBy: { eventDate: 'desc' },
  });
  res.json(events.map(e => ({
    id: e.id,
    date: formatDate(e.eventDate),
    companyId: e.companyId,
    type: e.eventType,
    old: e.oldValue ?? '',
    newVal: e.newValue ?? '',
    read: e.isRead,
  })));
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const body = req.body as {
    companyId?: number;
    eventDate?: string;
    eventType?: string;
    oldValue?: string;
    newValue?: string;
  };

  if (!body.companyId || !body.eventType?.trim()) {
    return res.status(400).json({ error: 'Укажите компанию и тип изменения' });
  }

  const company = await prisma.company.findUnique({ where: { id: Number(body.companyId) } });
  if (!company) return res.status(404).json({ error: 'Компания не найдена' });

  const event = await prisma.monitorEvent.create({
    data: {
      companyId: company.id,
      eventDate: parseDate(body.eventDate) ?? new Date(),
      eventType: body.eventType.trim(),
      oldValue: body.oldValue?.trim() || null,
      newValue: body.newValue?.trim() || null,
      isRead: false,
    },
  });

  await writeAudit(req.userId, 'MonitorEvent', event.id, 'CREATE', {
    eventType: event.eventType,
    companyId: event.companyId,
  }, req.ip);

  res.status(201).json({
    id: event.id,
    date: formatDate(event.eventDate),
    companyId: event.companyId,
    type: event.eventType,
    old: event.oldValue ?? '',
    newVal: event.newValue ?? '',
    read: event.isRead,
  });
});

router.put('/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.monitorEvent.update({
    where: { id },
    data: { isRead: true },
  });
  await writeAudit(req.userId, 'MonitorEvent', id, 'UPDATE', { isRead: true }, req.ip);
  res.json(updated);
});

export default router;
