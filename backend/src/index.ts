import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/auth';
import companiesRoutes from './routes/companies';
import processesRoutes from './routes/processes';
import rknRoutes from './routes/rkn';
import journalRoutes from './routes/journal';
import monitorRoutes from './routes/monitor';
import documentsRoutes from './routes/documents';
import auditRoutes from './routes/audit';
import dadataRoutes from './routes/dadata';
import publicSurveyRoutes from './routes/publicSurvey';
import publicAnketaRoutes from './routes/publicAnketa';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const uploadDir = process.env.UPLOAD_DIR || './uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({ origin: process.env.PUBLIC_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/public', publicSurveyRoutes);
app.use('/api/public', publicAnketaRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/processes', processesRoutes);
app.use('/api/rkn', rknRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dadata', dadataRoutes);

// В продакшене раздаём собранный фронтенд
// dist/src/index.js → ../../../frontend/dist
// src/index.ts (ts-node) → ../../frontend/dist
// cwd=backend → ../frontend/dist
const frontendCandidates = [
  path.join(__dirname, '../../../frontend/dist'),
  path.join(__dirname, '../../frontend/dist'),
  path.join(process.cwd(), '../frontend/dist'),
  path.join(process.cwd(), 'frontend/dist'),
];
const frontendPath =
  frontendCandidates.find((p) => fs.existsSync(path.join(p, 'index.html'))) ?? null;

if (frontendPath) {
  console.log(`Serving frontend from ${frontendPath}`);
  app.use(express.static(frontendPath));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  console.warn('Frontend dist not found; API-only mode');
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
});
