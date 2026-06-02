import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { findPartyByQuery } from '../utils/dadata';

const router = Router();

router.post('/party', authMiddleware, async (req, res) => {
  const body = req.body as {
    query?: string;
    branch_type?: 'MAIN' | 'BRANCH';
    type?: 'LEGAL' | 'INDIVIDUAL';
    kpp?: string;
  };

  try {
    const data = await findPartyByQuery({
      query: body.query ?? '',
      branch_type: body.branch_type,
      type: body.type,
      kpp: body.kpp,
    });
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка DaData';
    const status = message.includes('не настроен') ? 503 : message.includes('не найдена') ? 404 : 502;
    res.status(status).json({ error: message });
  }
});

export default router;
