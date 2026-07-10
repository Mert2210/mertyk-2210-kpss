import os
import json

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

os.makedirs('v2-server', exist_ok=True)

# 1. package.json
package_json = {
  "name": "v2-server",
  "version": "1.0.0",
  "description": "Mertyk KPSS V2 Backend",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "socket.io": "^4.7.5",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5"
  }
}
write_file('v2-server/package.json', json.dumps(package_json, indent=2))

# 2. server.js (Entry Point)
server_js = """import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeSockets } from './sockets/index.js';

dotenv.config();

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

app.get('/health', (req, res) => {
  res.json({ status: 'V2 Server is running smoothly!' });
});

// Initialize real-time features
initializeSockets(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 V2 Server running on port ${PORT}`);
});
"""
write_file('v2-server/server.js', server_js)

# 3. sockets/index.js (Socket Controller)
sockets_index_js = """export function initializeSockets(io) {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
"""
write_file('v2-server/sockets/index.js', sockets_index_js)

# 4. .env.example
env_example = """PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
"""
write_file('v2-server/.env.example', env_example)

print("V2 Server initialized successfully.")
