const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');

// Soruları Yükle
try {
    if (fs.existsSync(QUESTIONS_FILE)) {
        const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
        tumSorular = JSON.parse(data);
        console.log(`✅ ${tumSorular.length} soru yüklendi.`);
    } else {
        tumSorular = [];
        console.log("⚠️ Soru dosyası yok.");
    }
} catch (e) { console.error("Hata:", e); tumSorular = []; }

function sorulariKaydet() {
    try { fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2), 'utf8'); } 
    catch (e) { console.error("Kayıt hatası:", e); }
}

const rooms = {};

io.on("connection", (socket) => {
    
    socket.on("createRoom", (username) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = {
            code: roomCode, players: {}, gameStarted: false,
            currentQuestionIndex: 0, questions: [],
            settings: { duration: 15, count: 10, subject: 'HEPSI', difficulty: 'HEPSI', topic: 'HEPSI' }, // Yeni ayarlar
            timerId: null, answerCount: 0
        };
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: true };
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    socket.on("joinRoom", ({ username, roomCode }) => {
        if (!rooms[roomCode]) return socket.emit("errorMsg", "Böyle bir oda yok!");
        if (rooms[roomCode].gameStarted) return socket.emit("errorMsg", "Oyun başladı, giremezsin.");
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: false };
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;

        // --- GELİŞMİŞ FİLTRELEME SİSTEMİ ---
        let havuz = [...tumSorular];

        // 1. Ders Filtresi
        if (settings.subject !== "HEPSI") {
            havuz = havuz.filter(q => q.ders === settings.subject);
        }

        // 2. Zorluk Filtresi (Yeni)
        if (settings.difficulty !== "HEPSI") {
            havuz = havuz.filter(q => q.zorluk === settings.difficulty);
        }

        // 3. Konu Filtresi (Yeni)
        if (settings.topic && settings.topic !== "HEPSI") {
            havuz = havuz.filter(q => q.konu === settings.topic);
        }

        // Eğer filtreler sonucunda hiç soru kalmazsa uyarı ver veya tümünü kullan
        if (havuz.length === 0) {
            // Hiç soru yoksa genel havuzdan devam etmesin, boş dönsün ki anlaşılsın
            // Ama oyun çökmesin diye tüm soruları veriyoruz (yedek plan)
            havuz = [...tumSorular]; 
        }

        havuz.sort(() => Math.random() - 0.5); 
        room.settings = settings;
        room.questions = havuz;
        room.gameStarted = true;
        room.currentQuestionIndex = 0;
        
        Object.keys(room.players).forEach(id => room.players[id].score = 0);
        io.to(roomCode).emit("updatePlayerList", Object.values(room.players));
        sendQuestionToRoom(roomCode);
    });

    socket.on("submitAnswer", ({ roomCode, answerIndex }) => {
        const room = rooms[roomCode];
        if (!room || !room.gameStarted) return;
        
        const currentQ = room.questions[room.currentQuestionIndex];
        const player = room.players[socket.id];

        if (player && !player.hasAnsweredThisRound) {
            player.hasAnsweredThisRound = true; 
            room.answerCount++; 

            let isCorrect = false;
            if (answerIndex === -1) { isCorrect = false; } // Boş
            else {
                isCorrect = (answerIndex == currentQ.dogru);
                if (isCorrect) player.score += 10; else player.score -= 5;
            }
            
            socket.emit("answerResult", { correct: isCorrect, correctIndex: currentQ.dogru, selectedIndex: answerIndex, isBlank: answerIndex === -1 });
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            const totalPlayers = Object.keys(room.players).length;
            if (room.answerCount >= totalPlayers) {
                clearTimeout(room.timerId); 
                room.currentQuestionIndex++; 
                setTimeout(() => { sendQuestionToRoom(roomCode); }, 1000);
            }
        }
    });

    socket.on("addNewQuestion", (q) => {
        tumSorular.push(q);
        sorulariKaydet();
        socket.emit("questionAddedSuccess", "Soru kaydedildi!");
    });

    socket.on("disconnect", () => {
        for (const code in rooms) {
            if (rooms[code].players[socket.id]) {
                delete rooms[code].players[socket.id];
                io.to(code).emit("updatePlayerList", Object.values(rooms[code].players));
                if (Object.keys(rooms[code].players).length === 0) delete rooms[code]; 
            }
        }
    });
});

function sendQuestionToRoom(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.currentQuestionIndex >= room.settings.count || room.currentQuestionIndex >= room.questions.length) {
        io.to(roomCode).emit("gameOver", Object.values(room.players));
        room.gameStarted = false;
        return;
    }

    room.answerCount = 0; 
    Object.keys(room.players).forEach(id => { room.players[id].hasAnsweredThisRound = false; });

    const q = room.questions[room.currentQuestionIndex];
    io.to(roomCode).emit("newQuestion", {
        soru: q.soru, siklar: q.siklar, ders: q.ders, resim: q.resim, zorluk: q.zorluk, // Zorluk bilgisini de ekrana yollayalım
        index: room.currentQuestionIndex + 1, total: Math.min(room.settings.count, room.questions.length), duration: room.settings.duration
    });

    room.timerId = setTimeout(() => {
        if (rooms[roomCode] && room.gameStarted && room.questions[room.currentQuestionIndex] === q) {
            room.currentQuestionIndex++; sendQuestionToRoom(roomCode);
        }
    }, room.settings.duration * 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda.`));
