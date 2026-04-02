/* ==========================================================================
   GAZİLİLER KPSS BİLGİ BANKASI - SUNUCU DOSYASI (SERVER) - MASTER FULL VERSION
   ========================================================================== */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const nodemailer = require("nodemailer");

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

// --- GMAIL SMTP MOTORU (GAZİLİLER DESTEK) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || "gazililerdestek@gmail.com",
        pass: process.env.EMAIL_PASS || "knahydtitazdjvob"
    }
});

async function sendGaziEmail(to, title, count) {
    const mailOptions = {
        from: `"Gazililer Destek" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `👨‍🏫 Hocanız Yeni Bir Ödev Gönderdi!`,
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; padding: 25px; border: 2px solid #1e3c72; border-radius: 15px; max-width: 600px; margin: auto;">
                <h2 style="color: #1e3c72; text-align: center;">🎓 Gazililer KPSS Bilgi Bankası</h2>
                <div style="font-size: 1.1rem; color: #333; line-height: 1.6; background: #f9f9f9; padding: 15px; border-radius: 10px;">
                    Merhaba,<br><br>
                    <b>Hocanız</b> sana yeni bir ödev gönderdi.<br><br>
                    📌 <b>Ödev Konusu:</b> ${title}<br>
                    📝 <b>Soru Sayısı:</b> ${count}<br><br>
                    Hemen sisteme girip çalışmaya başlayabilirsin. Başarılar dileriz!
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8rem; color: #888; text-align: center;">Bu mail Gazililer Destek birimi tarafından otomatik gönderilmiştir.</p>
            </div>
        `
    };
    try { await transporter.sendMail(mailOptions); console.log("📧 Ödev maili gönderildi: " + to); } 
    catch (e) { console.error("❌ Mail Hatası:", e); }
}

app.get('/', (req, res) => {
    const indexPath = fs.existsSync(path.join(__dirname, 'public', 'index.html')) 
        ? path.join(__dirname, 'public', 'index.html') 
        : path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

// --- DEĞİŞKENLER VE DOSYALAR ---
let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const REPORTS_FILE = path.join(__dirname, 'reports.json'); 
const CLASSES_FILE = path.join(__dirname, 'classes.json');

// --- GEMINI AI AYARI ---
const geminiApiKey = process.env.GEMINI_API_KEY || "ANAHTAR_YOK";
const genAI = new GoogleGenerativeAI(geminiApiKey);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- SORU HAVUZU MOTORU (850 SATIRLIK KODDAKİ KURTARMA MANTIĞI) ---
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
            tumSorular = [];
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
    tumSorular.forEach(q => { if (q.deneme) denemeler[q.deneme] = (denemeler[q.deneme] || 0) + 1; });
    io.emit('updateDenemeList', { denemeler });
    io.emit('updateSubjectList', dersler);
}

// --- SOCKET İLETİŞİMİ ---
io.on("connection", (socket) => {
    
    // --- ÖDEV ATAMA VE MAIL GÖNDERME MOTORU ---
    socket.on("assignHomework", async (data) => {
        if(db) {
            try {
                const homework = { ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() };
                await db.collection("homeworks").add(homework);

                if (fs.existsSync(CLASSES_FILE)) {
                    const classes = JSON.parse(fs.readFileSync(CLASSES_FILE, 'utf8'));
                    const myClass = classes[data.classCode];
                    if (myClass && myClass.students) {
                        myClass.students.forEach(student => {
                            if (student.email) sendGaziEmail(student.email, data.title, data.count);
                        });
                    }
                }
                io.emit("receiveGlobalAlert", { sender: "Eğitmen", message: "Hocanız yeni bir ödev gönderdi!" });
            } catch(e) { console.error("Ödev Hatası:", e); }
        }
    });

    socket.on("getStudentHomeworks", async (classCode) => {
        if(db) {
            const snap = await db.collection("homeworks").where("classCode", "==", classCode).orderBy("createdAt", "desc").get();
            socket.emit("studentHomeworksData", snap.docs.map(doc => doc.data()));
        }
    });

    // --- ARALIKLI TEKRAR (SPACED REPETITION) MOTORU ---
    socket.on("addToReviewQueue", async (data) => {
        if(db) {
            const nextReview = new Date(); nextReview.setDate(nextReview.getDate() + 1);
            await db.collection("review_queue").add({
                studentName: data.studentName,
                question: data.question,
                nextReviewDate: nextReview.toISOString(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    });

    socket.on("getTodayReviews", async (studentName) => {
        if(db) {
            const today = new Date().toISOString();
            const snap = await db.collection("review_queue").where("studentName", "==", studentName).where("nextReviewDate", "<=", today).get();
            socket.emit("todayReviewsData", snap.docs.map(doc => doc.data()));
        }
    });

    // KİŞİYE ÖZEL FİLTRE GÖNDERİMİ (İZOLASYON)
    socket.on("getFilters", (classCode) => {
        const filteredPool = tumSorular.filter(q => !q.classCode || q.classCode === classCode);
        const denemeler = {};
        const dersler = [...new Set(filteredPool.map(q => (q.ders || "Genel").trim().toUpperCase()).filter(x => x))].sort();
        filteredPool.forEach(q => { if (q.deneme) denemeler[q.deneme] = (denemeler[q.deneme] || 0) + 1; });
        socket.emit('updateFilters', { dersler, denemeler });
    });

    // --- GEMINI AI SORGUSU ---
    socket.on("askGemini", async (qObj) => {
        try {
            if(geminiApiKey === "ANAHTAR_YOK") return socket.emit("geminiResponse", "⚠️ AI Anahtarı yok.");
            const prompt = `Sen uzman bir KPSS hocasısın. Analiz et ve kısa açıkla: \n\nSoru: ${qObj.soru} \nŞıklar: ${qObj.siklar.join(", ")}`;
            const result = await aiModel.generateContent(prompt);
            socket.emit("geminiResponse", result.response.text());
        } catch (e) { socket.emit("geminiResponse", "⚠️ AI şu an meşgul."); }
    });

    // --- GEMINI VISION GÖRSEL OKUMA MOTORU ---
    socket.on("parseImageWithGemini", async ({ imageBase64 }) => {
        try {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const imageParts = [{ inlineData: { data: base64Data, mimeType: "image/jpeg" } }];
            const prompt = "Bu bir KPSS sorusudur. Resmi analiz et. Format:\nSORU_METNI: [soru]\nSIKLAR: [A] | [B] | [C] | [D] | [E]\nDOGRU_INDEKS: [rakam]";
            const result = await aiModel.generateContent([prompt, ...imageParts]);
            socket.emit("geminiParsedData", result.response.text());
        } catch(e) { socket.emit("geminiParsedData", "HATA"); }
    });

    // --- SINIF VE YETKİ OLAYLARI ---
    socket.on("createClass", (teacherEmail) => {
        const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        let classes = {};
        if (fs.existsSync(CLASSES_FILE)) { try { classes = JSON.parse(fs.readFileSync(CLASSES_FILE, 'utf8')); } catch (e) {} }
        classes[classCode] = { teacher: teacherEmail, students: [], createdAt: new Date().toISOString() };
        fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2));
        socket.emit("classCreated", classCode);
    });

    socket.on("joinClass", ({ code, studentName, studentEmail }) => {
        if (fs.existsSync(CLASSES_FILE)) {
            let classes = JSON.parse(fs.readFileSync(CLASSES_FILE, 'utf8'));
            if (classes[code]) {
                if (!classes[code].students.find(s => s.email === studentEmail)) {
                    classes[code].students.push({ name: studentName, email: studentEmail, joinedAt: new Date().toLocaleString('tr-TR') });
                    fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2));
                }
                socket.emit("classJoined", { success: true, teacher: "Hocanız", code: code });
            } else { socket.emit("classJoined", { success: false }); }
        }
    });

    socket.on("addNewQuestion", async (newQ) => {
        tumSorular.push(newQ);
        fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(tumSorular, null, 2));
        if (db) { try { await db.collection("kpss_sorular").add({ ...newQ, createdAt: admin.firestore.FieldValue.serverTimestamp() }); } catch (e) {} }
        listeleriHerkesinEkranindaGuncelle();
    });

    socket.on("saveStudentResult", async (data) => {
        if(db) { try { await db.collection("kpss_results").add({ ...data, date: new Date().toLocaleString('tr-TR'), serverTime: admin.firestore.FieldValue.serverTimestamp() }); } catch(e){} }
    });

    socket.on("getMyStats", async (studentName) => {
        if(db) {
            const snap = await db.collection("kpss_results").where("name", "==", studentName).orderBy("serverTime", "desc").get();
            socket.emit("myStatsData", snap.docs.map(doc => doc.data()));
        }
    });

    socket.on("getTeacherReports", async (classCode) => {
        if(db) {
            const snap = await db.collection("kpss_results").where("classCode", "==", classCode).orderBy("serverTime", "desc").get();
            socket.emit("teacherReportsData", snap.docs.map(doc => doc.data()));
        }
    });

    // --- OYUN ODASI VE DENEME MANTIĞI (TAM SÜRÜM) ---
    socket.on("createRoom", (data) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = { code: roomCode, players: {}, gameStarted: false, currentQuestionIndex: 0, questions: [], settings: {}, timerId: null, answerCount: 0, questionStartTime: 0 };
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: data.username || "Gazi", score: 0, hasAnsweredThisRound: false };
        socket.emit("roomCreated", roomCode); io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    socket.on("joinRoom", ({ username, roomCode }) => {
        if (!rooms[roomCode]) return socket.emit("errorMsg", "Oda bulunamadı!");
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username, score: 0, hasAnsweredThisRound: false };
        socket.emit("roomJoined", roomCode); io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    socket.on("startTrial", (settings) => {
        let pool = tumSorular.filter(q => !q.classCode || q.classCode === settings.classCode);
        if (settings.subject && settings.subject !== "HEPSI") {
            const targets = Array.isArray(settings.subject) ? settings.subject : [settings.subject];
            pool = pool.filter(q => targets.includes((q.ders || "GENEL").trim().toUpperCase()));
        }
        fisherYatesShuffle(pool);
        const trialQs = pool.slice(0, parseInt(settings.count) || 10).map(q => shuffleOptions(q, settings.optionsCount));
        socket.emit("trialStarted", { questions: trialQs, timerMode: settings.timerMode, duration: settings.duration });
    });

    socket.on("startGame", ({ roomCode, settings }) => {
        const room = rooms[roomCode]; if (!room) return;
        let pool = tumSorular.filter(q => !q.classCode || q.classCode === settings.classCode);
        fisherYatesShuffle(pool);
        room.questions = pool.slice(0, parseInt(settings.count) || 10).map(q => shuffleOptions(q, settings.optionsCount));
        room.settings = settings; room.gameStarted = true; room.currentQuestionIndex = 0;
        sendQuestionToRoom(roomCode);
    });

    socket.on("submitAnswer", ({ roomCode, answerIndex }) => {
        const room = rooms[roomCode]; if (!room || !room.gameStarted) return;
        const currentQ = room.questions[room.currentQuestionIndex];
        const player = room.players[socket.id];
        if (player && !player.hasAnsweredThisRound) {
            player.hasAnsweredThisRound = true; room.answerCount++;
            let isCorrect = (answerIndex !== -1 && answerIndex == currentQ.dogru);
            if (isCorrect) player.score += 10; else if (answerIndex !== -1) player.score -= 5;
            socket.emit("answerResult", { correct: isCorrect, correctIndex: currentQ.dogru, selectedIndex: answerIndex });
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));
            if (room.answerCount >= Object.keys(room.players).length) {
                clearTimeout(room.timerId);
                setTimeout(() => { room.currentQuestionIndex++; sendQuestionToRoom(roomCode); }, 1000); 
            }
        }
    });

    socket.on("disconnect", () => {
        for (const code in rooms) {
            if (rooms[code].players[socket.id]) { delete rooms[code].players[socket.id]; io.to(code).emit("updatePlayerList", Object.values(rooms[code].players)); }
        }
    });
});

function sendQuestionToRoom(roomCode) {
    const room = rooms[roomCode]; if (!room || !room.gameStarted) return;
    if (room.currentQuestionIndex >= room.questions.length) {
        io.to(roomCode).emit("gameOver", Object.values(room.players));
        room.gameStarted = false; return;
    }
    room.answerCount = 0; Object.keys(room.players).forEach(id => { room.players[id].hasAnsweredThisRound = false; });
    const q = room.questions[room.currentQuestionIndex];
    io.to(roomCode).emit("newQuestion", {
        soru: q.soru, siklar: q.siklar, ders: q.ders, image: q.image,
        index: room.currentQuestionIndex + 1, total: room.questions.length,
        duration: parseInt(room.settings.duration), timerMode: room.settings.timerMode
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Gazililer Sunucusu ${PORT} portunda aktif.`));
