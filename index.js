const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["polling", "websocket"]
});

// Resim dosyaları için public klasörünü açıyoruz
app.use(express.static(path.join(__dirname, "public")));

// --- 🟢 UPTIME PING ---
app.get("/ping", (req, res) => {
    res.send("Pong! Sunucu Aktif.");
});

// --- 🛠️ SORU YÜKLEME VE TAMİR ---
let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');

function sorulariYukle() {
    console.log("📂 Soru dosyası okunuyor...");
    
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            let rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8');

            // Format Temizliği
            rawData = rawData.replace(/\]\s*\[/g, ",");
            rawData = rawData.replace(/\]\s*,\s*\[/g, ",");
            while (rawData.startsWith("[[")) { rawData = rawData.replace("[[", "["); }
            while (rawData.endsWith("]]")) { rawData = rawData.replace("]]", "]"); }

            try {
                tumSorular = JSON.parse(rawData);
                console.log(`✅ BAŞARILI: Toplam ${tumSorular.length} soru hafızaya alındı.`);
            } catch (parseErr) {
                console.log("⚠️ Derinlemesine kurtarma yapılıyor...");
                const matches = rawData.match(/\{.*?\}/gs); 
                if (matches) {
                    const fixedJson = "[" + matches.join(",") + "]";
                    tumSorular = JSON.parse(fixedJson);
                    console.log(`✅ TAMİR EDİLDİ: ${tumSorular.length} soru.`);
                } else {
                    throw new Error("Dosya kurtarılamadı.");
                }
            }
        } catch (err) {
            console.error("❌ HATA: Dosya okunamadı!");
            tumSorular = [{ "soru": "SİSTEM HATASI", "ders": "SİSTEM", "siklar": ["Tamam"], "dogru": 0 }];
        }
    } else {
        console.log("⚠️ Dosya yok, örnek oluşturuldu.");
        tumSorular = [{ "soru": "Örnek Soru", "ders": "GENEL", "siklar": ["A", "B"], "dogru": 0 }];
    }
}
sorulariYukle();

const rooms = {};

// ŞIKLARI KARIŞTIRMA
function shuffleOptions(q) {
    if (!q || !q.siklar) return q;
    const originalCorrectText = q.siklar[q.dogru];
    const shuffledSiklar = [...q.siklar].sort(() => Math.random() - 0.5);
    const newCorrectIndex = shuffledSiklar.indexOf(originalCorrectText);
    return { ...q, siklar: shuffledSiklar, dogru: newCorrectIndex };
}

io.on("connection", (socket) => {
    // ODA YÖNETİMİ
    socket.on("createRoom", (username) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = {
            code: roomCode, players: {}, gameStarted: false,
            currentQuestionIndex: 0, questions: [], settings: {},
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

    // --- OYUN BAŞLATMA MANTIĞI (FİLTRELER DAHİL) ---
    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        let pool = [...tumSorular];
        console.log(`Oyun Başlıyor: Oda ${roomCode}, Mod: ${settings.isMistakeMode ? "HATA" : "NORMAL"}, Deneme: ${settings.deneme}`);

        // 1. HATA ANALİZ MODU (HEM YANLIŞLAR HEM FİLTRELER)
        if (settings.isMistakeMode && settings.mistakeList && settings.mistakeList.length > 0) {
            // Önce sadece kullanıcının yanlışlarını seç
            pool = pool.filter(q => settings.mistakeList.includes(q.soru));
            
            // Yanlışlar içinde de Ders/Zorluk filtresi uygula
            if (settings.subject && settings.subject !== "HEPSI") {
                const aranan = settings.subject.trim().toLocaleUpperCase('tr');
                pool = pool.filter(q => (q.ders || "GENEL").trim().toLocaleUpperCase('tr') === aranan);
            }
            if (settings.difficulty && settings.difficulty !== "HEPSI") {
                 pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
            }
            if (settings.sikSayisi && settings.sikSayisi !== "HEPSI") {
                pool = pool.filter(q => q.siklar && q.siklar.length == settings.sikSayisi);
            }

            // Kalan soruları karıştır ve limiti uygula
            room.questions = pool.sort(() => Math.random() - 0.5)
                                 .slice(0, settings.count || 20)
                                 .map(q => shuffleOptions(q));
        }

        // 2. DENEME MODU (SIRALI VE ÖZEL DERS SIRALAMASI)
        else if (settings.deneme && settings.deneme !== "HEPSI") {
            // Sadece seçilen denemenin sorularını getir
            pool = pool.filter(q => q.deneme == settings.deneme);
            
            // Ders Sıralaması: Tarih -> Coğrafya -> Vatandaşlık -> Güncel
            const dersSirasi = { "TARİH": 1, "COĞRAFYA": 2, "VATANDAŞLIK": 3, "GÜNCEL BİLGİLER": 4 };
            
            pool.sort((a, b) => {
                const dersA = (a.ders || "").trim().toLocaleUpperCase('tr');
                const dersB = (b.ders || "").trim().toLocaleUpperCase('tr');
                const siraA = dersSirasi[dersA] || 99;
                const siraB = dersSirasi[dersB] || 99;
                
                return siraA - siraB;
            });

            // Deneme modunda karıştırma yapmıyoruz (shuffle yok), tüm soruları soruyoruz.
            room.questions = pool.map(q => shuffleOptions(q));
        }

        // 3. GENEL MOD (KARIŞIK VE FİLTRELİ)
        else {
            if (settings.subject && settings.subject !== "HEPSI") {
                const aranan = settings.subject.trim().toLocaleUpperCase('tr');
                pool = pool.filter(q => (q.ders || "GENEL").trim().toLocaleUpperCase('tr') === aranan);
            }
            // ZORLUK FİLTRESİ (Burada "ÇIKMIŞ" seçeneği de otomatik çalışır)
            if (settings.difficulty && settings.difficulty !== "HEPSI") {
                 pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
            }
            if (settings.sikSayisi && settings.sikSayisi !== "HEPSI") {
                pool = pool.filter(q => q.siklar && q.siklar.length == settings.sikSayisi);
            }

            // Karışık modda soruları karıştırıyoruz
            room.questions = pool.sort(() => Math.random() - 0.5)
                                 .slice(0, settings.count || 20)
                                 .map(q => shuffleOptions(q));
        }
        
        // Boş Kontrolü
        if(room.questions.length === 0) {
             room.questions = [{ "soru": "Seçilen kriterlere uygun soru bulunamadı!", "ders": "UYARI", "siklar": ["Tamam"], "dogru": 0, "cozum": "Filtreleri değiştirin." }];
        }

        room.settings = settings;
        room.gameStarted = true;
        room.currentQuestionIndex = 0;
        sendQuestionToRoom(roomCode);
    });

    // CEVAP İŞLEME
    socket.on("submitAnswer", ({ roomCode, answerIndex }) => {
        const room = rooms[roomCode];
        if (!room || !room.gameStarted) return;
        const currentQ = room.questions[room.currentQuestionIndex];
        const player = room.players[socket.id];

        if (player && !player.hasAnsweredThisRound) {
            player.hasAnsweredThisRound = true; 
            room.answerCount++; 
            let isCorrect = (answerIndex !== -1 && answerIndex == currentQ.dogru);
            let earnedPoints = 0;

            if (isCorrect) {
                const gecen = (Date.now() - room.questionStartTime) / 1000;
                const kalan = Math.max(0, room.settings.duration - gecen);
                earnedPoints = 10 + Math.ceil(kalan / 4); 
                player.score += earnedPoints;
            } else if (answerIndex !== -1) {
                player.score -= 5;
            }
            
            socket.emit("answerResult", { 
                correct: isCorrect, correctIndex: currentQ.dogru, selectedIndex: answerIndex, 
                isBlank: answerIndex === -1, points: earnedPoints 
            });
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            if (room.answerCount >= Object.keys(room.players).length) {
                clearTimeout(room.timerId); 
                room.currentQuestionIndex++; 
                setTimeout(() => { sendQuestionToRoom(roomCode); }, 1500); 
            }
        }
    });
    
    // YENİ SORU KAYDETME
    socket.on("addNewQuestion", (q) => { 
        tumSorular.push(q);
        fs.writeFile(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2), (err) => {
            if (err) console.error("Kayıt hatası:", err);
        });
    });
    
    // BAĞLANTI KOPMASI
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
    
    if (room.currentQuestionIndex >= room.questions.length) {
        io.to(roomCode).emit("gameOver", Object.values(room.players));
        room.gameStarted = false; return;
    }
    
    room.answerCount = 0; 
    Object.keys(room.players).forEach(id => { room.players[id].hasAnsweredThisRound = false; });
    room.questionStartTime = Date.now();
    const q = room.questions[room.currentQuestionIndex];
    
    io.to(roomCode).emit("newQuestion", {
        soru: q.soru, siklar: q.siklar, ders: q.ders, resim: q.resim, 
        zorluk: q.zorluk, deneme: q.deneme, cozum: q.cozum,    
        index: room.currentQuestionIndex + 1, total: room.questions.length, duration: room.settings.duration
    });
    
    room.timerId = setTimeout(() => { 
        if (rooms[roomCode] && room.gameStarted) { 
            room.currentQuestionIndex++; 
            sendQuestionToRoom(roomCode); 
        } 
    }, room.settings.duration * 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda tam güç çalışıyor.`));
