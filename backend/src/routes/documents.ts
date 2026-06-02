import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { formatDate, writeAudit } from '../utils/helpers';
import { streamZip } from '../utils/zipArchive';

const router = Router();

function mapDocument(doc: { id: number; companyId: number; name: string; type: string; filePath: string | null; uploadDate: Date | null }) {
  return {
    id: doc.id,
    companyId: doc.companyId,
    name: doc.name,
    type: doc.type,
    filePath: doc.filePath,
    uploadDate: formatDate(doc.uploadDate),
    hasFile: Boolean(doc.filePath),
  };
}

router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
  const docs = await prisma.generatedDocument.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { id: 'asc' },
  });
  res.json(docs.map(mapDocument));
});

router.get('/archive', authMiddleware, async (req, res) => {
  const companyId = Number(req.query.companyId);
  if (!companyId) return res.status(400).json({ error: 'Укажите companyId' });

  const types = req.query.types
    ? String(req.query.types).split(',').map(t => t.trim()).filter(Boolean)
    : undefined;

  const docs = await prisma.generatedDocument.findMany({
    where: {
      companyId,
      filePath: { not: null },
      ...(types?.length ? { type: { in: types } } : {}),
    },
    orderBy: { id: 'asc' },
  });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const label = company?.shortName || company?.name || `company-${companyId}`;
  streamZip(
    res,
    `${label}-documents.zip`,
    docs
      .filter(d => d.filePath)
      .map(d => ({ path: d.filePath!, name: path.basename(d.filePath!) })),
  );
});

router.post('/', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  const body = req.body as { companyId?: string; name?: string; type?: string };
  const companyId = Number(body.companyId);
  if (!companyId || !body.name?.trim() || !body.type?.trim()) {
    return res.status(400).json({ error: 'Укажите компанию, название и тип документа' });
  }
  if (!req.file) return res.status(400).json({ error: 'Прикрепите файл' });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return res.status(404).json({ error: 'Компания не найдена' });

  const doc = await prisma.generatedDocument.create({
    data: {
      companyId,
      name: body.name.trim(),
      type: body.type.trim(),
      filePath: req.file.path,
      uploadDate: new Date(),
    },
  });

  await writeAudit(req.userId, 'GeneratedDocument', doc.id, 'CREATE', { name: doc.name, type: doc.type }, req.ip);
  res.status(201).json(mapDocument(doc));
});

router.put('/:id', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const body = req.body as { name?: string };
  const existing = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Документ не найден' });
  if (!req.file) return res.status(400).json({ error: 'Прикрепите файл' });

  if (existing.filePath && fs.existsSync(existing.filePath)) {
    fs.unlinkSync(existing.filePath);
  }

  const updated = await prisma.generatedDocument.update({
    where: { id },
    data: {
      name: body.name?.trim() || existing.name,
      filePath: req.file.path,
      uploadDate: new Date(),
    },
  });

  await writeAudit(req.userId, 'GeneratedDocument', id, 'UPDATE', { name: updated.name }, req.ip);
  res.json(mapDocument(updated));
});

router.get('/:id/download', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const doc = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!doc?.filePath || !fs.existsSync(doc.filePath)) {
    return res.status(404).json({ error: 'Файл не найден' });
  }
  res.download(path.resolve(doc.filePath), path.basename(doc.filePath));
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const doc = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!doc) return res.status(404).json({ error: 'Документ не найден' });
  if (doc.filePath && fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
  await prisma.generatedDocument.delete({ where: { id } });
  await writeAudit(req.userId, 'GeneratedDocument', id, 'DELETE', { name: doc.name }, req.ip);
  res.json({ ok: true });
});

export default router;
