/* ==========================================================================
   GAZİLİLER KPSS BİLGİ BANKASI - SUNUCU DOSYASI (SERVER) - FULL VERSION
   ========================================================================== */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const server = http.createServer(app);

// Erişim Ayarları
app.use(cors());
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["polling", "websocket"]
});

app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, "public")));

// --- FIREBASE ADMIN MÜHÜRLEME (GÜVENLİ YÖNTEM) ---
let serviceAccount;
try {
    if (process.env.FIREBASE_CREDENTIALS) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    }
} catch (error) {
    console.error("⚠️ UYARI: Firebase Kimlik Bilgileri bulunamadı veya hatalı!");
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin: Bulut bağlantısı GÜVENLİ ŞEKİLDE mühürlendi.");
}
const db = admin.apps.length ? admin.firestore() : null;

app.get('/', (req, res) => {
    const indexPath = fs.existsSync(path.join(__dirname, 'public', 'index.html')) 
        ? path.join(__dirname, 'public', 'index.html') 
        : path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

// --- DEĞİŞKENLER ---
let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const REPORTS_FILE = path.join(__dirname, 'reports.json'); 
const CLASSES_FILE = path.join(__dirname, 'classes.json');

// --- GEMINI AI AYARI (GÜVENLİ YÖNTEM) ---
const geminiApiKey = process.env.GEMINI_API_KEY || "ANAHTAR_YOK";
const genAI = new GoogleGenerativeAI(geminiApiKey);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- SORU HAVUZU MOTORU ---
function sorulariYukle() {
    console.log("📂 Gazililer Soru Havuzu kontrol ediliyor...");
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            let rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8');
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

function shuffleOptions(q, maxOptions = 5) {
    if (!q || !q.siklar) return q;
    const originalCorrectText = q.siklar[q.dogru];
    let newSiklar = [...q.siklar];
    
    if (newSiklar.length > maxOptions) {
        const wrongOptions = newSiklar.filter((s, i) => i !== q.dogru);
        fisherYatesShuffle(wrongOptions); 
        newSiklar = [originalCorrectText, ...wrongOptions.slice(0, maxOptions - 1)]; 
    }

    fisherYatesShuffle(newSiklar);
    const newCorrectIndex = newSiklar.indexOf(originalCorrectText);
    return { ...q, siklar: newSiklar, dogru: newCorrectIndex };
}

// --- YENİ: LİSTE GÜNCELLEME MOTORU (CANLI YAYIN) ---
function listeleriHerkesinEkranindaGuncelle() {
    const denemeler = {};
    const dersler = [...new Set(tumSorular.map(q => (q.ders || "Genel").trim().toLocaleUpperCase('tr')).filter(x => x))].sort();
    tumSorular.forEach(q => { 
        if (q.deneme) denemeler[q.deneme] = (denemeler[q.deneme] || 0) + 1; 
    });
    io.emit('updateDenemeList', { denemeler });
    io.emit('updateSubjectList', dersler);
}

// --- SOCKET İLETİŞİMİ ---
io.on("connection", (socket) => {
    
    const denemeSayilari = {};
    const mevcutDersler = [...new Set(tumSorular.map(q => (q.ders || "").trim().toLocaleUpperCase('tr')).filter(x => x))].sort();
    tumSorular.forEach(q => { if (q.deneme) denemeSayilari[q.deneme] = (denemeSayilari[q.deneme] || 0) + 1; });

    socket.emit('updateDenemeList', { denemeler: denemeSayilari });
    socket.emit('updateSubjectList', mevcutDersler);

    // --- GEMINI AI SORGUSU ---
    socket.on("askGemini", async (qObj) => {
        try {
            if(geminiApiKey === "ANAHTAR_YOK") {
                socket.emit("geminiResponse", "⚠️ Sunucuda AI Anahtarı tanımlanmamış. (Render ayarlarını kontrol et)");
                return;
            }
            const prompt = `Sen uzman bir KPSS hocasısın. Aşağıdaki soruyu analiz et, doğru cevabı şıkkıyla belirt ve nedenini çok kısa, net şekilde açıkla: \n\nSoru: ${qObj.soru} \nŞıklar: ${qObj.siklar.join(", ")}`;
            const result = await aiModel.generateContent(prompt);
            socket.emit("geminiResponse", result.response.text());
        } catch (e) {
            console.error("AI Hatası:", e);
            socket.emit("geminiResponse", "⚠️ AI şu an yanıt veremiyor, lütfen daha sonra tekrar dene.");
        }
    });

    // --- GEMINI VISION GÖRSEL OKUMA MOTORU ---
    socket.on("parseImageWithGemini", async ({ imageBase64 }) => {
        try {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const imageParts = [{ inlineData: { data: base64Data, mimeType: "image/jpeg" } }];
            const prompt = "Bu bir KPSS sorusudur. Resmi analiz et. Soru metnini ve şıkları ayrı ayrı çıkar. Formatın şu olsun:\nSORU_METNI: [soruyu buraya yaz]\nSIKLAR: [A şıkkı] | [B şıkkı] | [C şıkkı] | [D şıkkı] | [E şıkkı]\nDOGRU_INDEKS: [sence doğru cevap hangisiyse 0'dan başlayarak sadece rakam yaz (A=0, B=1...)]";
            const result = await aiModel.generateContent([prompt, ...imageParts]);
            socket.emit("geminiParsedData", result.response.text());
        } catch(e) { socket.emit("geminiParsedData", "HATA"); }
    });

    // --- SINIF SİSTEMİ OLAYLARI ---
    socket.on("createClass", (teacherEmail) => {
        const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        let classes = {};
        if (fs.existsSync(CLASSES_FILE)) {
            try { classes = JSON.parse(fs.readFileSync(CLASSES_FILE, 'utf8')); } catch (e) { classes = {}; }
        }
        classes[classCode] = { teacher: teacherEmail, students: [], createdAt: new Date().toISOString() };
        fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2));
        socket.emit("classCreated", classCode);
    });

    socket.on("joinClass", ({ code, studentName }) => {
        if (fs.existsSync(CLASSES_FILE)) {
            let classes = JSON.parse(fs.readFileSync(CLASSES_FILE, 'utf8'));
            if (classes[code]) {
                if (!classes[code].students.find(s => s.name === studentName)) {
                    classes[code].students.push({ name: studentName, joinedAt: new Date().toLocaleString('tr-TR') });
                    fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2));
                }
                socket.emit("classJoined", { success: true, teacher: classes[code].teacher, code: code });
            } else {
                socket.emit("classJoined", { success: false });
            }
        }
    });

    // --- ÖĞRENCİ SONUÇLARINI KAYDETME VE ÇEKME ---
    socket.on("saveStudentResult", async (data) => {
        if(db) {
            try { await db.collection("kpss_results").add({ ...data, date: new Date().toLocaleString('tr-TR'), serverTime: admin.firestore.FieldValue.serverTimestamp() }); } catch(e){}
        }
    });

    socket.on("getMyStats", async (studentName) => {
        if(db && studentName) {
            try {
                const snap = await db.collection("kpss_results").where("name", "==", studentName).orderBy("serverTime", "desc").get();
                const reports = snap.docs.map(doc => doc.data());
                socket.emit("myStatsData", reports);
            } catch(e) { socket.emit("myStatsData", []); }
        } else { socket.emit("myStatsData", []); }
    });

    socket.on("getTeacherReports", async (classCode) => {
        if(db && classCode) {
            try {
                const snap = await db.collection("kpss_results").where("classCode", "==", classCode).orderBy("serverTime", "desc").get();
                const reports = snap.docs.map(doc => doc.data());
                socket.emit("teacherReportsData", reports);
            } catch(e) { socket.emit("teacherReportsData", []); }
        } else { socket.emit("teacherReportsData", []); }
    });

    // --- GLOBAL DUYURU ---
    socket.on("sendGlobalAlert", (data) => {
        io.emit("receiveGlobalAlert", {
            message: data.message,
            sender: data.sender || "Eğitmen"
        });
    });

    // --- DİNAMİK SORU EKLEME VE FIREBASE ---
    socket.on("addNewQuestion", async (newQ) => {
        tumSorular.push(newQ);
        fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2));
        if (db) {
            try {
                await db.collection("kpss_sorular").add({ ...newQ, createdAt: admin.firestore.FieldValue.serverTimestamp() });
                console.log(`☁️ Yeni Soru Buluta Mühürlendi: ${newQ.soru.substring(0, 30)}...`);
            } catch (e) { console.error("Firebase Hatası:", e); }
        }
        listeleriHerkesinEkranindaGuncelle();
    });

    // --- 🚨 YENİ: KÜTÜPHANEMİ GETİR (ÖĞRETMEN) 🚨 ---
    socket.on("getTeacherLibrary", async (classCode) => {
        if(db && classCode) {
            try {
                const snap = await db.collection("kpss_sorular").where("classCode", "==", classCode).get();
                const library = snap.docs.map(doc => doc.data());
                socket.emit("teacherLibraryData", library);
            } catch(e) { 
                socket.emit("teacherLibraryData", []); 
            }
        } else {
            // Eğer Firebase koparsa yerel JSON'dan okur
            const localLib = tumSorular.filter(q => q.classCode === classCode);
            socket.emit("teacherLibraryData", localLib);
        }
    });

    // --- 🚨 YENİ: ÖĞRETMEN ONAY BEKLEYENLERİ GETİR (ADMİN) 🚨 ---
    socket.on("getPendingTeachers", async () => {
        if(admin.apps.length) {
            try {
                const listUsersResult = await admin.auth().listUsers(1000);
                const pending = [];
                listUsersResult.users.forEach(userRecord => {
                    // İsminin sonunda |teacher_pending olanları yakalar
                    if (userRecord.displayName && userRecord.displayName.includes("|teacher_pending")) {
                        pending.push({
                            email: userRecord.email,
                            name: userRecord.displayName.split("|")[0]
                        });
                    }
                });
                socket.emit("pendingTeachersData", pending);
            } catch(e) {
                console.error("Öğretmenleri çekerken hata:", e);
                socket.emit("pendingTeachersData", []);
            }
        } else {
            socket.emit("pendingTeachersData", []);
        }
    });

    // --- 🚨 YENİ: ÖĞRETMEN ONAYLA (ADMİN) 🚨 ---
    socket.on("approveTeacher", async (email) => {
        if(admin.apps.length) {
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                if(userRecord.displayName && userRecord.displayName.includes("|teacher_pending")) {
                    const newName = userRecord.displayName.replace("teacher_pending", "teacher");
                    
                    // Kullanıcının ismindeki pending yazısını silerek onaylar
                    await admin.auth().updateUser(userRecord.uid, { displayName: newName });
                    
                    // Listeyi hemen güncelle ve admin ekranına tekrar yansıt
                    const listUsersResult = await admin.auth().listUsers(1000);
                    const pending = [];
                    listUsersResult.users.forEach(u => {
                        if (u.displayName && u.displayName.includes("|teacher_pending")) {
                            pending.push({ email: u.email, name: u.displayName.split("|")[0] });
                        }
                    });
                    socket.emit("pendingTeachersData", pending);
                }
            } catch(e) {
                console.error("Öğretmen onaylama hatası:", e);
            }
        }
    });

    // --- MERKEZİ HATA RAPORU ---
    socket.on("reportQuestion", (qObj) => {
        let reports = [];
        if (fs.existsSync(REPORTS_FILE)) {
            try { reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8')); } catch (e) { reports = []; }
        }
        reports.push({
            ...qObj,
            reportedAt: new Date().toLocaleString('tr-TR'),
            reportedBySocket: socket.id
        });
        fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
        console.log(`🚨 Hata Raporu Kaydedildi.`);
    });

    socket.on("adminGetReports", () => {
        if (fs.existsSync(REPORTS_FILE)) {
            try {
                const data = fs.readFileSync(REPORTS_FILE, 'utf8');
                socket.emit("allReportsData", JSON.parse(data));
            } catch (e) { socket.emit("allReportsData", []); }
        } else { socket.emit("allReportsData", []); }
    });

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

    // HIZLI DENEME BAŞLATMA
    socket.on("startTrial", (settings) => {
        let pool = [...tumSorular];
        if (settings.deneme && settings.deneme !== "HEPSI") {
            const secilenler = Array.isArray(settings.deneme) ? settings.deneme : [settings.deneme];
            pool = pool.filter(q => secilenler.includes(q.deneme));
        }
        if (settings.subject && settings.subject !== "HEPSI") {
            const hedefler = Array.isArray(settings.subject) ? settings.subject : [settings.subject];
            pool = pool.filter(q => hedefler.includes((q.ders || "GENEL").trim().toLocaleUpperCase('tr')));
        }
        if (settings.difficulty && settings.difficulty !== "HEPSI") pool = pool.filter(q => (q.zorluk || "ORTA").toLocaleUpperCase('tr') === settings.difficulty);

        fisherYatesShuffle(pool);
        const limit = parseInt(settings.count) || 10;
        const trialQuestions = pool.slice(0, limit).map(q => shuffleOptions(q, settings.optionsCount));
        
        socket.emit("trialStarted", {
            questions: trialQuestions,
            timerMode: settings.timerMode,
            duration: settings.duration
        });
    });

    // ÇOK OYUNCULU OYUNU BAŞLATMA
    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        let pool = [...tumSorular];
        const limit = parseInt(settings.count) || 10;

        if (settings.deneme && settings.deneme !== "HEPSI") {
            const secilenler = Array.isArray(settings.deneme) ? settings.deneme : [settings.deneme];
            pool = pool.filter(q => secilenler.includes(q.deneme));
        }
        if (settings.subject && settings.subject !== "HEPSI") {
            const hedefler = Array.isArray(settings.subject) ? settings.subject : [settings.subject];
            pool = pool.filter(q => hedefler.includes((q.ders || "GENEL").trim().toLocaleUpperCase('tr')));
        }
        if (settings.difficulty && settings.difficulty !== "HEPSI") {
            pool = pool.filter(q => (q.zorluk || "ORTA").toLocaleUpperCase('tr') === settings.difficulty);
        }

        fisherYatesShuffle(pool);
        room.questions = pool.slice(0, limit).map(q => shuffleOptions(q, settings.optionsCount));
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

    // CEVAPLAMA VE 1 SANİYELİK HIZLI GEÇİŞ
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
        soru: q.soru, siklar: q.siklar, ders: q.ders, image: q.image,
        index: room.currentQuestionIndex + 1, total: room.questions.length,
        duration: parseInt(room.settings.duration), timerMode: room.timerMode, remainingTime: remaining
    });
    
    if (room.timerMode === 'question' && room.settings.duration > 0) {
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
server.listen(PORT, () => console.log(`🚀 Gazililer Sunucusu ${PORT} portunda aktif.`));
