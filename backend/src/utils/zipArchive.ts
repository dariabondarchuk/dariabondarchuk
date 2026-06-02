import archiver from 'archiver';
import fs from 'fs';
import type { Response } from 'express';

export function streamZip(
  res: Response,
  filename: string,
  files: { path: string; name: string }[],
) {
  const existing = files.filter(f => fs.existsSync(f.path));
  if (existing.length === 0) {
    res.status(404).json({ error: 'Нет файлов для архивации' });
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  });
  archive.pipe(res);
  for (const file of existing) {
    archive.file(file.path, { name: file.name });
  }
  void archive.finalize();
}
