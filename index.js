/* ==========================================================================
   GAZİLİLER KPSS BİLGİ BANKASI - SUNUCU DOSYASI (SERVER)
   SÜREÇ: 1 SN HIZLI GEÇİŞ + DENGELİ DERS DAĞILIMI + TAM YETKİ
   ========================================================================== */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cors = require("cors"); // Tarayıcı engellerini aşmak için mühürlendi

const app = express();
const server = http.createServer(app);

// Erişim Ayarları
app.use(cors()); 
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["polling", "websocket"]
});

// Statik Dosya Yönetimi
app.use(express.static(path.join(__dirname))); 
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
    const indexPath = fs.existsSync(path.join(__dirname, 'public', 'index.html')) 
        ? path.join(__dirname, 'public', 'index.html') 
        : path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');

// --- SORU HAVUZU MOTORU (JSON ONARIM DESTEKLİ) ---
function sorulariYukle() {
    console.log("📂 Gazililer Soru Havuzu kontrol ediliyor...");
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            let rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8');
            // Kritik Temizlik: Fazla köşeli parantezleri onarır
            rawData = rawData.replace(/\]\s*\[/g, ",");
            rawData = rawData.replace(/\]\s*,\s*\[/g, ",");
            while (rawData.startsWith("[[")) { rawData = rawData.replace("[[", "["); }
            while (rawData.endsWith("]]")) { rawData = rawData.replace("]]", "]"); }

            try {
                tumSorular = JSON.parse(rawData);
                console.log(`✅ BAŞARILI: ${tumSorular.length} soru Gazililer için hazır.`);
            } catch (parseErr) {
                console.log("⚠️ JSON yapısı bozuk, kurtarma motoru çalışıyor...");
                const matches = rawData.match(/\{.*?\}/gs); 
                if (matches) {
                    tumSorular = JSON.parse("[" + matches.join(",") + "]");
                    console.log(`✅ KURTARILDI: ${tumSorular.length} soru onarıldı.`);
                }
            }
        } catch (err) {
            console.error("❌ HATA: Dosya okuma başarısız!");
            tumSorular = [{ "soru": "Sistem Hatası: Havuz Yüklenemedi", "ders": "SİSTEM", "siklar": ["Tamam"], "dogru": 0 }];
        }
    }
}
sorulariYukle();

const rooms = {};

// --- ALGORİTMALAR ---
function fisherYatesShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function shuffleOptions(q) {
    if (!q || !q.siklar) return q;
    const originalCorrectText = q.siklar[q.dogru];
    const shuffledSiklar = [...q.siklar].sort(() => Math.random() - 0.5);
    const newCorrectIndex = shuffledSiklar.indexOf(originalCorrectText);
    return { ...q, siklar: shuffledSiklar, dogru: newCorrectIndex };
}

function filterBySubject(pool, selectedSubjects) {
    if (!selectedSubjects || selectedSubjects === "HEPSI") return pool;
    const targets = (Array.isArray(selectedSubjects) ? selectedSubjects : [selectedSubjects]).map(s => s.trim().toLocaleUpperCase('tr'));
    return pool.filter(q => targets.includes((q.ders || "GENEL").trim().toLocaleUpperCase('tr')));
}

function getBalancedQuestions(pool, count) {
    // Eğitim Bilimleri eklendi (Ders yelpazesi genişletildi)
    const dersSirasi = ["TARİH", "COĞRAFYA", "VATANDAŞLIK", "GÜNCEL BİLGİLER", "EĞİTİM BİLİMLERİ"];
    const grouped = {};
    const others = [];

    pool.forEach(q => {
        const dersAdi = (q.ders || "GENEL").trim().toLocaleUpperCase('tr');
        let foundKey = dersSirasi.find(k => dersAdi.includes(k));
        if (foundKey) {
            if (!grouped[foundKey]) grouped[foundKey] = [];
            grouped[foundKey].push(q);
        } else { others.push(q); }
    });

    const activeSubjects = Object.keys(grouped);
    let selectedQuestions = [];
    
    if (activeSubjects.length > 0) {
        const baseCount = Math.floor(count / activeSubjects.length); 
        let remainder = count % activeSubjects.length; 

        activeSubjects.forEach(ders => {
            const shuffledSubjectPool = fisherYatesShuffle(grouped[ders]);
            let take = baseCount + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;
            selectedQuestions = selectedQuestions.concat(shuffledSubjectPool.slice(0, take));
        });
    } else {
        selectedQuestions = fisherYatesShuffle(others).slice(0, count);
    }
    return selectedQuestions.map(q => shuffleOptions(q));
}

// --- SOCKET İLETİŞİMİ ---
io.on("connection", (socket) => {
    
    // Kaynak ve Ders Listesi
    const denemeSayilari = {};
    const mevcutDersler = [...new Set(tumSorular.map(q => (q.ders || "").trim().toLocaleUpperCase('tr')).filter(x => x))].sort();
    tumSorular.forEach(q => { if (q.deneme) denemeSayilari[q.deneme] = (denemeSayilari[q.deneme] || 0) + 1; });

    socket.emit('updateDenemeList', { denemeler: denemeSayilari });
    socket.emit('updateSubjectList', mevcutDersler);

    // Oda Oluşturma
    socket.on("createRoom", (data) => {
        const username = (typeof data === 'object') ? data.username : (data || "Gazi");
        const rank = data.rank || "1. Seviye";
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        rooms[roomCode] = { 
            code: roomCode, players: {}, gameStarted: false, currentQuestionIndex: 0, 
            questions: [], settings: {}, timerId: null, answerCount: 0, questionStartTime: 0
        };
        
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username, rank, score: 0, hasAnsweredThisRound: false };
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    // Odaya Katılma
    socket.on("joinRoom", ({ username, roomCode, rank }) => {
        if (!rooms[roomCode]) return socket.emit("errorMsg", "Oda bulunamadı!");
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username, rank: rank || "1. Seviye", score: 0, hasAnsweredThisRound: false };
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    // Oyunu Başlatma
    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        let pool = [...tumSorular];
        const limit = parseInt(settings.count) || 10;

        if (settings.deneme && settings.deneme !== "HEPSI") {
            const secilenler = Array.isArray(settings.deneme) ? settings.deneme : [settings.deneme];
            pool = pool.filter(q => secilenler.includes(q.deneme));
        }
        pool = filterBySubject(pool, settings.subject);
        room.questions = getBalancedQuestions(pool, limit);

        room.settings = settings;
        room.timerMode = settings.timerMode || 'question';
        room.gameStarted = true;
        room.currentQuestionIndex = 0;

        if (room.timerMode === 'general') {
            const dak = parseInt(settings.duration) || 15;
            room.endTime = Date.now() + (dak * 60 * 1000);
            room.globalTimeout = setTimeout(() => {
                io.to(roomCode).emit("gameOver", Object.values(room.players));
                room.gameStarted = false;
            }, dak * 60 * 1000);
        }
        sendQuestionToRoom(roomCode);
    });

    // Cevaplama ve 1 Saniyelik Hızlı Geçiş
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
                earnedPoints = 10 + Math.ceil(Math.max(0, 20 - gecen) / 2);
                player.score += earnedPoints;
            } else if (answerIndex !== -1) { player.score -= 5; }
            
            socket.emit("answerResult", { 
                correct: isCorrect, correctIndex: currentQ.dogru, selectedIndex: answerIndex, points: earnedPoints 
            });

            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            // ÖNEMLİ: 1.5 saniye değil, tam 1 saniye sonra geçiş yapar
            if (room.answerCount >= Object.keys(room.players).length && room.timerMode === 'question') {
                clearTimeout(room.timerId);
                setTimeout(() => {
                    room.currentQuestionIndex++;
                    sendQuestionToRoom(roomCode);
                }, 1000); 
            }
        }
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
    if (!room || !room.gameStarted) return;
    if (room.currentQuestionIndex >= room.questions.length) {
        if(room.globalTimeout) clearTimeout(room.globalTimeout);
        io.to(roomCode).emit("gameOver", Object.values(room.players));
        room.gameStarted = false; return;
    }

    room.answerCount = 0;
    Object.keys(room.players).forEach(id => { room.players[id].hasAnsweredThisRound = false; });
    room.questionStartTime = Date.now();
    const q = room.questions[room.currentQuestionIndex];
    let remaining = room.timerMode === 'general' ? Math.max(0, Math.floor((room.endTime - Date.now()) / 1000)) : 0;

    io.to(roomCode).emit("newQuestion", {
        soru: q.soru, siklar: q.siklar, ders: q.ders,
        index: room.currentQuestionIndex + 1, total: room.questions.length,
        duration: parseInt(room.settings.duration), timerMode: room.timerMode, remainingTime: remaining
    });
    
    if (room.timerMode === 'question') {
        if(room.timerId) clearTimeout(room.timerId);
        room.timerId = setTimeout(() => { 
            if (rooms[roomCode] && room.gameStarted) {
                room.currentQuestionIndex++;
                sendQuestionToRoom(roomCode);
            } 
        }, room.settings.duration * 1000);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Gazililer Sunucusu ${PORT} portunda tam yetkiyle aktif.`));
