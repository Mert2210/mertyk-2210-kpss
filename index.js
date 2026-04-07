/* ==========================================================================
   GAZİLİLER YANLIŞ SORU KUMBARAM - SUNUCU DOSYASI (SERVER) - FINAL MASTER V3
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

// VERİ İŞLEME KAPASİTESİ (Resimli sorular için kritik)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["polling", "websocket"]
});

app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, "public")));

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
}
const db = admin.apps.length ? admin.firestore() : null;

app.get('/', (req, res) => {
    const indexPath = fs.existsSync(path.join(__dirname, 'public', 'index.html')) 
        ? path.join(__dirname, 'public', 'index.html') 
        : path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

// UYGULAMA İKON VE MANIFEST YÖNLENDİRMELERİ
app.get('/icon-192.png', (req, res) => { 
    const iconPath = fs.existsSync(path.join(__dirname, 'public', 'icon-192.png')) ? path.join(__dirname, 'public', 'icon-192.png') : path.join(__dirname, 'icon-192.png');
    res.sendFile(iconPath); 
});
app.get('/icon-512.png', (req, res) => { 
    const iconPath = fs.existsSync(path.join(__dirname, 'public', 'icon-512.png')) ? path.join(__dirname, 'public', 'icon-512.png') : path.join(__dirname, 'icon-512.png');
    res.sendFile(iconPath); 
});
app.get('/logo-square.png', (req, res) => { 
    const iconPath = fs.existsSync(path.join(__dirname, 'public', 'logo-square.png')) ? path.join(__dirname, 'public', 'logo-square.png') : path.join(__dirname, 'logo-square.png');
    res.sendFile(iconPath); 
});
app.get('/manifest.json', (req, res) => { 
    const manifestPath = fs.existsSync(path.join(__dirname, 'public', 'manifest.json')) ? path.join(__dirname, 'public', 'manifest.json') : path.join(__dirname, 'manifest.json');
    res.sendFile(manifestPath); 
});

let tumSorular = [];

const geminiApiKey = process.env.GEMINI_API_KEY || "ANAHTAR_YOK";
const genAI = new GoogleGenerativeAI(geminiApiKey);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 🚨 1. ADIM: SORULARI ARTIK DOSYADAN DEĞİL FIREBASE'DEN ÇEKİYORUZ 🚨
async function sorulariYukle() {
    if (db) {
        try {
            const snapshot = await db.collection("kpss_sorular").get();
            tumSorular = snapshot.docs.map(doc => doc.data());
            console.log(`📦 Firebase'den ${tumSorular.length} adet soru başarıyla yüklendi!`);
        } catch (err) {
            console.error("🔥 Firebase soru çekme hatası:", err.message);
            tumSorular = [{ "soru": "Sistem Hatası: Havuz Yüklenemedi", "ders": "SİSTEM", "siklar": ["Tamam"], "dogru": 0 }];
        }
    } else {
        console.log("⚠️ Firebase bağlantısı yok, sorular yüklenemedi.");
    }
}
sorulariYukle();
const rooms = {};

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

function getFiltersData() {
    const denemeler = {};
    const dersler = [...new Set(tumSorular.map(q => (q.ders || "Genel").trim().toLocaleUpperCase('tr')).filter(x => x))].sort();
    tumSorular.forEach(q => { if (q.deneme) denemeler[q.deneme] = (denemeler[q.deneme] || 0) + 1; });
    return { dersler, denemeler };
}

function listeleriHerkesinEkranindaGuncelle() {
    io.emit('updateFilters', getFiltersData());
}

// 🚨 BİLDİRİM (PUSH) GÖNDERME FONKSİYONU 🚨
async function sendPushNotification(topic, title, body) {
    if (admin.apps.length) {
        const message = {
            notification: { title: title, body: body },
            topic: topic // Öğrenciler sınıfa girdiklerinde bu "topic" (örneğin sınıf kodu) kanalına abone olacaklar
        };
        try {
            const response = await admin.messaging().send(message);
            console.log("🚀 Bildirim başarıyla gönderildi:", response);
        } catch (error) {
            console.error("⚠️ Bildirim gönderme hatası:", error);
        }
    }
}

io.on("connection", (socket) => {
    socket.emit('updateFilters', getFiltersData());

    socket.on("getFilters", () => {
        socket.emit('updateFilters', getFiltersData());
    });

    socket.on("askGemini", async (qObj) => {
        try {
            if(geminiApiKey === "ANAHTAR_YOK") {
                socket.emit("geminiResponse", "⚠️ Sunucuda GEMINI_API_KEY eksik."); return;
            }
            const soruMetni = qObj.soru || qObj.not || "Görseli inceleyiniz.";
            const siklarText = (qObj.siklar && Array.isArray(qObj.siklar)) ? qObj.siklar.join(", ") : "A, B, C, D, E";
            const prompt = `Sen uzman bir eğitimcisin. Aşağıdaki soruyu analiz et, doğru cevabı şıkkıyla belirt ve nedenini çok kısa, net şekilde açıkla: \n\nSoru: ${soruMetni} \nŞıklar: ${siklarText}`;
            const result = await aiModel.generateContent(prompt);
            socket.emit("geminiResponse", result.response.text());
        } catch (e) { socket.emit("geminiResponse", "⚠️ Gemini AI Hatası: " + e.message); }
    });

    socket.on("parseImageWithGemini", async ({ imageBase64 }) => {
        try {
            if(geminiApiKey === "ANAHTAR_YOK") { socket.emit("geminiParsedData", "⚠️ Sunucuda API Anahtarı yok."); return; }
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const imageParts = [{ inlineData: { data: base64Data, mimeType: "image/jpeg" } }];
            const prompt = "Bu bir sınav sorusudur. Resmi analiz et. Soru metnini ve şıkları ayrı ayrı çıkar. Formatın şu olsun:\nSORU_METNI: [soruyu buraya yaz]\nSIKLAR: [A şıkkı] | [B şıkkı] | [C şıkkı] | [D şıkkı] | [E şıkkı]\nDOGRU_INDEKS: [sence doğru cevap hangisiyse 0'dan başlayarak sadece rakam yaz (A=0, B=1...)]";
            const result = await aiModel.generateContent([prompt, ...imageParts]);
            socket.emit("geminiParsedData", result.response.text());
        } catch(e) { socket.emit("geminiParsedData", "HATA: " + e.message); }
    });

    // 🚨 ADIM 2: İSİMLENDİRİLMİŞ SINIF OLUŞTURMA 🚨
    // 🚨 2. ADIM: SINIF YÖNETİMİNİ FIREBASE'E TAŞIMA 🚨
    socket.on("createNamedClass", async ({ teacherEmail, className }) => {
        const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newClass = { name: className, teacher: teacherEmail, students: [], createdAt: admin.firestore.FieldValue.serverTimestamp() };
        
        if (db) {
            try {
                await db.collection("classes").doc(classCode).set(newClass);
                
                const snap = await db.collection("classes").where("teacher", "==", teacherEmail).get();
                const teacherClasses = snap.docs.map(doc => ({ code: doc.id, name: doc.data().name }));
                
                socket.emit("teacherClassesData", teacherClasses);
                socket.emit("classCreated", classCode);
            } catch (e) { console.error("Sınıf oluşturma hatası:", e.message); }
        }
    });

    socket.on("getTeacherClass", async (email) => {
        if (db) {
            try {
                const snap = await db.collection("classes").where("teacher", "==", email).get();
                const teacherClasses = snap.docs.map(doc => ({ code: doc.id, name: doc.data().name }));
                socket.emit("teacherClassesData", teacherClasses);
            } catch (e) { socket.emit("teacherClassesData", []); }
        }
    });

    socket.on("joinClass", async ({ code, studentName }) => {
        if (db) {
            try {
                const classRef = db.collection("classes").doc(code);
                const doc = await classRef.get();
                if (doc.exists) {
                    const classData = doc.data();
                    if (!classData.students.find(s => s.name === studentName)) {
                        classData.students.push({ name: studentName, joinedAt: new Date().toLocaleString('tr-TR') });
                        await classRef.update({ students: classData.students });
                    }
                    socket.emit("classJoined", { success: true, teacher: classData.teacher, code: code });
                } else {
                    socket.emit("classJoined", { success: false });
                }
            } catch (e) { socket.emit("classJoined", { success: false }); }
        }
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
            } else { socket.emit("classJoined", { success: false }); }
        }
    });

   socket.on("saveStudentResult", async (data) => {
        if(db) { 
            try { 
                await db.collection("kpss_results").add({ ...data, date: new Date().toLocaleString('tr-TR'), serverTime: admin.firestore.FieldValue.serverTimestamp() }); 
            } catch(e) { 
                console.error("❌ Öğrenci skoru kaydedilirken hata:", e.message); 
            } 
        }
    });

    socket.on("getMyStats", async (studentName) => {
        if(db && studentName) {
            try {
                const snap = await db.collection("kpss_results").where("name", "==", studentName).orderBy("serverTime", "desc").get();
                socket.emit("myStatsData", snap.docs.map(doc => doc.data()));
            } catch(e) { socket.emit("myStatsData", []); }
        } else { socket.emit("myStatsData", []); }
    });

    socket.on("getTeacherReports", async (classCode) => {
        if(db && classCode) {
            try {
                const snap = await db.collection("kpss_results").where("classCode", "==", classCode).orderBy("serverTime", "desc").get();
                socket.emit("teacherReportsData", snap.docs.map(doc => doc.data()));
            } catch(e) { socket.emit("teacherReportsData", []); }
        } else { socket.emit("teacherReportsData", []); }
    });

    socket.on("sendGlobalAlert", (data) => {
        io.emit("receiveGlobalAlert", { message: data.message, sender: data.sender || "Eğitmen" });
        // Eğer istersen ileride bu duyuruyu bildirim (push) olarak da attırabiliriz:
        // sendPushNotification("global", "📢 " + (data.sender || "Eğitmen"), data.message);
    });

    // 🚨 3. ADIM: SORUYU SADECE FIREBASE'E KAYDET (fs.writeFileSync KALDIRILDI) 🚨
    socket.on("addNewQuestion", async (newQ) => {
        tumSorular.push(newQ);
        if (db) { 
            try { 
                await db.collection("kpss_sorular").add({ ...newQ, createdAt: admin.firestore.FieldValue.serverTimestamp() }); 
            } catch (e) { 
                console.error("Soru ekleme hatası:", e.message); 
            } 
        }
        listeleriHerkesinEkranindaGuncelle();
        
        // 🚨 YENİ SORU EKLENDİĞİNDE BİLDİRİM GÖNDER 🚨
        if (newQ.classCode) {
            sendPushNotification(
                newQ.classCode, 
                "👨‍🏫 Öğretmenin Yeni Bir Soru Ekledi!", 
                `${newQ.ders} dersinden çözülmeyi bekleyen yeni bir soru var. Haydi kumbaraya!`
            );
        }
    });

    socket.on("getTeacherLibrary", async (classCode) => {
        if(db && classCode) {
            try {
                const snap = await db.collection("kpss_sorular").where("classCode", "==", classCode).get();
                socket.emit("teacherLibraryData", snap.docs.map(doc => doc.data()));
            } catch(e) { socket.emit("teacherLibraryData", []); }
        } else {
            socket.emit("teacherLibraryData", tumSorular.filter(q => q.classCode === classCode));
        }
    });

    socket.on("getClassQuestions", async (classCode) => {
        if(db && classCode) {
            try {
                const snap = await db.collection("kpss_sorular").where("classCode", "==", classCode).get();
                socket.emit("classQuestionsData", snap.docs.map(doc => doc.data()));
            } catch(e) { socket.emit("classQuestionsData", []); }
        } else {
            socket.emit("classQuestionsData", tumSorular.filter(q => q.classCode === classCode));
        }
    });

    socket.on("addStudentQuestion", async (q) => {
        if (db) { 
            try { 
                await db.collection("student_questions").add({ ...q, createdAt: admin.firestore.FieldValue.serverTimestamp() }); 
            } catch (e) { 
                console.error("❌ Öğrenci sorusu buluta eklenirken hata:", e.message); 
            } 
        }
    });
   socket.on("checkNotebookReviews", async (studentName) => {
        if(db && studentName) {
            try {
                const snap = await db.collection("student_questions").where("studentName", "==", studentName).get();
                const now = Date.now();
                let reviewCount = 0;
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if(data.nextReviewDate && data.nextReviewDate <= now) reviewCount++;
                });
                socket.emit("notebookReviewsCount", reviewCount);
            } catch(e) { 
                console.error("❌ Tekrar edilecek sorular kontrol edilirken hata:", e.message); 
            }
        }
    });

    socket.on("getStudentLibrary", async ({ studentName, onlyReviews }) => {
        if(db && studentName) {
            try {
                const snap = await db.collection("student_questions").where("studentName", "==", studentName).get();
                let library = snap.docs.map(doc => { let d = doc.data(); d.id = doc.id; return d; });
                if(onlyReviews) {
                    const now = Date.now();
                    library = library.filter(q => q.nextReviewDate && q.nextReviewDate <= now);
                } else {
                    library.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                }
                socket.emit("studentLibraryData", library);
            } catch(e) { socket.emit("studentLibraryData", []); }
        } else { socket.emit("studentLibraryData", []); }
    });

    socket.on("updateReviewDate", async ({ questionId, additionalDays }) => {
        if(db && questionId) {
            try {
                const newDate = Date.now() + (additionalDays * 24 * 60 * 60 * 1000);
                await db.collection("student_questions").doc(questionId).update({ nextReviewDate: newDate });
            } catch(e) { 
                console.error("❌ Soru tekrar tarihi güncellenirken hata:", e.message); 
            }
        }
    });

    socket.on("getPendingTeachers", async () => {
        if(admin.apps.length) {
            try {
                const listUsersResult = await admin.auth().listUsers(1000);
                const pending = [];
                listUsersResult.users.forEach(userRecord => {
                    if (userRecord.displayName && userRecord.displayName.includes("|teacher_pending")) {
                        pending.push({ email: userRecord.email, name: userRecord.displayName.split("|")[0] });
                    }
                });
                socket.emit("pendingTeachersData", pending);
            } catch(e) { socket.emit("pendingTeachersData", []); }
        } else { socket.emit("pendingTeachersData", []); }
    });

   socket.on("approveTeacher", async (email) => {
        if(admin.apps.length) {
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                if(userRecord.displayName && userRecord.displayName.includes("|teacher_pending")) {
                    const newName = userRecord.displayName.replace("teacher_pending", "teacher");
                    await admin.auth().updateUser(userRecord.uid, { displayName: newName });
                    
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
                console.error("❌ Öğretmen onaylanırken/listelenirken hata:", e.message); 
            }
        }
    });

    // 🚨 4. ADIM: HATA RAPORLARINI FIREBASE'E TAŞIMA 🚨
    socket.on("reportQuestion", async (qObj) => {
        if (db) {
            try {
                await db.collection("reports").add({ ...qObj, reportedAt: new Date().toLocaleString('tr-TR'), reportedBySocket: socket.id, serverTime: admin.firestore.FieldValue.serverTimestamp() });
            } catch (e) { console.error("Raporlama hatası:", e.message); }
        }
    });

    socket.on("adminGetReports", async () => {
        if (db) {
            try {
                const snap = await db.collection("reports").orderBy("serverTime", "desc").get();
                socket.emit("allReportsData", snap.docs.map(doc => doc.data()));
            } catch (e) { socket.emit("allReportsData", []); }
        } else { socket.emit("allReportsData", []); }
    });

    socket.on("createRoom", (data) => {
        const username = (typeof data === 'object') ? data.username : (data || "Öğrenci");
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

    socket.on("joinRoom", ({ username, roomCode, rank }) => {
        if (!rooms[roomCode]) return socket.emit("errorMsg", "Oda bulunamadı!");
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username, rank: rank || "1. Seviye", score: 0, hasAnsweredThisRound: false };
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

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
        
        socket.emit("trialStarted", { questions: trialQuestions, timerMode: settings.timerMode, duration: settings.duration });
    });

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
            
            socket.emit("answerResult", { correct: isCorrect, correctIndex: currentQ.dogru, selectedIndex: answerIndex, points: earnedPoints });
            io.to(roomCode).emit("updatePlayerList", Object.values(room.players));

            if (room.answerCount >= Object.keys(room.players).length && room.timerMode === 'question') {
                clearTimeout(room.timerId);
                
                if (room.currentQuestionIndex >= room.questions.length - 1) {
                    setTimeout(() => {
                        io.to(roomCode).emit("gameOver", Object.values(room.players));
                        room.gameStarted = false;
                    }, 1000);
                } else {
                    setTimeout(() => { 
                        room.currentQuestionIndex++; 
                        sendQuestionToRoom(roomCode); 
                    }, 1000);
                }
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
                if (room.currentQuestionIndex >= room.questions.length - 1) {
                    io.to(roomCode).emit("gameOver", Object.values(room.players));
                    room.gameStarted = false;
                } else {
                    room.currentQuestionIndex++; 
                    sendQuestionToRoom(roomCode); 
                }
            } 
        }, room.settings.duration * 1000);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Gazililer Eğitim Platformu Sunucusu ${PORT} portunda aktif.`));
