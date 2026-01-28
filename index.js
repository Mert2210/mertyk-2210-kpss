const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["polling", "websocket"] // Hem polling hem websocket desteği
});

app.use(express.static(path.join(__dirname, "public")));

// --- 🟢 UPTIME ROBOT İÇİN PING NOKTASI ---
app.get("/ping", (req, res) => {
    res.send("Pong! Sunucu Aktif ve Çalışıyor.");
});
// --------------------------------------------------

// --- 🛠️ GÜVENLİ VE AKILLI SORU YÜKLEME SİSTEMİ ---
let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');

function sorulariYukle() {
    console.log("📂 Soru dosyası okunuyor...");
    
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            let rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8');

            // 1. ADIM: Olası format hatalarını otomatik düzelt
            rawData = rawData.replace(/\]\s*\[/g, ",");
            rawData = rawData.replace(/\]\s*,\s*\[/g, ",");
            
            while (rawData.startsWith("[[")) { rawData = rawData.replace("[[", "["); }
            while (rawData.endsWith("]]")) { rawData = rawData.replace("]]", "]"); }

            try {
                tumSorular = JSON.parse(rawData);
                console.log(`✅ BAŞARILI: Toplam ${tumSorular.length} soru hafızaya alındı.`);
            } catch (parseErr) {
                console.log("⚠️ Basit okuma başarısız, derinlemesine temizlik yapılıyor...");
                const matches = rawData.match(/\{.*?\}/gs); 
                if (matches) {
                    const fixedJson = "[" + matches.join(",") + "]";
                    tumSorular = JSON.parse(fixedJson);
                    console.log(`✅ TAMİR EDİLDİ: ${tumSorular.length} soru kurtarıldı.`);
                } else {
                    throw new Error("Soru formatı kurtarılamadı.");
                }
            }

        } catch (err) {
            console.error("❌ KRİTİK HATA: questions.json dosyası çok bozuk!");
            tumSorular = [{
                "soru": "SİSTEM HATASI: Soru dosyası okunamadı.",
                "ders": "SİSTEM", "siklar": ["Tamam"], "dogru": 0, "zorluk": "KOLAY"
            }];
        }
    } else {
        console.log("⚠️ questions.json bulunamadı! Örnek soru oluşturuluyor.");
        tumSorular = [{ "soru": "Deneme Sorusu", "ders": "GENEL", "siklar": ["A", "B"], "dogru": 0 }];
    }
}

// Sunucu başlarken soruları yükle
sorulariYukle();

const rooms = {};

// Şık Karıştırma Fonksiyonu
function shuffleOptions(q) {
    if (!q || !q.siklar) return q;
    const originalCorrectText = q.siklar[q.dogru];
    const shuffledSiklar = [...q.siklar].sort(() => Math.random() - 0.5);
    const newCorrectIndex = shuffledSiklar.indexOf(originalCorrectText);
    return { ...q, siklar: shuffledSiklar, dogru: newCorrectIndex };
}

io.on("connection", (socket) => {
    socket.on("createRoom", (username) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = {
            code: roomCode, players: {}, gameStarted: false,
            currentQuestionIndex: 0, questions: [],
            settings: { duration: 15, count: 10, subject: 'HEPSI', difficulty: 'HEPSI', sikSayisi: 'HEPSI', deneme: 'HEPSI' },
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
        
        let pool = [...tumSorular];
        
        console.log(`🔍 Filtreleme Başlıyor... Toplam Havuz: ${pool.length}`);

        // ==================================================
        // ADIM 1: DENEME SEÇİMİ VE ÖZEL SIRALAMA MANTIĞI
        // ==================================================
        if (settings.deneme && settings.deneme !== "HEPSI") {
            // Sadece seçilen denemenin sorularını al
            pool = pool.filter(q => q.deneme == settings.deneme);
            
            // DERS SIRALAMA SİSTEMİ (Tarih -> Coğrafya -> Vatandaşlık -> Güncel)
            const dersSirasi = { 
                "TARİH": 1, 
                "COĞRAFYA": 2, 
                "VATANDAŞLIK": 3, 
                "GÜNCEL BİLGİLER": 4 
            };
            
            pool.sort((a, b) => {
                const siraA = dersSirasi[(a.ders || "").trim().toLocaleUpperCase('tr')] || 99;
                const siraB = dersSirasi[(b.ders || "").trim().toLocaleUpperCase('tr')] || 99;
                return siraA - siraB;
            });

            // Deneme modunda havuzdan karıştırmadan (sıralı) alıyoruz
            room.questions = pool.slice(0, settings.count || 60).map(q => shuffleOptions(q));
        } else {
            // --- GENEL HAVUZ MODU (ESKİ MANTIK KORUNDU) ---
            if (settings.subject && settings.subject !== "HEPSI") {
                const arananDers = settings.subject.trim().toLocaleUpperCase('tr');
                pool = pool.filter(q => {
                    const soruDersi = (q.ders || "GENEL").trim().toLocaleUpperCase('tr');
                    return soruDersi === arananDers;
                });
            }
            
            if (settings.difficulty && settings.difficulty !== "HEPSI") {
                 pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
            }

            if (settings.sikSayisi && settings.sikSayisi !== "HEPSI") {
                pool = pool.filter(q => q.siklar && q.siklar.length == settings.sikSayisi);
            }

            // Genel havuzda soruları her zaman karıştır
            room.questions = pool.sort(() => Math.random() - 0.5)
                                 .slice(0, settings.count || 20)
                                 .map(q => shuffleOptions(q));
        }
        
        // Eğer filtre sonucu hiç soru kalmadıysa hata vermemesi için uyarı sorusu ekle
        if(room.questions.length === 0) {
             room.questions = [{ "soru": "Kriterlere uygun soru bulunamadı!", "ders": "HATA", "siklar": ["Anlaşıldı"], "dogru": 0 }];
        }

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
        soru: q.soru, 
        siklar: q.siklar, 
        ders: q.ders, 
        resim: q.resim, 
        zorluk: q.zorluk,
        deneme: q.deneme,
        cozum: q.cozum,   
        index: room.currentQuestionIndex + 1, 
        total: Math.min(room.settings.count, room.questions.length), 
        duration: room.settings.duration
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
