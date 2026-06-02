import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
  const docs = await prisma.generatedDocument.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { id: 'asc' },
  });
  res.json(docs);
});

export default router;
