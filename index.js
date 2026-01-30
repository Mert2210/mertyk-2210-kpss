/* ==========================================================================
   MYK 2210 - KPSS PLATFORMU SUNUCU DOSYASI (SERVER)
   Sürüm: ULTRA FINAL + RANK SİSTEMİ ENTEGRE (Hatasız)
   ========================================================================== */

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

// HTML dosyasının bulunduğu klasörü açıyoruz
app.use(express.static(path.join(__dirname, "public")));

// Eğer public klasörü yoksa ana dizine bak
app.get('/', (req, res) => {
    if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.get("/ping", (req, res) => { res.send("Pong! Sunucu Aktif."); });

let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const REPORTS_FILE = path.join(__dirname, 'reports.json'); 

function sorulariYukle() {
    console.log("📂 Soru dosyası okunuyor...");
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            let rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8');
            // Olası JSON hatalarını (fazladan köşeli parantez vs.) temizle
            rawData = rawData.replace(/\]\s*\[/g, ",");
            rawData = rawData.replace(/\]\s*,\s*\[/g, ",");
            while (rawData.startsWith("[[")) { rawData = rawData.replace("[[", "["); }
            while (rawData.endsWith("]]")) { rawData = rawData.replace("]]", "]"); }

            try {
                tumSorular = JSON.parse(rawData);
                console.log(`✅ BAŞARILI: Toplam ${tumSorular.length} soru hafızaya alındı.`);
            } catch (parseErr) {
                console.log("⚠️ JSON Onarılıyor...");
                const matches = rawData.match(/\{.*?\}/gs); 
                if (matches) {
                    tumSorular = JSON.parse("[" + matches.join(",") + "]");
                    console.log(`✅ TAMİR EDİLDİ: ${tumSorular.length} soru.`);
                } else { throw new Error("Dosya kurtarılamadı."); }
            }
        } catch (err) {
            console.error("❌ HATA: Dosya okunamadı!");
            tumSorular = [{ "soru": "SİSTEM HATASI", "ders": "SİSTEM", "siklar": ["Tamam"], "dogru": 0 }];
        }
    } else {
        tumSorular = [{ "soru": "Örnek Soru", "ders": "GENEL", "siklar": ["A", "B"], "dogru": 0 }];
    }
}
sorulariYukle();

app.get("/raporlar", (req, res) => {
    if (fs.existsSync(REPORTS_FILE)) {
        const data = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
        let html = `<html><head><title>Raporlar</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:12px;}</style></head><body><h1>⚠️ Raporlar</h1><table><tr><th>Tarih</th><th>Kullanıcı</th><th>Soru</th><th>Şikayet</th></tr>`;
        data.reverse().forEach(r => { html += `<tr><td>${r.tarih}</td><td>${r.raporlayan}</td><td>${r.soru}</td><td style="color:red;">${r.mesaj}</td></tr>`; });
        html += `</table></body></html>`;
        res.send(html);
    } else { res.send("<h2>Rapor yok.</h2>"); }
});

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
    if (!selectedSubjects || selectedSubjects === "HEPSI" || selectedSubjects.includes("HEPSI")) return pool;
    const targets = (Array.isArray(selectedSubjects) ? selectedSubjects : [selectedSubjects]).map(s => s.trim().toLocaleUpperCase('tr'));
    return pool.filter(q => targets.includes((q.ders || "GENEL").trim().toLocaleUpperCase('tr')));
}

// --- 🔥 DENGELİ DAĞITIM VE SIRALAMA ALGORİTMASI ---
function getBalancedAndOrderedQuestions(pool, count) {
    const dersSirasi = ["TARİH", "COĞRAFYA", "VATANDAŞLIK", "GÜNCEL BİLGİLER", "EĞİTİM BİLİMLERİ"];
    const grouped = {};
    const others = [];

    pool.forEach(q => {
        const dersAdi = (q.ders || "GENEL").trim().toLocaleUpperCase('tr');
        let foundKey = dersSirasi.find(k => dersAdi.includes(k));
        if (foundKey) {
            if (!grouped[foundKey]) grouped[foundKey] = [];
            grouped[foundKey].push(q);
        } else {
            others.push(q);
        }
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
    
    if (selectedQuestions.length < count && others.length > 0) {
        const needed = count - selectedQuestions.length;
        selectedQuestions = selectedQuestions.concat(fisherYatesShuffle(others).slice(0, needed));
    }

    selectedQuestions.sort((a, b) => {
        const dersA = (a.ders || "").trim().toLocaleUpperCase('tr');
        const dersB = (b.ders || "").trim().toLocaleUpperCase('tr');
        
        let indexA = dersSirasi.findIndex(k => dersA.includes(k));
        let indexB = dersSirasi.findIndex(k => dersB.includes(k));
        
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        
        return indexA - indexB;
    });

    return selectedQuestions.map(q => shuffleOptions(q));
}

io.on("connection", (socket) => {
    
    const denemeSayilari = {};
    let ozgunSoruSayisi = 0;
    const mevcutDersler = [...new Set(tumSorular.map(q => (q.ders || "").trim().toLocaleUpperCase('tr')).filter(x => x))].sort();

    tumSorular.forEach(q => {
        if (q.deneme) denemeSayilari[q.deneme] = (denemeSayilari[q.deneme] || 0) + 1;
        if (q.zorluk !== "ÇIKMIŞ") ozgunSoruSayisi++;
    });

    socket.emit('updateDenemeList', { denemeler: denemeSayilari, ozgunSayi: ozgunSoruSayisi });
    socket.emit('updateSubjectList', mevcutDersler);

    socket.on('reportQuestion', (data) => {
        let reports = [];
        if (fs.existsSync(REPORTS_FILE)) { try { reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8')); } catch(e) {} }
        reports.push({ tarih: new Date().toLocaleString(), raporlayan: data.username, soru: data.soru, deneme: data.deneme, mesaj: data.reason });
        fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), () => {});
    });

    // --- GÜNCELLENEN KISIM: CREATE ROOM (RANK DESTEĞİ) ---
    socket.on("createRoom", (data) => {
        // İstemci artık { username, rank } objesi gönderiyor
        const username = data.username || "Misafir";
        const rank = data.rank || "1. Seviye"; 

        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = { 
            code: roomCode, 
            players: {}, 
            gameStarted: false, 
            currentQuestionIndex: 0, 
            questions: [], 
            settings: {}, 
            timerId: null, 
            answerCount: 0, 
            questionStartTime: 0 
        };
        
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { 
            id: socket.id, 
            username: username, 
            rank: rank, // <--- Rütbe eklendi
            score: 0, 
            isHost: true, 
            hasAnsweredThisRound: false 
        };
        
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    // --- GÜNCELLENEN KISIM: JOIN ROOM (RANK DESTEĞİ) ---
    socket.on("joinRoom", ({ username, roomCode, rank }) => {
        if (!rooms[roomCode]) return socket.emit("errorMsg", "Oda bulunamadı!");
        
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { 
            id: socket.id, 
            username: username, 
            rank: rank || "1. Seviye", // <--- Rütbe eklendi
            score: 0, 
            isHost: false, 
            hasAnsweredThisRound: false 
        };
        
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        let pool = [...tumSorular];
        const limit = parseInt(settings.count) || 20;

        console.log(`Oyun Başlıyor: Mod: ${settings.isMistakeMode ? "HATA" : "NORMAL"}`);

        // 1. HATA MODU
        if (settings.isMistakeMode) {
            if (settings.mistakeList && settings.mistakeList.length > 0) {
                pool = pool.filter(q => settings.mistakeList.some(mistakeSoru => mistakeSoru.trim() === (q.soru || "").trim()));
                pool = filterBySubject(pool, settings.subject);
                // Hatalarda sıra önemli değil, tam karıştır
                room.questions = fisherYatesShuffle(pool).slice(0, limit).map(q => shuffleOptions(q));
            } else {
                room.questions = [];
            }
        }

        // 2. KAYNAK MODU (DENEME)
        else if (settings.deneme && settings.deneme !== "HEPSI") {
            const secilenler = Array.isArray(settings.deneme) ? settings.deneme : [settings.deneme];
            if (secilenler.includes("OZGUN_SORULAR")) {
                 const ozgunHavuz = pool.filter(q => q.zorluk !== "ÇIKMIŞ");
                 const denemeHavuz = pool.filter(q => secilenler.includes(q.deneme));
                 pool = [...new Set([...ozgunHavuz, ...denemeHavuz])];
            } else {
                 pool = pool.filter(q => secilenler.includes(q.deneme));
            }
            pool = filterBySubject(pool, settings.subject);
            
            // Dengeli Dağıtım Fonksiyonunu Kullan
            room.questions = getBalancedAndOrderedQuestions(pool, limit);
        }

        // 3. GENEL MOD
        else {
            pool = filterBySubject(pool, settings.subject);
            if (settings.difficulty && settings.difficulty !== "HEPSI") pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
            if (settings.sikSayisi && settings.sikSayisi !== "HEPSI") pool = pool.filter(q => q.siklar && q.siklar.length == settings.sikSayisi);
            
            // Dengeli Dağıtım Fonksiyonunu Kullan (Hem karışık hem sıralı)
            room.questions = getBalancedAndOrderedQuestions(pool, limit);
        }
        
        if(room.questions.length === 0) {
             room.questions = [{ "soru": "Uygun soru bulunamadı!", "ders": "UYARI", "siklar": ["Tamam"], "dogru": 0 }];
        }

        room.settings = settings;
        room.timerMode = settings.timerMode || 'question';
        
        if (room.timerMode === 'general') {
            const dakika = parseInt(settings.duration) || 30;
            room.totalTimeSeconds = dakika * 60; 
            room.endTime = Date.now() + (room.totalTimeSeconds * 1000);
            room.globalTimeout = setTimeout(() => {
                io.to(roomCode).emit("gameOver", Object.values(room.players));
                room.gameStarted = false;
            }, room.totalTimeSeconds * 1000);
        }

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
            let isCorrect = (answerIndex !== -1 && answerIndex == currentQ.dogru);
            let earnedPoints = 0;
            if (isCorrect) {
                const gecen = (Date.now() - room.questionStartTime) / 1000;
                earnedPoints = 10 + Math.ceil(Math.max(0, 20 - gecen) / 4); 
                player.score += earnedPoints;
            } else if (answerIndex !== -1) { player.score -= 5; }
            
            socket.emit("answerResult", { correct: isCorrect, correctIndex: currentQ.dogru, selectedIndex: answerIndex, isBlank: answerIndex === -1, points: earnedPoints });
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            if (room.answerCount >= Object.keys(room.players).length) {
                if (room.timerMode === 'question') {
                    clearTimeout(room.timerId); 
                    room.currentQuestionIndex++; 
                    setTimeout(() => { sendQuestionToRoom(roomCode); }, 1500); 
                }
            }
        }
    });

    socket.on("jumpToQuestion", ({ roomCode, index }) => {
        const room = rooms[roomCode];
        if (!room) return;
        if (index < 0 || index >= room.questions.length) return;
        if (Object.keys(room.players).length > 1) return; 
        room.currentQuestionIndex = index;
        sendQuestionToRoom(roomCode);
    });
    
    socket.on("addNewQuestion", (q) => { 
        tumSorular.push(q);
        fs.writeFile(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2), () => {});
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
        soru: q.soru, siklar: q.siklar, ders: q.ders, resim: q.resim, zorluk: q.zorluk, deneme: q.deneme, cozum: q.cozum,    
        index: room.currentQuestionIndex + 1, total: room.questions.length, duration: parseInt(room.settings.duration), 
        timerMode: room.timerMode, remainingTime: remaining   
    });
    
    if (room.timerMode === 'question') {
        if(room.timerId) clearTimeout(room.timerId);
        room.timerId = setTimeout(() => { 
            if (rooms[roomCode] && room.gameStarted) { room.currentQuestionIndex++; sendQuestionToRoom(roomCode); } 
        }, room.settings.duration * 1000);
    } else { if(room.timerId) clearTimeout(room.timerId); }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda tam güç çalışıyor.`));

