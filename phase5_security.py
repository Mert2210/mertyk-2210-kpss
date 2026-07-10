import os
import json

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. Update v2-server package.json with security packages
with open('v2-server/package.json', 'r', encoding='utf-8') as f:
    server_pkg = json.load(f)

server_pkg['dependencies']['helmet'] = '^7.1.0'
server_pkg['dependencies']['express-rate-limit'] = '^7.2.0'

write_file('v2-server/package.json', json.dumps(server_pkg, indent=2))

# 2. Update server.js with Helmet and Rate Limit
server_js = """import express from 'express';
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  res.json({ status: 'V2 Ultimate Server is SECURE and running perfectly!' });
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
  console.log(`🚀 V2 Ultimate Server running securely on port ${PORT}`);
});
"""
write_file('v2-server/server.js', server_js)

# 3. Update supabase_schema.sql for Storage Security
schema_append = """
-- 7. SİBER GÜVENLİK: Karakter Kısıtlamaları (Veritabanı Şişirme Engelleme)
alter table public.classes drop constraint if exists classes_name_check;
alter table public.classes add constraint classes_name_check check (char_length(name) <= 255);

alter table public.questions drop constraint if exists questions_subject_check;
alter table public.questions add constraint questions_subject_check check (char_length(subject) <= 255);

-- 8. SİBER GÜVENLİK: Storage Virüs (Malware) Koruması
-- Sadece JPEG, PNG ve WEBP formatındaki resimlerin yüklenmesine izin ver.
drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images SECURE" 
on storage.objects for insert 
with check (
  bucket_id = 'question_images' 
  and auth.role() = 'authenticated'
  and (storage.extension(name) = 'jpg' or storage.extension(name) = 'jpeg' or storage.extension(name) = 'png' or storage.extension(name) = 'webp')
);
"""
with open('v2-server/supabase_schema.sql', 'a', encoding='utf-8') as f:
    f.write(schema_append)

print("Security audit fixes applied.")
