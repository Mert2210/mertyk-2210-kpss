import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSockets } from './sockets/index.js';
import { initializeCronJobs } from './cron/reminderJob.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// API Rotaları
app.get('/api/health', (req, res) => {
  res.json({ status: 'V2 Ultimate Server is running perfectly!' });
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

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 V2 Ultimate Server running on port ${PORT}`);
});
