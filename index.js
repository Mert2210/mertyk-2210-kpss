/* ==========================================================================
   MYK 2210 - KPSS PLATFORMU SUNUCU DOSYASI (SERVER)
   Sürüm: Tam Kapsamlı (Full Features)
   Özellikler: Hata Analizi (Trim Düzeltmeli), Fisher-Yates Karıştırma, 
   Raporlama, Otomatik Dosya Onarımı, Gelişmiş Oda Yönetimi
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

            // Olası JSON format hatalarını temizle (Manuel düzenlemelerden kaynaklı)
            rawData = rawData.replace(/\]\s*\[/g, ",");      // ] [ şeklindeki hataları virgülle birleştir
            rawData = rawData.replace(/\]\s*,\s*\[/g, ",");  // ] , [ şeklindeki hataları düzelt
            
            // Başlangıç ve bitişteki gereksiz parantezleri temizle
            while (rawData.startsWith("[[")) { rawData = rawData.replace("[[", "["); }
            while (rawData.endsWith("]]")) { rawData = rawData.replace("]]", "]"); }

            try {
                tumSorular = JSON.parse(rawData);
                console.log(`✅ BAŞARILI: Toplam ${tumSorular.length} soru hafızaya alındı.`);
            } catch (parseErr) {
                console.log("⚠️ JSON bozuk görünüyor, derinlemesine kurtarma modu devreye giriyor...");
                
                // Regex ile geçerli { ... } bloklarını yakala
                const matches = rawData.match(/\{.*?\}/gs); 
                if (matches) {
                    const fixedJson = "[" + matches.join(",") + "]";
                    tumSorular = JSON.parse(fixedJson);
                    console.log(`✅ TAMİR EDİLDİ: ${tumSorular.length} soru başarıyla kurtarıldı.`);
                } else {
                    throw new Error("Dosya kurtarılamayacak kadar hasarlı.");
                }
            }
        } catch (err) {
            console.error("❌ HATA: Dosya okunamadı veya format çok bozuk!");
            // Sistem çökmemesi için hata mesajı döndüren bir soru ekle
            tumSorular = [{ 
                "soru": "SİSTEM HATASI: Sorular yüklenemedi. Lütfen yöneticiye bildirin.", 
                "ders": "SİSTEM", 
                "siklar": ["Tamam"], 
                "dogru": 0 
            }];
        }
    } else {
        console.log("⚠️ Soru dosyası bulunamadı, örnek soru seti oluşturuluyor.");
        tumSorular = [{ "soru": "Örnek Soru: Türkiye'nin başkenti neresidir?", "ders": "COĞRAFYA", "siklar": ["İstanbul", "Ankara", "İzmir"], "dogru": 1 }];
    }
}

// Sunucu başlarken soruları yükle
sorulariYukle();

// --- 🕵️ RAPORLAMA SAYFASI (ADMİN İÇİN) ---
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
        
        // Raporları sondan başa (en yeni en üstte) sırala
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
 * Bir diziyi tamamen rastgele ve adil bir şekilde karıştırır.
 * "Tüm Sorular" modunda soruların hep aynı sırada gelmemesini sağlar.
 */
function fisherYatesShuffle(array) {
    let currentIndex = array.length, randomIndex;

    // Karıştırılacak eleman kalmayana kadar döngü devam eder
    while (currentIndex != 0) {
        // Geriye kalan elemanlardan rastgele birini seç
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // Mevcut elemanla rastgele seçilen elemanı yer değiştir
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }

    return array;
}

/**
 * Şıkları Karıştırma Fonksiyonu
 * Sorunun şıklarını (A, B, C, D, E) karıştırır ve doğru cevabın yeni indeksini bulur.
 */
function shuffleOptions(q) {
    if (!q || !q.siklar) return q;

    // Orijinal doğru cevabın metnini sakla
    const originalCorrectText = q.siklar[q.dogru];

    // Şıkları karıştır (Basit sort yöntemi şıklar için yeterlidir)
    const shuffledSiklar = [...q.siklar].sort(() => Math.random() - 0.5);

    // Doğru cevabın yeni yerini bul
    const newCorrectIndex = shuffledSiklar.indexOf(originalCorrectText);

    // Yeni soru objesini döndür
    return { 
        ...q, 
        siklar: shuffledSiklar, 
        dogru: newCorrectIndex 
    };
}

/**
 * Ders Filtreleme Yardımcısı
 * Havuzdan sadece seçilen derslere ait soruları süzer.
 */
function filterBySubject(pool, selectedSubjects) {
    // Eğer "HEPSI" seçiliyse filtreleme yapma, havuzu aynen döndür
    if (!selectedSubjects || selectedSubjects === "HEPSI" || selectedSubjects.includes("HEPSI")) {
        return pool;
    }

    // Seçilen dersleri diziye çevir ve büyük harfe dönüştür (eşleşme hatası olmasın diye)
    const targets = (Array.isArray(selectedSubjects) ? selectedSubjects : [selectedSubjects])
                    .map(s => s.trim().toLocaleUpperCase('tr'));

    return pool.filter(q => {
        const qDers = (q.ders || "GENEL").trim().toLocaleUpperCase('tr');
        return targets.includes(qDers);
    });
}

// ==========================================================================
// 3. SOCKET.IO İLETİŞİM KATMANI (REAL-TIME)
// ==========================================================================

io.on("connection", (socket) => {
    console.log(`🔌 Yeni Bağlantı: ${socket.id}`);

    // --- LİSTE GÖNDERİMİ ---
    // Kullanıcıya "Hangi Denemeler Var?" ve "Hangi Dersler Var?" bilgisini gönderir.
    const denemeSayilari = {};
    let ozgunSoruSayisi = 0;
    
    // Benzersiz ders listesini çıkar
    const mevcutDersler = [...new Set(tumSorular.map(q => (q.ders || "").trim().toLocaleUpperCase('tr')).filter(x => x))].sort();

    tumSorular.forEach(q => {
        // Deneme istatistiği
        if (q.deneme) {
            denemeSayilari[q.deneme] = (denemeSayilari[q.deneme] || 0) + 1;
        }
        // Özgün soru kontrolü
        if (q.zorluk !== "ÇIKMIŞ") {
            ozgunSoruSayisi++;
        }
    });

    // İstemciye verileri gönder
    socket.emit('updateDenemeList', { 
        denemeler: denemeSayilari, 
        ozgunSayi: ozgunSoruSayisi 
    });
    socket.emit('updateSubjectList', mevcutDersler);


    // --- RAPOR KAYDETME ---
    socket.on('reportQuestion', (data) => {
        console.log("⚠️ Rapor Alındı:", data.soru);
        let reports = [];
        
        // Mevcut rapor dosyasını oku
        if (fs.existsSync(REPORTS_FILE)) {
            try { 
                reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8')); 
            } catch(e) {
                console.error("Rapor dosyası okunamadı, yeni oluşturuluyor.");
            }
        }
        
        // Yeni raporu ekle
        reports.push({
            tarih: new Date().toLocaleString(),
            raporlayan: data.username,
            soru: data.soru,
            deneme: data.deneme,
            mesaj: data.reason
        });
        
        // Dosyaya yaz
        fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), (err) => {
            if(err) console.error("Rapor dosyaya yazılamadı.");
        });
    });


    // --- ODA OLUŞTURMA ---
    socket.on("createRoom", (username) => {
        // 4 Haneli rastgele oda kodu üret
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Odayı hafızada oluştur
        rooms[roomCode] = {
            code: roomCode, 
            players: {}, 
            gameStarted: false,
            currentQuestionIndex: 0, 
            questions: [], 
            settings: {},
            timerId: null, 
            answerCount: 0, 
            questionStartTime: 0,
            totalTimeSeconds: 0,
            endTime: 0
        };
        
        socket.join(roomCode);
        
        // Kurucuyu oyuncu olarak ekle (isHost: true)
        rooms[roomCode].players[socket.id] = { 
            id: socket.id, 
            username: username, 
            score: 0, 
            isHost: true,
            hasAnsweredThisRound: false 
        };
        
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });


    // --- ODAYA KATILMA ---
    socket.on("joinRoom", ({ username, roomCode }) => {
        if (!rooms[roomCode]) {
            return socket.emit("errorMsg", "Böyle bir oda bulunamadı! Kodu kontrol edin.");
        }
        
        socket.join(roomCode);
        
        // Yeni oyuncuyu ekle
        rooms[roomCode].players[socket.id] = { 
            id: socket.id, 
            username: username, 
            score: 0, 
            isHost: false,
            hasAnsweredThisRound: false 
        };
        
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });


    // --- OYUNU BAŞLATMA (EN KRİTİK BÖLÜM) ---
    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        let pool = [...tumSorular]; // Ana soru havuzunun kopyasını al
        console.log(`🚀 Oyun Başlıyor: Oda ${roomCode}, Mod: ${settings.isMistakeMode ? "HATA ANALİZİ" : "NORMAL MOD"}`);

        // ---------------------------------------------------------
        // SENARYO 1: HATA ANALİZ MODU (YANLIŞLARI SİL SÜPÜR)
        // ---------------------------------------------------------
        if (settings.isMistakeMode) {
            if (settings.mistakeList && settings.mistakeList.length > 0) {
                // KRİTİK DÜZELTME: trim() kullanarak boşluk farklarını yok sayıyoruz.
                // Böylece "Soru A " ile "Soru A" eşleşebiliyor.
                pool = pool.filter(q => {
                    return settings.mistakeList.some(mistakeSoru => 
                        mistakeSoru.trim() === (q.soru || "").trim()
                    );
                });

                // Ders filtresi varsa uygula
                pool = filterBySubject(pool, settings.subject);

                // Hatalı soruları da karıştır (Hep aynı sırayla gelmesin)
                room.questions = fisherYatesShuffle(pool)
                                     .slice(0, settings.count || 20)
                                     .map(q => shuffleOptions(q));
            } else {
                room.questions = []; // Liste boşsa soru yok
            }
        }

        // ---------------------------------------------------------
        // SENARYO 2: KAYNAK (DENEME) SEÇİMİ MODU
        // ---------------------------------------------------------
        else if (settings.deneme && settings.deneme !== "HEPSI") {
            const secilenler = Array.isArray(settings.deneme) ? settings.deneme : [settings.deneme];
            
            if (secilenler.includes("OZGUN_SORULAR")) {
                 const ozgunHavuz = pool.filter(q => q.zorluk !== "ÇIKMIŞ");
                 const denemeHavuz = pool.filter(q => secilenler.includes(q.deneme));
                 // Set kullanarak tekrarları önle
                 pool = [...new Set([...ozgunHavuz, ...denemeHavuz])];
            } else {
                 pool = pool.filter(q => secilenler.includes(q.deneme));
            }

            pool = filterBySubject(pool, settings.subject);
            
            // Deneme modunda pedagojik sıralama (Tarih -> Coğrafya -> Vatandaşlık)
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

        // ---------------------------------------------------------
        // SENARYO 3: GENEL MOD (TÜM SORULAR / KARIŞIK)
        // ---------------------------------------------------------
        else {
            pool = filterBySubject(pool, settings.subject);

            // Zorluk Filtresi
            if (settings.difficulty && settings.difficulty !== "HEPSI") {
                 pool = pool.filter(q => (q.zorluk || "ORTA") === settings.difficulty);
            }
            
            // Şık Sayısı Filtresi
            if (settings.sikSayisi && settings.sikSayisi !== "HEPSI") {
                pool = pool.filter(q => q.siklar && q.siklar.length == settings.sikSayisi);
            }
            
            // GELİŞMİŞ KARIŞTIRMA (Fisher-Yates)
            // Bu sayede her seferinde farklı sorular gelir.
            room.questions = fisherYatesShuffle(pool)
                                 .slice(0, settings.count || 20)
                                 .map(q => shuffleOptions(q));
        }
        
        // Eğer hiç soru bulunamadıysa uyarı sorusu oluştur
        if(room.questions.length === 0) {
             room.questions = [{ 
                 "soru": settings.isMistakeMode 
                    ? "Hatalı soru bulunamadı! Muhtemelen tarayıcı geçmişi temizlendi ya da tüm yanlışları düzelttin. Tebrikler! 🎉" 
                    : "Seçilen kriterlere uygun soru bulunamadı! Lütfen filtreleri değiştirip tekrar deneyin.", 
                 "ders": "SİSTEM", 
                 "siklar": ["Tamam"], 
                 "dogru": 0 
             }];
        }

        // --- ZAMANLAYICI AYARLARI ---
        room.settings = settings;
        room.timerMode = settings.timerMode || 'question';
        
        // Genel Süre Modu ise Bitiş Zamanını Hesapla
        if (room.timerMode === 'general') {
            const dakika = parseInt(settings.duration) || 30;
            room.totalTimeSeconds = dakika * 60; 
            room.endTime = Date.now() + (room.totalTimeSeconds * 1000);
            
            // Süre bitince oyunu bitir
            room.globalTimeout = setTimeout(() => {
                io.to(roomCode).emit("gameOver", Object.values(room.players));
                room.gameStarted = false;
            }, room.totalTimeSeconds * 1000);
        }

        room.gameStarted = true;
        room.currentQuestionIndex = 0;
        
        // İlk soruyu gönder
        sendQuestionToRoom(roomCode);
    });


    // --- CEVAP VERME İŞLEMİ ---
    socket.on("submitAnswer", ({ roomCode, answerIndex }) => {
        const room = rooms[roomCode];
        if (!room || !room.gameStarted) return;
        
        const currentQ = room.questions[room.currentQuestionIndex];
        const player = room.players[socket.id];

        // Eğer oyuncu bu turda daha önce cevap vermediyse
        if (player && !player.hasAnsweredThisRound) {
            player.hasAnsweredThisRound = true; 
            room.answerCount++; 
            
            let isCorrect = (answerIndex !== -1 && answerIndex == currentQ.dogru);
            let earnedPoints = 0;

            if (isCorrect) {
                // Hızlı cevap verene daha çok puan (Maks 20, Min 10)
                const gecen = (Date.now() - room.questionStartTime) / 1000;
                const kalan = Math.max(0, 20 - gecen); 
                earnedPoints = 10 + Math.ceil(kalan / 4); 
                player.score += earnedPoints;
            } else if (answerIndex !== -1) {
                // Yanlış cevap cezası
                player.score -= 5;
            }
            
            // Sonucu sadece o oyuncuya bildir (veya herkese, tercihe bağlı)
            socket.emit("answerResult", { 
                correct: isCorrect, 
                correctIndex: currentQ.dogru, 
                selectedIndex: answerIndex, 
                isBlank: answerIndex === -1, 
                points: earnedPoints 
            });
            
            // Tüm odaya güncel puan durumunu gönder
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            // Eğer herkes cevapladıysa sonraki soruya geç (Soru başına süre modunda)
            if (room.answerCount >= Object.keys(room.players).length) {
                if (room.timerMode === 'question') {
                    clearTimeout(room.timerId); 
                    room.currentQuestionIndex++; 
                    setTimeout(() => { sendQuestionToRoom(roomCode); }, 1500); 
                }
            }
        }
    });


    // --- SORU ATLAMA (Navigasyon) ---
    socket.on("jumpToQuestion", ({ roomCode, index }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        // Geçersiz index kontrolü
        if (index < 0 || index >= room.questions.length) return;
        
        // Çok oyunculu modda bireysel atlamaya izin verme (Senkronizasyon bozulur)
        if (Object.keys(room.players).length > 1) return; 

        room.currentQuestionIndex = index;
        sendQuestionToRoom(roomCode);
    });
    
    
    // --- YENİ SORU KAYDETME (Admin Paneli İçin) ---
    socket.on("addNewQuestion", (q) => { 
        tumSorular.push(q);
        fs.writeFile(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2), (err) => {
            if (err) console.error("Kayıt hatası:", err);
        });
    });
    
    
    // --- KULLANICI AYRILDIĞINDA ---
    socket.on("disconnect", () => {
        for (const code in rooms) {
            if (rooms[code].players[socket.id]) {
                delete rooms[code].players[socket.id];
                
                // Kalanlara listeyi güncelle
                io.to(code).emit("updatePlayerList", Object.values(rooms[code].players));
                
                // Oda boşaldıysa odayı sil
                if (Object.keys(rooms[code].players).length === 0) {
                    delete rooms[code]; 
                }
            }
        }
    });
});


/**
 * Odaya Soru Gönderme Yardımcı Fonksiyonu
 */
function sendQuestionToRoom(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    // Sorular bitti mi?
    if (room.currentQuestionIndex >= room.questions.length) {
        if(room.globalTimeout) clearTimeout(room.globalTimeout);
        io.to(roomCode).emit("gameOver", Object.values(room.players));
        room.gameStarted = false; 
        return;
    }
    
    // Yeni soru için hazırlıklar
    room.answerCount = 0; 
    Object.keys(room.players).forEach(id => { room.players[id].hasAnsweredThisRound = false; });
    room.questionStartTime = Date.now();
    
    const q = room.questions[room.currentQuestionIndex];
    
    // Kalan süreyi hesapla (Genel süre modu için)
    let remaining = 0;
    if (room.timerMode === 'general') {
        remaining = Math.max(0, Math.floor((room.endTime - Date.now()) / 1000));
    }

    // Soruyu gönder (Cevabı gönderme!)
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
        duration: parseInt(room.settings.duration), 
        timerMode: room.timerMode, 
        remainingTime: remaining   
    });
    
    // Soru başına süre moduysa zamanlayıcıyı kur
    if (room.timerMode === 'question') {
        if(room.timerId) clearTimeout(room.timerId);
        
        room.timerId = setTimeout(() => { 
            if (rooms[roomCode] && room.gameStarted) { 
                room.currentQuestionIndex++; 
                sendQuestionToRoom(roomCode); 
            } 
        }, room.settings.duration * 1000);
    } else {
        // Genel sürede soru geçişinde zamanlayıcı sıfırlamaya gerek yok
        if(room.timerId) clearTimeout(room.timerId); 
    }
}

// Sunucuyu Başlat
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda tam güç çalışıyor.`));

