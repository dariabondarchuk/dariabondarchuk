import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
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

app.use(cors({ origin: 'http://localhost:5173' }));
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

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
