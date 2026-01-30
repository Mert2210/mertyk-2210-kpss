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
const REPORTS_FILE = path.join(__dirname, 'reports.json'); // Rapor dosyası

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

// --- 🕵️ GİZLİ RAPOR SAYFASI ---
app.get("/raporlar", (req, res) => {
    if (fs.existsSync(REPORTS_FILE)) {
        const data = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
        
        let html = `
        <html>
        <head>
            <title>Hatalı Soru Raporları</title>
            <style>
                body { font-family: sans-serif; padding: 20px; background: #f4f4f9; }
                table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #1e3c72; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                h1 { color: #1e3c72; }
            </style>
        </head>
        <body>
            <h1>⚠️ Gelen Hata Bildirimleri</h1>
            <table>
                <tr>
                    <th>Tarih</th>
                    <th>Kullanıcı</th>
                    <th>Deneme / Ders</th>
                    <th>Soru</th>
                    <th>Şikayet Nedeni</th>
                </tr>
        `;
        
        data.reverse().forEach(r => {
            html += `
                <tr>
                    <td>${r.tarih}</td>
                    <td>${r.raporlayan}</td>
                    <td>${r.deneme || "Genel"}</td>
                    <td>${r.soru}</td>
                    <td style="color:red; font-weight:bold;">${r.mesaj}</td>
                </tr>
            `;
        });
        
        html += `</table></body></html>`;
        res.send(html);
    } else {
        res.send("<h2>Henüz hiç rapor yok! 🎉</h2>");
    }
});

const rooms = {};

// --- YENİ EKLENEN GELİŞMİŞ KARIŞTIRMA ALGORİTMASI (Fisher-Yates) ---
// Bu algoritma, soruların gerçekten rastgele dağılmasını sağlar.
function fisherYatesShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ŞIKLARI KARIŞTIRMA
function shuffleOptions(q) {
    if (!q || !q.siklar) return q;
    const originalCorrectText = q.siklar[q.dogru];
    const shuffledSiklar = [...q.siklar].sort(() => Math.random() - 0.5);
    const newCorrectIndex = shuffledSiklar.indexOf(originalCorrectText);
    return { ...q, siklar: shuffledSiklar, dogru: newCorrectIndex };
}

// --- YARDIMCI FONKSİYON: DERS FİLTRELEME ---
function filterBySubject(pool, selectedSubjects) {
    if (!selectedSubjects || selectedSubjects === "HEPSI" || selectedSubjects.includes("HEPSI")) return pool;
    const targets = (Array.isArray(selectedSubjects) ? selectedSubjects : [selectedSubjects])
                    .map(s => s.trim().toLocaleUpperCase('tr'));
    return pool.filter(q => {
        const qDers = (q.ders || "GENEL").trim().toLocaleUpperCase('tr');
        return targets.includes(qDers);
    });
}

io.on("connection", (socket) => {
    
    // --- GÜNCELLENMİŞ: SAYILI ve GRUPLANDIRILMIŞ LİSTE GÖNDERME ---
    const denemeSayilari = {};
    let ozgunSoruSayisi = 0;
    const mevcutDersler = [...new Set(tumSorular.map(q => (q.ders || "").trim().toLocaleUpperCase('tr')).filter(x => x))].sort();

    tumSorular.forEach(q => {
        // Deneme istatistiği
        if (q.deneme) {
            denemeSayilari[q.deneme] = (denemeSayilari[q.deneme] || 0) + 1;
        }
        // Özgün soru kontrolü (Zorluk seviyesi veya etiketinde 'ÇIKMIŞ' yazmıyorsa)
        if (q.zorluk !== "ÇIKMIŞ") {
            ozgunSoruSayisi++;
        }
    });

    const listeVerisi = {
        denemeler: denemeSayilari,
        ozgunSayi: ozgunSoruSayisi
    };
    
    socket.emit('updateDenemeList', listeVerisi);
    socket.emit('updateSubjectList', mevcutDersler);
    // -----------------------------------------------------------

    // --- HATALI SORU BİLDİRİMİ ALMA ---
    socket.on('reportQuestion', (data) => {
        console.log("⚠️ Bir soru rapor edildi:", data.soru);
        let reports = [];
        if (fs.existsSync(REPORTS_FILE)) {
            try {
                reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
            } catch(e) {}
        }
        reports.push({
            tarih: new Date().toLocaleString(),
            raporlayan: data.username,
            soru: data.soru,
            deneme: data.deneme,
            mesaj: data.reason
        });
        fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), (err) => {
            if(err) console.error("Rapor kaydedilemedi.");
        });
    });

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

    // --- OYUN BAŞLATMA MANTIĞI ---
    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        let pool = [...tumSorular];
        console.log(`Oyun Başlıyor: Oda ${roomCode}, Mod: ${settings.isMistakeMode ? "HATA" : "NORMAL"}`);

        // 1. HATA ANALİZ MODU
        if (settings.isMistakeMode && settings.mistakeList && settings.mistakeList.length > 0) {
            pool = pool.filter(q => settings.mistakeList.includes(q.soru));
            pool = filterBySubject(pool, settings.subject);

            if (settings.difficulty && settings.difficulty !== "HEPSI") {
                 pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
            }
            if (settings.sikSayisi && settings.sikSayisi !== "HEPSI") {
                pool = pool.filter(q => q.siklar && q.siklar.length == settings.sikSayisi);
            }
            // Burada da Fisher-Yates kullanıyoruz ki hata soruları hep aynı sırada gelmesin
            room.questions = fisherYatesShuffle(pool)
                                 .slice(0, settings.count || 20)
                                 .map(q => shuffleOptions(q));
        }

        // 2. SORU SEÇİMİ MODU (GÜNCELLENDİ)
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
            
            // Denemelerde genellikle ders sırası (Tarih -> Coğrafya...) istenir.
            // Ama sen "hep aynı sorular gelmesin" dedin.
            // Eğer "Tüm Sorular" seçiliyse KARIŞIK gelmeli, belirli bir deneme seçiliyse SIRALI gelmeli.
            // Bu mantığı korumak için burada karıştırma yapmıyoruz (kullanıcı bilinçli olarak 2014 KPSS'yi seçtiyse sırayla çözmek ister).
            // Ancak birden fazla deneme seçtiyse karıştırabiliriz. Şimdilik standart sıralamayı koruyoruz.
            
            const dersSirasi = { "TARİH": 1, "COĞRAFYA": 2, "VATANDAŞLIK": 3, "GÜNCEL BİLGİLER": 4 };
            pool.sort((a, b) => {
                const dersA = (a.ders || "").trim().toLocaleUpperCase('tr');
                const dersB = (b.ders || "").trim().toLocaleUpperCase('tr');
                const siraA = dersSirasi[dersA] || 99;
                const siraB = dersSirasi[dersB] || 99;
                return siraA - siraB;
            });

            const limit = parseInt(settings.count) || pool.length;
            room.questions = pool.slice(0, limit).map(q => shuffleOptions(q));
        }

        // 3. GENEL MOD (TÜM SORULAR SEÇİLDİĞİNDE)
        else {
            pool = filterBySubject(pool, settings.subject);

            if (settings.difficulty && settings.difficulty !== "HEPSI") {
                 pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
            }
            if (settings.sikSayisi && settings.sikSayisi !== "HEPSI") {
                pool = pool.filter(q => q.siklar && q.siklar.length == settings.sikSayisi);
            }
            
            // İŞTE BURASI: "Tüm Sorular" modunda gelişmiş karıştırma kullanıyoruz!
            // Standart .sort() yerine Fisher-Yates ile gerçekten rastgele yapıyoruz.
            room.questions = fisherYatesShuffle(pool)
                                 .slice(0, settings.count || 20)
                                 .map(q => shuffleOptions(q));
        }
        
        if(room.questions.length === 0) {
             room.questions = [{ "soru": "Seçilen kriterlere uygun soru bulunamadı!", "ders": "UYARI", "siklar": ["Tamam"], "dogru": 0 }];
        }

        // --- SÜRE AYARLARI ---
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
                const kalan = Math.max(0, 20 - gecen); 
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
                if (room.timerMode === 'question') {
                    clearTimeout(room.timerId); 
                    room.currentQuestionIndex++; 
                    setTimeout(() => { sendQuestionToRoom(roomCode); }, 1500); 
                }
            }
        }
    });

    // SORU ATLAMA / NAVİGASYON
    socket.on("jumpToQuestion", ({ roomCode, index }) => {
        const room = rooms[roomCode];
        if (!room) return;
        if (index < 0 || index >= room.questions.length) return;
        if (Object.keys(room.players).length > 1) return; 

        room.currentQuestionIndex = index;
        sendQuestionToRoom(roomCode);
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
        if(room.globalTimeout) clearTimeout(room.globalTimeout);
        io.to(roomCode).emit("gameOver", Object.values(room.players));
        room.gameStarted = false; return;
    }
    
    room.answerCount = 0; 
    Object.keys(room.players).forEach(id => { room.players[id].hasAnsweredThisRound = false; });
    room.questionStartTime = Date.now();
    const q = room.questions[room.currentQuestionIndex];
    
    let remaining = 0;
    if (room.timerMode === 'general') {
        remaining = Math.max(0, Math.floor((room.endTime - Date.now()) / 1000));
    }

    io.to(roomCode).emit("newQuestion", {
        soru: q.soru, siklar: q.siklar, ders: q.ders, resim: q.resim, 
        zorluk: q.zorluk, deneme: q.deneme, cozum: q.cozum,    
        index: room.currentQuestionIndex + 1, 
        total: room.questions.length, 
        duration: parseInt(room.settings.duration), 
        timerMode: room.timerMode, 
        remainingTime: remaining   
    });
    
    if (room.timerMode === 'question') {
        if(room.timerId) clearTimeout(room.timerId);
        room.timerId = setTimeout(() => { 
            if (rooms[roomCode] && room.gameStarted) { 
                room.currentQuestionIndex++; 
                sendQuestionToRoom(roomCode); 
            } 
        }, room.settings.duration * 1000);
    } else {
        if(room.timerId) clearTimeout(room.timerId); 
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda tam güç çalışıyor.`));

