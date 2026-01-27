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
        console.log(`✅ ${tumSorular.length} soru yüklendi.`);
    } else {
        tumSorular = [];
        console.log("⚠️ Soru dosyası yok.");
    }
} catch (e) {
    console.error("Hata:", e);
    tumSorular = [];
}

function sorulariKaydet() {
    try {
        fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2), 'utf8');
    } catch (e) {
        console.error("Kayıt hatası:", e);
    }
}

const rooms = {};

io.on("connection", (socket) => {
    
    socket.on("createRoom", (username) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = {
            code: roomCode,
            players: {},
            gameStarted: false,
            currentQuestionIndex: 0,
            questions: [],
            settings: { duration: 15, count: 10, subject: 'HEPSI' },
            timerId: null,      // Zamanlayıcıyı kontrol etmek için
            answerCount: 0      // Kaç kişi cevapladı sayacı
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

        let havuz = [...tumSorular];
        if (settings.subject !== "HEPSI") havuz = havuz.filter(q => q.ders === settings.subject);
        if (havuz.length === 0) havuz = [...tumSorular];
        havuz.sort(() => Math.random() - 0.5); 

        room.settings = settings;
        room.questions = havuz;
        room.gameStarted = true;
        room.currentQuestionIndex = 0;
        
        Object.keys(room.players).forEach(id => room.players[id].score = 0);
        io.to(roomCode).emit("updatePlayerList", Object.values(room.players));
        
        sendQuestionToRoom(roomCode);
    });

    // CEVAP VERME KISMI (GÜNCELLENDİ)
    socket.on("submitAnswer", ({ roomCode, answerIndex }) => {
        const room = rooms[roomCode];
        if (!room || !room.gameStarted) return;
        
        const currentQ = room.questions[room.currentQuestionIndex];
        const player = room.players[socket.id];

        // Eğer oyuncu zaten cevap verdiyse tekrar işletme (Çoklu tıklama önlemi)
        if (player && !player.hasAnsweredThisRound) {
            player.hasAnsweredThisRound = true; // Bu tur cevapladı işaretle
            room.answerCount++; // Cevap sayısını artır

            // Puanlama Mantığı
            let isCorrect = false;
            if (answerIndex === -1) {
                // BOŞ BIRAKTI: Puan değişmez (0)
                isCorrect = false; 
            } else {
                // ŞIK İŞARETLEDİ
                isCorrect = (answerIndex == currentQ.dogru);
                if (isCorrect) player.score += 10;
                else player.score -= 5;
            }
            
            // Sonucu sadece o kişiye gönder
            socket.emit("answerResult", { 
                correct: isCorrect, 
                correctIndex: currentQ.dogru, 
                selectedIndex: answerIndex,
                isBlank: answerIndex === -1 
            });
            
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            // HERKES CEVAPLADI MI KONTROLÜ
            const totalPlayers = Object.keys(room.players).length;
            if (room.answerCount >= totalPlayers) {
                // Herkes cevapladıysa süreyi bekleme, hemen geç!
                clearTimeout(room.timerId); // Mevcut sayacı iptal et
                room.currentQuestionIndex++; // Sıradaki soruya geç
                
                // Kısa bir bekleme (1 sn) sonra yeni soruyu at (Sonuçları görsünler diye)
                setTimeout(() => {
                    sendQuestionToRoom(roomCode);
                }, 1000);
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

    // Oyun bitti mi?
    if (room.currentQuestionIndex >= room.settings.count || room.currentQuestionIndex >= room.questions.length) {
        io.to(roomCode).emit("gameOver", Object.values(room.players));
        room.gameStarted = false;
        return;
    }

    // Yeni soru için hazırlık
    room.answerCount = 0; // Sayacı sıfırla
    Object.keys(room.players).forEach(id => {
        room.players[id].hasAnsweredThisRound = false; // Herkesin cevap hakkını aç
    });

    const q = room.questions[room.currentQuestionIndex];
    
    io.to(roomCode).emit("newQuestion", {
        soru: q.soru,
        siklar: q.siklar,
        ders: q.ders,
        resim: q.resim, // Resim varsa gönder
        index: room.currentQuestionIndex + 1,
        total: Math.min(room.settings.count, room.questions.length),
        duration: room.settings.duration
    });

    // Zamanlayıcıyı başlat ve ID'sini sakla
    room.timerId = setTimeout(() => {
        if (rooms[roomCode] && room.gameStarted && room.questions[room.currentQuestionIndex] === q) {
            // Süre doldu, kimse cevaplamasa bile geç
            room.currentQuestionIndex++;
            sendQuestionToRoom(roomCode);
        }
    }, room.settings.duration * 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda.`));
