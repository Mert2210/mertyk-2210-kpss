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
const { fisherYatesShuffle, shuffleOptions, getFiltersData } = require("./utils/question-utils");

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

function getCurrentFiltersData() {
    return getFiltersData(tumSorular);
}

function listeleriHerkesinEkranindaGuncelle() {
    io.emit('updateFilters', getCurrentFiltersData());
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
    socket.emit('updateFilters', getCurrentFiltersData());

    socket.on("getFilters", () => {
        socket.emit('updateFilters', getCurrentFiltersData());
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

    // 🚨 KORUMALI ALAN: Sadece Yönetici E-postası Raporları Çekebilir
    socket.on("adminGetReports", async (adminEmail) => {
        // Gelen e-posta senin e-postan değilse işlemi anında durdur!
        if (adminEmail !== "kayamert319@gmail.com") {
            console.warn(`🚨 Yetkisiz admin erişimi denemesi engellendi: ${adminEmail}`);
            socket.emit("allReportsData", []); // Hırsıza boş liste gönder :)
            return;
        }

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

    // 🚨 RAM DOSTU: HIZLI DENEME BAŞLATMA (FIREBASE SORGUSU İLE) 🚨
    socket.on("startTrial", async (settings) => {
        let pool = [];
        
        if (db) {
            try {
                let query = db.collection("kpss_sorular");
                
                // En büyük yükü (Ders filtrelemesini) Firebase'e yaptırıyoruz
                if (settings.subject && settings.subject !== "HEPSI") {
                    const hedefler = Array.isArray(settings.subject) ? settings.subject : [settings.subject];
                    query = query.where("ders", "in", hedefler);
                }
                
                const snapshot = await query.get();
                pool = snapshot.docs.map(doc => doc.data());
                
                // Kalan ufak filtreleri hafızada yapıyoruz (Çok daha az veri var artık)
                if (settings.deneme && settings.deneme !== "HEPSI") {
                    const secilenler = Array.isArray(settings.deneme) ? settings.deneme : [settings.deneme];
                    pool = pool.filter(q => secilenler.includes(q.deneme));
                }
                if (settings.difficulty && settings.difficulty !== "HEPSI") {
                    pool = pool.filter(q => (q.zorluk || "ORTA").toLocaleUpperCase('tr') === settings.difficulty);
                }
            } catch(e) {
                console.error("❌ Hızlı Deneme soruları çekilirken Firebase hatası:", e.message);
                pool = [...tumSorular]; // Hata olursa eski usül yedekten devam
            }
        } else {
            pool = [...tumSorular];
        }

        fisherYatesShuffle(pool);
        const limit = parseInt(settings.count) || 10;
        const trialQuestions = pool.slice(0, limit).map(q => shuffleOptions(q, settings.optionsCount));
        
        socket.emit("trialStarted", { questions: trialQuestions, timerMode: settings.timerMode, duration: settings.duration });
    });

// 🚨 RAM DOSTU: CANLI ODA SINAVI BAŞLATMA (FIREBASE SORGUSU İLE) 🚨
    socket.on("startGame", async ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        let pool = [];
        if (db) {
            try {
                let query = db.collection("kpss_sorular");
                
                // Dersleri Firebase'den filtreleyerek çek
                if (settings.subject && settings.subject !== "HEPSI") {
                    const hedefler = Array.isArray(settings.subject) ? settings.subject : [settings.subject];
                    query = query.where("ders", "in", hedefler);
                }
                
                const snapshot = await query.get();
                pool = snapshot.docs.map(doc => doc.data());

                // Diğer detay filtreleri
                if (settings.deneme && settings.deneme !== "HEPSI") {
                    const secilenler = Array.isArray(settings.deneme) ? settings.deneme : [settings.deneme];
                    pool = pool.filter(q => secilenler.includes(q.deneme));
                }
                if (settings.difficulty && settings.difficulty !== "HEPSI") {
                    pool = pool.filter(q => (q.zorluk || "ORTA").toLocaleUpperCase('tr') === settings.difficulty);
                }
            } catch(e) {
                console.error("❌ Oda soruları çekilirken Firebase hatası:", e.message);
                pool = [...tumSorular];
            }
        } else {
            pool = [...tumSorular];
        }

        const limit = parseInt(settings.count) || 10;
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
// 🚨 1. EKSİK: Sınıfın Ortak Yanlışlarını Kaydetme 🚨
    socket.on("saveClassMistakes", async ({ classCode, mistakes }) => {
        if(db && classCode && mistakes && mistakes.length > 0) {
            try {
                const batch = db.batch();
                mistakes.forEach(m => {
                    const docRef = db.collection("class_mistakes").doc();
                    batch.set(docRef, { ...m, classCode: classCode, serverTime: admin.firestore.FieldValue.serverTimestamp() });
                });
                await batch.commit();
            } catch(e) { console.error("❌ Sınıf yanlışları kaydedilirken hata:", e.message); }
        }
    });

    // 🚨 2. EKSİK: Öğretmenin Sınıf Yanlışları Analizini Çekmesi 🚨
    socket.on("getClassMistakes", async (classCode) => {
        if(db && classCode) {
            try {
                const snap = await db.collection("class_mistakes").where("classCode", "==", classCode).get();
                const mistakesMap = {};
                
                // Aynı soruları gruplayıp kaç kere yanlış yapıldığını sayıyoruz
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    const key = data.soru; // Soru metnini benzersiz anahtar (ID) kabul ediyoruz
                    if(!mistakesMap[key]) {
                        mistakesMap[key] = { ...data, count: 1 };
                    } else {
                        mistakesMap[key].count++;
                    }
                });
                
                // En çok yanlış yapılan soruyu en üste (Z'den A'ya) sıralıyoruz
                const sortedMistakes = Object.values(mistakesMap).sort((a,b) => b.count - a.count);
                socket.emit("classMistakesData", sortedMistakes);
            } catch(e) {
                console.error("❌ Sınıf yanlışları çekilirken hata:", e.message);
                socket.emit("classMistakesData", []);
            }
        } else {
            socket.emit("classMistakesData", []);
        }
    });

    // 🚨 3. EKSİK: Öğrenci Yanlış Yaptığında Bulut Tekrar Kutusuna Ekleme 🚨
    socket.on("addToReviewQueue", async ({ studentName, question }) => {
        if(db && studentName && question) {
            try {
                const nextReview = Date.now() + (24 * 60 * 60 * 1000); // Otomatik 1 gün sonraya ertele
                await db.collection("student_questions").add({
                    ...question,
                    studentName: studentName,
                    nextReviewDate: nextReview,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch(e) { console.error("❌ Review kuyruğuna eklenirken hata:", e.message); }
        }
    });
   
    // 🚨 RAM TEMİZLİĞİ: ODA BOŞALIRSA SİL 🚨
   // 1. Önce bağlantı içindeki son işlemi (disconnect) kapatıyoruz
    socket.on("disconnect", () => {
        for (const code in rooms) {
            if (rooms[code].players[socket.id]) {
                delete rooms[code].players[socket.id];
                io.to(code).emit("updatePlayerList", Object.values(rooms[code].players));
                if (Object.keys(rooms[code].players).length === 0) {
                    if (rooms[code].timerId) clearTimeout(rooms[code].timerId);
                    if (rooms[code].globalTimeout) clearTimeout(rooms[code].globalTimeout);
                    delete rooms[code];
                }
            }
        }
    });

}); // 🚨 İŞTE BU KRİTİK PARANTEZ: io.on("connection") kapısını kapatır.

// 2. Yardımcı Fonksiyon: Ana kapının dışında olmalı
function sendQuestionToRoom(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    io.to(roomCode).emit("nextQuestion", {
        question: room.questions[room.currentQuestionIndex],
        index: room.currentQuestionIndex,
        total: room.questions.length,
        endTime: room.endTime // Genel süre varsa
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

// 3. Sunucu Başlatma: En altta kalmalı
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Gazililer Eğitim Platformu Sunucusu ${PORT} portunda aktif.`);
});
