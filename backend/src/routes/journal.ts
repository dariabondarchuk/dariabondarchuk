import { Router } from 'express';
import { JournalStatus, JournalType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { formatDate, parseDate, writeAudit } from '../utils/helpers';

const router = Router();

const STATUS_MAP: Record<string, JournalStatus> = {
  new: JournalStatus.NEW,
  in_progress: JournalStatus.IN_PROGRESS,
  answered: JournalStatus.ANSWERED,
  closed: JournalStatus.CLOSED,
};

router.get('/', authMiddleware, async (req, res) => {
  const type = req.query.type as string | undefined;
  const entries = await prisma.journalEntry.findMany({
    where: type ? { type: type.toUpperCase() as JournalType } : undefined,
    include: { company: true },
    orderBy: { dateIn: 'desc' },
  });
  res.json(entries.map(j => ({
    id: j.id,
    companyId: j.companyId,
    type: j.type.toLowerCase(),
    dateIn: formatDate(j.dateIn),
    dateOut: formatDate(j.dateOut),
    sender: j.sender,
    content: j.content,
    answer: j.answer ?? '',
    status: j.status === JournalStatus.IN_PROGRESS ? 'in_progress' : j.status.toLowerCase(),
  })));
});

router.post('/', authMiddleware, upload.fields([
  { name: 'contentFile', maxCount: 1 },
  { name: 'answerFile', maxCount: 1 },
]), async (req: AuthRequest, res) => {
  const body = req.body as Record<string, string>;
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const entry = await prisma.journalEntry.create({
    data: {
      companyId: Number(body.companyId),
      type: (body.type?.toUpperCase() ?? 'SUBJECT') as JournalType,
      dateIn: parseDate(body.dateIn) ?? new Date(),
      dateOut: parseDate(body.dateOut),
      sender: body.sender ?? '',
      content: body.content ?? '',
      answer: body.answer ?? null,
      contentFile: files?.contentFile?.[0]?.path ?? null,
      answerFile: files?.answerFile?.[0]?.path ?? null,
      status: STATUS_MAP[body.status ?? 'new'] ?? JournalStatus.NEW,
    },
  });
  await writeAudit(req.userId, 'JournalEntry', entry.id, 'CREATE', { sender: entry.sender }, req.ip);
  res.status(201).json(entry);
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const existing = await prisma.journalEntry.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: {
      answer: (body.answer as string) ?? existing.answer,
      dateOut: body.dateOut !== undefined ? parseDate(body.dateOut as string) : existing.dateOut,
      status: body.status ? (STATUS_MAP[body.status as string] ?? existing.status) : existing.status,
    },
  });
  await writeAudit(req.userId, 'JournalEntry', id, 'UPDATE', { answer: updated.answer }, req.ip);
  res.json(updated);
});

router.post('/:id/files', authMiddleware, upload.single('answerFile'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!req.file) return res.status(400).json({ error: 'File required' });
  const updated = await prisma.journalEntry.update({
    where: { id },
    data: { answerFile: req.file.path },
  });
  res.json(updated);
});

export default router;
