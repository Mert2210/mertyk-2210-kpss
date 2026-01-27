const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Public klasörünü dışa aç
app.use(express.static(path.join(__dirname, "public")));

// --- SORU SİSTEMİ ---
let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');

// Dosyadan soruları yükle
try {
    if (fs.existsSync(QUESTIONS_FILE)) {
        const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
        tumSorular = JSON.parse(data);
        console.log(`✅ ${tumSorular.length} soru yüklendi.`);
    } else {
        tumSorular = [];
        console.log("⚠️ Soru dosyası yok, boş başlatılıyor.");
    }
} catch (e) {
    console.error("Hata:", e);
    tumSorular = [];
}

// Soruları Kaydet
function sorulariKaydet() {
    try {
        fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2), 'utf8');
    } catch (e) {
        console.error("Kayıt hatası:", e);
    }
}

// --- ODA SİSTEMİ ---
const rooms = {};

io.on("connection", (socket) => {
    
    // 1. ODA KURMA
    socket.on("createRoom", (username) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = {
            code: roomCode,
            players: {},
            gameStarted: false,
            currentQuestionIndex: 0,
            questions: [],
            settings: { duration: 15, count: 10, subject: 'HEPSI' }
        };
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: true };
        
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    // 2. ODAYA KATILMA
    socket.on("joinRoom", ({ username, roomCode }) => {
        if (!rooms[roomCode]) {
            socket.emit("errorMsg", "Böyle bir oda yok!");
            return;
        }
        if (rooms[roomCode].gameStarted) {
            socket.emit("errorMsg", "Oyun başladı, şu an giremezsin.");
            return;
        }

        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: false };
        
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    // 3. OYUNU BAŞLAT (GÜNCELLENDİ: ARTIK KARIŞTIRIYOR!)
    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;

        let havuz = [...tumSorular];
        
        // Dersi filtrele
        if (settings.subject !== "HEPSI") {
            havuz = havuz.filter(q => q.ders === settings.subject);
        }
        // Eğer o dersten soru kalmadıysa hepsini koy
        if (havuz.length === 0) havuz = [...tumSorular];

        // 🔥 İŞTE SİHİRLİ DOKUNUŞ BURASI (SORULARI KARIŞTIRIR) 🔥
        havuz.sort(() => Math.random() - 0.5); 

        room.settings = settings;
        room.questions = havuz;
        room.gameStarted = true;
        room.currentQuestionIndex = 0;
        
        Object.keys(room.players).forEach(id => room.players[id].score = 0);
        
        io.to(roomCode).emit("updatePlayerList", Object.values(room.players));
        sendQuestionToRoom(roomCode);
    });

    // 4. CEVAP VERME
    socket.on("submitAnswer", ({ roomCode, answerIndex }) => {
        const room = rooms[roomCode];
        if (!room || !room.gameStarted) return;
        
        const currentQ = room.questions[room.currentQuestionIndex];
        const isCorrect = (answerIndex == currentQ.dogru);
        const player = room.players[socket.id];

        if (player) {
            if (isCorrect) player.score += 10;
            else player.score -= 5;
            
            socket.emit("answerResult", { correct: isCorrect, correctIndex: currentQ.dogru, selectedIndex: answerIndex });
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));
        }
    });

    // 5. YENİ SORU EKLEME
    socket.on("addNewQuestion", (q) => {
        tumSorular.push(q);
        sorulariKaydet();
        socket.emit("questionAddedSuccess", "Soru başarıyla kaydedildi!");
    });

    socket.on("disconnect", () => {
        for (const code in rooms) {
            if (rooms[code].players[socket.id]) {
                delete rooms[code].players[socket.id];
                io.to(code).emit("updatePlayerList", Object.values(rooms[code].players));
                if (Object.keys(rooms[code].players).length === 0) {
                    delete rooms[code]; 
                }
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

    const q = room.questions[room.currentQuestionIndex];
    io.to(roomCode).emit("newQuestion", {
        soru: q.soru,
        siklar: q.siklar,
        ders: q.ders,
        index: room.currentQuestionIndex + 1,
        total: Math.min(room.settings.count, room.questions.length),
        duration: room.settings.duration
    });

    setTimeout(() => {
        if (rooms[roomCode] && room.gameStarted && room.questions[room.currentQuestionIndex] === q) {
            room.currentQuestionIndex++;
            sendQuestionToRoom(roomCode);
        }
    }, room.settings.duration * 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
