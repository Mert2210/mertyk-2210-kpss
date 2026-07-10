import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

server_js = """import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSockets } from './sockets/index.js';

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

// API Rotaları (Örnek)
app.get('/api/health', (req, res) => {
  res.json({ status: 'V2 Ultimate Server is running perfectly!' });
});

// React Ön Yüzü Sunma (Monorepo Entegrasyonu)
// V2-Client build edildikten sonra 'dist' klasörünü sunar
const clientBuildPath = path.join(__dirname, '../v2-client/dist');
app.use(express.static(clientBuildPath));

// React Router'ın çalışması için her isteği index.html'e yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Socket.io Başlatma
initializeSockets(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 V2 Ultimate Server running on port ${PORT}`);
});
"""
write_file('v2-server/server.js', server_js)

# Update v2-server package.json to include a build script for Render
package_json = """{
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
    "dotenv": "^16.4.5"
  }
}
"""
write_file('v2-server/package.json', package_json)

print("Monorepo server integration complete.")
