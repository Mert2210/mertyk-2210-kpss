/* ==========================================================================
   MYK 2210 - KPSS PLATFORMU SUNUCU DOSYASI (SERVER)
   Sürüm: Final Tam Sürüm
   Özellikler: 
   - Trim destekli Hata Analizi
   - Akıllı Sıralama (Ders sırası sabit, içerik rastgele)
   - Fisher-Yates Karıştırma
   ========================================================================== */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

// Uygulama ve Sunucu Kurulumu
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ["polling", "websocket"]
});

// Statik dosyalar (Resimler, CSS vb.) için public klasörünü dışa aç
app.use(express.static(path.join(__dirname, "public")));

// --- 🟢 SUNUCU DURUM KONTROLÜ (PING) ---
app.get("/ping", (req, res) => {
    res.send("Pong! Sunucu tüm sistemleriyle aktif ve çalışıyor.");
});

// ==========================================================================
// 1. VERİ YÖNETİMİ VE DOSYA İŞLEMLERİ
// ==========================================================================

let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const REPORTS_FILE = path.join(__dirname, 'reports.json');

/**
 * Soruları yükleyen ve bozuk JSON dosyalarını onarmaya çalışan fonksiyon.
 */
function sorulariYukle() {
    console.log("📂 Soru dosyası okunuyor...");
    
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            let rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8');

            // Olası JSON format hatalarını temizle
            rawData = rawData.replace(/\]\s*\[/g, ",");
            rawData = rawData.replace(/\]\s*,\s*\[/g, ",");
            
            while (rawData.startsWith("[[")) { rawData = rawData.replace("[[", "["); }
            while (rawData.endsWith("]]")) { rawData = rawData.replace("]]", "]"); }

            try {
                tumSorular = JSON.parse(rawData);
                console.log(`✅ BAŞARILI: Toplam ${tumSorular.length} soru hafızaya alındı.`);
            } catch (parseErr) {
                console.log("⚠️ JSON bozuk, kurtarma modu devreye giriyor...");
                const matches = rawData.match(/\{.*?\}/gs); 
                if (matches) {
                    const fixedJson = "[" + matches.join(",") + "]";
                    tumSorular = JSON.parse(fixedJson);
                    console.log(`✅ TAMİR EDİLDİ: ${tumSorular.length} soru kurtarıldı.`);
                } else {
                    throw new Error("Dosya kurtarılamayacak kadar hasarlı.");
                }
            }
        } catch (err) {
            console.error("❌ HATA: Dosya okunamadı!");
            tumSorular = [{ 
                "soru": "SİSTEM HATASI: Sorular yüklenemedi.", 
                "ders": "SİSTEM", 
                "siklar": ["Tamam"], 
                "dogru": 0 
            }];
        }
    } else {
        console.log("⚠️ Dosya bulunamadı, örnek oluşturuluyor.");
        tumSorular = [{ "soru": "Örnek Soru", "ders": "GENEL", "siklar": ["A", "B"], "dogru": 0 }];
    }
}

// Sunucu başlarken soruları yükle
sorulariYukle();

// --- 🕵️ RAPORLAMA SAYFASI ---
app.get("/raporlar", (req, res) => {
    if (fs.existsSync(REPORTS_FILE)) {
        const data = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
        
        let html = `
        <html>
        <head>
            <title>Hatalı Soru Raporları</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #f4f4f9; }
                table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #1e3c72; color: white; }
                tr:nth-child(even) { background-color: #f8f9fa; }
                h1 { color: #1e3c72; border-bottom: 2px solid #e67e22; display:inline-block; padding-bottom:10px; }
            </style>
        </head>
        <body>
            <h1>⚠️ Gelen Hata Bildirimleri (${data.length})</h1>
            <table>
                <tr>
                    <th>Tarih</th>
                    <th>Kullanıcı</th>
                    <th>Deneme / Kaynak</th>
                    <th>Soru Metni</th>
                    <th>Şikayet Nedeni</th>
                </tr>
        `;
        
        data.reverse().forEach(r => {
            html += `
                <tr>
                    <td>${r.tarih}</td>
                    <td><b>${r.raporlayan}</b></td>
                    <td>${r.deneme || "Genel"}</td>
                    <td>${r.soru.substring(0, 100)}...</td>
                    <td style="color:#c0392b; font-weight:bold;">${r.mesaj}</td>
                </tr>
            `;
        });
        
        html += `</table></body></html>`;
        res.send(html);
    } else {
        res.send("<h2 style='font-family:sans-serif; color:green;'>Henüz hiç rapor yok! Harika! 🎉</h2>");
    }
});

// ==========================================================================
// 2. YARDIMCI FONKSİYONLAR (ALGORİTMALAR)
// ==========================================================================

const rooms = {};

/**
 * Fisher-Yates Karıştırma Algoritması
 * Bir diziyi tamamen rastgele karıştırır.
 */
function fisherYatesShuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

/**
 * Şıkları Karıştırma Fonksiyonu
 */
function shuffleOptions(q) {
    if (!q || !q.siklar) return q;
    const originalCorrectText = q.siklar[q.dogru];
    const shuffledSiklar = [...q.siklar].sort(() => Math.random() - 0.5);
    const newCorrectIndex = shuffledSiklar.indexOf(originalCorrectText);
    return { ...q, siklar: shuffledSiklar, dogru: newCorrectIndex };
}

/**
 * Ders Filtreleme Yardımcısı
 */
function filterBySubject(pool, selectedSubjects) {
    if (!selectedSubjects || selectedSubjects === "HEPSI" || selectedSubjects.includes("HEPSI")) {
        return pool;
    }
    const targets = (Array.isArray(selectedSubjects) ? selectedSubjects : [selectedSubjects])
                    .map(s => s.trim().toLocaleUpperCase('tr'));

    return pool.filter(q => {
        const qDers = (q.ders || "GENEL").trim().toLocaleUpperCase('tr');
        return targets.includes(qDers);
    });
}

/**
 * 🔥 YENİ: AKILLI SIRALAMA VE KARIŞTIRMA
 * Soruları ders sırasına (Tarih > Coğrafya...) göre dizer AMA
 * her dersin içindeki soruları rastgele karıştırır.
 * Böylece sıralama sabit kalır ama sorular hep aynı gelmez.
 */
function getOrderedAndShuffledQuestions(pool, count) {
    // 1. İstenen Ders Sırası (Burası Sabit)
    const dersSirasi = ["TARİH", "COĞRAFYA", "VATANDAŞLIK", "GÜNCEL BİLGİLER", "EĞİTİM BİLİMLERİ"];
    
    // 2. Soruları Derslere Göre Grupla
    const grouped = {};
    const others = []; // Listede olmayan diğer dersler

    pool.forEach(q => {
        const dersAdi = (q.ders || "GENEL").trim().toLocaleUpperCase('tr');
        // Ders adının içinde anahtar kelime geçiyor mu? (Örn: 'TARİH' kelimesi 'INKILAP TARİHİ'nde geçer)
        let foundKey = dersSirasi.find(k => dersAdi.includes(k));
        
        if (foundKey) {
            if (!grouped[foundKey]) grouped[foundKey] = [];
            grouped[foundKey].push(q);
        } else {
            others.push(q);
        }
    });

    // 3. Her Grubu Kendi İçinde Karıştır (Rastgelelik burada sağlanıyor!)
    Object.keys(grouped).forEach(ders => {
        grouped[ders] = fisherYatesShuffle(grouped[ders]);
    });
    const shuffledOthers = fisherYatesShuffle(others);

    // 4. Sırayla Birleştir
    let finalList = [];
    
    // Önce öncelikli dersleri ekle
    dersSirasi.forEach(ders => {
        if (grouped[ders]) {
            finalList = finalList.concat(grouped[ders]);
        }
    });

    // Sonra diğerlerini ekle
    finalList = finalList.concat(shuffledOthers);

    // 5. İstenen sayı kadarını kes ve şıkları karıştırarak döndür
    return finalList.slice(0, count).map(q => shuffleOptions(q));
}

// ==========================================================================
// 3. SOCKET.IO İLETİŞİM KATMANI (REAL-TIME)
// ==========================================================================

io.on("connection", (socket) => {
    console.log(`🔌 Yeni Bağlantı: ${socket.id}`);

    // --- LİSTE GÖNDERİMİ ---
    const denemeSayilari = {};
    let ozgunSoruSayisi = 0;
    const mevcutDersler = [...new Set(tumSorular.map(q => (q.ders || "").trim().toLocaleUpperCase('tr')).filter(x => x))].sort();

    tumSorular.forEach(q => {
        if (q.deneme) denemeSayilari[q.deneme] = (denemeSayilari[q.deneme] || 0) + 1;
        if (q.zorluk !== "ÇIKMIŞ") ozgunSoruSayisi++;
    });

    socket.emit('updateDenemeList', { denemeler: denemeSayilari, ozgunSayi: ozgunSoruSayisi });
    socket.emit('updateSubjectList', mevcutDersler);


    // --- RAPOR KAYDETME ---
    socket.on('reportQuestion', (data) => {
        console.log("⚠️ Rapor Alındı:", data.soru);
        let reports = [];
        if (fs.existsSync(REPORTS_FILE)) { try { reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8')); } catch(e) {} }
        reports.push({
            tarih: new Date().toLocaleString(),
            raporlayan: data.username,
            soru: data.soru,
            deneme: data.deneme,
            mesaj: data.reason
        });
        fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), (err) => { if(err) console.error("Rapor yazılamadı."); });
    });


    // --- ODA OLUŞTURMA ---
    socket.on("createRoom", (username) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = {
            code: roomCode, players: {}, gameStarted: false,
            currentQuestionIndex: 0, questions: [], settings: {},
            timerId: null, answerCount: 0, questionStartTime: 0, totalTimeSeconds: 0, endTime: 0
        };
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: true, hasAnsweredThisRound: false };
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });


    // --- ODAYA KATILMA ---
    socket.on("joinRoom", ({ username, roomCode }) => {
        if (!rooms[roomCode]) return socket.emit("errorMsg", "Böyle bir oda bulunamadı!");
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: username, score: 0, isHost: false, hasAnsweredThisRound: false };
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });


    // --- OYUNU BAŞLATMA (KRİTİK GÜNCELLEME) ---
    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        let pool = [...tumSorular];
        const limit = parseInt(settings.count) || 20;

        console.log(`🚀 Oyun Başlıyor: Oda ${roomCode}, Mod: ${settings.isMistakeMode ? "HATA ANALİZİ" : "NORMAL"}`);

        // ---------------------------------------------------------
        // SENARYO 1: HATA ANALİZ MODU (TRIM DÜZELTMELİ)
        // ---------------------------------------------------------
        if (settings.isMistakeMode) {
            if (settings.mistakeList && settings.mistakeList.length > 0) {
                // Trim ile eşleşme
                pool = pool.filter(q => settings.mistakeList.some(mistakeSoru => mistakeSoru.trim() === (q.soru || "").trim()));
                pool = filterBySubject(pool, settings.subject);
                // Hatalarda sıra önemli değil, tam karışık
                room.questions = fisherYatesShuffle(pool).slice(0, limit).map(q => shuffleOptions(q));
            } else {
                room.questions = [];
            }
        }

        // ---------------------------------------------------------
        // SENARYO 2: KAYNAK (DENEME) SEÇİMİ MODU (AKILLI KARIŞTIRMA)
        // ---------------------------------------------------------
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
            
            // BURADA DEĞİŞİKLİK YAPILDI:
            // "getOrderedAndShuffledQuestions" kullanarak hem ders sırasını koruyoruz 
            // hem de soruların sürekli aynı gelmesini engelliyoruz.
            room.questions = getOrderedAndShuffledQuestions(pool, limit);
        }

        // ---------------------------------------------------------
        // SENARYO 3: GENEL MOD (TÜM SORULAR / AKILLI KARIŞTIRMA)
        // ---------------------------------------------------------
        else {
            pool = filterBySubject(pool, settings.subject);

            if (settings.difficulty && settings.difficulty !== "HEPSI") {
                 pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
            }
            if (settings.sikSayisi && settings.sikSayisi !== "HEPSI") {
                pool = pool.filter(q => q.siklar && q.siklar.length == settings.sikSayisi);
            }
            
            // Burada da sıralı ama karışık gelmesini istiyorsan:
            room.questions = getOrderedAndShuffledQuestions(pool, limit);
            
            // EĞER "Genel Modda ders sırası olmasın, çorba olsun" dersen alt satırı aç, üsttekini kapa:
            // room.questions = fisherYatesShuffle(pool).slice(0, limit).map(q => shuffleOptions(q));
        }
        
        // Soru Yoksa Uyarı
        if(room.questions.length === 0) {
             room.questions = [{ 
                 "soru": settings.isMistakeMode 
                    ? "Hatalı soru bulunamadı! Tarayıcı geçmişi silinmiş olabilir." 
                    : "Seçilen kriterlere uygun soru bulunamadı!", 
                 "ders": "UYARI", "siklar": ["Tamam"], "dogru": 0 
             }];
        }

        // Zamanlayıcı
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


    // --- CEVAP ALMA ---
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

    // --- NAVİGASYON ---
    socket.on("jumpToQuestion", ({ roomCode, index }) => {
        const room = rooms[roomCode];
        if (!room) return;
        if (index < 0 || index >= room.questions.length) return;
        if (Object.keys(room.players).length > 1) return; 
        room.currentQuestionIndex = index;
        sendQuestionToRoom(roomCode);
    });
    
    // --- YENİ SORU KAYDET ---
    socket.on("addNewQuestion", (q) => { 
        tumSorular.push(q);
        fs.writeFile(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2), (err) => {
            if (err) console.error("Kayıt hatası:", err);
        });
    });
    
    // --- KOPMA ---
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
    } else {
        if(room.timerId) clearTimeout(room.timerId); 
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda tam güç çalışıyor.`));
