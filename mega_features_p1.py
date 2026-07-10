import os
import json

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. Update v2-client package.json
client_pkg = {
  "name": "v2-client",
  "private": True,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.42.0",
    "lucide-react": "^0.372.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "socket.io-client": "^4.7.5",
    "browser-image-compression": "^2.0.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.1",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.6",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "vite": "^5.2.0"
  }
}
write_file('v2-client/package.json', json.dumps(client_pkg, indent=2))

# 2. Update v2-server package.json
server_pkg = {
  "name": "v2-server",
  "version": "1.0.0",
  "description": "Mertyk KPSS V2 Backend",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "build:client": "cd ../v2-client && npm install && npm run build"
  },
  "dependencies": {
    "express": "^4.19.2",
    "socket.io": "^4.7.5",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "node-cron": "^3.0.3",
    "@supabase/supabase-js": "^2.42.0"
  }
}
write_file('v2-server/package.json', json.dumps(server_pkg, indent=2))

# 3. Add node-cron job to server
cron_js = """import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);

export const initializeCronJobs = () => {
  // Her gece 00:00'da çalışacak
  cron.schedule('0 0 * * *', async () => {
    console.log('⏳ [CRON] Akıllı Tekrar Motoru (Spaced Repetition) çalıştırılıyor...');
    
    // Hatırlatma tarihi bugüne veya öncesine gelmiş ve henüz çözülmemiş soruları bul
    const { data, error } = await supabase
      .from('questions')
      .select('id, user_id')
      .eq('is_solved', false)
      .lte('reminder_date', new Date().toISOString());

    if (error) {
      console.error('❌ [CRON] Hata:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ [CRON] ${data.length} adet sorunun tekrar vakti geldi!`);
      // Gelecekte buraya Push Notification (Bildirim) gönderme kodu eklenecek.
    } else {
      console.log('✅ [CRON] Bugün için tekrar edilecek soru bulunamadı.');
    }
  });
  
  console.log('⚙️ Akıllı Tekrar (Cron) Motoru Başlatıldı.');
};
"""
write_file('v2-server/cron/reminderJob.js', cron_js)

# Update server.js to include cron
server_js = """import express from 'express';
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
"""
write_file('v2-server/server.js', server_js)

# 4. Storage Bucket to Schema
schema_append = """
-- 5. Storage (Depolama Kovası) Ayarları (Görseller için)
-- Eğer bucket yoksa oluştur
insert into storage.buckets (id, name, public) 
values ('question_images', 'question_images', true)
on conflict (id) do nothing;

-- Herkes görsel okuyabilir
create policy "Anyone can read images" on storage.objects for select using (bucket_id = 'question_images');
-- Sadece giriş yapanlar görsel yükleyebilir
create policy "Authenticated users can upload images" on storage.objects for insert with check (bucket_id = 'question_images' and auth.role() = 'authenticated');
-- Sadece yükleyen kendi görselini silebilir
create policy "Users can delete own images" on storage.objects for delete using (bucket_id = 'question_images' and auth.uid() = owner);
"""
with open('v2-server/supabase_schema.sql', 'a', encoding='utf-8') as f:
    f.write(schema_append)

# 5. render.yaml
render_yaml = """services:
  - type: web
    name: mertyk-kpss-v2
    env: node
    plan: free
    rootDir: v2-server
    buildCommand: npm run build:client && npm install
    startCommand: npm start
    envVars:
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
"""
write_file('render.yaml', render_yaml)

print("Mega features script part 1 executed.")
