import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { JournalStatus, JournalType, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { formatDate, parseDate, writeAudit } from '../utils/helpers';
import { streamZip } from '../utils/zipArchive';

const router = Router();
const MAX_ADDITIONAL_FILES = 20;

const STATUS_MAP: Record<string, JournalStatus> = {
  new: JournalStatus.NEW,
  in_progress: JournalStatus.IN_PROGRESS,
  answered: JournalStatus.ANSWERED,
  closed: JournalStatus.CLOSED,
};

type StoredAdditionalFile = { path: string; name: string };

function parseAdditionalFiles(raw: Prisma.JsonValue | null | undefined): StoredAdditionalFile[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const p = typeof o.path === 'string' ? o.path : '';
      const n = typeof o.name === 'string' ? o.name : path.basename(p);
      if (!p || !fs.existsSync(p)) return null;
      return { path: p, name: n };
    })
    .filter((x): x is StoredAdditionalFile => x !== null);
}

function hasAnswerFileStored(answerFile: string | null) {
  return Boolean(answerFile && fs.existsSync(answerFile));
}

function mapJournalEntry(j: {
  id: number;
  companyId: number;
  type: JournalType;
  dateIn: Date;
  dateOut: Date | null;
  sender: string;
  content: string;
  contentFile: string | null;
  answer: string | null;
  answerFile: string | null;
  additionalFiles: Prisma.JsonValue | null;
  status: JournalStatus;
}) {
  const additional = parseAdditionalFiles(j.additionalFiles);
  const hasAnswerFile = hasAnswerFileStored(j.answerFile);
  const dbStatus = j.status === JournalStatus.IN_PROGRESS ? 'in_progress' : j.status.toLowerCase();
  const displayStatus = hasAnswerFile ? dbStatus : 'waiting_answer';

  return {
    id: j.id,
    companyId: j.companyId,
    type: j.type.toLowerCase(),
    dateIn: formatDate(j.dateIn),
    dateOut: formatDate(j.dateOut),
    sender: j.sender,
    content: j.content,
    answer: j.answer ?? '',
    status: dbStatus,
    displayStatus,
    hasContentFile: Boolean(j.contentFile && fs.existsSync(j.contentFile)),
    hasAnswerFile,
    contentFileName: j.contentFile ? path.basename(j.contentFile) : null,
    answerFileName: j.answerFile ? path.basename(j.answerFile) : null,
    additionalFiles: additional.map((f, index) => ({ name: f.name, index })),
  };
}

router.get('/', authMiddleware, async (req, res) => {
  const type = req.query.type as string | undefined;
  const entries = await prisma.journalEntry.findMany({
    where: type ? { type: type.toUpperCase() as JournalType } : undefined,
    include: { company: true },
    orderBy: { dateIn: 'desc' },
  });
  res.json(entries.map(mapJournalEntry));
});

router.post('/', authMiddleware, upload.fields([
  { name: 'contentFile', maxCount: 1 },
  { name: 'answerFile', maxCount: 1 },
]), async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, string>;
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const companyId = Number(body.companyId);
    if (!companyId || Number.isNaN(companyId)) {
      return res.status(400).json({ error: 'Укажите компанию' });
    }
    if (!body.sender?.trim()) {
      return res.status(400).json({ error: 'Укажите заявителя' });
    }
    if (!body.content?.trim()) {
      return res.status(400).json({ error: 'Укажите содержание запроса' });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        companyId,
        type: (body.type?.toUpperCase() ?? 'SUBJECT') as JournalType,
        dateIn: parseDate(body.dateIn) ?? new Date(),
        dateOut: parseDate(body.dateOut),
        sender: body.sender.trim(),
        content: body.content.trim(),
        answer: body.answer ?? null,
        contentFile: files?.contentFile?.[0]?.path ?? null,
        answerFile: files?.answerFile?.[0]?.path ?? null,
        status: STATUS_MAP[body.status ?? 'new'] ?? JournalStatus.NEW,
        additionalFiles: [],
      },
    });
    await writeAudit(req.userId, 'JournalEntry', entry.id, 'CREATE', { sender: entry.sender }, req.ip);
    res.status(201).json(mapJournalEntry(entry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось сохранить обращение' });
  }
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
      status: body.status
        ? (STATUS_MAP[body.status as string] ?? existing.status)
        : existing.status,
    },
  });
  await writeAudit(req.userId, 'JournalEntry', id, 'UPDATE', { answer: updated.answer }, req.ip);
  res.json(mapJournalEntry(updated));
});

router.post('/:id/files', authMiddleware, upload.fields([
  { name: 'contentFile', maxCount: 1 },
  { name: 'answerFile', maxCount: 1 },
]), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const kind = (req.body as { kind?: string }).kind || 'answer';
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const file = kind === 'content' ? files?.contentFile?.[0] : files?.answerFile?.[0];
  if (!file) return res.status(400).json({ error: 'File required' });

  const existing = await prisma.journalEntry.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const field = kind === 'content' ? 'contentFile' : 'answerFile';
  const oldPath = existing[field];
  if (oldPath && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

  const updateData: {
    contentFile?: string;
    answerFile?: string;
    dateOut?: Date;
    status?: JournalStatus;
  } = { [field]: file.path };

  if (kind === 'answer') {
    updateData.dateOut = existing.dateOut ?? new Date();
    updateData.status = JournalStatus.ANSWERED;
  }

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: updateData,
  });
  res.json(mapJournalEntry(updated));
});

router.post(
  '/:id/additional-files',
  authMiddleware,
  upload.array('files', MAX_ADDITIONAL_FILES),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const uploaded = req.files as Express.Multer.File[] | undefined;
    if (!uploaded?.length) return res.status(400).json({ error: 'Выберите файлы' });

    const existing = await prisma.journalEntry.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const current = parseAdditionalFiles(existing.additionalFiles);
    if (current.length + uploaded.length > MAX_ADDITIONAL_FILES) {
      uploaded.forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res.status(400).json({
        error: `Можно прикрепить не более ${MAX_ADDITIONAL_FILES} дополнительных файлов`,
      });
    }

    const merged: StoredAdditionalFile[] = [
      ...current,
      ...uploaded.map(f => ({ path: f.path, name: f.originalname || path.basename(f.path) })),
    ];

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: { additionalFiles: merged as unknown as Prisma.InputJsonValue },
    });
    await writeAudit(req.userId, 'JournalEntry', id, 'UPLOAD_ADDITIONAL', { count: uploaded.length }, req.ip);
    res.json(mapJournalEntry(updated));
  },
);

router.get('/:id/files/:kind/download', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const kind = req.params.kind;
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry) return res.status(404).json({ error: 'Not found' });

  const filePath = kind === 'content' ? entry.contentFile : entry.answerFile;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Файл не найден' });
  }
  res.download(path.resolve(filePath), path.basename(filePath));
});

router.get('/:id/additional-files/:index/download', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const index = Number(req.params.index);
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry) return res.status(404).json({ error: 'Not found' });

  const files = parseAdditionalFiles(entry.additionalFiles);
  const file = files[index];
  if (!file) return res.status(404).json({ error: 'Файл не найден' });
  res.download(path.resolve(file.path), file.name);
});

router.get('/:id/archive', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry) return res.status(404).json({ error: 'Not found' });

  const files: { path: string; name: string }[] = [];
  if (entry.contentFile && fs.existsSync(entry.contentFile)) {
    files.push({ path: entry.contentFile, name: `obraschenie-${path.basename(entry.contentFile)}` });
  }
  if (entry.answerFile && fs.existsSync(entry.answerFile)) {
    files.push({ path: entry.answerFile, name: `otvet-${path.basename(entry.answerFile)}` });
  }
  parseAdditionalFiles(entry.additionalFiles).forEach((f, i) => {
    files.push({ path: f.path, name: `dop-${i + 1}-${f.name}` });
  });

  streamZip(res, `journal-${id}.zip`, files);
});

router.delete('/:id/files/:kind', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const kind = req.params.kind;
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry) return res.status(404).json({ error: 'Not found' });

  const field = kind === 'content' ? 'contentFile' : 'answerFile';
  const filePath = entry[field];
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const updateData: {
    contentFile?: string | null;
    answerFile?: string | null;
    status?: JournalStatus;
    dateOut?: Date | null;
  } = { [field]: null };

  if (kind === 'answer') {
    updateData.status = JournalStatus.NEW;
    updateData.dateOut = null;
  }

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: updateData,
  });
  await writeAudit(req.userId, 'JournalEntry', id, 'DELETE_FILE', { kind }, req.ip);
  res.json(mapJournalEntry(updated));
});

router.delete('/:id/additional-files/:index', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const index = Number(req.params.index);
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry) return res.status(404).json({ error: 'Not found' });

  const files = parseAdditionalFiles(entry.additionalFiles);
  const target = files[index];
  if (!target) return res.status(404).json({ error: 'Файл не найден' });

  if (fs.existsSync(target.path)) fs.unlinkSync(target.path);
  files.splice(index, 1);

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: { additionalFiles: files as unknown as Prisma.InputJsonValue },
  });
  await writeAudit(req.userId, 'JournalEntry', id, 'DELETE_ADDITIONAL', { index }, req.ip);
  res.json(mapJournalEntry(updated));
});

export default router;
