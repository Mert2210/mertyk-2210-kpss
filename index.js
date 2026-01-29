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

app.use(express.static(path.join(__dirname, "public")));

// --- 🟢 UPTIME ROBOT İÇİN PING NOKTASI ---
app.get("/ping", (req, res) => {
    res.send("Pong! Sunucu Aktif ve Çalışıyor.");
});

// --- 🛠️ GELİŞMİŞ SORU YÜKLEME VE TAMİR SİSTEMİ ---
let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');

function sorulariYukle() {
    console.log("📂 Soru dosyası okunuyor...");
    
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            let rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8');

            // Format hatalarını otomatik düzelt
            rawData = rawData.replace(/\]\s*\[/g, ",");
            rawData = rawData.replace(/\]\s*,\s*\[/g, ",");
            while (rawData.startsWith("[[")) { rawData = rawData.replace("[[", "["); }
            while (rawData.endsWith("]]")) { rawData = rawData.replace("]]", "]"); }

            try {
                tumSorular = JSON.parse(rawData);
                console.log(`✅ BAŞARILI: Toplam ${tumSorular.length} soru hafızaya alındı.`);
            } catch (parseErr) {
                console.log("⚠️ Basit okuma başarısız, derinlemesine kurtarma yapılıyor...");
                const matches = rawData.match(/\{.*?\}/gs); 
                if (matches) {
                    const fixedJson = "[" + matches.join(",") + "]";
                    tumSorular = JSON.parse(fixedJson);
                    console.log(`✅ TAMİR EDİLDİ: ${tumSorular.length} soru kurtarıldı.`);
                } else {
                    throw new Error("Dosya kurtarılamadı.");
                }
            }
        } catch (err) {
            console.error("❌ KRİTİK HATA: questions.json okunamadı!");
            tumSorular = [{ "soru": "SİSTEM HATASI: Dosya bozuk.", "ders": "SİSTEM", "siklar": ["Tamam"], "dogru": 0 }];
        }
    } else {
        console.log("⚠️ Dosya bulunamadı, örnek soru oluşturuluyor.");
        tumSorular = [{ "soru": "Örnek Soru", "ders": "GENEL", "siklar": ["A", "B"], "dogru": 0 }];
    }
}
sorulariYukle();

const rooms = {};

// ŞIKLARI KARIŞTIRMA (Doğru Cevabı Takip Ederek)
function shuffleOptions(q) {
    if (!q || !q.siklar) return q;
    const originalCorrectText = q.siklar[q.dogru];
    const shuffledSiklar = [...q.siklar].sort(() => Math.random() - 0.5);
    const newCorrectIndex = shuffledSiklar.indexOf(originalCorrectText);
    return { ...q, siklar: shuffledSiklar, dogru: newCorrectIndex };
}

io.on("connection", (socket) => {
    // ODA KURMA
    socket.on("createRoom", (username) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = {
            code: roomCode, players: {}, gameStarted: false,
            currentQuestionIndex: 0, questions: [],
            settings: {},
            timerId: null, answerCount: 0, questionStartTime: 0
        };
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: true };
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    // ODAYA KATILMA
    socket.on("joinRoom", ({ username, roomCode }) => {
        if (!rooms[roomCode]) return socket.emit("errorMsg", "Oda bulunamadı!");
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: false };
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    // --- OYUNU BAŞLATMA (TÜM MANTIK BURADA) ---
    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        let pool = [...tumSorular];
        console.log(`🚀 Oyun Başlıyor: Oda ${roomCode}, Mod: ${settings.deneme}, HataModu: ${settings.isMistakeMode}`);

        // ==================================================
        // SENARYO 1: HATA ANALİZ MODU (Kişisel Yanlışlar)
        // ==================================================
        if (settings.isMistakeMode && settings.mistakeList && settings.mistakeList.length > 0) {
            // İstemciden gelen yanlış soru metinleriyle eşleşenleri bul
            pool = pool.filter(q => settings.mistakeList.includes(q.soru));
            
            // Hata sorularını karıştırarak odaya ata (DÜZELTİLEN KISIM BURASI)
            room.questions = pool.sort(() => Math.random() - 0.5).map(q => shuffleOptions(q));
        }

        // ==================================================
        // SENARYO 2: DENEME MODU (Sıralı)
        // ==================================================
        else if (settings.deneme && settings.deneme !== "HEPSI") {
            // Sadece seçilen denemeyi al
            pool = pool.filter(q => q.deneme == settings.deneme);
            
            // KPSS Sırasına Diz (Tarih -> Coğrafya -> Vatandaşlık -> Güncel)
            const dersSirasi = { "TARİH": 1, "COĞRAFYA": 2, "VATANDAŞLIK": 3, "GÜNCEL BİLGİLER": 4 };
            pool.sort((a, b) => {
                const siraA = dersSirasi[(a.ders || "").trim().toLocaleUpperCase('tr')] || 99;
                const siraB = dersSirasi[(b.ders || "").trim().toLocaleUpperCase('tr')] || 99;
                return siraA - siraB;
            });

            // Sırayı bozmadan, sadece şıkları karıştırarak al
            room.questions = pool.slice(0, settings.count || 60).map(q => shuffleOptions(q));
        }

        // ==================================================
        // SENARYO 3: GENEL KARIŞIK MOD (Filtreli)
        // ==================================================
        else {
            // Ders Filtresi
            if (settings.subject && settings.subject !== "HEPSI") {
                const aranan = settings.subject.trim().toLocaleUpperCase('tr');
                pool = pool.filter(q => (q.ders || "GENEL").trim().toLocaleUpperCase('tr') === aranan);
            }
            // Zorluk Filtresi
            if (settings.difficulty && settings.difficulty !== "HEPSI") {
                 pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
            }
            // Şık Sayısı Filtresi (Başlangıç/Yeni Nesil)
            if (settings.sikSayisi && settings.sikSayisi !== "HEPSI") {
                pool = pool.filter(q => q.siklar && q.siklar.length == settings.sikSayisi);
            }

            // Havuzu karıştır ve limiti uygula
            room.questions = pool.sort(() => Math.random() - 0.5)
                                 .slice(0, settings.count || 20)
                                 .map(q => shuffleOptions(q));
        }
        
        // Eğer soru bulunamadıysa patlamaması için boş soru koy
        if(room.questions.length === 0) {
             room.questions = [{ "soru": "Bu kriterlere uygun soru bulunamadı!", "ders": "BİLGİ", "siklar": ["Tamam"], "dogru": 0, "cozum": "Ayarlarını değiştirip tekrar dene." }];
        }

        room.settings = settings;
        room.gameStarted = true;
        room.currentQuestionIndex = 0;
        sendQuestionToRoom(roomCode);
    });

    // CEVAP GÖNDERME
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
                    // Zamana dayalı puanlama
                    const gecen = (Date.now() - room.questionStartTime) / 1000;
                    const kalan = Math.max(0, room.settings.duration - gecen);
                    earnedPoints = 10 + Math.ceil(kalan / 4); 
                    player.score += earnedPoints;
                } else {
                    player.score -= 5; // Yanlış cevap cezası
                }
            }
            
            // Cevap sonucunu oyuncuya bildir
            socket.emit("answerResult", { 
                correct: isCorrect, 
                correctIndex: currentQ.dogru, 
                selectedIndex: answerIndex, 
                isBlank: answerIndex === -1, 
                points: earnedPoints 
            });
            
            // Tüm odaya puan tablosunu güncelle
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            // Herkes cevapladıysa sonraki soruya geç
            if (room.answerCount >= Object.keys(room.players).length) {
                clearTimeout(room.timerId); 
                room.currentQuestionIndex++; 
                setTimeout(() => { sendQuestionToRoom(roomCode); }, 1500); 
            }
        }
    });
    
    // YENİ SORU EKLEME VE KAYDETME (YENİ EKLENDİ)
    socket.on("addNewQuestion", (q) => { 
        tumSorular.push(q);
        // Dosyaya kalıcı olarak yaz
        fs.writeFile(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2), (err) => {
            if (err) console.error("Kayıt hatası:", err);
            else console.log("Yeni soru dosyaya kaydedildi.");
        });
    });
    
    // OYUNCU AYRILDIĞINDA
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

// SORU GÖNDERME YARDIMCISI
function sendQuestionToRoom(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    // Sorular bittiyse oyun sonu
    if (room.currentQuestionIndex >= room.questions.length) {
        io.to(roomCode).emit("gameOver", Object.values(room.players));
        room.gameStarted = false; return;
    }
    
    // Yeni soru hazırlığı
    room.answerCount = 0; 
    Object.keys(room.players).forEach(id => { room.players[id].hasAnsweredThisRound = false; });
    room.questionStartTime = Date.now();
    const q = room.questions[room.currentQuestionIndex];
    
    // Soruyu gönder
    io.to(roomCode).emit("newQuestion", {
        soru: q.soru, 
        siklar: q.siklar, 
        ders: q.ders, 
        resim: q.resim, 
        zorluk: q.zorluk,
        deneme: q.deneme,
        cozum: q.cozum,   
        index: room.currentQuestionIndex + 1, 
        total: room.questions.length, 
        duration: room.settings.duration
    });
    
    // Zamanlayıcıyı başlat
    room.timerId = setTimeout(() => { 
        if (rooms[roomCode] && room.gameStarted) { 
            room.currentQuestionIndex++; 
            sendQuestionToRoom(roomCode); 
        } 
    }, room.settings.duration * 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda tam güç çalışıyor.`));
