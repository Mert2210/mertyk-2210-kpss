/* ==========================================================================
   GAZİLİLER YANLIŞ SORU KUMBARAM - SUNUCU DOSYASI (SERVER) - FINAL MASTER V3
   ========================================================================== */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { fisherYatesShuffle, shuffleOptions, getFiltersData } = require("./utils/question-utils");
const { readJsonFile, writeJsonFile } = require("./services/json-store");
const { sanitizeString, isValidImageDataUrl, isTeacherRole, isAdminRole } = require("./services/security-utils");
const { calculateEarnedPoints, calculateNextReviewDate } = require("./services/game-rules");

const app = express();
const server = http.createServer(app);
const ROOT_ADMIN_EMAIL = "kayamert319@gmail.com".toLowerCase();
const adminEmailsFromEnv = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
const ADMIN_EMAILS = Array.from(new Set([ROOT_ADMIN_EMAIL, ...adminEmailsFromEnv
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)]));
const staticFileLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." }
});

// VERİ İŞLEME KAPASİTESİ (Resimli sorular için kritik)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";
if (!ALLOWED_ORIGIN) {
    console.warn("⚠️ UYARI: ALLOWED_ORIGIN ayarlanmamış, tüm kökenlerden istek kabul ediliyor. Prodüksiyonda ALLOWED_ORIGIN env değişkenini tanımlayın.");
}

// Güvenli CORS yöneticisi: ALLOWED_ORIGIN ayarlanmışsa yalnızca o kökeni kabul et,
// aksi takdirde (geliştirme ortamı) tüm kökenlere izin ver.
const corsOriginHandler = ALLOWED_ORIGIN
    ? (origin, cb) => { cb(null, !origin || origin === ALLOWED_ORIGIN); }
    : (origin, cb) => { cb(null, true); };

app.use(cors({ origin: corsOriginHandler }));

const io = new Server(server, {
    cors: { origin: corsOriginHandler, methods: ["GET", "POST"] },
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

app.get('/', staticFileLimiter, (req, res) => {
    const indexPath = fs.existsSync(path.join(__dirname, 'public', 'index.html')) 
        ? path.join(__dirname, 'public', 'index.html') 
        : path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

// UYGULAMA İKON VE MANIFEST YÖNLENDİRMELERİ
app.get('/icon-192.png', staticFileLimiter, (req, res) => { 
    const iconPath = fs.existsSync(path.join(__dirname, 'public', 'icon-192.png')) ? path.join(__dirname, 'public', 'icon-192.png') : path.join(__dirname, 'icon-192.png');
    res.sendFile(iconPath); 
});
app.get('/icon-512.png', staticFileLimiter, (req, res) => { 
    const iconPath = fs.existsSync(path.join(__dirname, 'public', 'icon-512.png')) ? path.join(__dirname, 'public', 'icon-512.png') : path.join(__dirname, 'icon-512.png');
    res.sendFile(iconPath); 
});
app.get('/logo-square.png', staticFileLimiter, (req, res) => { 
    const iconPath = fs.existsSync(path.join(__dirname, 'public', 'logo-square.png')) ? path.join(__dirname, 'public', 'logo-square.png') : path.join(__dirname, 'logo-square.png');
    res.sendFile(iconPath); 
});
app.get('/manifest.json', staticFileLimiter, (req, res) => { 
    const manifestPath = fs.existsSync(path.join(__dirname, 'public', 'manifest.json')) ? path.join(__dirname, 'public', 'manifest.json') : path.join(__dirname, 'manifest.json');
    res.sendFile(manifestPath); 
});

app.get('/app-config', staticFileLimiter, (req, res) => {
    res.json({
        firebaseConfig: {
            apiKey: process.env.FIREBASE_API_KEY || "",
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
            projectId: process.env.FIREBASE_PROJECT_ID || "",
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
            appId: process.env.FIREBASE_APP_ID || "",
            measurementId: process.env.FIREBASE_MEASUREMENT_ID || ""
        },
        firebaseVapidKey: process.env.FIREBASE_VAPID_PUBLIC_KEY || ""
    });
});

let tumSorular = [];
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const REPORTS_FILE = path.join(__dirname, 'reports.json'); 
const CLASSES_FILE = path.join(__dirname, 'classes.json');
const CLASS_MISTAKES_FILE = path.join(__dirname, 'class_mistakes.json');
const REVIEW_QUEUE_FILE = path.join(__dirname, 'review_queue.json');
const DEFAULT_VISUAL_QUESTION_TEXT = "Görsel soru";

const geminiApiKey = process.env.GEMINI_API_KEY || "ANAHTAR_YOK";
const genAI = new GoogleGenerativeAI(geminiApiKey);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function sorulariYukle() {
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            let rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8');
            rawData = rawData.replace(/\]\s*\[/g, ",");
            rawData = rawData.replace(/\]\s*,\s*\[/g, ",");
            while (rawData.startsWith("[[")) { rawData = rawData.replace("[[", "["); }
            while (rawData.endsWith("]]")) { rawData = rawData.replace("]]", "]"); }
            try { tumSorular = JSON.parse(rawData); } 
            catch (parseErr) {
                const matches = rawData.match(/\{.*?\}/gs); 
                if (matches) tumSorular = JSON.parse("[" + matches.join(",") + "]");
            }
        } catch (err) {
            tumSorular = [{ "soru": "Sistem Hatası: Havuz Yüklenemedi", "ders": "SİSTEM", "siklar": ["Tamam"], "dogru": 0 }];
        }
    }
}
sorulariYukle();

const rooms = {};

function listeleriHerkesinEkranindaGuncelle() {
    io.emit('updateFilters', getFiltersData(tumSorular));
}

function readClasses() {
    return readJsonFile(CLASSES_FILE, {});
}

function writeClasses(classes) {
    writeJsonFile(CLASSES_FILE, classes);
}

function currentUser(socket) {
    return socket.data.user || { role: "guest", isVerified: false, email: "", name: "" };
}

function ensureTeacher(socket) {
    const user = currentUser(socket);
    if (!isTeacherRole(user.role)) {
        socket.emit("errorMsg", "Bu işlem için öğretmen yetkisi gerekir.");
        return false;
    }
    return true;
}

function ensureAdmin(socket) {
    const user = currentUser(socket);
    if (!isAdminRole(user.role)) {
        socket.emit("errorMsg", "Bu işlem için yönetici yetkisi gerekir.");
        return false;
    }
    return true;
}

function sanitizeCurriculumMap(payload) {
    const out = {};
    if (!payload || typeof payload !== "object") return out;
    Object.entries(payload).forEach(([subjectRaw, topicsRaw]) => {
        const subject = sanitizeString(subjectRaw, 80);
        if (!subject) return;
        const topicsInput = Array.isArray(topicsRaw) ? topicsRaw : [];
        const topics = Array.from(new Set(
            topicsInput
                .map((topic) => sanitizeString(topic, 120))
                .filter(Boolean)
        ));
        out[subject] = topics;
    });
    return out;
}

function generateUniqueQuestionId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeQuestionForClient(question, fallbackId = "") {
    const safeQuestion = question && typeof question === "object" ? question : {};
    const id = sanitizeString(safeQuestion.id, 120) || sanitizeString(fallbackId, 120) || generateUniqueQuestionId();
    return { ...safeQuestion, id };
}

// 🚨 BİLDİRİM (PUSH) GÖNDERME FONKSİYONU 🚨
async function sendPushNotification(topic, title, body) {
    if (!admin.apps.length || !isValidTopicName(topic)) return false;
    const message = {
        notification: { title: title, body: body },
        topic: topic // Öğrenciler sınıfa girdiklerinde bu "topic" (örneğin sınıf kodu) kanalına abone olacaklar
    };
    try {
        const response = await admin.messaging().send(message);
        console.log("🚀 Bildirim başarıyla gönderildi:", response);
        return true;
    } catch (error) {
        console.error("⚠️ Bildirim gönderme hatası:", error);
        return false;
    }
}

function isValidTopicName(topic) {
    // Bu akışta topic, sınıf kodu olarak kullanılır ve sınıf kodu uzunluğu 20 karakterle sınırlandırılır.
    return typeof topic === "string" && /^[a-zA-Z0-9\-_.~%]{1,20}$/.test(topic);
}

function isLikelyFcmToken(token) {
    // FCM web tokenlarında ":" karakteri bulunabildiği için desen buna izin verir.
    return typeof token === "string" && token.length >= 20 && token.length <= 4096 && /^[\w\-:.]+$/.test(token);
}

function buildStudentNotificationTopic(studentName) {
    const safeName = sanitizeString(studentName, 100);
    if (!safeName) return "";
    const digest = crypto.createHash("sha256").update(safeName, "utf8").digest("hex").slice(0, 16);
    return `stu_${digest}`;
}

// Bekleyen hatırlatma zamanlayıcıları: docId -> timeout handle
const scheduledReminders = new Map();
// Öğrenci başına debounce zamanlayıcıları: topic -> timeout handle
const studentDebounceTimers = new Map();

function scheduleReminder(docId, data) {
    if (scheduledReminders.has(docId)) {
        clearTimeout(scheduledReminders.get(docId));
        scheduledReminders.delete(docId);
    }
    const nextReviewDate = Number(data.nextReviewDate);
    const reminderSentAt = Number(data.reminderSentAt || 0);
    const studentName = sanitizeString(data.studentName, 100);
    if (!studentName || !Number.isFinite(nextReviewDate) || nextReviewDate <= 0) return;
    if (Number.isFinite(reminderSentAt) && reminderSentAt >= nextReviewDate) return;
    const delay = Math.max(0, nextReviewDate - Date.now());
    const handle = setTimeout(() => {
        scheduledReminders.delete(docId);
        triggerStudentReminder(studentName).catch((e) => console.error("⚠️ Hatırlatma tetiklenemedi:", e));
    }, delay);
    scheduledReminders.set(docId, handle);
}

async function triggerStudentReminder(studentName) {
    if (!db || !admin.apps.length) return;
    const topic = buildStudentNotificationTopic(studentName);
    if (!topic) return;
    if (studentDebounceTimers.has(topic)) {
        clearTimeout(studentDebounceTimers.get(topic));
    }
    studentDebounceTimers.set(topic, setTimeout(async () => {
        studentDebounceTimers.delete(topic);
        const now = Date.now();
        try {
            const snap = await db.collection("student_questions")
                .where("studentName", "==", studentName)
                .where("nextReviewDate", "<=", now)
                .orderBy("nextReviewDate", "asc")
                .get();
            const dueRefs = snap.docs.filter((doc) => {
                const d = doc.data() || {};
                const sat = Number(d.reminderSentAt || 0);
                const nrd = Number(d.nextReviewDate);
                return !Number.isFinite(sat) || sat < nrd;
            });
            if (dueRefs.length === 0) return;
            const sent = await sendPushNotification(
                topic,
                "⏰ Tekrar Zamanı Geldi!",
                `Bugün tekrar etmen gereken ${dueRefs.length} soru var.`
            );
            if (!sent) return;
            const batch = db.batch();
            dueRefs.forEach((doc) => batch.update(doc.ref, { reminderSentAt: now }));
            await batch.commit();
        } catch (error) {
            console.error("⚠️ Hatırlatma gönderme hatası:", error);
        }
    }, 2000));
}

io.on("connection", (socket) => {
    socket.emit('updateFilters', getFiltersData(tumSorular));

    socket.on("getFilters", () => {
        socket.emit('updateFilters', getFiltersData(tumSorular));
    });

    socket.on("getUserCurriculum", async () => {
        if (!ensureAdmin(socket)) return;
        if (!db) {
            console.warn("getUserCurriculum skipped: db connection is unavailable.");
            return socket.emit("userCurriculumData", {});
        }
        try {
            const doc = await db.collection("app_config").doc("user_curriculum").get();
            if (!doc.exists) return socket.emit("userCurriculumData", {});
            const data = doc.data() || {};
            socket.emit("userCurriculumData", sanitizeCurriculumMap(data.curriculum || {}));
        } catch (error) {
            socket.emit("userCurriculumData", {});
        }
    });

    socket.on("upsertUserCurriculum", async (curriculumPayload) => {
        if (!ensureAdmin(socket)) return;
        if (!db) return socket.emit("errorMsg", "Veritabanı bağlantısı yok. Kullanıcı müfredatı senkronize edilemedi.");
        const safeCurriculum = sanitizeCurriculumMap(curriculumPayload);
        try {
            await db.collection("app_config").doc("user_curriculum").set({
                curriculum: safeCurriculum,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: sanitizeString(currentUser(socket).email, 200)
            }, { merge: true });
            socket.emit("userCurriculumData", safeCurriculum);
        } catch (error) {
            socket.emit("errorMsg", "Kullanıcı müfredatı veritabanına kaydedilemedi.");
        }
    });

    socket.on("setUserContext", async ({ idToken, fallbackName, fallbackRole }) => {
        const safeName = sanitizeString(fallbackName, 120) || "Kullanıcı";
        const safeFallbackRole = String(fallbackRole || "").trim() === "teacher" ? "teacher" : "student";
        socket.data.user = { name: safeName, role: safeFallbackRole, isVerified: false, isAdmin: false, email: "" };

        if (!idToken || !admin.apps.length) return;
        try {
            const decoded = await admin.auth().verifyIdToken(idToken);
            const userRecord = await admin.auth().getUser(decoded.uid);
            const displayName = userRecord.displayName || "";
            const roleFromName = (displayName.split("|")[1] || "student").trim();
            const email = (userRecord.email || "").toLowerCase();
            const isAdmin = ADMIN_EMAILS.includes(email);
            socket.data.user = {
                uid: decoded.uid,
                email: userRecord.email || "",
                name: sanitizeString(displayName.split("|")[0] || safeName, 120),
                role: isAdmin ? "admin" : roleFromName,
                isVerified: true,
                isAdmin
            };
            if (db && roleFromName === "teacher_pending" && !isAdmin) {
                await db.collection("teacher_approvals").doc(decoded.uid).set({
                    uid: decoded.uid,
                    email: userRecord.email || "",
                    name: sanitizeString(displayName.split("|")[0] || safeName, 120),
                    status: "pending",
                    isApproved: false,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        } catch (error) {
            socket.emit("errorMsg", "Kimlik doğrulama yapılamadı. Bazı işlemler kısıtlanabilir.");
        }
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
        } catch (e) { socket.emit("geminiResponse", "⚠️ Gemini AI işlenirken bir hata oluştu. Lütfen tekrar deneyin."); }
    });

    socket.on("parseImageWithGemini", async ({ imageBase64 }) => {
        try {
            if(geminiApiKey === "ANAHTAR_YOK") { socket.emit("geminiParsedData", "⚠️ Sunucuda API Anahtarı yok."); return; }
            if (!imageBase64 || typeof imageBase64 !== 'string') { socket.emit("geminiParsedData", "⚠️ Geçersiz görsel verisi."); return; }
            if (!/^data:image\/(jpeg|jpg|png|gif|webp);base64,/i.test(imageBase64)) { socket.emit("geminiParsedData", "⚠️ Görsel formatı desteklenmiyor."); return; }
            if (imageBase64.length > 2 * 1024 * 1024) { socket.emit("geminiParsedData", "⚠️ Görsel dosyası çok büyük (max 2 MB)."); return; }
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const imageParts = [{ inlineData: { data: base64Data, mimeType: "image/jpeg" } }];
            const prompt = "Bu bir sınav sorusudur. Resmi analiz et. Soru metnini ve şıkları ayrı ayrı çıkar. Formatın şu olsun:\nSORU_METNI: [soruyu buraya yaz]\nSIKLAR: [A şıkkı] | [B şıkkı] | [C şıkkı] | [D şıkkı] | [E şıkkı]\nDOGRU_INDEKS: [sence doğru cevap hangisiyse 0'dan başlayarak sadece rakam yaz (A=0, B=1...)]";
            const result = await aiModel.generateContent([prompt, ...imageParts]);
            socket.emit("geminiParsedData", result.response.text());
        } catch(e) { socket.emit("geminiParsedData", "⚠️ Görsel işlenirken bir hata oluştu. Lütfen tekrar deneyin."); }
    });

    // 🚨 ADIM 2: İSİMLENDİRİLMİŞ SINIF OLUŞTURMA 🚨
    socket.on("createNamedClass", ({ teacherEmail, className }) => {
        if (!ensureTeacher(socket)) return;
        if (typeof className !== 'string' || typeof teacherEmail !== 'string') return socket.emit("errorMsg", "Geçersiz istek.");
        const safeClassName = sanitizeString(className, 100);
        const requestedEmail = sanitizeString(teacherEmail, 200);
        const verifiedEmail = sanitizeString(currentUser(socket).email, 200);
        const safeTeacherEmail = verifiedEmail || requestedEmail;
        if (!safeClassName || !safeTeacherEmail) return socket.emit("errorMsg", "Sınıf adı ve e-posta zorunludur.");
        const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const classes = readClasses();
        classes[classCode] = { name: safeClassName, teacher: safeTeacherEmail, students: [], createdAt: new Date().toISOString() };
        writeClasses(classes);
        
        // Hoca için listeyi tazele
        const teacherClasses = Object.keys(classes)
            .filter(code => classes[code].teacher === safeTeacherEmail)
            .map(code => ({ code, name: classes[code].name }));
        socket.emit("teacherClassesData", teacherClasses);
        socket.emit("classCreated", classCode);
    });

    socket.on("createClass", (teacherName) => {
        if (!ensureTeacher(socket)) return;
        const user = currentUser(socket);
        const safeTeacherEmail = sanitizeString(user.email, 200);
        if (!safeTeacherEmail) return socket.emit("errorMsg", "Öğretmen e-posta bilgisi bulunamadı.");
        const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const safeTeacherName = sanitizeString(teacherName, 100) || user.name || "Öğretmen";
        const classes = readClasses();
        classes[classCode] = {
            name: `${safeTeacherName} Sınıfı`,
            teacher: safeTeacherEmail,
            students: [],
            createdAt: new Date().toISOString()
        };
        writeClasses(classes);
        socket.emit("classCreated", classCode);
        socket.emit("teacherClassFound", classCode);
        const teacherClasses = Object.keys(classes)
            .filter(code => classes[code].teacher === safeTeacherEmail)
            .map(code => ({ code, name: classes[code].name }));
        socket.emit("teacherClassesData", teacherClasses);
    });

    // 🚨 ADIM 2: HOCANIN SINIFLARINI GETİRME 🚨
    socket.on("getTeacherClass", (email) => {
        if (!ensureTeacher(socket)) return;
        const classes = readClasses();
        const userEmail = sanitizeString(currentUser(socket).email, 200);
        const requestedEmail = sanitizeString(email, 200);
        const targetEmail = userEmail || requestedEmail;
        const teacherClasses = Object.keys(classes)
            .filter(code => classes[code].teacher === targetEmail)
            .map(code => ({ code, name: classes[code].name }));
        socket.emit("teacherClassesData", teacherClasses);
    });

    socket.on("joinClass", ({ code, studentName }) => {
        if (typeof code !== 'string' || typeof studentName !== 'string') return socket.emit("classJoined", { success: false });
        const safeCode = sanitizeString(code, 20).toUpperCase();
        const safeName = sanitizeString(studentName, 100);
        if (!safeCode || !safeName) return socket.emit("classJoined", { success: false });
        const classes = readClasses();
        if (classes[safeCode]) {
            if (!classes[safeCode].students.find(s => s.name === safeName)) {
                classes[safeCode].students.push({ name: safeName, joinedAt: new Date().toLocaleString('tr-TR') });
                writeClasses(classes);
            }
            socket.emit("classJoined", { success: true, teacher: classes[safeCode].teacher, code: safeCode });
        } else {
            socket.emit("classJoined", { success: false });
        }
    });

    socket.on("setClassNotificationToken", async ({ token, classCode, previousClassCode }) => {
        if (!admin.apps.length) return;
        const safeToken = sanitizeString(token, 4096);
        const safeClassCode = sanitizeString(classCode, 20).toUpperCase();
        const safePreviousClassCode = sanitizeString(previousClassCode || "", 20).toUpperCase();
        if (!isLikelyFcmToken(safeToken) || !isValidTopicName(safeClassCode)) {
            return socket.emit("errorMsg", "Bildirim abonelik bilgisi geçersiz.");
        }
        const classes = readClasses();
        if (!classes[safeClassCode]) {
            return socket.emit("errorMsg", "Bildirim için geçersiz sınıf kodu.");
        }
        try {
            if (safePreviousClassCode && safePreviousClassCode !== safeClassCode && isValidTopicName(safePreviousClassCode)) {
                await admin.messaging().unsubscribeFromTopic([safeToken], safePreviousClassCode);
            }
            await admin.messaging().subscribeToTopic([safeToken], safeClassCode);
            socket.emit("notificationSubscriptionUpdated", { success: true, classCode: safeClassCode });
        } catch (error) {
            console.error("⚠️ Bildirim abonelik hatası:", error);
            socket.emit("errorMsg", "Bildirim aboneliği güncellenemedi.");
        }
    });

    socket.on("clearClassNotificationToken", async ({ token, classCode }) => {
        if (!admin.apps.length) return;
        const safeToken = sanitizeString(token, 4096);
        const safeClassCode = sanitizeString(classCode, 20).toUpperCase();
        if (!isLikelyFcmToken(safeToken) || !isValidTopicName(safeClassCode)) return;
        try {
            await admin.messaging().unsubscribeFromTopic([safeToken], safeClassCode);
            socket.emit("notificationSubscriptionCleared", { success: true, classCode: safeClassCode });
        } catch (error) {
            console.error("⚠️ Bildirim abonelik kaldırma hatası:", error);
            socket.emit("errorMsg", "Bildirim aboneliği kapatılamadı.");
        }
    });

    socket.on("setStudentNotificationToken", async ({ token, studentName, previousStudentName }) => {
        if (!admin.apps.length) return;
        const safeToken = sanitizeString(token, 4096);
        const safeStudentName = sanitizeString(studentName, 100);
        const safePreviousStudentName = sanitizeString(previousStudentName || "", 100);
        const studentTopic = buildStudentNotificationTopic(safeStudentName);
        const previousTopic = buildStudentNotificationTopic(safePreviousStudentName);
        if (!isLikelyFcmToken(safeToken) || !studentTopic) {
            return socket.emit("errorMsg", "Öğrenci bildirim abonelik bilgisi geçersiz.");
        }
        try {
            if (previousTopic && previousTopic !== studentTopic) {
                await admin.messaging().unsubscribeFromTopic([safeToken], previousTopic);
            }
            await admin.messaging().subscribeToTopic([safeToken], studentTopic);
            socket.emit("notificationStudentSubscriptionUpdated", { success: true, studentTopic });
        } catch (error) {
            console.error("⚠️ Öğrenci bildirim abonelik hatası:", error);
            socket.emit("errorMsg", "Öğrenci bildirim aboneliği güncellenemedi.");
        }
    });

    socket.on("clearStudentNotificationToken", async ({ token, studentName }) => {
        if (!admin.apps.length) return;
        const safeToken = sanitizeString(token, 4096);
        const safeStudentName = sanitizeString(studentName, 100);
        const studentTopic = buildStudentNotificationTopic(safeStudentName);
        if (!isLikelyFcmToken(safeToken) || !studentTopic) return;
        try {
            await admin.messaging().unsubscribeFromTopic([safeToken], studentTopic);
            socket.emit("notificationStudentSubscriptionCleared", { success: true, studentTopic });
        } catch (error) {
            console.error("⚠️ Öğrenci bildirim abonelik kaldırma hatası:", error);
            socket.emit("errorMsg", "Öğrenci bildirim aboneliği kapatılamadı.");
        }
    });

    socket.on("saveStudentResult", async (data) => {
        if (!data || typeof data !== "object") return;
        const safeName = sanitizeString(data.name, 120);
        const safeClassCode = sanitizeString(data.classCode || "", 20).toUpperCase();
        if (!safeName) return;
        const safeScore = typeof data.score === "number" && Number.isFinite(data.score) ? data.score : 0;
        const safeTotal = typeof data.total === "number" && Number.isFinite(data.total) ? data.total : 0;
        const safeDuration = typeof data.duration === "number" && Number.isFinite(data.duration) ? data.duration : 0;
        if(db) {
            try {
                await db.collection("kpss_results").add({
                    name: safeName,
                    classCode: safeClassCode,
                    score: safeScore,
                    total: safeTotal,
                    duration: safeDuration,
                    date: new Date().toLocaleString('tr-TR'),
                    serverTime: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch(e) {}
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
        if (!ensureTeacher(socket)) return;
        const safeClassCode = sanitizeString(classCode, 20).toUpperCase();
        const classes = readClasses();
        const roster = (classes[safeClassCode]?.students || []).map(s => sanitizeString(s.name, 100)).filter(Boolean);
        if(db && safeClassCode) {
            try {
                const snap = await db.collection("kpss_results").where("classCode", "==", safeClassCode).orderBy("serverTime", "desc").get();
                socket.emit("teacherReportsData", { reports: snap.docs.map(doc => doc.data()), roster });
            } catch(e) { socket.emit("teacherReportsData", { reports: [], roster }); }
        } else { socket.emit("teacherReportsData", { reports: [], roster }); }
    });

    socket.on("sendGlobalAlert", (data) => {
        if (!ensureTeacher(socket)) return;
        if (!data || typeof data !== 'object') return;
        if (typeof data.message !== 'string' || data.message.trim() === '') return;
        const safeMessage = sanitizeString(data.message, 500);
        const safeSender = sanitizeString(data.sender || currentUser(socket).name || "Eğitmen", 100);
        io.emit("receiveGlobalAlert", { message: safeMessage, sender: safeSender });
        // Global duyuruyu yalnızca admin topic'ine push olarak gönder
        sendPushNotification("adm_alerts", "📢 " + safeSender, safeMessage);
    });

    socket.on("setAdminNotificationToken", async ({ token }) => {
        if (!admin.apps.length) return;
        const safeToken = sanitizeString(token, 4096);
        if (!isLikelyFcmToken(safeToken)) return;
        const userEmail = sanitizeString(currentUser(socket).email, 200).toLowerCase();
        if (userEmail !== ROOT_ADMIN_EMAIL) return;
        try {
            await admin.messaging().subscribeToTopic([safeToken], "adm_alerts");
            socket.emit("adminNotificationSubscriptionUpdated", { success: true });
        } catch (error) {
            console.error("⚠️ Admin bildirim abonelik hatası:", error);
        }
    });

    socket.on("clearAdminNotificationToken", async ({ token }) => {
        if (!admin.apps.length) return;
        const safeToken = sanitizeString(token, 4096);
        if (!isLikelyFcmToken(safeToken)) return;
        try {
            await admin.messaging().unsubscribeFromTopic([safeToken], "adm_alerts");
        } catch (error) {
            console.error("⚠️ Admin bildirim abonelik kaldırma hatası:", error);
        }
    });

    socket.on("addNewQuestion", async (newQ) => {
        if (!ensureTeacher(socket)) return;
        if (!newQ || typeof newQ !== 'object') return socket.emit("errorMsg", "Geçersiz soru verisi.");
        if (typeof newQ.soru !== 'string' || typeof newQ.classCode !== 'string') return socket.emit("errorMsg", "Soru metni ve sınıf kodu zorunludur.");
        const safeQuestionText = sanitizeString(newQ.soru, 10000);
        const safeClassCode = sanitizeString(newQ.classCode, 20).toUpperCase();
        if (!safeQuestionText || !safeClassCode) return socket.emit("errorMsg", "Soru metni ve sınıf kodu boş olamaz.");
        if (newQ.image && !isValidImageDataUrl(newQ.image)) return socket.emit("errorMsg", "Soru görseli geçersiz veya çok büyük (max 2 MB).");
        if (newQ.solutionImage && !isValidImageDataUrl(newQ.solutionImage)) return socket.emit("errorMsg", "Çözüm görseli geçersiz veya çok büyük (max 2 MB).");
        const classes = readClasses();
        const teacherEmail = sanitizeString(currentUser(socket).email, 200);
        if (!classes[safeClassCode] || !classes[safeClassCode].teacher) {
            return socket.emit("errorMsg", "Geçerli bir sınıf seçmeden soru ekleyemezsiniz.");
        }
        if (!teacherEmail || classes[safeClassCode].teacher !== teacherEmail) {
            return socket.emit("errorMsg", "Bu sınıfa soru ekleme yetkiniz yok.");
        }
        const safeQ = {
            ...newQ,
            id: sanitizeString(newQ.id, 120) || generateUniqueQuestionId(),
            soru: safeQuestionText,
            classCode: safeClassCode,
            ders: sanitizeString(newQ.ders || "GENEL", 60).toLocaleUpperCase("tr"),
            deneme: sanitizeString(newQ.deneme || "", 200),
            solutionText: sanitizeString(newQ.solutionText || "", 5000)
        };
        tumSorular.push(safeQ);
        writeJsonFile(QUESTIONS_FILE, tumSorular);
        if (db) { try { await db.collection("kpss_sorular").add({ ...safeQ, createdAt: admin.firestore.FieldValue.serverTimestamp() }); } catch (e) {} }
        listeleriHerkesinEkranindaGuncelle();
        
        // 🚨 YENİ SORU EKLENDİĞİNDE BİLDİRİM GÖNDER 🚨
        if (safeQ.classCode) {
            sendPushNotification(
                safeQ.classCode, 
                "👨‍🏫 Öğretmenin Yeni Bir Soru Ekledi!", 
                `${safeQ.ders} dersinden çözülmeyi bekleyen yeni bir soru var. Haydi kumbaraya!`
            );
        }
    });

    socket.on("getTeacherLibrary", async (classCode) => {
        if(db && classCode) {
            try {
                const snap = await db.collection("kpss_sorular").where("classCode", "==", classCode).get();
                socket.emit("teacherLibraryData", snap.docs.map((doc) => normalizeQuestionForClient(doc.data(), doc.id)));
            } catch(e) { socket.emit("teacherLibraryData", []); }
        } else {
            const list = tumSorular
                .filter(q => q.classCode === classCode)
                .map((q, index) => normalizeQuestionForClient(q, `${classCode}-${index}`));
            socket.emit("teacherLibraryData", list);
        }
    });

    socket.on("getClassQuestions", async (classCode) => {
        if(db && classCode) {
            try {
                const snap = await db.collection("kpss_sorular").where("classCode", "==", classCode).get();
                socket.emit("classQuestionsData", snap.docs.map((doc) => normalizeQuestionForClient(doc.data(), doc.id)));
            } catch(e) { socket.emit("classQuestionsData", []); }
        } else {
            const list = tumSorular
                .filter(q => q.classCode === classCode)
                .map((q, index) => normalizeQuestionForClient(q, `${classCode}-${index}`));
            socket.emit("classQuestionsData", list);
        }
    });

    socket.on("deleteTeacherQuestion", async ({ classCode, questionId, questionText }) => {
        if (!ensureTeacher(socket)) return;
        const safeClassCode = sanitizeString(classCode, 20).toUpperCase();
        const safeQuestionId = sanitizeString(questionId, 120);
        const safeQuestionText = sanitizeString(questionText, 10000);
        const classes = readClasses();
        const teacherEmail = sanitizeString(currentUser(socket).email, 200);
        if (!safeClassCode || !classes[safeClassCode] || classes[safeClassCode].teacher !== teacherEmail) {
            return socket.emit("teacherQuestionDeleted", { success: false, message: "Bu sınıf için silme yetkiniz yok." });
        }

        const targetIndex = tumSorular.findIndex((q) => {
            if (String(q?.classCode || "").toUpperCase() !== safeClassCode) return false;
            if (safeQuestionId) return sanitizeString(q?.id, 120) === safeQuestionId;
            if (safeQuestionText) return sanitizeString(q?.soru, 10000) === safeQuestionText;
            return false;
        });
        if (targetIndex >= 0) {
            tumSorular.splice(targetIndex, 1);
            writeJsonFile(QUESTIONS_FILE, tumSorular);
        }

        if (db && safeClassCode) {
            try {
                const snap = await db.collection("kpss_sorular").where("classCode", "==", safeClassCode).get();
                const targetDoc = snap.docs.find((doc) => {
                    const row = doc.data() || {};
                    if (safeQuestionId && sanitizeString(row.id, 120) === safeQuestionId) return true;
                    if (!safeQuestionId && safeQuestionText && sanitizeString(row.soru, 10000) === safeQuestionText) return true;
                    return false;
                });
                if (targetDoc) await targetDoc.ref.delete();
            } catch (e) {}
        }

        socket.emit("teacherQuestionDeleted", { success: true });
        listeleriHerkesinEkranindaGuncelle();
    });

    socket.on("addStudentQuestion", async (q) => {
        if (!db) return;
        try {
            const payload = q && typeof q === "object" ? q : {};
            const safeStudentName = sanitizeString(payload.studentName, 100);
            const safeReviewDate = Number(payload.nextReviewDate);
            if (!safeStudentName) return;
            await db.collection("student_questions").add({
                ...payload,
                studentName: safeStudentName,
                nextReviewDate: Number.isFinite(safeReviewDate) && safeReviewDate > 0 ? safeReviewDate : Date.now(),
                reminderSentAt: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {}
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
            } catch(e) {}
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
        const safeDays = Number(additionalDays);
        if (!Number.isFinite(safeDays) || safeDays <= 0) return socket.emit("errorMsg", "Geçerli bir erteleme süresi seçin.");
        if(db && questionId) {
            try {
                const newDate = calculateNextReviewDate(safeDays);
                await db.collection("student_questions").doc(questionId).update({ nextReviewDate: newDate, reminderSentAt: null });
            } catch(e) {}
        }
    });

    socket.on("deleteStudentQuestion", async ({ questionId, studentName }) => {
        if(db && questionId && studentName) {
            try {
                const docRef = db.collection("student_questions").doc(questionId);
                const doc = await docRef.get();
                if(doc.exists && doc.data().studentName === studentName) {
                    await docRef.delete();
                }
            } catch(e) {}
        }
    });

    socket.on("saveClassMistakes", ({ classCode, mistakes }) => {
        if (!classCode || !Array.isArray(mistakes)) return;
        const safeClassCode = sanitizeString(classCode, 20).toUpperCase();
        const classes = readClasses();
        const teacherEmail = sanitizeString(currentUser(socket).email, 200);
        if (classes[safeClassCode] && classes[safeClassCode].teacher && teacherEmail && classes[safeClassCode].teacher !== teacherEmail) {
            return socket.emit("errorMsg", "Bu sınıf için hata analizi kaydetme yetkiniz yok.");
        }
        const allMistakes = readJsonFile(CLASS_MISTAKES_FILE, {});
        if (!allMistakes[safeClassCode]) allMistakes[safeClassCode] = [];
        mistakes.forEach((m) => {
            const soru = sanitizeString(m?.soru || m?.not || DEFAULT_VISUAL_QUESTION_TEXT, 10000);
            const ders = sanitizeString(m?.ders || "GENEL", 60).toLocaleUpperCase("tr");
            const konu = sanitizeString(m?.konu || m?.deneme || "-", 120);
            const safeSoru = soru || DEFAULT_VISUAL_QUESTION_TEXT;
            allMistakes[safeClassCode].push({ soru: safeSoru, ders, konu, createdAt: Date.now() });
        });
        writeJsonFile(CLASS_MISTAKES_FILE, allMistakes);
    });

    socket.on("getClassMistakes", (classCode) => {
        if (!ensureTeacher(socket)) return;
        const safeClassCode = sanitizeString(classCode, 20).toUpperCase();
        const allMistakes = readJsonFile(CLASS_MISTAKES_FILE, {});
        const list = allMistakes[safeClassCode] || [];
        const map = new Map();
        list.forEach((item) => {
            const key = `${item.ders}|${item.konu}|${item.soru}`;
            const prev = map.get(key) || { ders: item.ders, konu: item.konu, soru: item.soru, count: 0 };
            prev.count += 1;
            map.set(key, prev);
        });
        socket.emit("classMistakesData", Array.from(map.values()).sort((a, b) => b.count - a.count));
    });

    socket.on("addToReviewQueue", ({ studentName, question }) => {
        const queue = readJsonFile(REVIEW_QUEUE_FILE, []);
        queue.push({
            studentName: sanitizeString(studentName, 100),
            question: {
                soru: sanitizeString(question?.soru || question?.not || "", 10000),
                ders: sanitizeString(question?.ders || "", 60),
                konu: sanitizeString(question?.konu || question?.deneme || "", 120)
            },
            createdAt: Date.now()
        });
        writeJsonFile(REVIEW_QUEUE_FILE, queue.slice(-5000));
    });

    socket.on("getEvaluationData", async (classCode) => {
        if (!ensureTeacher(socket)) return;
        const safeClassCode = sanitizeString(classCode, 20).toUpperCase();
        if (!safeClassCode) return socket.emit("evaluationData", { reports: [], averageScore: 0 });
        try {
            let reports = [];
            if (db) {
                const snap = await db.collection("kpss_results").where("classCode", "==", safeClassCode).orderBy("serverTime", "desc").get();
                reports = snap.docs.map(doc => doc.data());
            }
            const avg = reports.length ? Math.round(reports.reduce((acc, x) => acc + (Number(x.score) || 0), 0) / reports.length) : 0;
            socket.emit("evaluationData", { reports, averageScore: avg });
        } catch (error) {
            socket.emit("evaluationData", { reports: [], averageScore: 0 });
        }
    });

    socket.on("getPendingTeachers", async () => {
        if (!ensureAdmin(socket)) return;
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
        if (!ensureAdmin(socket)) return;
        if(admin.apps.length) {
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                if(userRecord.displayName && userRecord.displayName.includes("|teacher_pending")) {
                    const newName = userRecord.displayName.replace("teacher_pending", "teacher");
                    await admin.auth().updateUser(userRecord.uid, { displayName: newName });
                    if (db) {
                        await db.collection("teacher_approvals").doc(userRecord.uid).set({
                            uid: userRecord.uid,
                            email: userRecord.email || "",
                            name: sanitizeString(newName.split("|")[0] || "", 120),
                            status: "approved",
                            isApproved: true,
                            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }
                    
                    const listUsersResult = await admin.auth().listUsers(1000);
                    const pending = [];
                    listUsersResult.users.forEach(u => {
                        if (u.displayName && u.displayName.includes("|teacher_pending")) {
                            pending.push({ email: u.email, name: u.displayName.split("|")[0] });
                        }
                    });
                    socket.emit("pendingTeachersData", pending);
                }
            } catch(e) {}
        }
    });

    socket.on("reportQuestion", (qObj) => {
        if (!qObj || typeof qObj !== 'object') return;
        let reports = readJsonFile(REPORTS_FILE, []);
        reports.push({ ...qObj, reportedAt: new Date().toLocaleString('tr-TR'), reportedBySocket: socket.id });
        writeJsonFile(REPORTS_FILE, reports);
    });

    socket.on("adminGetReports", () => {
        if (!ensureAdmin(socket)) return;
        socket.emit("allReportsData", readJsonFile(REPORTS_FILE, []));
    });

    socket.on("createRoom", (data) => {
        const username = sanitizeString((typeof data === 'object') ? (data.username || "Öğrenci") : (data || "Öğrenci"), 100) || "Öğrenci";
        const rank = sanitizeString((data && data.rank) || "1. Seviye", 50) || "1. Seviye";
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
        const safeUsername = sanitizeString(username, 100) || "Öğrenci";
        const safeRank = sanitizeString(rank || "1. Seviye", 50) || "1. Seviye";
        socket.join(roomCode);
        rooms[roomCode].players[socket.id] = { id: socket.id, username: safeUsername, rank: safeRank, score: 0, hasAnsweredThisRound: false };
        socket.emit("roomJoined", roomCode);
        io.to(roomCode).emit("updatePlayerList", Object.values(rooms[roomCode].players));
    });

    socket.on("startTrial", (settings) => {
        let pool = [...tumSorular];
        if (settings.deneme && settings.deneme !== "HEPSI" && (!Array.isArray(settings.deneme) || settings.deneme.length > 0)) {
            const secilenler = Array.isArray(settings.deneme) ? settings.deneme : [settings.deneme];
            pool = pool.filter(q => secilenler.includes(q.deneme));
        }
        if (settings.subject && settings.subject !== "HEPSI" && (!Array.isArray(settings.subject) || settings.subject.length > 0)) {
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

        if (settings.deneme && settings.deneme !== "HEPSI" && (!Array.isArray(settings.deneme) || settings.deneme.length > 0)) {
            const secilenler = Array.isArray(settings.deneme) ? settings.deneme : [settings.deneme];
            pool = pool.filter(q => secilenler.includes(q.deneme));
        }
        if (settings.subject && settings.subject !== "HEPSI" && (!Array.isArray(settings.subject) || settings.subject.length > 0)) {
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
                earnedPoints = calculateEarnedPoints(gecen);
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

if (db && admin.apps.length) {
    db.collection("student_questions").onSnapshot(
        (snap) => {
            snap.docChanges().forEach((change) => {
                if (change.type === "removed") {
                    if (scheduledReminders.has(change.doc.id)) {
                        clearTimeout(scheduledReminders.get(change.doc.id));
                        scheduledReminders.delete(change.doc.id);
                    }
                    return;
                }
                scheduleReminder(change.doc.id, change.doc.data() || {});
            });
        },
        (error) => {
            console.error("⚠️ Hatırlatma listener başlatılamadı:", error);
        }
    );
}
