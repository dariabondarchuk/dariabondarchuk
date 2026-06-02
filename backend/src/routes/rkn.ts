import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { formatDate, writeAudit } from '../utils/helpers';

const router = Router();

router.get('/', authMiddleware, async (_req, res) => {
  const items = await prisma.rknNotification.findMany({
    include: { company: true, documents: { orderBy: { version: 'desc' } } },
    orderBy: { id: 'asc' },
  });
  res.json(items.map(n => ({
    id: n.id,
    companyId: n.companyId,
    dateSubmit: formatDate(n.submitDate),
    dateChange: formatDate(n.changeDate),
    status: n.status === 'SUBMITTED' ? 'submitted' : n.status === 'NOT_SUBMITTED' ? 'not_submitted' : 'needs_update',
    files: n.documents.map(d => ({
      id: d.id,
      name: d.fileName,
      date: formatDate(d.uploadDate),
      current: d.isCurrent,
    })),
  })));
});

router.post('/:id/documents', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  const notificationId = Number(req.params.id);
  const notification = await prisma.rknNotification.findUnique({ where: { id: notificationId } });
  if (!notification) return res.status(404).json({ error: 'Not found' });
  if (!req.file) return res.status(400).json({ error: 'File required' });

  const maxVersion = await prisma.rknDocument.aggregate({
    where: { notificationId },
    _max: { version: true },
  });

  await prisma.rknDocument.updateMany({
    where: { notificationId, isCurrent: true },
    data: { isCurrent: false },
  });

  const doc = await prisma.rknDocument.create({
    data: {
      notificationId,
      fileName: req.file.originalname,
      filePath: req.file.path,
      isCurrent: true,
      version: (maxVersion._max.version ?? 0) + 1,
    },
  });

  await writeAudit(req.userId, 'RknDocument', doc.id, 'CREATE', { fileName: doc.fileName }, req.ip);
  res.status(201).json(doc);
});

router.get('/:id/documents/:docId/download', authMiddleware, async (req, res) => {
  const docId = Number(req.params.docId);
  const doc = await prisma.rknDocument.findUnique({ where: { id: docId } });
  if (!doc || !fs.existsSync(doc.filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(path.resolve(doc.filePath), doc.fileName);
});

router.delete('/:id/documents/:docId', authMiddleware, async (req: AuthRequest, res) => {
  const docId = Number(req.params.docId);
  const doc = await prisma.rknDocument.findUnique({ where: { id: docId } });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
  await prisma.rknDocument.delete({ where: { id: docId } });
  await writeAudit(req.userId, 'RknDocument', docId, 'DELETE', {}, req.ip);
  res.json({ ok: true });
});

export default router;
