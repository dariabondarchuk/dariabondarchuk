import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { formatDate, writeAudit } from '../utils/helpers';

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
