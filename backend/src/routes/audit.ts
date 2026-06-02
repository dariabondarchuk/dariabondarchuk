import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const entityType = req.query.entityType as string | undefined;

  const logs = await prisma.auditLog.findMany({
    where: entityType ? { entityType } : undefined,
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  res.json(logs);
});

export default router;
