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

try {
    if (fs.existsSync(QUESTIONS_FILE)) {
        const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
        tumSorular = JSON.parse(data);
    }
} catch (e) { console.error("Soru dosyası yüklenemedi."); }

const rooms = {};

io.on("connection", (socket) => {
    socket.on("createRoom", (username) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = {
            code: roomCode, players: {}, gameStarted: false,
            currentQuestionIndex: 0, questions: [],
            settings: { duration: 15, count: 10, subject: 'HEPSI', difficulty: 'HEPSI' },
            timerId: null, answerCount: 0, questionStartTime: 0
        };
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: true };
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    socket.on("joinRoom", ({ username, roomCode }) => {
        if (!rooms[roomCode]) return socket.emit("errorMsg", "Oda bulunamadı!");
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: false };
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

 socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        // 1. Tüm soruları havuza al
        let pool = [...tumSorular];
        
        console.log(`🔍 Filtreleme Başlıyor... Toplam Soru: ${pool.length}`);
        console.log(`👉 İstenen Ders: ${settings.subject}`);

        // 2. Filtreleme Mantığı (GÜÇLENDİRİLMİŞ)
        if (settings.subject && settings.subject !== "HEPSI") {
            const arananDers = settings.subject.trim().toLocaleUpperCase('tr');
            
            pool = pool.filter(q => {
                // Soru verisinde ders etiketi yoksa 'GENEL' varsay
                const soruDersi = (q.ders || "GENEL").trim().toLocaleUpperCase('tr');
                return soruDersi === arananDers;
            });
        }
        
        // 3. Zorluk Seviyesi Filtresi (Varsa)
        if (settings.difficulty && settings.difficulty !== "HEPSI") {
             pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
        }
        
        // 4. Eğer filtre sonucu 0 soru kaldıysa, mecburen tümünü yükle (Çökmemesi için)
        if(pool.length === 0) {
            console.log("⚠️ Filtreye uygun soru bulunamadı! Tüm sorular yükleniyor...");
            pool = [...tumSorular]; 
            // Kullanıcıya bilgi vermek istersen buraya bir socket.emit ekleyebilirsin
        } else {
            console.log(`✅ Filtreleme Başarılı! ${pool.length} soru bulundu.`);
        }

        // 5. Soruları Karıştır ve Odaya Yükle
        room.questions = pool.sort(() => Math.random() - 0.5)
                             .slice(0, settings.count || 20)
                             .map(q => shuffleOptions(q));
                             
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
            room.answerCount++; 
            let isCorrect = false;
            let earnedPoints = 0;

            if (answerIndex !== -1) { 
                isCorrect = (answerIndex == currentQ.dogru);
                if (isCorrect) {
                    const gecen = (Date.now() - room.questionStartTime) / 1000;
                    const kalan = Math.max(0, room.settings.duration - gecen);
                    earnedPoints = 10 + Math.ceil(kalan / 4); 
                    player.score += earnedPoints;
                } else {
                    player.score -= 5;
                }
            }
            socket.emit("answerResult", { correct: isCorrect, correctIndex: currentQ.dogru, selectedIndex: answerIndex, isBlank: answerIndex === -1, points: earnedPoints });
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            // HERKES CEVAP VERDİĞİNDE 1.5 SANİYE BEKLE (Doğru cevabı görsünler)
            if (room.answerCount >= Object.keys(room.players).length) {
                clearTimeout(room.timerId); 
                room.currentQuestionIndex++; 
                setTimeout(() => { sendQuestionToRoom(roomCode); }, 1500); 
            }
        }
    });

    socket.on("addNewQuestion", (q) => { tumSorular.push(q); });
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
        room.gameStarted = false; return;
    }
    room.answerCount = 0; 
    Object.keys(room.players).forEach(id => { room.players[id].hasAnsweredThisRound = false; });
    room.questionStartTime = Date.now();
    const q = room.questions[room.currentQuestionIndex];
    io.to(roomCode).emit("newQuestion", {
        soru: q.soru, siklar: q.siklar, ders: q.ders, resim: q.resim, zorluk: q.zorluk,
        index: room.currentQuestionIndex + 1, total: Math.min(room.settings.count, room.questions.length), duration: room.settings.duration
    });
    
    room.timerId = setTimeout(() => { 
        if (rooms[roomCode] && room.gameStarted) { 
            room.currentQuestionIndex++; 
            sendQuestionToRoom(roomCode); 
        } 
    }, room.settings.duration * 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu aktif.`));

