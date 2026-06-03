import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { formatDate, parseDate, writeAudit } from '../utils/helpers';
import { streamZip } from '../utils/zipArchive';
import { createRknNotificationForCompany, mapRknNotificationRow } from '../utils/createRknNotification';

const router = Router();

function parseRuDate(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const m = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return parseDate(trimmed);
}

router.get('/', authMiddleware, async (_req, res) => {
  const items = await prisma.rknNotification.findMany({
    include: { company: true, documents: { orderBy: { version: 'desc' } } },
    orderBy: { id: 'asc' },
  });
  res.json(items.map(n => mapRknNotificationRow(n)));
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const body = req.body as { companyId?: number };
  const companyId = Number(body.companyId);
  if (!companyId || Number.isNaN(companyId)) {
    return res.status(400).json({ error: 'Выберите компанию' });
  }

  const result = await createRknNotificationForCompany(companyId, { userId: req.userId, ip: req.ip });
  res.status(result.status).json(result.body);
});

router.post('/notifications', authMiddleware, async (req: AuthRequest, res) => {
  const body = req.body as { companyId?: number };
  const companyId = Number(body.companyId);
  if (!companyId || Number.isNaN(companyId)) {
    return res.status(400).json({ error: 'Выберите компанию' });
  }

  const result = await createRknNotificationForCompany(companyId, { userId: req.userId, ip: req.ip });
  res.status(result.status).json(result.body);
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const body = req.body as { dateSubmit?: string | null; dateChange?: string | null };
  const existing = await prisma.rknNotification.findUnique({
    where: { id },
    include: { documents: { orderBy: { version: 'desc' } } },
  });
  if (!existing) return res.status(404).json({ error: 'Уведомление не найдено' });

  const hasDocuments = existing.documents.length > 0;
  const updated = await prisma.rknNotification.update({
    where: { id },
    data: {
      submitDate: body.dateSubmit !== undefined
        ? (body.dateSubmit ? parseRuDate(body.dateSubmit) : null)
        : existing.submitDate,
      changeDate: body.dateChange !== undefined
        ? (body.dateChange ? parseRuDate(body.dateChange) : null)
        : existing.changeDate,
      status: hasDocuments ? 'SUBMITTED' : 'NOT_SUBMITTED',
    },
    include: { documents: { orderBy: { version: 'desc' } } },
  });

  await writeAudit(req.userId, 'RknNotification', id, 'UPDATE', {
    dateSubmit: formatDate(updated.submitDate),
    dateChange: formatDate(updated.changeDate),
  }, req.ip);
  res.json(mapRknNotificationRow(updated));
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.rknNotification.findUnique({
    where: { id },
    include: { documents: true },
  });
  if (!existing) return res.status(404).json({ error: 'Уведомление не найдено' });

  for (const doc of existing.documents) {
    if (doc.filePath && fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
  }
  await prisma.rknNotification.delete({ where: { id } });
  await writeAudit(req.userId, 'RknNotification', id, 'DELETE', { companyId: existing.companyId }, req.ip);
  res.json({ ok: true });
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

  const nextVersion = (maxVersion._max.version ?? 0) + 1;

  const doc = await prisma.rknDocument.create({
    data: {
      notificationId,
      fileName: req.file.originalname,
      filePath: req.file.path,
      isCurrent: true,
      version: nextVersion,
    },
  });

  await prisma.rknNotification.update({
    where: { id: notificationId },
    data: {
      status: 'SUBMITTED',
      submitDate: nextVersion === 1 ? new Date() : notification.submitDate ?? new Date(),
      changeDate: nextVersion > 1 ? new Date() : notification.changeDate,
    },
  });

  await writeAudit(req.userId, 'RknDocument', doc.id, 'CREATE', { fileName: doc.fileName, version: nextVersion }, req.ip);

  const refreshed = await prisma.rknNotification.findUnique({
    where: { id: notificationId },
    include: { documents: { orderBy: { version: 'desc' } } },
  });
  res.status(201).json({
    document: doc,
    notification: refreshed ? mapRknNotificationRow(refreshed) : null,
  });
});

router.get('/:id/documents/archive', authMiddleware, async (req, res) => {
  const notificationId = Number(req.params.id);
  const notification = await prisma.rknNotification.findUnique({
    where: { id: notificationId },
    include: { company: true, documents: { orderBy: { version: 'desc' } } },
  });
  if (!notification) return res.status(404).json({ error: 'Not found' });

  const label = notification.company.shortName || notification.company.name || `rkn-${notificationId}`;
  streamZip(
    res,
    `${label}-rkn.zip`,
    notification.documents.map(d => ({ path: d.filePath, name: d.fileName })),
  );
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

  const remaining = await prisma.rknDocument.count({ where: { notificationId: doc.notificationId } });
  const notification = await prisma.rknNotification.findUnique({
    where: { id: doc.notificationId },
    include: { documents: { orderBy: { version: 'desc' } } },
  });
  if (notification) {
    if (remaining === 0) {
      await prisma.rknNotification.update({
        where: { id: doc.notificationId },
        data: { status: 'NOT_SUBMITTED', submitDate: null, changeDate: null },
      });
    } else if (doc.isCurrent) {
      const latest = await prisma.rknDocument.findFirst({
        where: { notificationId: doc.notificationId },
        orderBy: { version: 'desc' },
      });
      if (latest) {
        await prisma.rknDocument.update({ where: { id: latest.id }, data: { isCurrent: true } });
      }
    }
    const refreshed = await prisma.rknNotification.findUnique({
      where: { id: doc.notificationId },
      include: { documents: { orderBy: { version: 'desc' } } },
    });
    return res.json({
      ok: true,
      notification: refreshed ? mapRknNotificationRow(refreshed) : null,
    });
  }
  res.json({ ok: true });
});

export default router;
