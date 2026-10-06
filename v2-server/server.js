import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSockets } from './sockets/index.js';
import { initializeCronJobs } from './cron/reminderJob.js';
import { buildHealthPayload, getStartupDiagnostics } from './config.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const startedAt = Date.now();
const diagnostics = getStartupDiagnostics(process.env);

const app = express();
const httpServer = createServer(app);

// 🛡️ SİBER GÜVENLİK: Kalkan (Helmet) - HTTP Başlıklarını gizler ve korur
app.use(helmet({
  contentSecurityPolicy: false, // React frontend için şimdilik kapalı
  crossOriginEmbedderPolicy: false
}));

// 🛡️ SİBER GÜVENLİK: API DDoS ve Brute Force Koruması
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 100, // 1 IP'den dakikada max 100 istek
  message: 'Çok fazla istek atıldı. Lütfen biraz bekleyin.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 🛡️ SİBER GÜVENLİK: CORS Ayarları (Sadece izinli domainler)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://mertyk-kpss.onrender.com', 'https://your-custom-domain.com'] 
    : '*',
  methods: ['GET', 'POST']
}));

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://mertyk-kpss.onrender.com', 'https://your-custom-domain.com'] 
      : '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json({ limit: '1mb' })); // 🛡️ SİBER GÜVENLİK: Dev payloadları engelle

// API Rotaları
app.get('/api/health', (req, res) => {
  res.status(200).json(buildHealthPayload({ diagnostics, startedAt }));
});

// React Ön Yüzü Sunma
const clientBuildPath = path.join(__dirname, '../v2-client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Soketleri Başlat
initializeSockets(io);

// Gece Yarısı Hatırlatma Motorunu Başlat
initializeCronJobs();

diagnostics.warnings.forEach((warning) => {
  const level = diagnostics.isProduction && warning.includes('incomplete') ? console.error : console.warn;
  level(`⚠️ [startup] ${warning}`);
});

httpServer.listen(diagnostics.port, () => {
  console.log(`🚀 V2 Ultimate Server running securely on port ${diagnostics.port} (env=${diagnostics.nodeEnv})`);
  console.log(`ℹ️ [startup] Supabase configured: ${diagnostics.supabase.hasConfig ? 'yes' : 'no'}`);
});
