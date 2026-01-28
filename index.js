const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const server = http.createServer(app);

// --- ⚙️ SOCKET.IO AYARLARI (Kurumsal Ağlar İçin İyileştirildi) ---
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["polling", "websocket"]
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/ping", (req, res) => {
    res.send("Pong! Sunucu Aktif.");
});

// --- 🛠️ SORU YÜKLEME VE KAYDETME SİSTEMİ ---
let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');

function sorulariYukle() {
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            let rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8');
            tumSorular = JSON.parse(rawData);
            console.log(`✅ ${tumSorular.length} soru yüklendi.`);
        } catch (err) {
            console.error("❌ Soru dosyası okunamadı!");
            tumSorular = [{ "soru": "Sistem Hatası", "ders": "HATA", "siklar": ["Tamam"], "dogru": 0 }];
        }
    }
}
sorulariYukle();

// --- 📱 WHATSAPP BOT ENTEGRASYONU ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📱 WhatsApp QR Kodunu taratın!');
});

client.on('ready', () => console.log('✅ WhatsApp Botu Aktif!'));

const wpSessions = {};

client.on('message', async (msg) => {
    const user = msg.from;
    const text = msg.body.toLocaleLowerCase('tr').trim();

    if (text === 'soru') {
        const randomIdx = Math.floor(Math.random() * tumSorular.length);
        const soru = tumSorular[randomIdx];
        wpSessions[user] = { correct: soru.dogru, options: soru.siklar };

        let optionsText = soru.siklar.map((s, i) => `${String.fromCharCode(65 + i)}) ${s}`).join('\n');
        msg.reply(`📝 *KPSS SORUSU*\n\n${soru.soru}\n\n*ŞIKLAR:*\n${optionsText}\n\n_Cevap için sadece harf gönderin._`);
    } 
    else if (wpSessions[user] && /^[a-eA-E]$/.test(text)) {
        const choice = text.toUpperCase().charCodeAt(0) - 65;
        const session = wpSessions[user];

        if (choice === session.correct) {
            msg.reply("✅ *Doğru Cevap!* \nYeni soru için 'soru' yazın.");
        } else {
            msg.reply(`❌ *Yanlış!* \nDoğru: *${String.fromCharCode(65 + session.correct)}) ${session.options[session.correct]}*`);
        }
        delete wpSessions[user];
    }
});
client.initialize();

// --- 🎮 OYUN MANTIĞI VE ODALAR ---
const rooms = {};

function shuffleOptions(q) {
    if (!q || !q.siklar) return q;
    const originalCorrectText = q.siklar[q.dogru];
    const shuffledSiklar = [...q.siklar].sort(() => Math.random() - 0.5);
    return { ...q, siklar: shuffledSiklar, dogru: shuffledSiklar.indexOf(originalCorrectText) };
}

io.on("connection", (socket) => {
    socket.on("createRoom", (username) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = {
            code: roomCode, players: {}, gameStarted: false, currentQuestionIndex: 0, questions: [],
            settings: { duration: 15, count: 10, subject: 'HEPSI', difficulty: 'HEPSI', sikSayisi: 'HEPSI' }
        };
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username, score: 0, isHost: true };
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    socket.on("joinRoom", ({ username, roomCode }) => {
        if (!rooms[roomCode]) return socket.emit("errorMsg", "Oda bulunamadı!");
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username, score: 0, isHost: false };
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;

        let pool = [...tumSorular];
        if (settings.subject !== "HEPSI") {
            pool = pool.filter(q => (q.ders || "").trim().toLocaleUpperCase('tr') === settings.subject.trim().toLocaleUpperCase('tr'));
        }
        if (settings.difficulty !== "HEPSI") pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
        if (settings.sikSayisi !== "HEPSI") pool = pool.filter(q => q.siklar.length == settings.sikSayisi);

        room.questions = (pool.length > 0 ? pool : tumSorular)
            .sort(() => Math.random() - 0.5)
            .slice(0, settings.count)
            .map(q => shuffleOptions(q));

        room.settings = settings;
        room.gameStarted = true;
        room.currentQuestionIndex = 0;
        sendQuestionToRoom(roomCode);
    });

    socket.on("submitAnswer", ({ roomCode, answerIndex }) => {
        const room = rooms[roomCode];
        if (!room || !room.gameStarted) return;
        const currentQ = room.questions[room.currentQuestionIndex];
        const player = room.players[socket.id];

        if (player && !player.hasAnsweredThisRound) {
            player.hasAnsweredThisRound = true;
            let earnedPoints = 0;
            const isCorrect = answerIndex == currentQ.dogru;

            if (isCorrect) {
                const gecen = (Date.now() - room.questionStartTime) / 1000;
                earnedPoints = 10 + Math.ceil(Math.max(0, room.settings.duration - gecen) / 4);
                player.score += earnedPoints;
            } else if (answerIndex !== -1) player.score -= 5;

            socket.emit("answerResult", { correct: isCorrect, correctIndex: currentQ.dogru, selectedIndex: answerIndex, isBlank: answerIndex === -1, points: earnedPoints });
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            if (Object.values(room.players).every(p => p.hasAnsweredThisRound)) {
                clearTimeout(room.timerId);
                room.currentQuestionIndex++;
                setTimeout(() => sendQuestionToRoom(roomCode), 1500);
            }
        }
    });

    // --- 💾 KALICI SORU EKLEME ---
    socket.on("addNewQuestion", (q) => {
        tumSorular.push(q);
        try {
            fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2), 'utf8');
        } catch (err) { console.error("Soru kaydedilemedi!"); }
    });

    socket.on("disconnect", () => {
        for (const code in rooms) {
            if (rooms[code].players[socket.id]) {
                delete rooms[code].players[socket.id];
                io.to(code).emit("updatePlayerList", Object.values(rooms[code].players));
            }
        }
    });
});

function sendQuestionToRoom(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.currentQuestionIndex >= room.questions.length) {
        io.to(roomCode).emit("gameOver", Object.values(room.players));
        room.gameStarted = false;
        return;
    }

    Object.keys(room.players).forEach(id => room.players[id].hasAnsweredThisRound = false);
    room.questionStartTime = Date.now();
    const q = room.questions[room.currentQuestionIndex];

    io.to(roomCode).emit("newQuestion", {
        ...q, index: room.currentQuestionIndex + 1, total: room.questions.length, duration: room.settings.duration
    });

    room.timerId = setTimeout(() => {
        if (rooms[roomCode] && room.gameStarted) {
            room.currentQuestionIndex++;
            sendQuestionToRoom(roomCode);
        }
    }, room.settings.duration * 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda aktif.`));
