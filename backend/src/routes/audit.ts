import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authMiddleware } from '../middleware/auth';
import { ENTITY_LABELS, formatAuditLogRow } from '../utils/auditLabels';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const entityType = typeof req.query.entityType === 'string' && req.query.entityType.trim()
    ? req.query.entityType.trim()
    : undefined;

  const where = entityType ? { entityType } : {};

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
  ]);

  res.json({
    total,
    items: logs.map(formatAuditLogRow),
  });
});

router.get('/entity-types', authMiddleware, async (_req, res) => {
  const rows = await prisma.auditLog.findMany({
    distinct: ['entityType'],
    select: { entityType: true },
    orderBy: { entityType: 'asc' },
  });
  res.json(
    rows.map(r => ({
      value: r.entityType,
      label: ENTITY_LABELS[r.entityType] ?? r.entityType,
    })),
  );
});

export default router;
