import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { createSafeClientStore } from "./modules/client-storage.mjs";
import { SETTINGS_MODES, applySettingsMode, getDefaultSettingsModeByRole } from "./modules/settings-mode.mjs";
import { normalizeTopicFilterMode, getAllowedTopicsForMode, getAllowedTopicsForModalContext, isStorageRetryLimitExceededError, buildDerslerimTopicNavigation, canStartLibraryTest, evaluateStdAnswer, filterCourseNamesByQuery, getSavedLibraryCourseNames, buildDueReminderCountsBySubject, mergeSavedSubjectsWithDrafts, buildTopicListFromSources, getNextExpandedCourse, buildSelectedCourseLabel } from "./modules/ui-flow.mjs";
import { resolveCurrentExamType, getCustomCurriculumGroupsByExamType as getCustomCurriculumGroupsByExamTypeFromMap, getCustomCurriculumSubjectsByExamType as getCustomCurriculumSubjectsByExamTypeFromMap, getCustomCurriculumTopicsByExamTypeAndSubject as getCustomCurriculumTopicsByExamTypeAndSubjectFromMap, getCustomTopicsBySubject as getCustomTopicsBySubjectFromMap, addCustomTopicsForSubject as addCustomTopicsForSubjectInMap } from "./modules/custom-data.mjs";
import { buildRelativeResourceUrl, getShareableAppLink, shouldRegisterServiceWorker } from "./modules/app-shell.mjs";

const fallbackFirebaseConfig = { 
    apiKey: "AIzaSyDkZI-LxCOaog4kyb4YSquEK6ZpLNH2pqs", 
    authDomain: "kpss-genel-kultur-soru-havuzu.firebaseapp.com", 
    projectId: "kpss-genel-kultur-soru-havuzu", 
    storageBucket: "kpss-genel-kultur-soru-havuzu.firebasestorage.app",
    messagingSenderId: "435941343639",
    appId: "1:435941343639:web:3ce323e0f8386d796c04d2",
    measurementId: "G-CMLQJ746WT"
};

const runtimeConfig = window.__APP_CONFIG__ || {};
const runtimeFirebase = runtimeConfig.firebaseConfig || {};
const firebaseVapidKey = String(runtimeConfig.firebaseVapidKey || "").trim();
const firebaseConfig = runtimeFirebase.apiKey
    ? { ...fallbackFirebaseConfig, ...runtimeFirebase }
    : fallbackFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const messaging = getMessaging(app);
const storage = getStorage(app);
const ROOT_ADMIN_EMAIL = "kayamert319@gmail.com";
const APP_STATE = {
    currentUser: { name: "", role: "guest", email: "" },
    room: { code: "", mode: "room" },
    quiz: { index: 0, total: 0, timerMode: "question" },
    activeListType: ""
};
const DEFAULT_ERROR_MESSAGE = "İşlem sırasında bir hata oluştu.";
const LEGACY_EMPTY_BOOK_TEXT = "kaynak girilmemiş";
const STORAGE_UPLOAD_TIMEOUT_REASON = "Görsel yükleme zaman aşımına uğradı (bağlantı yavaşlığı veya görsel boyutu nedeniyle).";
const STORAGE_UPLOAD_CONTINUE_WITHOUT_IMAGE_PROMPT = `⚠️ ${STORAGE_UPLOAD_TIMEOUT_REASON} Soruyu görselsiz kaydetmek ister misiniz?`;
const CLIENT_STORE = createSafeClientStore(window.localStorage, {
    onError: (error, key, op) => {
        console.warn(`İstemci depolama hatası (${op}:${key}):`, error);
    }
});

const KPSS_B_COMMON_SUBJECTS = {
    "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Dil Bilgisi", "Yazım Kuralları", "Noktalama", "Sözel Mantık"],
    "Matematik": ["Temel Kavramlar", "Sayı Basamakları", "Bölme-Bölünebilme", "Rasyonel Sayılar", "Basit Eşitsizlikler", "Problemler", "Sayısal Mantık", "Geometri"],
    "Tarih": ["İlk Türk Devletleri", "İslam Tarihi", "Osmanlı Kuruluş-Yükseliş", "XIX. Yüzyıl Osmanlı", "Kurtuluş Savaşı", "Atatürk İlke ve İnkılapları", "Çağdaş Türk ve Dünya"],
    "Coğrafya": ["Türkiye'nin Fiziki Coğrafyası", "Türkiye'nin Beşeri Coğrafyası", "Türkiye'nin Ekonomik Coğrafyası", "Bölgeler Coğrafyası", "Çevre ve Toplum"],
    "Vatandaşlık": ["Hukukun Temel Kavramları", "Anayasa Hukuku", "İdare Hukuku", "Temel Hak ve Ödevler", "Güncel Bilgiler"]
};

// 🚨 YENİ NESİL MÜFREDAT AĞACI VE KAPSÜL (BUTON) SİSTEMİ BAŞLANGICI 🚨
window.mufredat = {
    "KPSS": {
        "A Grubu": {
            "Muhasebe": ["Genel Muhasebe", "Envanter", "Maliyet Muhasebesi", "Şirketler Muhasebesi", "Mali Tablolar Analizi"],
            "İktisat": ["Mikro İktisat", "Makro İktisat", "Para-Banka", "Uluslararası İktisat", "Büyüme ve Kalkınma", "Türkiye Ekonomisi"],
            "Maliye": ["Kamu Maliyesi", "Bütçe", "Kamu Harcamaları", "Vergi Hukuku", "Türk Vergi Sistemi", "Maliye Politikası"],
            "Hukuk": ["Anayasa Hukuku", "İdare Hukuku", "İdari Yargı", "Ceza Hukuku", "Medeni Hukuk", "Borçlar Hukuku", "Ticaret Hukuku"],
            "İşletme": ["İşletme Bilimine Giriş", "Yönetim ve Organizasyon", "Pazarlama", "Üretim Yönetimi", "Finansal Yönetim"],
            "Çalışma Ekonomisi": ["İş Hukuku", "Sosyal Güvenlik", "Çalışma Psikolojisi", "Türkiye'de Sosyal Politika"],
            "Kamu Yönetimi": ["Siyaset Bilimi", "Yönetim Bilimi", "Kentleşme", "Türk İdare Sistemi"],
            "Uluslararası İlişkiler": ["Uluslararası Hukuk", "Uluslararası Örgütler", "Siyasi Tarih", "Türk Dış Politikası"]
        },
        "B Grubu (Lisans)": {
            ...KPSS_B_COMMON_SUBJECTS
        },
        "B Grubu (Önlisans)": {
            ...KPSS_B_COMMON_SUBJECTS
        },
        "B Grubu (Ortaöğretim)": {
            ...KPSS_B_COMMON_SUBJECTS
        },
        "Eğitim Bilimleri": {
            "Gelişim Psikolojisi": ["Fiziksel Gelişim", "Bilişsel Gelişim", "Dil Gelişimi", "Kişilik Gelişimi", "Ahlak Gelişimi"],
            "Öğrenme Psikolojisi": ["Davranışçı Kuramlar", "Bilişsel Kuramlar", "Yapılandırmacılık", "Öğrenmeyi Etkileyen Etmenler"],
            "Program Geliştirme": ["Program Tasarımı", "Hedef-Davranış Yazımı", "İçerik Düzenleme", "Öğretim Stratejileri"],
            "Öğretim Yöntem ve Teknikleri": ["Anlatım", "Soru-Cevap", "Tartışma", "Mikro Öğretim", "Tam Öğrenme"],
            "Ölçme ve Değerlendirme": ["Temel Kavramlar", "Geçerlik-Güvenirlik", "Madde Analizi", "İstatistik", "Test Geliştirme"],
            "Rehberlik": ["Rehberliğin İlkeleri", "Psikolojik Danışma Kuramları", "Özel Eğitim", "Sınıf Yönetimi"]
        }
    },
    "YKS": {
        "TYT": {
            "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Dil Bilgisi", "Yazım Kuralları", "Noktalama", "Anlatım Bozukluğu"],
            "Matematik": ["Temel Kavramlar", "Sayı Basamakları", "Bölme-Bölünebilme", "EBOB-EKOK", "Rasyonel Sayılar", "Basit Eşitsizlikler", "Mutlak Değer", "Problemler", "Kümeler", "Fonksiyonlar", "Geometri"],
            "Sosyal Bilimler": ["Tarih", "Coğrafya", "Felsefe", "Din Kültürü ve Ahlak Bilgisi"],
            "Fen Bilimleri": ["TYT Fizik", "TYT Kimya", "TYT Biyoloji"]
        },
        "AYT": {
            "Matematik": ["Fonksiyonlar", "Polinom", "2. Dereceden Denklemler", "Trigonometri", "Logaritma", "Diziler", "Limit", "Türev", "İntegral"],
            "Edebiyat-Sosyal 1": ["Edebî Dönemler", "Şiir Bilgisi", "Cumhuriyet Dönemi Edebiyatı", "Tarih-1", "Coğrafya-1"],
            "Sosyal 2": ["Tarih-2", "Coğrafya-2", "Felsefe Grubu", "Din Kültürü ve Ahlak Bilgisi"],
            "Fen Bilimleri": ["AYT Fizik", "AYT Kimya", "AYT Biyoloji"]
        }
    },
    "AGS (Akademi Giriş Sınavı)": {
        "Genel Yetenek ve Genel Kültür": {
            "Türkçe": ["Sözel Mantık", "Paragraf", "Dil Bilgisi"],
            "Matematik": ["Temel Kavramlar", "Problemler", "Sayısal Mantık"],
            "Tarih": ["Atatürk İlkeleri", "İnkılap Tarihi", "Çağdaş Türkiye"],
            "Coğrafya": ["Türkiye Coğrafyası", "Nüfus ve Yerleşme", "Ekonomik Coğrafya"],
            "Vatandaşlık": ["Anayasa", "Temel Hukuk", "Kamu Yönetimi"],
            "Eğitim Mevzuatı": ["1739 Sayılı Kanun", "MEB Yapısı", "Öğretmenlik Meslek Kanunu"]
        }
    },
    "LGS": {
        "Sayısal": {
            "Matematik": ["Çarpanlar ve Katlar", "Üslü İfadeler", "Kareköklü İfadeler", "Veri Analizi", "Basit Olasılık", "Cebirsel İfadeler"],
            "Fen Bilimleri": ["Mevsimler ve İklim", "DNA ve Genetik Kod", "Basınç", "Madde ve Endüstri", "Basit Makineler", "Elektrik Yükleri"]
        },
        "Sözel": {
            "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Fiilimsiler", "Cümlenin Ögeleri"],
            "T.C. İnkılap Tarihi ve Atatürkçülük": ["Bir Kahraman Doğuyor", "Milli Uyanış", "Ya İstiklal Ya Ölüm", "Atatürkçülük"],
            "Din Kültürü ve Ahlak Bilgisi": ["Kader İnancı", "Zekât ve Sadaka", "Hz. Muhammed'in Örnekliği"],
            "İngilizce": ["Friendship", "Teen Life", "In the Kitchen", "On the Phone"]
        }
    }
};

window.secilenSinav = "";
window.secilenGrup = "";
window.secilenDers = "";
window.secilenKonu = "";

const DEFAULT_PROFILE_SUBJECTS = ['Tarih', 'Coğrafya', 'Vatandaşlık', 'Matematik', 'Türkçe', 'Eğitim Bilimleri', 'Fizik', 'Kimya', 'Biyoloji', 'Fen Bilimleri'];
const DEFAULT_EXAM_TYPE = 'kpss_lisans';
const READY_SOURCES_STORAGE_KEY = 'gazi_ready_sources_v1';
const ADD_QUESTION_UI_PREFS_STORAGE_KEY = 'gazi_add_question_ui_prefs_v1';
const USER_CURRICULUM_STORAGE_KEY = 'gazi_user_curriculum_v1';
const SOFT_DARK_THEME_STORAGE_KEY = 'gazi_soft_dark_theme_v1';
const DERSLERIM_TOPIC_FILTER_STORAGE_KEY = 'gazi_derslerim_topic_filter_v1';
const DERSLERIM_COURSE_SEARCH_STORAGE_KEY = 'gazi_derslerim_course_search_v1';
const DERSLERIM_COURSE_ADDED_BADGE_STORAGE_KEY = 'gazi_derslerim_course_added_badge_v1';
const STUDENT_SAVED_MATERIALS_STORAGE_KEY = 'gazi_student_saved_teacher_materials_v1';
const CUSTOM_EXAM_TYPES_STORAGE_KEY = 'gazi_custom_exam_types_v1';
const CUSTOM_CURRICULUM_STORAGE_KEY = 'gazi_custom_curriculum_v1';
const LOCAL_NOTEBOOK_STORAGE_KEY = 'gazi_local_notebook';
const REMINDER_INTERVALS_STORAGE_KEY = 'gazi_reminder_intervals_v1';
const CUSTOM_EXAM_PREFIX = 'custom_';
const DEFAULT_CUSTOM_GROUP_NAME = 'Genel';
const MAX_READY_SOURCES = 30;
const FLOAT_COMPARISON_EPSILON = 0.001;
const VALID_STUDENT_PHOTO_SOURCES = ['camera', 'gallery', 'file'];
const IMAGE_OPTIMIZATION_CONFIG = Object.freeze({
    maxWidth: 1280,
    minWidth: 720,
    // 1GB toplam bulut kota için soru/çözüm görsellerinde ortalama dosya boyutunu düşük tutar.
    targetBytes: 220 * 1024,
    initialQuality: 0.82,
    minQuality: 0.68,
    qualityStep: 0.04,
    scaleStep: 0.9,
    maxAttempts: 14
});
// Kaynakça görselleri genelde metin ağırlıklı olduğu için daha düşük hedef boyut kullanılır.
const SOURCE_IMAGE_OPTIMIZATION_OVERRIDES = Object.freeze({
    targetBytes: 170 * 1024,
    maxWidth: 1100
});
// 1x1 şeffaf GIF placeholder (kaynak görseli olmayan kartlar için)
const PLACEHOLDER_IMAGE_SRC = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
const DERSLERIM_STATE = {
    selectedLibraryPath: { subject: "", topic: "" },
    currentLibraryModalSubject: "",
    currentLibraryModalMode: "select",
    libraryModalFocusedSubject: "",
    libraryViewingTopicPath: null,
    smartAddTopicPath: null,
    pendingLibraryFilter: null,
    isStudentUploadInProgress: false,
    expandedProfileSubject: '',
    expandedLibraryLessonSubject: '',
    currentLibraryLessonsFocusedSubject: ''
};

function normalizeText(v) {
    return String(v || '').trim().toLocaleLowerCase('tr');
}

function normalizeStudentPhotoSource(value) {
    return VALID_STUDENT_PHOTO_SOURCES.includes(value) ? value : 'camera';
}

function slugifySubjectName(v) {
    return String(v || '')
        .toLocaleLowerCase('tr')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'ders';
}

function generateCustomExamTypeValue(label) {
    return `${CUSTOM_EXAM_PREFIX}${slugifySubjectName(label)}`;
}

function uniqueSubjects(list) {
    return Array.from(new Set((Array.isArray(list) ? list : []).filter(Boolean).map(s => String(s).trim()).filter(Boolean)));
}

function parseTopicsFromText(text) {
    return uniqueSubjects(String(text || '')
        .split(/[\n,;]+/g)
        .map((topic) => topic.trim())
        .filter(Boolean));
}

function normalizeReminderIntervals(list = []) {
    const safeList = Array.isArray(list) ? list : [];
    const unique = Array.from(new Set(
        safeList
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
            .map((value) => Number(value.toFixed(2)))
    ));
    unique.sort((a, b) => a - b);
    return unique;
}

function getReminderIntervals() {
    const stored = CLIENT_STORE.getJSON(REMINDER_INTERVALS_STORAGE_KEY, []);
    const normalized = normalizeReminderIntervals(stored);
    if (normalized.length > 0) return normalized;
    const fallback = [7];
    CLIENT_STORE.setJSON(REMINDER_INTERVALS_STORAGE_KEY, fallback);
    return fallback;
}

function setReminderIntervals(intervals = []) {
    CLIENT_STORE.setJSON(REMINDER_INTERVALS_STORAGE_KEY, normalizeReminderIntervals(intervals));
}

function buildReminderOptionLabel(daysValue) {
    const safeValue = Number(daysValue);
    if (!Number.isFinite(safeValue) || safeValue <= 0) return '';
    const text = Number.isInteger(safeValue) ? String(safeValue) : String(safeValue).replace('.', ',');
    return `${text} gün`;
}

window.renderReminderIntervalSelect = () => {
    const select = document.getElementById('std-q-reminder');
    if (!select) return;
    const intervals = getReminderIntervals();
    const currentValue = String(select.value || CLIENT_STORE.getItem('gazi_last_reminder_days', '') || '');
    select.innerHTML = intervals
        .map((days) => `<option value="${days}">${escapeHtml(buildReminderOptionLabel(days))}</option>`)
        .join('');
    const hasCurrent = intervals.some((days) => String(days) === currentValue);
    if (hasCurrent) select.value = currentValue;
    else if (intervals.length > 0) select.value = String(intervals[0]);
};

window.renderReminderOptionsScreen = () => {
    const listEl = document.getElementById('reminder-options-list');
    if (!listEl) return;
    const intervals = getReminderIntervals();
    listEl.innerHTML = intervals.map((days, index) => `
        <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <strong style="color:#1e3c72;">${escapeHtml(buildReminderOptionLabel(days))}</strong>
            <div style="display:flex; gap:6px;">
                <button type="button" class="outline" style="width:auto; padding:6px 10px; font-size:0.74rem;" onclick="window.editReminderInterval(${index})">Düzenle</button>
                <button type="button" class="outline" style="width:auto; padding:6px 10px; font-size:0.74rem; border-color:#c0392b; color:#c0392b;" onclick="window.deleteReminderInterval(${index})">Sil</button>
            </div>
        </div>
    `).join('');
};

window.openReminderOptionsScreen = () => {
    window.renderReminderOptionsScreen();
    showScreen('screen-reminder-options');
};

window.addReminderInterval = () => {
    const input = document.getElementById('reminder-interval-input');
    const value = Number(String(input?.value || '').replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return alert('Lütfen 0’dan büyük bir gün değeri girin.');
    const next = normalizeReminderIntervals([...getReminderIntervals(), value]);
    setReminderIntervals(next);
    if (input) input.value = '';
    window.renderReminderIntervalSelect();
    window.renderReminderOptionsScreen();
};

window.editReminderInterval = (index) => {
    const list = getReminderIntervals();
    const current = list[Number(index)];
    if (!Number.isFinite(current)) return;
    const value = prompt('Yeni gün değerini girin:', String(current));
    if (value === null) return;
    const nextValue = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(nextValue) || nextValue <= 0) return alert('Geçerli bir gün değeri girin.');
    list[Number(index)] = nextValue;
    setReminderIntervals(list);
    window.renderReminderIntervalSelect();
    window.renderReminderOptionsScreen();
};

window.deleteReminderInterval = (index) => {
    const list = getReminderIntervals();
    const safeIndex = Number(index);
    if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= list.length) return;
    if (list.length === 1) return alert('En az bir hatırlatma aralığı kalmalıdır. Sorulara hatırlatma tarihi atamak için en az bir seçenek gereklidir.');
    list.splice(safeIndex, 1);
    setReminderIntervals(list);
    window.renderReminderIntervalSelect();
    window.renderReminderOptionsScreen();
};

function getLocalNotebookQuestions() {
    const raw = CLIENT_STORE.getJSON(LOCAL_NOTEBOOK_STORAGE_KEY, []);
    const safeRaw = Array.isArray(raw) ? raw : [];
    const normalized = safeRaw
        .map((row) => {
            if (!row || typeof row !== 'object') return null;
            const question = { ...row };
            const textSeed = String(question.soru || question.not || question.konu || question.ders || '').trim();
            if (!String(question.id || '').trim()) {
                question.id = generateUniqueId(`local-${textSeed.slice(0, 12) || 'q'}`);
            }
            if (!question.soru && question.not) {
                question.soru = String(question.not).trim() || "Görseli inceleyiniz.";
            }
            if (!question.siklar || !Array.isArray(question.siklar) || question.siklar.length === 0) {
                question.siklar = ["A", "B", "C", "D", "E"];
            }
            return question;
        })
        .filter(Boolean);
    if (JSON.stringify(normalized) !== JSON.stringify(safeRaw)) {
        CLIENT_STORE.setJSON(LOCAL_NOTEBOOK_STORAGE_KEY, normalized);
    }
    return normalized;
}

function setLocalNotebookQuestions(list = []) {
    const safeList = Array.isArray(list) ? list : [];
    CLIENT_STORE.setJSON(LOCAL_NOTEBOOK_STORAGE_KEY, safeList);
}

function getCurrentExamType() {
    return resolveCurrentExamType(
        document.getElementById('profile-exam-type')?.value,
        CLIENT_STORE.getItem('gazi_exam_type'),
        DEFAULT_EXAM_TYPE
    );
}

function getCustomExamTypes() {
    const raw = CLIENT_STORE.getJSON(CUSTOM_EXAM_TYPES_STORAGE_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw
        .map((row) => ({
            value: String(row?.value || '').trim(),
            label: String(row?.label || '').trim()
        }))
        .filter((row) => row.value && row.label);
}

function saveCustomExamTypes(list = []) {
    const safeList = Array.isArray(list) ? list : [];
    CLIENT_STORE.setJSON(CUSTOM_EXAM_TYPES_STORAGE_KEY, safeList.map((row) => ({
        value: String(row?.value || '').trim(),
        label: String(row?.label || '').trim()
    })).filter((row) => row.value && row.label));
}

function getCustomCurriculumMap() {
    const raw = CLIENT_STORE.getJSON(CUSTOM_CURRICULUM_STORAGE_KEY, {});
    return raw && typeof raw === 'object' ? raw : {};
}

function saveCustomCurriculumMap(nextMap = {}) {
    CLIENT_STORE.setJSON(CUSTOM_CURRICULUM_STORAGE_KEY, nextMap && typeof nextMap === 'object' ? nextMap : {});
}

function getCustomCurriculumGroupsByExamType(examType) {
    return getCustomCurriculumGroupsByExamTypeFromMap(getCustomCurriculumMap(), examType);
}

function getCustomCurriculumSubjectsByExamType(examType) {
    return getCustomCurriculumSubjectsByExamTypeFromMap(getCustomCurriculumMap(), examType);
}

function getCustomCurriculumTopicsByExamTypeAndSubject(examType, subject) {
    return getCustomCurriculumTopicsByExamTypeAndSubjectFromMap(getCustomCurriculumMap(), examType, subject);
}

function getCustomTopicMap() {
    const raw = CLIENT_STORE.getJSON('gazi_custom_topics', {});
    return raw && typeof raw === 'object' ? raw : {};
}

function getCustomTopicsBySubject(subject) {
    return getCustomTopicsBySubjectFromMap(getCustomTopicMap(), subject);
}

function addCustomTopicsForSubject(subject, topics = []) {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject) return;
    const nextMap = addCustomTopicsForSubjectInMap(getCustomTopicMap(), safeSubject, topics);
    CLIENT_STORE.setJSON('gazi_custom_topics', nextMap);
}

function ensureProfileExamTypeOptions(selectedValue = '') {
    const select = document.getElementById('profile-exam-type');
    if (!select) return;
    const existingValues = new Set(Array.from(select.options).map((opt) => String(opt.value || '').trim()));
    getCustomExamTypes().forEach(({ value, label }) => {
        if (existingValues.has(value)) return;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = `${label} (Özel)`;
        select.appendChild(opt);
        existingValues.add(value);
    });
    const safeSelected = String(selectedValue || '').trim();
    if (safeSelected && !existingValues.has(safeSelected)) {
        const fallback = getCustomExamTypes().find((row) => row.value === safeSelected);
        const opt = document.createElement('option');
        opt.value = safeSelected;
        opt.textContent = fallback?.label ? `${fallback.label} (Özel)` : `${safeSelected} (Özel)`;
        select.appendChild(opt);
    }
}

function ensureDerslerimAddExamOptions(selectedValue = '') {
    const select = document.getElementById('derslerim-add-exam-type');
    if (!select) return;
    const customOpt = select.querySelector('option[value="__custom__"]');
    const existingValues = new Set(Array.from(select.options).map((opt) => String(opt.value || '').trim()));
    getCustomExamTypes().forEach(({ value, label }) => {
        if (existingValues.has(value) || value === '__custom__') return;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = `${label} (Özel)`;
        if (customOpt) select.insertBefore(opt, customOpt);
        else select.appendChild(opt);
        existingValues.add(value);
    });
    const safeSelected = String(selectedValue || '').trim();
    if (safeSelected && !existingValues.has(safeSelected) && safeSelected !== '__custom__') {
        const fallback = getCustomExamTypes().find((row) => row.value === safeSelected);
        const opt = document.createElement('option');
        opt.value = safeSelected;
        opt.textContent = fallback?.label ? `${fallback.label} (Özel)` : `${safeSelected} (Özel)`;
        if (customOpt) select.insertBefore(opt, customOpt);
        else select.appendChild(opt);
    }
}

function getAddQuestionUIPrefs() {
    const parsed = CLIENT_STORE.getJSON(ADD_QUESTION_UI_PREFS_STORAGE_KEY, {});
    return parsed && typeof parsed === 'object' ? parsed : {};
}

function saveAddQuestionUIPrefs(nextPrefs = {}) {
    const current = getAddQuestionUIPrefs();
    CLIENT_STORE.setJSON(ADD_QUESTION_UI_PREFS_STORAGE_KEY, { ...current, ...nextPrefs });
}

function normalizeCurriculumData(input) {
    const out = {};
    if (!input || typeof input !== 'object') return out;
    Object.keys(input).forEach((rawSubject) => {
        const subject = String(rawSubject || '').trim();
        if (!subject) return;
        const topicsRaw = Array.isArray(input[rawSubject]) ? input[rawSubject] : [];
        const topics = Array.from(new Set(topicsRaw.map(t => String(t || '').trim()).filter(Boolean)));
        out[subject] = topics;
    });
    return out;
}

function buildInitialUserCurriculum() {
    const parsed = CLIENT_STORE.getJSON(USER_CURRICULUM_STORAGE_KEY, null);
    const normalized = normalizeCurriculumData(parsed);
    if (Object.keys(normalized).length > 0) return normalized;

    const built = {};
    const savedSubjects = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    savedSubjects.forEach((row) => {
        const subjectName = String(row?.name || '').trim();
        if (!subjectName) return;
        const topics = String(row?.topics || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
        built[subjectName] = Array.from(new Set(topics));
    });

    if (Object.keys(built).length > 0) return built;
    return { "Genel Ders": ["Genel Konu"] };
}

function persistUserCurriculum() {
    CLIENT_STORE.setJSON(USER_CURRICULUM_STORAGE_KEY, window.userCurriculum || {});
}

function isGodModeUser() {
    return (String(APP_STATE.currentUser?.email || '').trim().toLowerCase() === ROOT_ADMIN_EMAIL);
}

function syncUserCurriculumIfGodMode() {
    if (!isGodModeUser() || !socket) return;
    socket.emit("upsertUserCurriculum", window.userCurriculum || {});
}

function ensureCurriculumPath(subject, topic) {
    const safeSubject = String(subject || '').trim();
    const safeTopic = String(topic || '').trim();
    if (!safeSubject || !safeTopic) return;
    if (!window.userCurriculum[safeSubject]) window.userCurriculum[safeSubject] = [];
    if (!window.userCurriculum[safeSubject].includes(safeTopic)) window.userCurriculum[safeSubject].push(safeTopic);
    persistUserCurriculum();
}

window.userCurriculum = buildInitialUserCurriculum();
Object.defineProperties(window, {
    selectedLibraryPath: {
        get() { return DERSLERIM_STATE.selectedLibraryPath; },
        set(value) { DERSLERIM_STATE.selectedLibraryPath = value; }
    },
    currentLibraryModalSubject: {
        get() { return DERSLERIM_STATE.currentLibraryModalSubject; },
        set(value) { DERSLERIM_STATE.currentLibraryModalSubject = value; }
    },
    currentLibraryModalMode: {
        get() { return DERSLERIM_STATE.currentLibraryModalMode; },
        set(value) { DERSLERIM_STATE.currentLibraryModalMode = value; }
    },
    libraryModalFocusedSubject: {
        get() { return DERSLERIM_STATE.libraryModalFocusedSubject; },
        set(value) { DERSLERIM_STATE.libraryModalFocusedSubject = String(value || '').trim(); }
    },
    libraryViewingTopicPath: {
        get() { return DERSLERIM_STATE.libraryViewingTopicPath; },
        set(value) { DERSLERIM_STATE.libraryViewingTopicPath = value; }
    },
    smartAddTopicPath: {
        get() { return DERSLERIM_STATE.smartAddTopicPath; },
        set(value) { DERSLERIM_STATE.smartAddTopicPath = value; }
    },
    pendingLibraryFilter: {
        get() { return DERSLERIM_STATE.pendingLibraryFilter; },
        set(value) { DERSLERIM_STATE.pendingLibraryFilter = value; }
    },
    expandedProfileSubject: {
        get() { return DERSLERIM_STATE.expandedProfileSubject; },
        set(value) { DERSLERIM_STATE.expandedProfileSubject = String(value || '').trim(); }
    },
    expandedLibraryLessonSubject: {
        get() { return DERSLERIM_STATE.expandedLibraryLessonSubject; },
        set(value) { DERSLERIM_STATE.expandedLibraryLessonSubject = String(value || '').trim(); }
    },
    currentLibraryLessonsFocusedSubject: {
        get() { return DERSLERIM_STATE.currentLibraryLessonsFocusedSubject; },
        set(value) { DERSLERIM_STATE.currentLibraryLessonsFocusedSubject = String(value || '').trim(); }
    },
    isStudentUploadInProgress: {
        get() { return DERSLERIM_STATE.isStudentUploadInProgress; },
        set(value) { DERSLERIM_STATE.isStudentUploadInProgress = !!value; }
    }
});

function updateSelectedFolderText(subject, topic) {
    const text = (!subject || !topic)
        ? 'Seçili Kütüphane: Henüz seçilmedi'
        : `Seçili Kütüphane: ${subject} / ${topic}`;
    ['selected-folder-text', 'derslerim-selected-folder-text'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    });
}

function setSelectedLibraryPath(subject, topic) {
    const safeSubject = String(subject || '').trim();
    const safeTopic = String(topic || '').trim();
    if (!safeSubject || !safeTopic) return;
    window.selectedLibraryPath = { subject: safeSubject, topic: safeTopic };
    window.secilenDers = safeSubject;
    window.secilenKonu = safeTopic;
    updateSelectedFolderText(safeSubject, safeTopic);
    saveAddQuestionUIPrefs({ folderSubject: safeSubject, folderTopic: safeTopic });
    ensureCurriculumPath(safeSubject, safeTopic);
}

function normalizeLibraryPath(path) {
    if (!path || typeof path !== 'object') return null;
    const subject = String(path.subject || '').trim();
    const topic = String(path.topic || '').trim();
    if (!subject || !topic) return null;
    return { subject, topic };
}

window.applySmartAddQuestionFormVisibility = () => {
    const selectionArea = document.getElementById('dynamic-selection-area');
    if (!selectionArea) return;
    selectionArea.style.display = 'block';
};

function getLibraryModalActiveOnlyEnabled() {
    const toggleEl = document.getElementById('library-modal-active-toggle');
    if (toggleEl) return !!toggleEl.checked;
    const savedMode = normalizeTopicFilterMode(CLIENT_STORE.getItem(DERSLERIM_TOPIC_FILTER_STORAGE_KEY, 'all'));
    return savedMode === 'saved';
}

function getLibraryModalTopicFilterMode() {
    return getLibraryModalActiveOnlyEnabled() ? 'saved' : 'all';
}

function setLibraryModalTitleForMode() {
    const title = document.getElementById('library-modal-title');
    if (!title) return;
    title.textContent = window.currentLibraryModalMode === 'view'
        ? '📚 Kayıtlı Kütüphanem'
        : '📁 Kütüphane Seç';
}

window.toggleLibraryModalSection = () => {
    const section = document.getElementById('library-modal-library-section');
    const titleBtn = document.getElementById('library-modal-title');
    if (!section) return;
    section.classList.toggle('collapsed');
    const expanded = !section.classList.contains('collapsed');
    if (titleBtn) titleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
};

window.toggleLibraryModalSubject = (subjectSlug) => {
    if (window.currentLibraryModalMode === 'view') {
        window.libraryModalFocusedSubject = String(subjectSlug || '').trim();
        window.renderLibraryModalTree();
        return;
    }
    const el = document.getElementById(`library-modal-topics-${subjectSlug}`);
    const arrowEl = document.getElementById(`library-modal-subj-arrow-${subjectSlug}`);
    const btn = document.getElementById(`library-modal-subj-btn-${subjectSlug}`);
    if (!el) return;
    el.classList.toggle('open');
    const expanded = el.classList.contains('open');
    if (arrowEl) arrowEl.textContent = expanded ? '▲' : '▼';
    if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
};

window.handleLibraryModalTopicSelection = (subject, topic) => {
    const safeSubject = String(subject || '').trim();
    const safeTopic = String(topic || '').trim();
    if (!safeSubject || !safeTopic) return;
    setSelectedLibraryPath(safeSubject, safeTopic);
    if (window.currentLibraryModalMode === 'select') {
        window.closeLibraryModal();
        return;
    }
    const selectedPath = { subject: safeSubject, topic: safeTopic };
    window.libraryViewingTopicPath = selectedPath;
    window.pendingLibraryFilter = selectedPath;
    window.closeLibraryModal();
    window.openStudentLibrary({ keepTopicContext: true });
};

window.showLibraryModalActiveTopicsInfo = () => {
    window.showSoftFeedback('Aktif konular, içerisinde en az bir soru kayıtlı olan konulardır.');
};

window.handleLibraryModalActiveToggleChange = () => {
    const mode = getLibraryModalTopicFilterMode();
    CLIENT_STORE.setItem(DERSLERIM_TOPIC_FILTER_STORAGE_KEY, mode);
    window.renderLibraryModalTree();
};

window.renderLibraryModalTree = () => {
    const content = document.getElementById('library-modal-content');
    if (!content) return;
    setLibraryModalTitleForMode();
    content.innerHTML = '';

    const sectionWrap = document.createElement('div');
    sectionWrap.className = 'library-modal-tree-wrap';

    const section = document.createElement('div');
    section.id = 'library-modal-library-section';
    section.className = 'library-modal-library-section';
    section.setAttribute('role', 'region');
    section.setAttribute('aria-label', 'Kütüphane ders ve konu listesi');

    const filterMode = getLibraryModalTopicFilterMode();
    const isViewMode = window.currentLibraryModalMode === 'view';
    CLIENT_STORE.setItem(DERSLERIM_TOPIC_FILTER_STORAGE_KEY, isViewMode ? filterMode : 'all');
    const savedTopicIndex = buildSavedTopicIndexForDerslerim();
    const selectedSubjects = getDerslerimSubjectsFromStorage();
    const subjectList = selectedSubjects.length > 0
        ? selectedSubjects
        : (window.currentLibraryModalMode === 'view' ? [] : Object.keys(window.userCurriculum || {}));
    const focusedSubject = window.currentLibraryModalMode === 'view'
        ? String(window.libraryModalFocusedSubject || '').trim()
        : '';

    if (!subjectList.length) {
        const emptyText = document.createElement('small');
        emptyText.className = 'derslerim-empty-text';
        emptyText.textContent = 'Önce Derslerim bölümünden ders ekleyin.';
        section.appendChild(emptyText);
    } else {
        let hasRenderableTopic = false;
        let usedSavedFilterFallback = false;
        let effectiveFilterMode = filterMode;
        if (focusedSubject) {
            const allTopics = getTopicsForDerslerimSubject(focusedSubject);
            const savedTopicsForSubject = savedTopicIndex.get(focusedSubject);
            const topicResult = getAllowedTopicsForModalContext(allTopics, savedTopicsForSubject, filterMode, window.currentLibraryModalMode);
            const allowedTopics = topicResult.topics;
            effectiveFilterMode = topicResult.effectiveMode;
            usedSavedFilterFallback = topicResult.usedFallback;
            const backBtn = document.createElement('button');
            backBtn.type = 'button';
            backBtn.className = 'library-back-btn';
            backBtn.textContent = '⬅️ Derslere Dön';
            backBtn.addEventListener('click', () => {
                window.libraryModalFocusedSubject = '';
                window.renderLibraryModalTree();
            });
            section.appendChild(backBtn);

            const subjectTitle = document.createElement('h4');
            subjectTitle.style.margin = '0 0 8px 0';
            subjectTitle.style.color = '#1e3c72';
            subjectTitle.textContent = `📘 ${focusedSubject}`;
            section.appendChild(subjectTitle);

            if (allowedTopics.length === 0) {
                const emptyText = document.createElement('small');
                emptyText.className = 'derslerim-empty-text';
                emptyText.textContent = 'Bu derste kayıtlı konu bulunamadı.';
                section.appendChild(emptyText);
            } else {
                allowedTopics.forEach((topic) => {
                    const topicBtn = document.createElement('button');
                    topicBtn.type = 'button';
                    topicBtn.className = 'derslerim-topic-btn';
                    topicBtn.setAttribute('aria-label', `${focusedSubject} - ${topic} konusunu aç`);
                    topicBtn.textContent = `📄 ${topic}`;
                    topicBtn.addEventListener('click', () => window.handleLibraryModalTopicSelection(focusedSubject, topic));
                    section.appendChild(topicBtn);
                });
            }
            hasRenderableTopic = true;
        } else {
        subjectList.forEach((subject) => {
            const slug = slugifySubjectName(subject);
            const allTopics = getTopicsForDerslerimSubject(subject);
            const savedTopicsForSubject = savedTopicIndex.get(subject);
            const topicResult = getAllowedTopicsForModalContext(allTopics, savedTopicsForSubject, filterMode, window.currentLibraryModalMode);
            const allowedTopics = topicResult.topics;
            if (topicResult.usedFallback) usedSavedFilterFallback = true;
            if (topicResult.effectiveMode === 'all') effectiveFilterMode = 'all';
            if (allowedTopics.length === 0) return;
            hasRenderableTopic = true;

            const subjectBtn = document.createElement('button');
            subjectBtn.type = 'button';
            subjectBtn.className = 'derslerim-library-subject';
            subjectBtn.id = `library-modal-subj-btn-${slug}`;
            subjectBtn.setAttribute('aria-expanded', 'false');
            subjectBtn.setAttribute('aria-controls', `library-modal-topics-${slug}`);
            if (window.currentLibraryModalMode === 'view') {
                subjectBtn.addEventListener('click', () => window.toggleLibraryModalSubject(subject));
            } else {
                subjectBtn.addEventListener('click', () => window.toggleLibraryModalSubject(slug));
            }

            const leftLabel = document.createElement('span');
            leftLabel.textContent = `📘 ${subject}`;
            const arrow = document.createElement('span');
            arrow.id = `library-modal-subj-arrow-${slug}`;
            arrow.textContent = '▼';
            subjectBtn.append(leftLabel, arrow);

            if (window.currentLibraryModalMode === 'view') {
                section.append(subjectBtn);
            } else {
                const topicsWrap = document.createElement('div');
                topicsWrap.id = `library-modal-topics-${slug}`;
                topicsWrap.className = 'derslerim-library-topics';
                topicsWrap.setAttribute('role', 'group');
                topicsWrap.setAttribute('aria-label', `${subject} konuları`);

                allowedTopics.forEach((topic) => {
                    const topicBtn = document.createElement('button');
                    topicBtn.type = 'button';
                    topicBtn.className = 'derslerim-topic-btn';
                    topicBtn.setAttribute('aria-label', `${subject} - ${topic} konusunu aç`);
                    topicBtn.textContent = `📄 ${topic}`;
                    topicBtn.addEventListener('click', () => window.handleLibraryModalTopicSelection(subject, topic));
                    topicsWrap.appendChild(topicBtn);
                });

                section.append(subjectBtn, topicsWrap);
            }
        });
        }

        if (!hasRenderableTopic) {
            const emptyText = document.createElement('small');
            emptyText.className = 'derslerim-empty-text';
            emptyText.textContent = effectiveFilterMode === 'saved'
                ? 'Henüz aktif konu bulunamadı. Tüm konuları görmek için “Sadece Aktif Konuları Göster” anahtarını kapatın.'
                : 'Konu bulunamadı.';
            section.appendChild(emptyText);
        }
        if (usedSavedFilterFallback && isViewMode) {
            CLIENT_STORE.setItem(DERSLERIM_TOPIC_FILTER_STORAGE_KEY, 'all');
            const toggleEl = document.getElementById('library-modal-active-toggle');
            if (toggleEl) toggleEl.checked = false;
        }
    }

    sectionWrap.appendChild(section);
    content.appendChild(sectionWrap);
    const titleBtn = document.getElementById('library-modal-title');
    if (titleBtn) titleBtn.setAttribute('aria-expanded', 'true');
};

window.openLibraryModal = (mode = 'select', options = {}) => {
    const currentUser = APP_STATE.currentUser || {};
    if (currentUser.role !== 'student') return;
    const overlay = document.getElementById('library-modal-overlay');
    const content = document.getElementById('library-modal-content');
    const toggleEl = document.getElementById('library-modal-active-toggle');
    const controls = document.querySelector('.library-modal-controls');
    if (!overlay || !content) return;
    const normalizedMode = mode === 'view' ? 'view' : 'select';
    const requestedFocusedSubject = String(options.focusedSubject || '').trim();
    window.currentLibraryModalMode = normalizedMode;
    window.libraryModalFocusedSubject = requestedFocusedSubject;
    setLibraryModalTitleForMode();
    if (toggleEl) {
        const savedMode = normalizeTopicFilterMode(CLIENT_STORE.getItem(DERSLERIM_TOPIC_FILTER_STORAGE_KEY, 'all'));
        if (normalizedMode === 'view') {
            toggleEl.checked = savedMode === 'saved';
        } else {
            toggleEl.checked = false;
            CLIENT_STORE.setItem(DERSLERIM_TOPIC_FILTER_STORAGE_KEY, 'all');
        }
        toggleEl.disabled = normalizedMode !== 'view';
    }
    if (controls) controls.style.display = normalizedMode === 'view' ? 'flex' : 'none';
    overlay.classList.toggle('library-modal-overlay-fullscreen', window.currentLibraryModalMode === 'view');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
    window.renderLibraryModalTree();
};

window.closeLibraryModal = (event) => {
    if (event && event.currentTarget && event.target !== event.currentTarget) return;
    const overlay = document.getElementById('library-modal-overlay');
    if (overlay) {
        overlay.classList.remove('open');
        setTimeout(() => {
            if (!overlay.classList.contains('open')) overlay.style.display = 'none';
        }, 300);
    }
    window.currentLibraryModalSubject = "";
    window.libraryModalFocusedSubject = "";
};

window.updateStudentPhotoAddButtonLabel = () => {
    const photoSourceSelect = document.getElementById('student-photo-source-select');
    const labelEl = document.getElementById('student-photo-add-btn-label');
    if (!photoSourceSelect || !labelEl) return;
    const labels = {
        camera: '➕ Soru Ekle (Kameradan Ekle)',
        gallery: '➕ Soru Ekle (Fotoğraf Ekle)',
        file: '➕ Soru Ekle (Dosya Seç)'
    };
    labelEl.textContent = labels[photoSourceSelect.value] || labels.camera;
};

window.updateStudentSolutionAddButtonLabel = () => {
    const solutionSourceSelect = document.getElementById('student-solution-source-select');
    const labelEl = document.getElementById('student-solution-add-btn-label');
    if (!solutionSourceSelect || !labelEl) return;
    const labels = {
        camera: '🧩 Çözüm Ekle (Kameradan Ekle)',
        gallery: '🧩 Çözüm Ekle (Fotoğraf Ekle)',
        file: '🧩 Çözüm Ekle (Dosya Seç)'
    };
    labelEl.textContent = labels[solutionSourceSelect.value] || labels.camera;
};

window.updateStudentSaveTargetLabel = () => {
    const saveTargetSelect = document.getElementById('student-save-target-select');
    const labelEl = document.getElementById('student-save-target-label');
    const saveBtn = document.getElementById('student-save-btn');
    if (!saveTargetSelect) return;
    const isLocal = saveTargetSelect.value === 'local';
    if (labelEl) labelEl.textContent = isLocal ? '💾 Kayıt Hedefi: Cihaz' : '💾 Kayıt Hedefi: Bulut';
    if (saveBtn) saveBtn.textContent = isLocal ? '💾 Cihaza Kaydet' : '☁️ Buluta Kaydet';
};

window.restoreAddQuestionUISelections = () => {
    const prefs = getAddQuestionUIPrefs();

    const photoSourceSelect = document.getElementById('student-photo-source-select');
    const solutionSourceSelect = document.getElementById('student-solution-source-select');
    const saveTargetSelect = document.getElementById('student-save-target-select');

    if (photoSourceSelect) {
        photoSourceSelect.value = normalizeStudentPhotoSource(prefs.photoSource);
    }
    if (solutionSourceSelect) {
        solutionSourceSelect.value = normalizeStudentPhotoSource(prefs.solutionSource);
    }
    if (saveTargetSelect && (prefs.saveTarget === 'cloud' || prefs.saveTarget === 'local')) {
        saveTargetSelect.value = prefs.saveTarget;
    }

    const folderSubject = (prefs.folderSubject || window.secilenDers || '').trim();
    const folderTopic = (prefs.folderTopic || window.secilenKonu || '').trim();
    const hasStoredPath =
        !!folderSubject &&
        !!folderTopic &&
        Array.isArray(window.userCurriculum?.[folderSubject]) &&
        window.userCurriculum[folderSubject].includes(folderTopic);
    if (hasStoredPath) {
        setSelectedLibraryPath(folderSubject, folderTopic);
    } else {
        updateSelectedFolderText('', '');
    }
    window.updateStudentPhotoAddButtonLabel();
    window.updateStudentSolutionAddButtonLabel();
    window.updateStudentSaveTargetLabel();
    window.applySmartAddQuestionFormVisibility();
};

window.openFolderSelector = () => {
    window.smartAddTopicPath = null;
    window.applySmartAddQuestionFormVisibility();
    window.openLibraryModal('select');
};

window.openStudentPhotoPicker = () => {
    const photoSourceSelect = document.getElementById('student-photo-source-select');
    const selectedSource = photoSourceSelect ? photoSourceSelect.value : 'camera';
    saveAddQuestionUIPrefs({ photoSource: selectedSource });

    const targetInput = selectedSource === 'gallery'
        ? document.getElementById('std-img-upload-file')
        : selectedSource === 'file'
            ? document.getElementById('std-img-upload-file-picker')
            : document.getElementById('std-img-upload-camera');
    if (targetInput) targetInput.click();
};

window.openStudentSolutionPicker = () => {
    const solutionSourceSelect = document.getElementById('student-solution-source-select');
    const selectedSource = solutionSourceSelect ? solutionSourceSelect.value : 'camera';
    saveAddQuestionUIPrefs({ solutionSource: selectedSource });
    const targetInput = selectedSource === 'gallery'
        ? document.getElementById('std-solution-upload-file')
        : selectedSource === 'file'
            ? document.getElementById('std-solution-upload-file-picker')
            : document.getElementById('std-solution-upload-camera');
    if (targetInput) targetInput.click();
};

window.selectStudentPhotoSource = (source) => {
    const safeSource = normalizeStudentPhotoSource(source);
    const select = document.getElementById('student-photo-source-select');
    if (select) select.value = safeSource;
    saveAddQuestionUIPrefs({ photoSource: safeSource });
    window.updateStudentPhotoAddButtonLabel();
    const dropdown = document.getElementById('student-photo-picker');
    if (dropdown) dropdown.open = false;
    window.openStudentPhotoPicker();
};

window.selectStudentSolutionSource = (source) => {
    const safeSource = normalizeStudentPhotoSource(source);
    const select = document.getElementById('student-solution-source-select');
    if (select) select.value = safeSource;
    saveAddQuestionUIPrefs({ solutionSource: safeSource });
    window.updateStudentSolutionAddButtonLabel();
    const dropdown = document.getElementById('student-solution-picker');
    if (dropdown) dropdown.open = false;
    window.openStudentSolutionPicker();
};

window.selectStudentSaveTarget = (target) => {
    const safeTarget = target === 'local' ? 'local' : 'cloud';
    const select = document.getElementById('student-save-target-select');
    if (select) select.value = safeTarget;
    saveAddQuestionUIPrefs({ saveTarget: safeTarget });
    window.updateStudentSaveTargetLabel();
    const dropdown = document.getElementById('student-save-picker');
    if (dropdown) dropdown.open = false;
};

window.openStudentLibrary = (options = {}) => {
    const keepTopicContext = !!(options && options.keepTopicContext);
    if (!keepTopicContext) window.libraryViewingTopicPath = null;
    const source = (typeof socket !== 'undefined' && socket !== null) ? 'cloud' : 'local';
    window.fetchStudentLibrary(source, false);
};

window.openSmartAddForCurrentLibraryTopic = () => {
    const context = normalizeLibraryPath(window.libraryViewingTopicPath);
    if (!context) return;
    window.smartAddTopicPath = context;
    setSelectedLibraryPath(context.subject, context.topic);
    window.applySmartAddQuestionFormVisibility();
    showScreen('screen-main');
    const panel = document.getElementById('student-library-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.renderLibraryTopicAddButton = () => {
    const context = normalizeLibraryPath(window.libraryViewingTopicPath);
    const btn = document.getElementById('library-topic-add-fab');
    if (!btn) return;
    if (!context) {
        btn.style.display = 'none';
        btn.title = '';
        return;
    }
    btn.style.display = 'inline-flex';
    btn.title = `Bu konuya soru ekle: ${context.subject} / ${context.topic}`;
};

window.saveStudentQuestionWithPreference = () => {
    const saveTargetSelect = document.getElementById('student-save-target-select');
    const saveTarget = saveTargetSelect ? saveTargetSelect.value : 'cloud';
    const normalizedSaveTarget = saveTarget === 'local' ? 'local' : 'cloud';
    saveAddQuestionUIPrefs({ saveTarget: normalizedSaveTarget });
    window.uploadStudentQuestion(normalizedSaveTarget);
};

function getReadySources() {
    try {
        const parsed = JSON.parse(localStorage.getItem(READY_SOURCES_STORAGE_KEY)) || [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveReadySource(name, image = null) {
    const sourceName = String(name || '').trim();
    if (!sourceName) return;
    const current = getReadySources();
    const idx = current.findIndex(s => normalizeText(s.name) === normalizeText(sourceName));
    const existing = idx >= 0 ? current[idx] : null;
    const finalImage = image || (existing ? existing.image : '');
    const payload = { name: sourceName, image: finalImage || '', updatedAt: Date.now() };
    if (idx >= 0) current[idx] = payload;
    else current.unshift(payload);
    const sorted = [...current].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, MAX_READY_SOURCES);
    localStorage.setItem(READY_SOURCES_STORAGE_KEY, JSON.stringify(sorted));
}

const EXAM_TYPE_SUBJECT_MAP = {
    kpss_a: ['KPSS', ['A Grubu']],
    kpss_lisans: ['KPSS', ['B Grubu (Lisans)']],
    kpss_onlisans: ['KPSS', ['B Grubu (Önlisans)']],
    kpss_ortaogretim: ['KPSS', ['B Grubu (Ortaöğretim)']],
    kpss_egitim: ['KPSS', ['Eğitim Bilimleri']],
    yks_tyt: ['YKS', ['TYT']],
    yks_ayt: ['YKS', ['AYT']],
    lise_okul: ['YKS', ['TYT', 'AYT']],
    ortaokul: ['LGS', ['Sayısal', 'Sözel']],
    ags: ['AGS (Akademi Giriş Sınavı)', ['Genel Yetenek ve Genel Kültür']]
};

function getSubjectsByExamType(examType) {
    const conf = EXAM_TYPE_SUBJECT_MAP[examType];
    if (!conf || !window.mufredat[conf[0]]) {
        const fallbackCustomSubjects = getCustomCurriculumSubjectsByExamType(examType);
        const savedSubjects = getDerslerimSubjectsFromStorage();
        return uniqueSubjects([...DEFAULT_PROFILE_SUBJECTS, ...fallbackCustomSubjects, ...savedSubjects]);
    }
    const [examKey, groups] = conf;
    const subjectNames = [];
    groups.forEach(group => {
        const groupData = window.mufredat[examKey][group];
        if (groupData) subjectNames.push(...Object.keys(groupData));
    });
    const customSubjects = getCustomCurriculumSubjectsByExamType(examType);
    const savedSubjects = getDerslerimSubjectsFromStorage();
    return uniqueSubjects([...(subjectNames.length > 0 ? subjectNames : DEFAULT_PROFILE_SUBJECTS), ...customSubjects, ...savedSubjects]);
}

function getCurriculumTopicsByExamTypeAndSubject(examType, subject) {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject) return [];
    const conf = EXAM_TYPE_SUBJECT_MAP[examType];
    if (!conf || !window.mufredat[conf[0]]) {
        return getCustomCurriculumTopicsByExamTypeAndSubject(examType, safeSubject);
    }
    const [examKey, groups] = conf;
    const topics = [];
    groups.forEach((group) => {
        const subjectTopics = window.mufredat?.[examKey]?.[group]?.[safeSubject];
        if (Array.isArray(subjectTopics)) topics.push(...subjectTopics);
    });
    const customTopics = getCustomCurriculumTopicsByExamTypeAndSubject(examType, safeSubject);
    return uniqueSubjects([...topics, ...customTopics]);
}

window.renderProfileSubjectsByExam = (savedSubjectsInput = null) => {
    const container = document.getElementById('profile-subjects-area');
    const examTypeEl = document.getElementById('profile-exam-type');
    if (!container || !examTypeEl) return;
    const allSubjects = getSubjectsByExamType(examTypeEl.value);
    const savedSubjects = Array.isArray(savedSubjectsInput) ? savedSubjectsInput : CLIENT_STORE.getJSON('gazi_subjects_v2', []);
    const savedMap = new Map();
    savedSubjects.forEach((item) => {
        const normalizedName = normalizeText(item?.name);
        if (!normalizedName) return;
        savedMap.set(normalizedName, {
            topics: String(item?.topics || '').trim(),
            selected: item?.selected !== false
        });
    });
    const queryInput = document.getElementById('derslerim-course-search');
    const query = String(queryInput?.value || '').trim();
    const filteredSubjects = filterCourseNamesByQuery(allSubjects, query);
    if (filteredSubjects.length === 0) {
        container.innerHTML = `<p class="derslerim-empty-text">Aramaya uygun ders bulunamadı.</p>`;
        return;
    }

    container.innerHTML = filteredSubjects.map((subject, subjectIndex) => {
            const key = slugifySubjectName(subject);
            const uniqueId = `${subjectIndex}`;
            const checkboxId = `subj-dyn-${key}-${uniqueId}`;
            const topicsId = `subj-dyn-topics-${key}-${uniqueId}`;
            const saved = savedMap.get(normalizeText(subject));
            const checked = saved?.selected ? 'checked' : '';
            const savedTopicsText = String(saved?.topics || '').trim();
            const selectedTopics = parseTopicsFromText(savedTopicsText);
            const userTopics = Array.isArray(window.userCurriculum?.[subject]) ? window.userCurriculum[subject] : [];
            const curriculumTopics = getCurriculumTopicsByExamTypeAndSubject(examTypeEl.value, subject);
            const customTopics = getCustomTopicsBySubject(subject);
            const topicList = buildTopicListFromSources(curriculumTopics, userTopics, savedTopicsText, customTopics);
            const isExpanded = normalizeText(window.expandedProfileSubject) === normalizeText(subject);
            const topicsHTML = topicList.length > 0
                ? `<div class="subject-row-topics">${topicList.map((topic) => `<span class="subject-topic-chip">${escapeHtml(topic)}</span>`).join('')}</div>`
                : `<p class="subject-row-empty-topic">Konu başlığı bulunamadı.</p>`;
            return `
                <div class="subject-row" data-subject-name="${escapeHtml(subject)}" data-topics-text="${escapeHtml(savedTopicsText)}">
                    <div class="subject-row-main">
                        <input type="checkbox" id="${checkboxId}" value="${escapeHtml(subject)}" ${checked} onchange="window.handleDerslerimCourseToggle()">
                        <button type="button" class="subject-row-collapse-btn" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-controls="${topicsId}" onclick="window.toggleProfileSubjectTopics(${JSON.stringify(subject)})">
                            <span class="subject-row-name">📘 ${escapeHtml(subject)}</span>
                            <span>${isExpanded ? '▲' : '▼'}</span>
                        </button>
                    </div>
                    <div id="${topicsId}" class="subject-row-accordion${isExpanded ? ' open' : ''}">
                        <button type="button" class="outline" style="width:auto; padding:6px 10px; font-size:0.74rem; border-color:#3498db; color:#3498db;" onclick="window.openCourseTopicsScreen(${JSON.stringify(subject)})">Konuları Seç (${selectedTopics.length})</button>
                        ${topicsHTML}
                    </div>
                </div>
            `;
    }).join('');
};

window.currentCourseTopicsSubject = '';
window.currentCourseTopicsSelected = [];
window.currentCourseTopicsAll = [];
window.courseTopicsBackScreen = 'screen-settings';

window.openCourseTopicsScreen = (subjectName = '', backScreen = 'screen-settings') => {
    const safeSubject = String(subjectName || '').trim();
    if (!safeSubject) return;
    const savedSubjects = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    const savedRow = savedSubjects.find((row) => normalizeText(row?.name) === normalizeText(safeSubject));
    const currentExamType = document.getElementById('profile-exam-type')?.value || getCurrentExamType();
    const allTopics = buildTopicListFromSources(
        getCurriculumTopicsByExamTypeAndSubject(currentExamType, safeSubject),
        Array.isArray(window.userCurriculum?.[safeSubject]) ? window.userCurriculum[safeSubject] : [],
        String(savedRow?.topics || ''),
        getCustomTopicsBySubject(safeSubject)
    );
    window.currentCourseTopicsSubject = safeSubject;
    window.currentCourseTopicsAll = allTopics;
    window.currentCourseTopicsSelected = parseTopicsFromText(String(savedRow?.topics || ''));
    window.courseTopicsBackScreen = String(backScreen || 'screen-settings');
    window.renderCourseTopicsScreen();
    showScreen('screen-course-topics');
};

window.goBackFromCourseTopics = () => {
    showScreen(window.courseTopicsBackScreen || 'screen-settings');
};

window.renderCourseTopicsScreen = () => {
    const subjectEl = document.getElementById('course-topics-subject-title');
    const listEl = document.getElementById('course-topics-list');
    if (!subjectEl || !listEl) return;
    const subject = String(window.currentCourseTopicsSubject || '').trim();
    const allTopics = Array.isArray(window.currentCourseTopicsAll) ? window.currentCourseTopicsAll : [];
    const selectedSet = new Set(Array.isArray(window.currentCourseTopicsSelected) ? window.currentCourseTopicsSelected : []);
    subjectEl.textContent = subject ? `📘 ${subject}` : '📘 Ders';
    if (allTopics.length === 0) {
        listEl.innerHTML = '<p class="derslerim-empty-text">Bu derse ait konu bulunamadı.</p>';
        return;
    }
    listEl.innerHTML = allTopics.map((topic, index) => `
        <label class="checkbox-item" style="padding:10px; border:1px solid #e5ecf6; border-radius:8px; margin-bottom:6px;">
            <input type="checkbox" value="${escapeHtml(topic)}" ${selectedSet.has(topic) ? 'checked' : ''} onchange="window.toggleCourseTopicSelection(${index}, this.checked)">
            <span style="color:#1e3c72; font-weight:600; text-align:left;">${escapeHtml(topic)}</span>
        </label>
    `).join('');
};

window.toggleCourseTopicSelection = (topicIndex, checked) => {
    const allTopics = Array.isArray(window.currentCourseTopicsAll) ? window.currentCourseTopicsAll : [];
    const topic = String(allTopics[Number(topicIndex)] || '').trim();
    if (!topic) return;
    const selected = new Set(Array.isArray(window.currentCourseTopicsSelected) ? window.currentCourseTopicsSelected : []);
    if (checked) selected.add(topic);
    else selected.delete(topic);
    window.currentCourseTopicsSelected = Array.from(selected);
};

window.saveCourseTopicsSelection = () => {
    const subject = String(window.currentCourseTopicsSubject || '').trim();
    if (!subject) return;
    const selectedTopics = uniqueSubjects(Array.isArray(window.currentCourseTopicsSelected) ? window.currentCourseTopicsSelected : []);
    const savedSubjects = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    const rowIndex = savedSubjects.findIndex((row) => normalizeText(row?.name) === normalizeText(subject));
    const payload = {
        name: subject,
        topics: selectedTopics.join(', '),
        selected: true
    };
    if (rowIndex >= 0) savedSubjects[rowIndex] = { ...savedSubjects[rowIndex], ...payload };
    else savedSubjects.push(payload);
    syncSelectedSubjectsToStorage(savedSubjects);
    window.renderProfileSubjectsByExam(savedSubjects);
    window.renderLibraryLessonsScreen();
    window.showSoftFeedback('Konu seçimi kaydedildi.');
    showScreen('screen-settings');
};

function getDerslerimSubjectDraftsFromUI() {
    const rows = Array.from(document.querySelectorAll('#profile-subjects-area .subject-row'));
    if (rows.length === 0) return null;
    const out = [];
    rows.forEach((row) => {
        const cb = row.querySelector('input[type="checkbox"]');
        if (!cb) return;
        out.push({
            name: cb.value,
            topics: String(row.getAttribute('data-topics-text') || '').trim(),
            selected: !!cb.checked
        });
    });
    return out;
}

function collectSelectedSubjectsFromUI() {
    const subjectsData = [];
    document.querySelectorAll('#profile-subjects-area .subject-row').forEach((row) => {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb && cb.checked) {
            subjectsData.push({
                name: cb.value,
                topics: String(row.getAttribute('data-topics-text') || '').trim(),
                selected: true
            });
        }
    });
    return subjectsData;
}

function syncSelectedSubjectsToStorage(subjectsData = []) {
    CLIENT_STORE.setJSON('gazi_subjects_v2', subjectsData);
    CLIENT_STORE.setItem('gazi_onboarding_done', 'true');
    if (document.getElementById('library-modal-overlay')?.classList.contains('open')) {
        window.renderLibraryModalTree();
    }
    const dersSelect = document.getElementById('std-q-ders');
    if (dersSelect) {
        dersSelect.innerHTML = '';
        const safeSubjects = Array.isArray(subjectsData) ? subjectsData : [];
        if (safeSubjects.length > 0) {
            safeSubjects.forEach((subject) => {
                const safeName = String(subject?.name || '').trim();
                if (!safeName) return;
                const option = document.createElement('option');
                option.value = safeName;
                option.textContent = safeName;
                dersSelect.appendChild(option);
            });
        }
        if (dersSelect.options.length === 0) {
            const option = document.createElement('option');
            option.value = DEFAULT_CUSTOM_GROUP_NAME;
            option.textContent = DEFAULT_CUSTOM_GROUP_NAME;
            dersSelect.appendChild(option);
        }
    }
    window.renderSavedLibraryCoursesPanel();
    window.renderLibraryLessonsScreen();
}

function renderFirstRunOnboardingSubjects() {
    const container = document.getElementById('onboarding-subjects');
    const examTypeEl = document.getElementById('onboarding-exam-type');
    if (!container || !examTypeEl) return;
    const subjects = getSubjectsByExamType(examTypeEl.value);
    container.innerHTML = '';
    subjects.forEach((subject, idx) => {
        const safeSubject = String(subject || '').trim();
        if (!safeSubject) return;
        const label = document.createElement('label');
        label.className = 'onboarding-subject-item';
        label.htmlFor = `onboarding-subject-${idx}`;
        const checkbox = document.createElement('input');
        checkbox.id = `onboarding-subject-${idx}`;
        checkbox.type = 'checkbox';
        checkbox.value = safeSubject;
        checkbox.checked = true;
        const text = document.createElement('span');
        text.textContent = safeSubject;
        label.appendChild(checkbox);
        label.appendChild(text);
        container.appendChild(label);
    });
}

window.openFirstRunOnboarding = () => {
    if (CLIENT_STORE.getItem('gazi_onboarding_done', '')) return;
    const overlay = document.getElementById('first-run-onboarding');
    const examTypeEl = document.getElementById('onboarding-exam-type');
    if (!overlay || !examTypeEl) return;
    examTypeEl.value = CLIENT_STORE.getItem('gazi_exam_type', DEFAULT_EXAM_TYPE);
    renderFirstRunOnboardingSubjects();
    overlay.style.display = 'flex';
};

window.handleOnboardingExamTypeChange = () => {
    renderFirstRunOnboardingSubjects();
};

window.completeFirstRunOnboarding = () => {
    const examTypeEl = document.getElementById('onboarding-exam-type');
    const selectedSubjects = Array.from(document.querySelectorAll('#onboarding-subjects input[type="checkbox"]:checked'))
        .map((cb) => String(cb.value || '').trim())
        .filter(Boolean);
    if (!examTypeEl || selectedSubjects.length === 0) {
        alert("Lütfen en az bir ders seçin.");
        return;
    }
    CLIENT_STORE.setItem('gazi_exam_type', examTypeEl.value);
    CLIENT_STORE.setItem('gazi_onboarding_done', 'true');
    syncSelectedSubjectsToStorage(selectedSubjects.map((name) => ({ name, topics: '', selected: true })));
    const overlay = document.getElementById('first-run-onboarding');
    if (overlay) overlay.style.display = 'none';
    window.showScreen('screen-main');
    window.updateLocalListCounts();
};

window.handleDerslerimCourseToggle = () => {
    syncSelectedSubjectsToStorage(collectSelectedSubjectsFromUI());
};

window.handleDerslerimCourseSearch = () => {
    const drafts = getDerslerimSubjectDraftsFromUI();
    const queryInput = document.getElementById('derslerim-course-search');
    const query = String(queryInput?.value || '');
    CLIENT_STORE.setItem(DERSLERIM_COURSE_SEARCH_STORAGE_KEY, query);
    const saved = CLIENT_STORE.getJSON('gazi_subjects_v2', []);
    const merged = mergeSavedSubjectsWithDrafts(saved, drafts);
    window.renderProfileSubjectsByExam(merged);
};

window.toggleProfileSubjectTopics = (subjectName = '') => {
    const safeSubject = String(subjectName || '').trim();
    if (!safeSubject) return;
    window.expandedProfileSubject = getNextExpandedCourse(window.expandedProfileSubject, safeSubject);
    const drafts = getDerslerimSubjectDraftsFromUI();
    const saved = CLIENT_STORE.getJSON('gazi_subjects_v2', []);
    window.renderProfileSubjectsByExam(mergeSavedSubjectsWithDrafts(saved, drafts));
};

window.openDerslerimAddModal = () => {
    const modal = document.getElementById('derslerim-add-modal');
    if (!modal) return;
    const examTypeSelect = document.getElementById('derslerim-add-exam-type');
    const currentExamType = getCurrentExamType();
    ensureDerslerimAddExamOptions(currentExamType);
    if (examTypeSelect) {
        examTypeSelect.value = currentExamType;
    }
    const customExamInput = document.getElementById('derslerim-add-custom-exam');
    if (customExamInput) customExamInput.value = '';
    const groupInput = document.getElementById('derslerim-add-group');
    if (groupInput) groupInput.value = '';
    const subjectInput = document.getElementById('derslerim-add-subject');
    if (subjectInput) subjectInput.value = '';
    const topicsInput = document.getElementById('derslerim-add-topics');
    if (topicsInput) topicsInput.value = '';
    window.toggleDerslerimAddCustomExamInput();
    modal.style.display = 'flex';
};

window.closeDerslerimAddModal = () => {
    const modal = document.getElementById('derslerim-add-modal');
    if (modal) modal.style.display = 'none';
};

window.toggleDerslerimAddCustomExamInput = () => {
    const examTypeSelect = document.getElementById('derslerim-add-exam-type');
    const customExamWrap = document.getElementById('derslerim-add-custom-exam-wrap');
    if (!examTypeSelect || !customExamWrap) return;
    customExamWrap.style.display = examTypeSelect.value === '__custom__' ? 'block' : 'none';
};

function updateCourseAddedNavBadge(show) {
    const shouldShow = !!show;
    const dot = document.getElementById('nav-derslerim-added-dot');
    if (dot) dot.style.display = shouldShow ? 'inline-flex' : 'none';
    CLIENT_STORE.setItem(DERSLERIM_COURSE_ADDED_BADGE_STORAGE_KEY, shouldShow ? '1' : '0');
}

window.saveDerslerimCustomCourse = () => {
    const examTypeSelect = document.getElementById('derslerim-add-exam-type');
    const customExamInput = document.getElementById('derslerim-add-custom-exam');
    const groupInput = document.getElementById('derslerim-add-group');
    const subjectInput = document.getElementById('derslerim-add-subject');
    const topicsInput = document.getElementById('derslerim-add-topics');
    if (!examTypeSelect || !groupInput || !subjectInput || !topicsInput) return;

    let examTypeValue = String(examTypeSelect.value || '').trim();
    if (!examTypeValue) {
        alert('Lütfen sınav tipini seçin.');
        return;
    }
    if (examTypeValue === '__custom__') {
        const customExamLabel = String(customExamInput?.value || '').trim();
        if (!customExamLabel) {
            alert('Lütfen özel sınav tipi adını girin.');
            return;
        }
        examTypeValue = generateCustomExamTypeValue(customExamLabel);
        const customExams = getCustomExamTypes();
        if (!customExams.some((row) => row.value === examTypeValue)) {
            customExams.push({ value: examTypeValue, label: customExamLabel });
            saveCustomExamTypes(customExams);
        }
    }

    const groupName = String(groupInput.value || '').trim() || DEFAULT_CUSTOM_GROUP_NAME;
    const subjectName = String(subjectInput.value || '').trim();
    if (!subjectName) {
        alert('Lütfen ders adını girin.');
        return;
    }
    const topics = parseTopicsFromText(topicsInput.value);

    const savedSubjects = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    const subjectIdx = savedSubjects.findIndex((item) => normalizeText(item?.name) === normalizeText(subjectName));
    if (subjectIdx >= 0) {
        savedSubjects[subjectIdx] = {
            ...savedSubjects[subjectIdx],
            name: subjectName,
            selected: true
        };
    } else {
        savedSubjects.push({ name: subjectName, topics: '', selected: true });
    }
    CLIENT_STORE.setJSON('gazi_subjects_v2', savedSubjects);

    if (topics.length > 0) {
        addCustomTopicsForSubject(subjectName, topics);

        if (!Array.isArray(window.userCurriculum?.[subjectName])) window.userCurriculum[subjectName] = [];
        window.userCurriculum[subjectName] = uniqueSubjects([...window.userCurriculum[subjectName], ...topics]);
        persistUserCurriculum();
        syncUserCurriculumIfGodMode();
    }

    const customCurriculum = getCustomCurriculumMap();
    if (!customCurriculum[examTypeValue]) customCurriculum[examTypeValue] = {};
    if (!customCurriculum[examTypeValue][groupName]) customCurriculum[examTypeValue][groupName] = {};
    const existingCurriculumTopics = Array.isArray(customCurriculum[examTypeValue][groupName][subjectName]) ? customCurriculum[examTypeValue][groupName][subjectName] : [];
    customCurriculum[examTypeValue][groupName][subjectName] = uniqueSubjects([...existingCurriculumTopics, ...topics]);
    saveCustomCurriculumMap(customCurriculum);

    ensureProfileExamTypeOptions(examTypeValue);
    ensureDerslerimAddExamOptions(examTypeValue);
    window.expandedProfileSubject = subjectName;
    const profileExamType = document.getElementById('profile-exam-type');
    if (profileExamType) profileExamType.value = examTypeValue;
    CLIENT_STORE.setItem('gazi_exam_type', examTypeValue);
    window.updateGradeDropdown();
    window.renderSavedLibraryCoursesPanel();
    window.closeDerslerimAddModal();
    updateCourseAddedNavBadge(true);
    window.showSoftFeedback('Ders/Konu başarıyla eklendi.');
};

window.renderSavedLibraryCoursesPanel = () => {
    const wrap = document.getElementById('saved-library-course-list');
    if (!wrap) return;
    const savedSubjects = CLIENT_STORE.getJSON('gazi_subjects_v2', []);
    const savedSubjectMap = new Map(
        (Array.isArray(savedSubjects) ? savedSubjects : [])
            .map((row) => [normalizeText(row?.name), String(row?.topics || '').trim()])
    );
    const courseNames = getSavedLibraryCourseNames(savedSubjects);
    const localNotebook = getLocalNotebookQuestions();
    const dueReminderCounts = buildDueReminderCountsBySubject(localNotebook, Date.now());
    if (courseNames.length === 0) {
        wrap.innerHTML = `<p class="saved-library-empty">Henüz ders seçmediniz. Derslerim ekranında tiklenen dersler burada görünür.</p>`;
        const navDot = document.getElementById('nav-derslerim-reminder-dot');
        if (navDot) navDot.style.display = 'none';
        return;
    }
    let totalDueCount = 0;
    wrap.innerHTML = courseNames
        .map((name, index) => {
            const dueCount = dueReminderCounts[name] || 0;
            totalDueCount += dueCount;
            const encodedName = encodeURIComponent(name);
            const selectedTopics = parseTopicsFromText(savedSubjectMap.get(normalizeText(name)) || '');
            const topics = selectedTopics.length > 0 ? selectedTopics : getTopicsForDerslerimSubject(name);
            const topicsHtml = topics.length > 0
                ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                    ${topics.map((topic) => `<button type="button" class="outline" style="width:auto; padding:4px 7px; font-size:0.72rem; border-color:#8eb4ff; color:#dce7ff;" onclick="window.openLibraryTopicFromDerslerimEncoded('${encodeURIComponent(name)}','${encodeURIComponent(topic)}')">${escapeHtml(topic)}</button>`).join('')}
                   </div>`
                : `<small style="display:block; margin-top:8px; color:#b7c7e6;">Bu derste konu bulunamadı.</small>`;
            return `<div class="saved-library-course-item" data-subject-name="${encodedName}" style="display:block;">
                <button type="button" class="saved-library-course-btn" data-subject-name="${encodedName}" style="display:flex; justify-content:space-between; align-items:center;">📘 ${escapeHtml(name)}${dueCount > 0 ? `<span class="saved-library-red-dot" title="Hatırlatma zamanı gelen soru: ${dueCount}">🔴 ${dueCount}</span>` : ''}</button>
                ${topicsHtml}
            </div>`;
        })
        .join('');
    wrap.querySelectorAll('.saved-library-course-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            window.openSavedLibraryLesson(btn.dataset.subjectName || '');
        });
    });
    const navDot = document.getElementById('nav-derslerim-reminder-dot');
    if (navDot) navDot.style.display = totalDueCount > 0 ? 'inline-flex' : 'none';
};

window.openSavedLibraryLesson = (encodedName) => {
    try {
        const subjectName = decodeURIComponent(String(encodedName || ''));
        if (!subjectName) return;
        window.openLibraryLessonsScreen(subjectName);
    } catch (e) {
        console.warn('Kayıtlı kütüphane dersi açılamadı:', e);
        window.showSoftFeedback('Ders bağlantısı çözümlenemedi.');
    }
};

window.renderLibraryLessonsScreen = (focusedSubject = '') => {
    const listEl = document.getElementById('library-lessons-list');
    if (!listEl) return;
    const selectedCourseLabel = document.getElementById('library-lessons-selected-course');
    const normalizedFocus = String(focusedSubject || window.currentLibraryLessonsFocusedSubject || '').trim();
    if (selectedCourseLabel) selectedCourseLabel.textContent = buildSelectedCourseLabel(normalizedFocus);
    const savedSubjects = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    const selectedSubjects = getSavedLibraryCourseNames(savedSubjects);
    const savedMap = new Map(
        (Array.isArray(savedSubjects) ? savedSubjects : [])
            .map((row) => [normalizeText(row?.name), String(row?.topics || '').trim()])
    );
    const subjectsToRender = normalizedFocus ? selectedSubjects.filter((name) => name === normalizedFocus) : selectedSubjects;
    if (subjectsToRender.length === 0) {
        listEl.innerHTML = '<p class="derslerim-empty-text">Henüz kütüphanede ders bulunmuyor.</p>';
        return;
    }
    listEl.innerHTML = subjectsToRender.map((subject) => {
        const subjectSlug = slugifySubjectName(subject);
        const topicWrapId = `library-lessons-topics-${subjectSlug}`;
        const selectedTopics = parseTopicsFromText(savedMap.get(normalizeText(subject)) || '');
        const topics = selectedTopics.length > 0 ? selectedTopics : getTopicsForDerslerimSubject(subject);
        const isExpanded = normalizeText(window.expandedLibraryLessonSubject) === normalizeText(subject);
        const topicButtons = topics.length > 0
            ? topics.map((topic) => `<button type="button" class="derslerim-topic-btn" onclick="window.openLibraryTopicFromDerslerim(${JSON.stringify(subject)}, ${JSON.stringify(topic)})">${escapeHtml(topic)}</button>`).join('')
            : `<small class="derslerim-empty-text">Bu derste konu bulunamadı.</small>`;
        return `
            <section style="margin-bottom:10px;">
                <button type="button" class="derslerim-library-subject" id="library-lessons-subj-btn-${subjectSlug}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-controls="${topicWrapId}" onclick="window.toggleLibraryLessonSubject(${JSON.stringify(subject)})">
                    <span>📘 ${escapeHtml(subject)}</span>
                    <span>${isExpanded ? '▲' : '▼'}</span>
                </button>
                <div id="${topicWrapId}" class="derslerim-library-topics${isExpanded ? ' open' : ''}" style="margin-top:6px;">${topicButtons}</div>
            </section>
        `;
    }).join('');
};

window.openLibraryLessonsScreen = (focusedSubject = '') => {
    const normalizedFocus = String(focusedSubject || '').trim();
    window.currentLibraryLessonsFocusedSubject = normalizedFocus;
    if (normalizedFocus) window.expandedLibraryLessonSubject = normalizedFocus;
    updateCourseAddedNavBadge(false);
    window.renderLibraryLessonsScreen(focusedSubject);
    showScreen('screen-library-lessons');
};

window.toggleLibraryLessonSubject = (subjectName = '') => {
    const safeSubject = String(subjectName || '').trim();
    if (!safeSubject) return;
    window.expandedLibraryLessonSubject = getNextExpandedCourse(window.expandedLibraryLessonSubject, safeSubject);
    window.renderLibraryLessonsScreen(window.currentLibraryLessonsFocusedSubject || '');
};

window.toggleDerslerimSection = (contentId, arrowId, triggerId = null) => {
    const content = document.getElementById(contentId);
    const arrow = document.getElementById(arrowId);
    const trigger = triggerId ? document.getElementById(triggerId) : null;
    if (!content) return;
    content.classList.toggle('collapsed');
    const isCollapsed = content.classList.contains('collapsed');
    if (arrow) arrow.textContent = isCollapsed ? '▶' : '▼';
    if (trigger) trigger.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
};

window.applyDerslerimTheme = (enabled) => {
    const isEnabled = !!enabled;
    document.body.classList.toggle('full-dark-theme', isEnabled);
    document.body.classList.remove('soft-dark-theme');
    CLIENT_STORE.setItem(SOFT_DARK_THEME_STORAGE_KEY, isEnabled ? '1' : '0');
    const btn = document.getElementById('derslerim-theme-toggle-btn');
    if (btn) {
        btn.textContent = isEnabled
            ? '🌙 Gece Modu: Açık'
            : '🌙 Gece Modu: Kapalı';
    }
};

window.toggleDerslerimTheme = () => {
    const nextValue = !document.body.classList.contains('full-dark-theme');
    window.applyDerslerimTheme(nextValue);
};

window.restoreDerslerimTheme = () => {
    const saved = CLIENT_STORE.getItem(SOFT_DARK_THEME_STORAGE_KEY, '0') === '1';
    window.applyDerslerimTheme(saved);
};
// Eski global isimler için geriye dönük uyumluluk
/** @deprecated applyDerslerimTheme kullanın. */
window.applySoftDerslerimTheme = window.applyDerslerimTheme;
/** @deprecated toggleDerslerimTheme kullanın. */
window.toggleSoftDerslerimTheme = window.toggleDerslerimTheme;
/** @deprecated restoreDerslerimTheme kullanın. */
window.restoreSoftDerslerimTheme = window.restoreDerslerimTheme;

function getDerslerimSubjectsFromStorage() {
    const saved = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    const selected = saved
        .map(item => String(item?.name || '').trim())
        .filter(Boolean);
    return uniqueSubjects(selected);
}

function getTopicsForDerslerimSubject(subject) {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject) return [];
    const fromUserCurriculum = Array.isArray(window.userCurriculum?.[safeSubject]) ? window.userCurriculum[safeSubject] : [];
    const fromCustomTopics = getCustomTopicsBySubject(safeSubject);
    const activeExamType = getCurrentExamType();
    const fromBaseCurriculum = getCurriculumTopicsByExamTypeAndSubject(activeExamType, safeSubject);
    const saved = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    const row = saved.find(item => String(item?.name || '').trim() === safeSubject);
    return buildTopicListFromSources(fromBaseCurriculum, fromUserCurriculum, row?.topics || '', fromCustomTopics);
}

function getDerslerimTopicFilterMode() {
    return normalizeTopicFilterMode(CLIENT_STORE.getItem(DERSLERIM_TOPIC_FILTER_STORAGE_KEY, 'all'));
}

function buildSavedTopicIndexForDerslerim() {
    const map = new Map();
    const addPair = (subject, topic) => {
        const safeSubject = String(subject || '').trim();
        const safeTopic = String(topic || '').trim();
        if (!safeSubject || !safeTopic) return;
        if (!map.has(safeSubject)) map.set(safeSubject, new Set());
        map.get(safeSubject).add(safeTopic);
    };
    const localNotebook = getLocalNotebookQuestions();
    localNotebook.forEach((q) => addPair(q?.ders, q?.konu || q?.deneme));
    const activeLibrary = Array.isArray(window.originalStdQuestions) ? window.originalStdQuestions : [];
    activeLibrary.forEach((q) => addPair(q?.ders, q?.konu || q?.deneme));
    return map;
}

window.openLibraryTopicFromDerslerimEncoded = (encodedSubject, encodedTopic) => {
    try {
        const subject = decodeURIComponent(String(encodedSubject || ''));
        const topic = decodeURIComponent(String(encodedTopic || ''));
        window.openLibraryTopicFromDerslerim(subject, topic);
    } catch (e) {
        console.warn('Derslerim konu bağlantısı çözümlenemedi:', e);
        window.showSoftFeedback('Konu bağlantısı çözümlenemedi.');
    }
};

window.openLibraryTopicFromDerslerim = (subject, topic) => {
    const nextNavState = buildDerslerimTopicNavigation(subject, topic);
    if (!nextNavState) return;
    window.libraryViewingTopicPath = nextNavState.libraryViewingTopicPath;
    window.pendingLibraryFilter = nextNavState.pendingLibraryFilter;
    window.openStudentLibrary({ keepTopicContext: true });
};

window.toggleDerslerimLibrarySubject = (subjectSlug) => {
    const el = document.getElementById(`derslerim-topics-${subjectSlug}`);
    const arrowEl = document.getElementById(`derslerim-subj-arrow-${subjectSlug}`);
    const btn = document.getElementById(`derslerim-subj-btn-${subjectSlug}`);
    if (!el) return;
    el.classList.toggle('open');
    const expanded = el.classList.contains('open');
    if (arrowEl) arrowEl.textContent = expanded ? '▲' : '▼';
    if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
};

window.handleDerslerimTopicFilterChange = window.handleLibraryModalActiveToggleChange;
window.renderDerslerimLibraryTree = window.renderLibraryModalTree;

window.renderReadySources = () => {
    const listEl = document.getElementById('ready-sources-list');
    if (!listEl) return;
    const sources = getReadySources();
    if (sources.length === 0) {
        listEl.innerHTML = `<small style="color:#7f8c8d;">Henüz kayıtlı kaynakça yok. İlk soruyu kaydedince burada gözükecek.</small>`;
        return;
    }
    listEl.innerHTML = sources.map(source => `
        <div class="ready-source-card" data-source-name="${escapeHtml(encodeURIComponent(source.name))}">
            ${source.image ? `<img src="${safeImageSrc(source.image)}" alt="${escapeHtml(source.name)}">` : `<img src="${PLACEHOLDER_IMAGE_SRC}" alt="">`}
            <div class="ready-source-name">${escapeHtml(source.name)}</div>
        </div>
    `).join('');
    listEl.querySelectorAll('.ready-source-card').forEach(card => {
        card.addEventListener('click', () => window.selectReadySource(card.dataset.sourceName || ''));
    });
};

window.toggleReadySourcesPanel = () => {
    const panel = document.getElementById('ready-sources-panel');
    if (!panel) return;
    panel.classList.toggle('hidden-panel');
    if (!panel.classList.contains('hidden-panel')) window.renderReadySources();
};

window.selectReadySource = (encodedName) => {
    let name = '';
    try {
        name = decodeURIComponent(encodedName || '');
    } catch (e) {
        console.warn('Kaynak adı çözümlenemedi:', e);
        window.showSoftFeedback('Kaynak adı çözümlenemedi.');
        return;
    }
    name = String(name || '').trim();
    if (!name) return;
    const bookInput = document.getElementById('std-q-kitap');
    const preview = document.getElementById('std-source-image-preview');
    if (!bookInput) return;
    const source = getReadySources().find(s => s.name === name);
    if (!source) return;
    bookInput.value = source.name;
    if (source.image) {
        stdSourceImageBase64 = source.image;
        if (preview) {
            preview.src = safeImageSrc(source.image);
            preview.style.display = 'block';
        }
    } else {
        stdSourceImageBase64 = null;
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
    }
};

window.initEtiketleme = () => {
    const mem = CLIENT_STORE.getJSON('gazi_sticky_memory', {}) || {};
    if(mem.exam) window.secilenSinav = mem.exam;
    if(mem.group) window.secilenGrup = mem.group;
    if(mem.subject) window.secilenDers = mem.subject;
    if(mem.topic) window.secilenKonu = mem.topic;
    if(mem.book) {
        const bookInput = document.getElementById('std-q-kitap');
        if (bookInput) bookInput.value = mem.book;
    }
    if(mem.sourceImage) {
        const sourceImgPreview = document.getElementById('std-source-image-preview');
        if (sourceImgPreview) {
            stdSourceImageBase64 = mem.sourceImage;
            sourceImgPreview.src = safeImageSrc(mem.sourceImage);
            sourceImgPreview.style.display = 'block';
        }
    }

    if(mem.exam) {
        const memBadge = document.getElementById('mem-badge');
        if (memBadge) memBadge.style.display = "inline-block";
    }

    window.renderReadySources();
    window.renderExams(mem.exam ? true : false);
    window.restoreAddQuestionUISelections();
};

window.renderExams = (fromMemory = false) => {
    const container = document.getElementById('box-exams');
    if (!container) return;
    const exams = Object.keys(window.mufredat);
    container.innerHTML = exams.map(ex => `<div class="chip ${window.secilenSinav === ex ? 'active' : ''}" onclick="window.selectExam('${ex}')">${ex}</div>`).join('');
    if(fromMemory && window.secilenSinav) window.selectExam(window.secilenSinav, true);
};

window.selectExam = (ex, fromMemory = false) => {
    window.secilenSinav = ex;
    if(!fromMemory) { window.secilenGrup = ""; window.secilenDers = ""; window.secilenKonu = ""; 
        const memBadge = document.getElementById('mem-badge');
        if (memBadge) memBadge.style.display = "none"; 
    }
    
    document.querySelectorAll('#box-exams .chip').forEach(c => c.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    
    window.renderGroups(fromMemory);
};

window.renderGroups = (fromMemory = false) => {
    const container = document.getElementById('box-kpss-group');
    const area = document.getElementById('area-kpss-group');
    if (!container || !area) return;

    if(!window.secilenSinav || !window.mufredat[window.secilenSinav]) { area.style.display = 'none'; return; }
    
    const groups = Object.keys(window.mufredat[window.secilenSinav]);
    area.style.display = 'block';
    container.innerHTML = groups.map(g => `<div class="chip ${window.secilenGrup === g ? 'active' : ''}" onclick="window.selectGroup('${g}')">${g}</div>`).join('');
    
    if(fromMemory && window.secilenGrup) window.selectGroup(window.secilenGrup, true);
    else {
        const areaDers = document.getElementById('area-ders');
        if (areaDers) areaDers.style.display = 'none';
    }
};

window.selectGroup = (g, fromMemory = false) => {
    window.secilenGrup = g;
    if(!fromMemory) { window.secilenDers = ""; window.secilenKonu = ""; }
    
    document.querySelectorAll('#box-kpss-group .chip').forEach(c => c.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');

    window.renderSubjects(fromMemory);
};

window.renderSubjects = (fromMemory = false) => {
    const container = document.getElementById('box-dersler');
    const area = document.getElementById('area-ders');
    if (!container || !area) return;

    if(!window.secilenSinav || !window.secilenGrup || !window.mufredat[window.secilenSinav][window.secilenGrup]) { area.style.display = 'none'; return; }
    
    const subjects = Object.keys(window.mufredat[window.secilenSinav][window.secilenGrup]);
    area.style.display = 'block';
    container.innerHTML = subjects.map(s => `<div class="chip ${window.secilenDers === s ? 'active' : ''}" onclick="window.selectSubject('${s}')">${s}</div>`).join('');
    
    if(fromMemory && window.secilenDers) window.selectSubject(window.secilenDers, true);
    else {
        const areaKonu = document.getElementById('area-konu');
        if (areaKonu) areaKonu.style.display = 'none';
    }
};

window.selectSubject = (s, fromMemory = false) => {
    window.secilenDers = s;
    if(!fromMemory) window.secilenKonu = "";
    
    document.querySelectorAll('#box-dersler .chip').forEach(c => c.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');

    window.renderTopics(fromMemory);
};

window.renderTopics = (fromMemory = false) => {
    const container = document.getElementById('box-konular');
    const area = document.getElementById('area-konu');
    if (!container || !area) return;

    if(!window.secilenDers) { area.style.display = 'none'; return; }
    
    let topics = window.mufredat[window.secilenSinav][window.secilenGrup][window.secilenDers] || [];
    const customTopics = CLIENT_STORE.getJSON('gazi_custom_topics', {}) || {};
    if(customTopics[window.secilenDers]) topics = [...topics, ...customTopics[window.secilenDers]];

    area.style.display = 'block';
    container.innerHTML = topics.map(t => `<div class="chip ${window.secilenKonu === t ? 'active' : ''}" onclick="window.selectTopic('${t}')">${t}</div>`).join('');
};

window.selectTopic = (t) => {
    window.secilenKonu = t;
    document.querySelectorAll('#box-konular .chip').forEach(c => c.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    const customInput = document.getElementById('custom-konu-input');
    if (customInput) customInput.value = ""; 
};

document.addEventListener("DOMContentLoaded", () => {
    const photoSourceSelect = document.getElementById('student-photo-source-select');
    if (photoSourceSelect) {
        photoSourceSelect.addEventListener('change', (e) => {
            const nextValue = normalizeStudentPhotoSource(e.target.value);
            saveAddQuestionUIPrefs({ photoSource: nextValue });
            window.updateStudentPhotoAddButtonLabel();
        });
    }

    const solutionSourceSelect = document.getElementById('student-solution-source-select');
    if (solutionSourceSelect) {
        solutionSourceSelect.addEventListener('change', (e) => {
            const nextValue = normalizeStudentPhotoSource(e.target.value);
            saveAddQuestionUIPrefs({ solutionSource: nextValue });
            window.updateStudentSolutionAddButtonLabel();
        });
    }

    const saveTargetSelect = document.getElementById('student-save-target-select');
    if (saveTargetSelect) {
        saveTargetSelect.addEventListener('change', (e) => {
            saveAddQuestionUIPrefs({ saveTarget: e.target.value === 'local' ? 'local' : 'cloud' });
            window.updateStudentSaveTargetLabel();
        });
    }

    setTimeout(() => { window.initEtiketleme(); }, 500);
    window.restoreDerslerimTheme();
    updateCourseAddedNavBadge(CLIENT_STORE.getItem(DERSLERIM_COURSE_ADDED_BADGE_STORAGE_KEY, '0') === '1');
});
// 🚨 YENİ NESİL MÜFREDAT AĞACI BİTİŞ 🚨

// 🚨 TEMEL ARAYÜZ VE PWA FONKSİYONLARI 🚨
window.onload = () => { 
    window.updateRegGradeDropdown(); 
    window.renderReminderIntervalSelect();
    checkPWAPrompts();
};

function checkPWAPrompts() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isChromeIOS = navigator.userAgent.includes('CriOS') || navigator.userAgent.includes('FxiOS');
    
    if (!isStandalone) {
        if (isIOS && isChromeIOS) {
            document.getElementById('ios-chrome-prompt').style.display = 'flex';
        } else if (isIOS && !isChromeIOS) {
            if(!localStorage.getItem('gazi_ios_prompt')) { 
                document.getElementById('ios-pwa-prompt').style.display = 'block'; 
            }
        } else if (isAndroid) {
            if(!localStorage.getItem('gazi_android_prompt')) { 
                document.getElementById('android-pwa-prompt').style.display = 'block'; 
            }
        }
    }
}

window.closePWAPrompt = (os) => {
    if(os === 'ios') { 
        document.getElementById('ios-pwa-prompt').style.display = 'none'; 
        localStorage.setItem('gazi_ios_prompt', 'true'); 
    } 
    else { 
        document.getElementById('android-pwa-prompt').style.display = 'none'; 
        localStorage.setItem('gazi_android_prompt', 'true'); 
    }
};

window.copyLinkAndAlert = () => {
    navigator.clipboard.writeText(getShareableAppLink(window.location)).then(() => {
        alert("✅ Link kopyalandı! Şimdi iPhone'unuzdan Safari uygulamasını açıp linki yapıştırın.");
    });
};

window.nextSlide = (slideNum) => {
    document.querySelectorAll('.intro-slide').forEach(s => s.classList.remove('active'));
    document.getElementById('slide-' + slideNum).classList.add('active');
};

window.finishIntro = () => {
    document.getElementById('intro-overlay').style.opacity = '0';
    setTimeout(() => { 
        document.getElementById('intro-overlay').style.display = 'none'; 
        localStorage.setItem('gazi_intro_seen', 'true'); 
        const onboardingDone = CLIENT_STORE.getItem('gazi_onboarding_done', '');
        if (onboardingDone) window.openSettingsPanel();
        else window.openFirstRunOnboarding();
    }, 500);
};

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { 
    e.preventDefault(); 
    deferredPrompt = e; 
    document.getElementById('pwa-install-btn').style.display = 'block'; 
});

window.installPWA = () => { 
    if(deferredPrompt) { 
        deferredPrompt.prompt(); 
        deferredPrompt.userChoice.then((choiceResult) => { 
            deferredPrompt = null; 
            document.getElementById('pwa-install-btn').style.display = 'none'; 
        }); 
    } 
};

if ('serviceWorker' in navigator && shouldRegisterServiceWorker(window.location.protocol)) {
    navigator.serviceWorker.register(buildRelativeResourceUrl('sw.js')).then(() => console.log("PWA Aktif."));
}

try {
    onMessage(messaging, (payload) => {
        const title = String(payload?.notification?.title || "Yeni bildirim");
        const body = String(payload?.notification?.body || "");
        window.showSoftFeedback(body ? `🔔 ${title} — ${body}` : `🔔 ${title}`);
    });
} catch (error) {
    console.warn("Foreground bildirim dinleyicisi başlatılamadı:", error);
}

const ROLE_STUDENT = 'student';
const ROLE_TEACHER = 'teacher';
const NAV_ITEM_MAP = {
    'screen-main': 'nav-ev',
    'screen-settings': null, // set dynamically by mode
    'screen-secure-logout': null, // follows settings mode dynamically
    'screen-gelisim': 'nav-gelisim',
    'screen-friends': 'nav-arkadaslar',
    'screen-stats': 'nav-gelisim',
    'screen-list': 'nav-gelisim',
    'screen-library-lessons': 'nav-derslerim',
    'screen-course-topics': 'nav-derslerim',
    'screen-reminder-options': 'nav-profil',
    'screen-teacher': 'nav-ogretmen',
};
let activeNavRole = localStorage.getItem('gazi_nav_role') === ROLE_TEACHER ? ROLE_TEACHER : ROLE_STUDENT;

window.applyRoleBasedBottomNav = (role = ROLE_STUDENT) => {
    activeNavRole = role === ROLE_TEACHER ? ROLE_TEACHER : ROLE_STUDENT;
    localStorage.setItem('gazi_nav_role', activeNavRole);
    document.querySelectorAll('.student-only').forEach((el) => {
        el.style.display = activeNavRole === ROLE_STUDENT ? 'flex' : 'none';
    });
    document.querySelectorAll('.teacher-only').forEach((el) => {
        el.style.display = activeNavRole === ROLE_TEACHER ? 'flex' : 'none';
    });
};

window.showScreen = (id) => { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    document.getElementById(id).classList.add('active');
    const nav = document.getElementById('bottom-nav');
    if (id !== 'screen-auth') {
        nav.style.display = 'flex';
        document.body.classList.add('nav-visible');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNavId = NAV_ITEM_MAP[id];
        if (activeNavId) document.getElementById(activeNavId)?.classList.add('active');
    } else {
        nav.style.display = 'none';
        document.body.classList.remove('nav-visible');
    }
};

window.openProfilePanel = () => {
    const settingsEl = document.getElementById('screen-settings');
    const titleEl = document.getElementById('settings-screen-title');
    applySettingsMode(settingsEl, titleEl, SETTINGS_MODES.PROFILE);
    NAV_ITEM_MAP['screen-settings'] = 'nav-profil';
    window.openSettingsPanel();
};

window.openDerslerimPanel = () => {
    if (activeNavRole !== ROLE_STUDENT) return;
    updateCourseAddedNavBadge(false);
    const settingsEl = document.getElementById('screen-settings');
    const titleEl = document.getElementById('settings-screen-title');
    applySettingsMode(settingsEl, titleEl, SETTINGS_MODES.DERSLERIM);
    NAV_ITEM_MAP['screen-settings'] = 'nav-derslerim';
    window.openSettingsPanel();
};

window.openSecureLogoutScreen = () => {
    NAV_ITEM_MAP['screen-secure-logout'] = NAV_ITEM_MAP['screen-settings'] || 'nav-profil';
    window.showScreen('screen-secure-logout');
};

window.openTeacherPanel = () => {
    if (activeNavRole !== ROLE_TEACHER) return;
    window.showScreen('screen-teacher');
};

window.openGelisimPanel = () => {
    window.updateLocalListCounts();
    window.showScreen('screen-gelisim');
};

window.openFriendsPanel = () => {
    window.showScreen('screen-friends');
};

window.toggleSection = (id) => { 
    const el = document.getElementById(id); 
    if (el) el.classList.toggle('hidden-panel'); 
};

window.showSoftFeedback = (message) => {
    const toast = document.getElementById('notification-toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) {
        if (message) alert(message);
        return;
    }
    msgEl.textContent = String(message || DEFAULT_ERROR_MESSAGE);
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
};

window.toggleDropdown = (id) => document.getElementById(id).classList.toggle('show');
window.myClassCode = localStorage.getItem("gazi_class_code") || "";
const NOTIFICATION_SUBSCRIPTION_CLASS_KEY = "gazi_notification_class_code";
const NOTIFICATION_ENABLED_KEY = "gazi_notifications_enabled";
const NOTIFICATION_PROMPT_SEEN_KEY = "gazi_notification_prompt_seen";
const NOTIFICATION_TOKEN_KEY = "gazi_notification_token";
const NOTIFICATION_SUBSCRIPTION_STUDENT_KEY = "gazi_notification_student_name";
let selectedRole = 'student';

function areNotificationsEnabled() {
    return CLIENT_STORE.getItem(NOTIFICATION_ENABLED_KEY, '1') !== '0';
}

function setNotificationsEnabled(enabled) {
    CLIENT_STORE.setItem(NOTIFICATION_ENABLED_KEY, enabled ? '1' : '0');
}

function getPreferredNotificationClassCode() {
    return String(window.myClassCode || localStorage.getItem("gazi_class_code") || "").trim().toUpperCase();
}

function getCurrentStudentNotificationName() {
    const role = String(APP_STATE.currentUser?.role || "").trim();
    if (role !== "student") return "";
    const safeName = String(APP_STATE.currentUser?.name || "").trim();
    if (safeName) return safeName;
    const displayName = String(document.getElementById('display-user')?.innerText || "").replace("Hoş Geldin, ", "").trim();
    return displayName;
}

function syncStudentPushSubscription(token) {
    const safeToken = String(token || "").trim();
    const studentName = getCurrentStudentNotificationName();
    if (!socket || !safeToken || !studentName) return;
    const previousStudentName = String(localStorage.getItem(NOTIFICATION_SUBSCRIPTION_STUDENT_KEY) || "").trim();
    socket.emit("setStudentNotificationToken", { token: safeToken, studentName, previousStudentName });
    localStorage.setItem(NOTIFICATION_SUBSCRIPTION_STUDENT_KEY, studentName);
}

function clearStudentPushSubscription() {
    if (!socket) return;
    const token = String(localStorage.getItem(NOTIFICATION_TOKEN_KEY) || "").trim();
    const studentName = String(localStorage.getItem(NOTIFICATION_SUBSCRIPTION_STUDENT_KEY) || getCurrentStudentNotificationName()).trim();
    if (!token || !studentName) return;
    socket.emit("clearStudentNotificationToken", { token, studentName });
    localStorage.removeItem(NOTIFICATION_SUBSCRIPTION_STUDENT_KEY);
}

function updateNotificationToggleUI() {
    const toggle = document.getElementById('profile-notification-toggle');
    const status = document.getElementById('profile-notification-status');
    const enabled = areNotificationsEnabled();
    if (toggle) toggle.checked = enabled;
    if (!status) return;
    if (!enabled) {
        status.textContent = "Bildirimler kapalı.";
        return;
    }
    if (typeof Notification === "undefined") {
        status.textContent = "Bu cihazda bildirim desteği yok.";
        return;
    }
    if (Notification.permission === "granted") {
        status.textContent = "Bildirimler açık.";
        return;
    }
    if (Notification.permission === "denied") {
        status.textContent = "Tarayıcı bildirimi engelliyor. Tarayıcı ayarından açabilirsiniz.";
        return;
    }
    status.textContent = "Bildirimler açık.";
}

async function getCurrentFcmToken() {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return "";
    if (!firebaseVapidKey) return "";
    const serviceWorkerRegistration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
        vapidKey: firebaseVapidKey,
        serviceWorkerRegistration
    });
    if (token) localStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
    return String(token || "");
}

async function clearClassPushSubscription(classCodeRaw) {
    const classCode = String(classCodeRaw || "").trim().toUpperCase();
    if (!classCode || !socket) return;
    const token = String(localStorage.getItem(NOTIFICATION_TOKEN_KEY) || "").trim();
    if (!token) return;
    socket.emit("clearClassNotificationToken", { token, classCode });
}

async function subscribeToClassPushNotifications(classCodeRaw, { forcePrompt = false } = {}) {
    const classCode = String(classCodeRaw || "").trim().toUpperCase();
    if (!socket) return;
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return;
    if (!firebaseVapidKey || !areNotificationsEnabled()) return;
    try {
        let permission = Notification.permission;
        if (permission === "default" && forcePrompt) {
            permission = await Notification.requestPermission();
        }
        if (permission !== "granted") return;
        const token = await getCurrentFcmToken();
        if (!token) return;
        syncStudentPushSubscription(token);
        if (!classCode) return;
        const previousClassCode = localStorage.getItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY) || "";
        socket.emit("setClassNotificationToken", {
            token,
            classCode,
            previousClassCode
        });
        localStorage.setItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY, classCode);
    } catch (error) {
        console.warn("Bildirim aboneliği kurulamadı:", error);
    } finally {
        updateNotificationToggleUI();
    }
}

async function promptNotificationsOnFirstLaunch() {
    if (CLIENT_STORE.getItem(NOTIFICATION_PROMPT_SEEN_KEY, '')) return;
    CLIENT_STORE.setItem(NOTIFICATION_PROMPT_SEEN_KEY, '1');
    if (!areNotificationsEnabled()) return;
    if (typeof Notification === "undefined") return;
    try {
        if (Notification.permission === "default") await Notification.requestPermission();
        if (Notification.permission === "granted") {
            await subscribeToClassPushNotifications(getPreferredNotificationClassCode(), { forcePrompt: false });
        }
    } catch (error) {
        console.warn("İlk açılış bildirim izni alınamadı:", error);
    } finally {
        updateNotificationToggleUI();
    }
}

window.handleNotificationToggleChange = async () => {
    const toggle = document.getElementById('profile-notification-toggle');
    const status = document.getElementById('profile-notification-status');
    const isEnabled = !!toggle?.checked;
    setNotificationsEnabled(isEnabled);
    if (isEnabled) {
        if (status) status.textContent = "Bildirimler açık.";
        await subscribeToClassPushNotifications(getPreferredNotificationClassCode(), { forcePrompt: true });
    } else {
        await clearClassPushSubscription(localStorage.getItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY) || getPreferredNotificationClassCode());
        clearStudentPushSubscription();
        localStorage.removeItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY);
    }
    updateNotificationToggleUI();
};

window.setMainRole = (role) => {
    selectedRole = role;
    const btnS = document.getElementById('btn-main-student'); 
    const btnT = document.getElementById('btn-main-teacher');
    const tInfo = document.getElementById('teacher-info-text'); 
    const subtitle = document.getElementById('role-subtitle');
    const studentOpts = document.getElementById('reg-student-options'); 
    const teacherOpts = document.getElementById('reg-teacher-options');
    
    if(role === 'student') {
        btnS.classList.add('active'); 
        btnT.classList.remove('active');
        if(subtitle) subtitle.innerText = '(Öğrenci)';
        if(tInfo) tInfo.style.display = 'none';
        if(studentOpts) studentOpts.style.display = 'block';
        if(teacherOpts) teacherOpts.style.display = 'none';
    } else {
        btnT.classList.add('active'); 
        btnS.classList.remove('active');
        if(subtitle) subtitle.innerText = '(Öğretmen)';
        if(tInfo) tInfo.style.display = 'block';
        if(studentOpts) studentOpts.style.display = 'none';
        if(teacherOpts) teacherOpts.style.display = 'block';
    }
};

window.switchAuth = (t) => { 
    document.getElementById('login-box').style.display = t === 'login' ? 'block' : 'none'; 
    document.getElementById('reg-box').style.display = t === 'register' ? 'block' : 'none'; 
};

window.updateRegGradeDropdown = () => {
    const type = document.getElementById('reg-exam-type').value; 
    const area = document.getElementById('reg-grade-area'); 
    const select = document.getElementById('reg-grade'); 
    select.innerHTML = '';

    let grades = [];
    if(type === 'lise_okul') grades = ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Mezun']; 
    else if (type === 'ortaokul') grades = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf (LGS)'];

    if(grades.length > 0) { 
        area.style.display = 'block'; 
        grades.forEach(val => select.innerHTML += `<option value="${val}">${val}</option>`); 
    } else { 
        area.style.display = 'none'; 
    }
};

window.updateGradeDropdown = () => {
    const type = document.getElementById('profile-exam-type').value; 
    const area = document.getElementById('grade-selection-area'); 
    const boxContainer = document.getElementById('grade-boxes'); 
    boxContainer.innerHTML = ''; 
    document.getElementById('profile-grade').value = '';

    let grades = [];
    if(type === 'lise_okul') grades = ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Mezun']; 
    else if (type === 'ortaokul') grades = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf (LGS)'];

    if(grades.length > 0) { 
        area.style.display = 'block'; 
        grades.forEach(val => { 
            const btn = document.createElement('div'); 
            btn.className = 'grade-btn'; 
            btn.innerText = val; 
            btn.onclick = () => { 
                document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected')); 
                btn.classList.add('selected'); 
                document.getElementById('profile-grade').value = val; 
            }; 
            boxContainer.appendChild(btn); 
        }); 
    } else { 
        area.style.display = 'none'; 
    }
    window.renderProfileSubjectsByExam();
};

window.openSettingsPanel = () => {
    const userNameText = document.getElementById('display-user').innerText;
    if(userNameText.includes("Misafir")) { 
        document.getElementById('password-update-area').style.display = 'none'; 
    } else { 
        document.getElementById('password-update-area').style.display = 'block'; 
    }
    
    const savedExamType = CLIENT_STORE.getItem('gazi_exam_type', DEFAULT_EXAM_TYPE);
    ensureProfileExamTypeOptions(savedExamType);
    document.getElementById('profile-exam-type').value = savedExamType; 
    window.updateGradeDropdown();
    
    const savedGrade = CLIENT_STORE.getItem('gazi_grade', '');
    if(savedGrade) { 
        document.getElementById('profile-grade').value = savedGrade; 
        setTimeout(() => { 
            document.querySelectorAll('.grade-btn').forEach(btn => { 
                if(btn.innerText === savedGrade) btn.classList.add('selected'); 
            }); 
        }, 100); 
    }

    const savedSubjects = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    const searchInput = document.getElementById('derslerim-course-search');
    if (searchInput) {
        searchInput.value = CLIENT_STORE.getItem(DERSLERIM_COURSE_SEARCH_STORAGE_KEY, '');
    }
    window.renderProfileSubjectsByExam(savedSubjects);
    window.restoreDerslerimTheme();
    window.renderReminderIntervalSelect();
    updateNotificationToggleUI();
    showScreen('screen-settings');
};

window.saveProfileSettings = () => {
    const user = auth.currentUser; 
    const newName = document.getElementById('profile-new-name').value.trim(); 
    const oldPass = document.getElementById('profile-old-pass').value.trim(); 
    const newPass = document.getElementById('profile-new-pass').value.trim();
    
    if(user && newName) { 
        const role = (user.displayName || "").split('|')[1] || 'student'; 
        updateProfile(user, { displayName: newName + "|" + role }); 
        document.getElementById('display-user').innerText = "Hoş Geldin, " + newName; 
    }

    if(user && newPass && !user.isAnonymous) {
        if(!oldPass) return alert("Şifrenizi güncellemek için lütfen önce Eski Şifrenizi yazınız!");
        const cred = EmailAuthProvider.credential(user.email, oldPass);
        reauthenticateWithCredential(user, cred).then(() => { 
            updatePassword(user, newPass).then(() => { 
                alert("Şifreniz başarıyla güncellendi!"); 
                document.getElementById('profile-old-pass').value = ''; 
                document.getElementById('profile-new-pass').value = ''; 
            }); 
        }).catch(e => { alert("Eski şifreniz hatalı veya geçersiz!"); return; });
    }

    CLIENT_STORE.setItem('gazi_exam_type', document.getElementById('profile-exam-type').value); 
    CLIENT_STORE.setItem('gazi_grade', document.getElementById('profile-grade').value);
    
    const subjectsData = collectSelectedSubjectsFromUI();
    syncSelectedSubjectsToStorage(subjectsData);
    
    alert("✅ Çalışma Masası Ayarlarınız Kaydedildi!");
    showScreen('screen-main');
};

window.handleLogin = async () => { 
    try { 
        await signInWithEmailAndPassword(auth, document.getElementById('login-email').value.trim(), document.getElementById('login-pass').value); 
    } catch(e) { 
        alert("❌ Giriş Başarısız: E-posta veya şifre hatalı."); 
    } 
};

window.handleRegister = async () => {
    const e = document.getElementById('reg-email').value.trim(); 
    const u = document.getElementById('reg-username').value; 
    const p1 = document.getElementById('reg-pass').value; 
    const p2 = document.getElementById('reg-pass-confirm').value;
    
    if(p1 !== p2) return alert("❌ Şifreler uymuyor!");
    
    const regExamType = document.getElementById('reg-exam-type').value; 
    const regGrade = document.getElementById('reg-grade').value;
    
    try { 
        const res = await createUserWithEmailAndPassword(auth, e, p1); 
        await updateProfile(res.user, { displayName: u + "|" + selectedRole }); 
        await sendEmailVerification(res.user);
        
        if(selectedRole === 'student') { 
            localStorage.setItem('gazi_exam_type', regExamType); 
            if(regGrade) localStorage.setItem('gazi_grade', regGrade); 
        } else if (selectedRole === 'teacher_pending') { 
            const selectedExams = Array.from(document.querySelectorAll('.t-exam-cb:checked')).map(cb => cb.value); 
            localStorage.setItem('gazi_teacher_exams', JSON.stringify(selectedExams)); 
        }

        alert("✅ Kayıt başarılı! Lütfen doğrulama maili için Gelen Kutunuzu ve SPAM (Gereksiz) klasörünü kontrol etmeyi unutmayın!");
        await signOut(auth); 
        location.reload(); 
    } catch(e) { 
        alert("❌ Kayıt Hatası: İşlem tamamlanamadı."); 
    }
};

window.handleGuestLogin = async () => { 
    try { 
        const guestName = "Misafir-" + Math.floor(1000 + Math.random() * 9000); 
        const res = await signInAnonymously(auth); 
        await updateProfile(res.user, { displayName: guestName + "|student" }); 
        location.reload(); 
    } catch(e) { 
        alert("Bağlantı Hatası"); 
    } 
};

window.handleResetPassword = async () => { 
    const email = document.getElementById('login-email').value.trim(); 
    if(!email) return alert("❌ Lütfen önce e-posta adresinizi yazın."); 
    try { 
        await sendPasswordResetEmail(auth, email); 
        alert("📩 Şifre sıfırlama bağlantısı gönderildi! Lütfen SPAM (Gereksiz) kutunuzu da kontrol edin."); 
    } catch(e) { 
        alert(e.message); 
    } 
};

window.handleGoogleLogin = async () => { 
    const provider = new GoogleAuthProvider();
    try {
        const cred = await signInWithPopup(auth, provider);
        const signedInUser = cred?.user || auth.currentUser;
        if (signedInUser && (!signedInUser.displayName || !signedInUser.displayName.includes("|"))) {
            const fallbackName = (signedInUser.displayName || signedInUser.email?.split('@')[0] || "Kullanıcı").trim();
            await updateProfile(signedInUser, { displayName: `${fallbackName}|student` });
        }
        if (!(signedInUser?.displayName || "").includes("|teacher_pending")) {
            window.showScreen('screen-main');
        }
    } catch(e) {
        const fallbackToRedirect = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e?.code);
        if (fallbackToRedirect) {
            await signInWithRedirect(auth, provider);
            return;
        }
        alert("❌ Google girişi başarısız: " + (e?.message || "Bilinmeyen hata"));
    } 
};

getRedirectResult(auth)
    .then(async (result) => {
        const redirectUser = result?.user;
        if (redirectUser && (!redirectUser.displayName || !redirectUser.displayName.includes("|"))) {
            const fallbackName = (redirectUser.displayName || redirectUser.email?.split('@')[0] || "Kullanıcı").trim();
            await updateProfile(redirectUser, { displayName: `${fallbackName}|student` });
        }
        if (redirectUser && !(redirectUser.displayName || "").includes("|teacher_pending")) {
            window.showScreen('screen-main');
        }
    })
    .catch(e => {
        if (!e) return;
        const ignoredCodes = ['auth/no-current-user', 'auth/cancelled-popup-request', 'auth/popup-closed-by-user'];
        if (!ignoredCodes.includes(e.code)) {
            alert("❌ Google girişi başarısız: " + e.message);
        }
    });

async function syncSocketUserContext(user, role, name) {
    if (!socket) return;
    try {
        const idToken = user && !user.isAnonymous ? await user.getIdToken() : null;
        socket.emit("setUserContext", {
            idToken,
            fallbackRole: role || "student",
            fallbackName: name || "Kullanıcı"
        });
    } catch (e) {
        socket.emit("setUserContext", {
            idToken: null,
            fallbackRole: role || "student",
            fallbackName: name || "Kullanıcı"
        });
    }
}

onAuthStateChanged(auth, user => {
    const adminBtn = document.getElementById('admin-report-btn'); 
    const adminApproveBtn = document.getElementById('admin-approve-btn'); 
    const instPanel = document.getElementById('instructor-panel'); 
    const studentArea = document.getElementById('student-class-area');
    const studentLibPanel = document.getElementById('student-library-panel');
    const savedLibraryPanel = document.getElementById('saved-library-panel');
    const teacherMainTools = document.getElementById('teacher-main-tools');

    if (user) { 
        let nameFromAuth = user.displayName;
        if (!nameFromAuth || nameFromAuth.split('|')[0].trim() === "") { 
            const fallbackName = user.email ? user.email.split('@')[0] : (user.isAnonymous ? "Misafir-" + user.uid.substring(0,4) : "Gazi Adayı"); 
            nameFromAuth = fallbackName + "|student"; 
        }
        
        const nameParts = nameFromAuth.split('|'); 
        const realName = nameParts[0]; 
        const roleFromAuth = nameParts[1] || "student";
        const normalizedEmail = (user.email || "").toLowerCase();
        const isAdmin = (normalizedEmail === ROOT_ADMIN_EMAIL);
        const role = isAdmin ? "admin" : roleFromAuth;
        APP_STATE.currentUser = { name: realName, role, email: user.email || "" };
        
        document.getElementById('display-user').innerText = "Hoş Geldin, " + realName; 
        document.getElementById('profile-new-name').value = realName;
        
        const isTeacher = (role === "teacher" || isAdmin); 
        const isPending = (roleFromAuth === "teacher_pending");

        if (isPending && !isAdmin) {
            alert("⏳ Hesabınız yönetici onayında. Onay sonrası giriş yapabilirsiniz.");
            signOut(auth).finally(() => window.showScreen('screen-auth'));
            return;
        }
        
        if (instPanel) instPanel.style.display = isTeacher ? "block" : "none";
        if (studentArea) studentArea.style.display = isTeacher ? "none" : "block"; 
        if (studentLibPanel) studentLibPanel.style.display = isTeacher ? "none" : "block";
        if (savedLibraryPanel) savedLibraryPanel.style.display = isTeacher ? "none" : "block";
        if (teacherMainTools) teacherMainTools.style.display = isTeacher ? "block" : "none";
        if (adminBtn) adminBtn.style.display = isAdmin ? "block" : "none";
        if (adminApproveBtn) adminApproveBtn.style.display = isAdmin ? "block" : "none";
        window.applyRoleBasedBottomNav(isTeacher ? ROLE_TEACHER : ROLE_STUDENT);

        const settingsEl = document.getElementById('screen-settings');
        const titleEl = document.getElementById('settings-screen-title');
        const defaultMode = getDefaultSettingsModeByRole(isTeacher);
        if (defaultMode === SETTINGS_MODES.PROFILE) {
            applySettingsMode(settingsEl, titleEl, SETTINGS_MODES.PROFILE);
            NAV_ITEM_MAP['screen-settings'] = 'nav-profil';
        } else {
            applySettingsMode(settingsEl, titleEl, SETTINGS_MODES.DERSLERIM);
            NAV_ITEM_MAP['screen-settings'] = 'nav-derslerim';
        }

        const stdClassCode = localStorage.getItem("gazi_class_code");
        if(stdClassCode && !isTeacher) { 
            document.getElementById('class-code-input').value = stdClassCode; 
            document.getElementById('btn-class-questions').style.display = 'block';
            subscribeToClassPushNotifications(stdClassCode);
        }

        if(typeof socket !== 'undefined') {
            syncSocketUserContext(user, role, realName);
            if (isTeacher) socket.emit("getTeacherClass", user.email);
            socket.emit("getFilters", window.myClassCode || "");
            if (!isTeacher) socket.emit("checkNotebookReviews", realName);
            if (isAdmin) socket.emit("getUserCurriculum");
        }

        if (isTeacher) {
            try {
                const cachedClasses = JSON.parse(localStorage.getItem('gazi_teacher_classes'));
                if (cachedClasses && cachedClasses.length > 0) {
                    renderTeacherClasses(cachedClasses);
                }
            } catch(e) {
                localStorage.removeItem('gazi_teacher_classes');
            }
        }

        const savedSubjects = JSON.parse(localStorage.getItem('gazi_subjects_v2')) || [];
        const dersSelect = document.getElementById('std-q-ders');
        if(dersSelect) { 
            dersSelect.innerHTML = savedSubjects.length > 0 
                ? savedSubjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('') 
                : `<option value="${DEFAULT_CUSTOM_GROUP_NAME}">${DEFAULT_CUSTOM_GROUP_NAME}</option>`; 
        }

        const onboardingDone = CLIENT_STORE.getItem('gazi_onboarding_done', '');
        if(!isTeacher && !onboardingDone) {
            const hasSeenIntro = CLIENT_STORE.getItem('gazi_intro_seen', '');
            if(!hasSeenIntro) { 
                document.getElementById('intro-overlay').style.display = 'flex'; 
            } else { 
                window.openFirstRunOnboarding();
            }
        } else { 
            window.showScreen('screen-main'); 
        }

        if (!isTeacher) {
            promptNotificationsOnFirstLaunch();
        }

        if (!isTeacher) {
            window.updateLocalListCounts();
            window.renderSavedLibraryCoursesPanel();
            window.renderStudentSavedTeacherMaterials();
        }

    } else { 
        APP_STATE.currentUser = { name: "", role: "guest", email: "" };
        window.renderSavedLibraryCoursesPanel();
        window.showScreen('screen-auth'); 
    }
});

window.logout = () => signOut(auth).then(() => location.reload());

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeImageSrc(src) {
    if (typeof src !== 'string') return '';
    if (/^data:image\/(jpeg|png|gif|webp);base64,/.test(src)) return src;
    if (/^https?:\/\//.test(src)) return src;
    return '';
}

function getImageExtensionFromDataUrl(dataUrl) {
    const match = /^data:image\/(jpeg|png|gif|webp);base64,/.exec(dataUrl || '');
    if (!match) return 'jpg';
    if (match[1] === 'jpeg') return 'jpg';
    return match[1];
}

function estimateDataUrlBytes(dataUrl) {
    if (typeof dataUrl !== 'string') return 0;
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex < 0) return 0;
    const base64 = dataUrl.slice(commaIndex + 1);
    const paddingMatch = base64.match(/=*$/);
    const padding = paddingMatch ? paddingMatch[0].length : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function encodeCanvasToDataUrl(canvas, mimeType, quality) {
    try {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        return dataUrl.startsWith(`data:${mimeType}`) ? dataUrl : null;
    } catch (e) {
        return null;
    }
}

async function optimizeImageFileForUpload(file, options = {}) {
    if (!file) return null;
    const config = { ...IMAGE_OPTIMIZATION_CONFIG, ...(options || {}) };
    const originalDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = originalDataUrl;
    });

    const baseWidth = Math.max(1, Math.round(Math.min(image.width, config.maxWidth)));
    let width = baseWidth;
    let height = Math.max(1, Math.round((image.height * width) / Math.max(1, image.width)));
    let quality = config.initialQuality;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return originalDataUrl;
    const redraw = () => {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);
    };
    redraw();

    const mimeCandidates = ['image/webp', 'image/jpeg'];
    let bestDataUrl = null;
    let bestBytes = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
        let currentDataUrl = null;
        for (const mimeType of mimeCandidates) {
            const encoded = encodeCanvasToDataUrl(canvas, mimeType, quality);
            if (encoded) {
                currentDataUrl = encoded;
                break;
            }
        }
        if (!currentDataUrl) break;

        const bytes = estimateDataUrlBytes(currentDataUrl);
        if (bytes > 0 && bytes < bestBytes) {
            bestBytes = bytes;
            bestDataUrl = currentDataUrl;
        }
        if (bytes > 0 && bytes <= config.targetBytes) break;

        if (quality > config.minQuality + FLOAT_COMPARISON_EPSILON) {
            quality = Math.max(config.minQuality, quality - config.qualityStep);
            continue;
        }

        if (width <= config.minWidth) break;
        width = Math.max(config.minWidth, Math.round(width * config.scaleStep));
        height = Math.max(1, Math.round((image.height * width) / Math.max(1, image.width)));
        quality = config.initialQuality;
        redraw();
    }

    return bestDataUrl || originalDataUrl;
}

function generateUniqueId(prefix = '') {
    const baseId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 12)}`;
    return prefix ? `${prefix}_${baseId}` : baseId;
}

async function uploadImageDataUrlIfNeeded(dataUrl, folder) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    if (/^https?:\/\//.test(dataUrl)) return dataUrl;
    if (!/^data:image\/(jpeg|png|gif|webp);base64,/.test(dataUrl)) return null;
    const ext = getImageExtensionFromDataUrl(dataUrl);
    const uniqueId = generateUniqueId();
    const fileName = `${uniqueId}.${ext}`;
    const fileRef = storageRef(storage, `${folder}/${fileName}`);
    await uploadString(fileRef, dataUrl, 'data_url');
    return getDownloadURL(fileRef);
}

let socket; 
try { socket = io(); } catch(e) { console.warn("Socket sunucusu yok."); }

let currentMode = "room", myRoom = "", currentQIndex = 0, qInt = null, totalInt = null, trialQuestions = [], trialAnswers = [];
let roomSolvedIndices = new Set(), roomTotalQuestions = 0;
let currentQObject = null, currentListType = "", selectedTimerMode = "question";
let uploadedImageBase64 = null; let uploadedSolutionBase64 = null; 
let stdUploadedImageBase64 = null; let stdSolutionBase64 = null; let stdSourceImageBase64 = null;
window.tempStdQuestions = []; window.originalStdQuestions = [];

window.setTimerMode = (mode) => { 
    selectedTimerMode = mode; 
    document.getElementById('btn-mode-sec').className = mode === 'question' ? 'green' : 'outline'; 
    document.getElementById('btn-mode-min').className = mode === 'general' ? 'green' : 'outline'; 
    document.getElementById('room-q-time').placeholder = mode === 'question' ? 'Örn: 45 (Saniye)' : 'Örn: 15 (Dakika)'; 
};

window.updateFilterText = (type) => {
    const checkboxes = document.querySelectorAll(`input[name="${type}-secim"]`);
    if (window.event && window.event.target && window.event.target.type === 'checkbox') {
        if (window.event.target.value === "HEPSI" && window.event.target.checked) { 
            checkboxes.forEach(cb => { if(cb.value !== "HEPSI") cb.checked = false; }); 
        } 
        else if (window.event.target.value !== "HEPSI" && window.event.target.checked) { 
            checkboxes.forEach(cb => { if(cb.value === "HEPSI") cb.checked = false; }); 
        }
    }
    const checkedBoxes = document.querySelectorAll(`input[name="${type}-secim"]:checked`); 
    const trigger = document.getElementById(`${type}-trigger`); 
    if (!trigger) return;

    let count = checkedBoxes.length; 
    const hasHepsi = Array.from(checkedBoxes).some(cb => cb.value === "HEPSI");
    if (count === 0) trigger.innerText = "Seçim Yapılmadı ▼"; 
    else if (hasHepsi) trigger.innerText = "Tümü Seçili ▼"; 
    else trigger.innerText = `${count} Adet Seçildi ▼`;
};

if(socket) {
    socket.on('updateFilters', data => {
        const dersContent = document.getElementById('ders-content');
        if (dersContent && data.dersler) { 
            dersContent.innerHTML = `<div class="checkbox-item"><input type="checkbox" name="ders-secim" value="HEPSI" checked onchange="updateFilterText('ders')"><label>TÜMÜ</label></div>` + 
            data.dersler.map(x => `<div class="checkbox-item"><input type="checkbox" name="ders-secim" value="${escapeHtml(x)}" onchange="updateFilterText('ders')"><label>${escapeHtml(x)}</label></div>`).join(''); 
            updateFilterText('ders'); 
        }
        const denemeContent = document.getElementById('deneme-content');
        if (denemeContent && data.denemeler) { 
            const denemeKeys = Object.keys(data.denemeler); 
            denemeContent.innerHTML = `<div class="checkbox-item"><input type="checkbox" name="deneme-secim" value="HEPSI" checked onchange="updateFilterText('deneme')"><label>TÜMÜ</label></div>` + 
            denemeKeys.map(x => `<div class="checkbox-item"><input type="checkbox" name="deneme-secim" value="${escapeHtml(x)}" onchange="updateFilterText('deneme')"><label>${escapeHtml(x)}</label></div>`).join(''); 
            updateFilterText('deneme'); 
        }
    });
    socket.on("errorMsg", (msg) => {
        const safeMsg = typeof msg === "string" && msg.trim() ? msg : DEFAULT_ERROR_MESSAGE;
        const role = String(APP_STATE.currentUser?.role || '').trim();
        if (safeMsg.includes("öğretmen yetkisi gerekir") && (role === "teacher" || role === "admin")) {
            window.showSoftFeedback(`⚠️ ${safeMsg}`);
            return;
        }
        alert(`⚠️ ${safeMsg}`);
    });
    socket.on("userCurriculumData", (payload) => {
        const remote = normalizeCurriculumData(payload);
        if (Object.keys(remote).length === 0) return;
        window.userCurriculum = remote;
        persistUserCurriculum();
        if (document.getElementById('library-modal-overlay')?.classList.contains('open')) {
            window.renderLibraryModalTree();
        }
    });
}

window.fetchMyStats = () => { 
    if(!socket) return alert("Sunucuya bağlanılamadı!"); 
    const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    socket.emit("getMyStats", name); 
};

if(socket) {
    socket.on("myStatsData", (history) => {
        let totalExams = history.length; let tCorrect = 0, tWrong = 0, tBlank = 0, tScore = 0;
        history.forEach(r => { 
            tCorrect += r.correct || 0; 
            tWrong += r.wrong || 0; 
            tBlank += r.blank || 0; 
            tScore += r.score || 0; 
        });
        const totalQs = tCorrect + tWrong + tBlank; 
        const successRate = totalQs > 0 ? Math.round((tCorrect / totalQs) * 100) : 0;
        
        document.getElementById('stats-summary').innerHTML = `
            <div style="background:#27ae60; padding:15px; border-radius:10px;">
                <div style="font-size:2rem; font-weight:bold;">%${successRate}</div>
                <div style="font-size:0.8rem;">Başarı Oranı</div>
            </div>
            <div style="background:#2980b9; padding:15px; border-radius:10px;">
                <div style="font-size:2rem; font-weight:bold;">${totalExams}</div>
                <div style="font-size:0.8rem;">Çözülen Deneme</div>
            </div>
            <div style="background:#e67e22; padding:10px; border-radius:10px; grid-column: span 2;">
                <div style="font-size:1.1rem; font-weight:bold;">Toplam: ${tCorrect} Doğru | ${tWrong} Yanlış</div>
            </div>`;
        
        const histDiv = document.getElementById('stats-history');
        if(history.length === 0) { 
            histDiv.innerHTML = "<p>Henüz çözülmüş bir deneme yok.</p>"; 
        } else { 
            histDiv.innerHTML = history.slice(0,10).map(r => `
                <div class="list-item" style="border-left: 5px solid #2980b9;">
                    <span style="float:right; color:#666; font-size:0.8rem;">${escapeHtml(r.date)}</span>
                    <b style="color:#1e3c72;">Puan: ${escapeHtml(r.score)}</b> <br>
                    <small style="color:#27ae60; font-weight:bold;">Doğru: ${escapeHtml(r.correct)}</small> | 
                    <small style="color:#c0392b; font-weight:bold;">Yanlış: ${escapeHtml(r.wrong)}</small>
                </div>`).join(''); 
        }
        showScreen('screen-stats');
    });
}

window.processImageUpload = async (e, type = 'question') => {
    const file = e.target.files[0]; 
    if(!file) return; 
    
    const previewId = type === 'question' ? 'img-preview' : 'img-preview-solution';
    document.getElementById(previewId).style.display = 'block'; 
    document.getElementById(previewId).src = "https://i.gifer.com/ZKZg.gif"; 

    try {
        const optimizedDataUrl = await optimizeImageFileForUpload(file);
        if (!optimizedDataUrl) throw new Error('Görsel verisi üretilemedi.');

        if (type === 'question') {
            uploadedImageBase64 = optimizedDataUrl;
            document.getElementById(previewId).src = uploadedImageBase64;
        } else {
            uploadedSolutionBase64 = optimizedDataUrl;
            document.getElementById(previewId).src = uploadedSolutionBase64;
        }
    } catch (err) {
        console.error("Görsel işlenemedi:", err);
        document.getElementById(previewId).style.display = 'none';
        if (type === 'question') uploadedImageBase64 = null;
        else uploadedSolutionBase64 = null;
        alert("⚠️ Görsel optimize edilemedi. Lütfen farklı bir görsel deneyin.");
    }
};

window.processStudentImageUpload = async (e, type = 'image') => {
    const file = e.target.files[0]; 
    if(!file) return;
    
    if(type === 'image') { 
        document.getElementById('std-img-preview').style.display = 'block'; 
        document.getElementById('std-img-preview').src = "https://i.gifer.com/ZKZg.gif"; 
    } else if (type === 'solution') {
        const solutionPreview = document.getElementById('std-solution-preview');
        if (solutionPreview) {
            solutionPreview.style.display = 'block';
            solutionPreview.src = "https://i.gifer.com/ZKZg.gif";
        }
    } else if (type === 'source') {
        const sourcePreview = document.getElementById('std-source-image-preview');
        if (sourcePreview) {
            sourcePreview.style.display = 'block';
            sourcePreview.src = "https://i.gifer.com/ZKZg.gif";
        }
    }
    
    try {
        const optimizedDataUrl = await optimizeImageFileForUpload(file, type === 'source' ? SOURCE_IMAGE_OPTIMIZATION_OVERRIDES : {});
        if (!optimizedDataUrl) throw new Error('Görsel verisi üretilemedi.');

        if(type === 'image') { 
            stdUploadedImageBase64 = optimizedDataUrl; 
            document.getElementById('std-img-preview').src = stdUploadedImageBase64; 
        } else if (type === 'solution') { 
            stdSolutionBase64 = optimizedDataUrl; 
            const solutionPreview = document.getElementById('std-solution-preview');
            if (solutionPreview) {
                solutionPreview.src = stdSolutionBase64;
                solutionPreview.style.display = 'block';
            }
        } else if (type === 'source') {
            stdSourceImageBase64 = optimizedDataUrl;
            const sourcePreview = document.getElementById('std-source-image-preview');
            if (sourcePreview) {
                sourcePreview.src = stdSourceImageBase64;
                sourcePreview.style.display = 'block';
            }
            alert("✅ Kaynakça resmi eklendi.");
        } else {
            return;
        }
    } catch (err) {
        console.error("Öğrenci görseli işlenemedi:", err);
        if (type === 'image') {
            stdUploadedImageBase64 = null;
            const stdPreview = document.getElementById('std-img-preview');
            if (stdPreview) stdPreview.style.display = 'none';
        } else if (type === 'source') {
            stdSourceImageBase64 = null;
            const sourcePreview = document.getElementById('std-source-image-preview');
            if (sourcePreview) sourcePreview.style.display = 'none';
        } else if (type === 'solution') {
            stdSolutionBase64 = null;
            const solutionPreview = document.getElementById('std-solution-preview');
            if (solutionPreview) solutionPreview.style.display = 'none';
        }
        alert("⚠️ Görsel optimize edilemedi. Lütfen farklı bir görsel deneyin.");
    }
};

window.uploadQuestion = async () => {
    if(!socket) return alert("Sunucuya bağlanılamadı!");
    
    const qDers = document.getElementById('new-q-ders').value.trim(); 
    const qKonu = document.getElementById('new-q-deneme').value.trim();
    const qSoru = document.getElementById('new-q-text').value.trim() || "Aşağıdaki görseli inceleyiniz."; 
    const qSiklar = ["A", "B", "C", "D", "E"];
    const qDogru = parseInt(document.getElementById('new-q-correct').value) || 0; 
    const qSolText = document.getElementById('new-q-sol-text').value.trim();
    
    if(!qDers || !qKonu) return alert("Lütfen Ders ve Konu alanlarını doldurun!"); 
    if(!window.myClassCode) return alert("⚠️ Lütfen önce bir sınıf seçin veya oluşturun!");
    
    let questionImageUrl = null;
    let solutionImageUrl = null;
    try {
        [questionImageUrl, solutionImageUrl] = await Promise.all([
            uploadImageDataUrlIfNeeded(uploadedImageBase64, 'questions'),
            uploadImageDataUrlIfNeeded(uploadedSolutionBase64, 'solutions')
        ]);
    } catch (err) {
        console.error("Soru/çözüm görselleri Storage'a yüklenemedi:", err);
        if (isStorageRetryLimitExceededError(err)) {
            const continueWithoutImages = confirm(STORAGE_UPLOAD_CONTINUE_WITHOUT_IMAGE_PROMPT);
            if (!continueWithoutImages) return;
            questionImageUrl = null;
            solutionImageUrl = null;
        } else {
            const errDetail = err && err.message ? ` (${err.message})` : '';
            return alert(`⚠️ Soru veya çözüm görseli yüklenemedi${errDetail}. Lütfen tekrar deneyin.`);
        }
    }

    const q = { 
        soru: qSoru, 
        siklar: qSiklar, 
        dogru: qDogru, 
        ders: qDers.toUpperCase(), 
        deneme: qKonu, 
        image: questionImageUrl, 
        classCode: window.myClassCode, 
        solutionText: qSolText, 
        solutionImage: solutionImageUrl 
    };
    
    socket.emit("addNewQuestion", q);
    
    document.getElementById('new-q-text').value = ""; 
    document.getElementById('new-q-ders').value = ""; 
    document.getElementById('new-q-deneme').value = ""; 
    document.getElementById('new-q-correct').value = "0"; 
    document.getElementById('img-preview').style.display = "none"; 
    uploadedImageBase64 = null; 
    document.getElementById('new-q-sol-text').value = ""; 
    document.getElementById('img-preview-solution').style.display = "none"; 
    uploadedSolutionBase64 = null;
    
    alert(`✅ Soru (ve varsa çözümü) kütüphanenize eklendi!`);
};

// 🚨 YENİ GÜNCELLENMİŞ ÖĞRENCİ SORU YÜKLEME KODU (HAFIZALI) 🚨
window.uploadStudentQuestion = async (target = 'cloud') => {
    if (window.isStudentUploadInProgress) {
        return alert("Kaydetme işlemi devam ediyor, lütfen bekleyin.");
    }
    if (target === 'cloud' && (!socket || !socket.connected)) {
        return alert("Buluta bağlanılamadı, lütfen Cihaza Kaydet seçeneğini kullanın.");
    }
    const customKonuInput = document.getElementById('custom-konu-input');
    const customKonu = customKonuInput ? customKonuInput.value.trim() : "";
    const smartTopicContext = normalizeLibraryPath(window.smartAddTopicPath);
    const finalTopic = (smartTopicContext?.topic || customKonu || window.secilenKonu || "").trim();
    const finalDers = (smartTopicContext?.subject || window.secilenDers || "").trim();
    
    const stdQKitap = document.getElementById('std-q-kitap');
    const qKitap = stdQKitap ? stdQKitap.value.trim() : ""; 
    const finalBook = qKitap;
    
    if(!finalTopic || !finalDers) return alert("Komutanım, lütfen önce Kütüphane/Ders seçimini tamamlayın!");
    
    const qText = document.getElementById('std-q-text').value.trim(); 
    const qSolText = document.getElementById('std-q-sol-text').value.trim(); 
    const correctIdx = parseInt(document.getElementById('std-q-correct-idx').value) || 0;
    const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı";
    
    const reminderDays = parseFloat(document.getElementById('std-q-reminder').value) || 1;
    CLIENT_STORE.setItem('gazi_last_reminder_days', String(reminderDays));
    const nextReviewDate = Date.now() + (reminderDays * 24 * 60 * 60 * 1000); 

    if(!stdUploadedImageBase64 && !qText) return alert("Lütfen bir fotoğraf yükleyin veya kendinize bir not yazın!");

    if(customKonu && !smartTopicContext && finalDers !== "Genel Ders") {
        addCustomTopicsForSubject(finalDers, [customKonu]);
    }

    CLIENT_STORE.setJSON('gazi_sticky_memory', {
        exam: String(window.secilenSinav || ''),
        group: String(window.secilenGrup || ''),
        subject: String(finalDers || ''),
        topic: String(finalTopic || ''),
        book: String(finalBook || ''),
        sourceImage: stdSourceImageBase64 || null
    });
    
    const memBadge = document.getElementById('mem-badge');
    if (memBadge) memBadge.style.display = "inline-block";

    const saveBtn = document.getElementById('student-save-btn');
    window.isStudentUploadInProgress = true;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Kaydediliyor...';
    }
    try {
    let questionImageForSave = stdUploadedImageBase64;
    let solutionImageForSave = stdSolutionBase64;
    let sourceImageForSave = stdSourceImageBase64 || null;
    const hasTextContent = !!qText;

    if (target === 'cloud') {
        try {
            [questionImageForSave, solutionImageForSave, sourceImageForSave] = await Promise.all([
                uploadImageDataUrlIfNeeded(stdUploadedImageBase64, 'questions'),
                uploadImageDataUrlIfNeeded(stdSolutionBase64, 'solutions'),
                uploadImageDataUrlIfNeeded(stdSourceImageBase64, 'sources')
            ]);
        } catch (err) {
            console.error("Öğrenci soru/çözüm/kaynak görselleri Storage'a yüklenemedi:", err);
            if (isStorageRetryLimitExceededError(err) && hasTextContent) {
                const continueWithoutImages = confirm(STORAGE_UPLOAD_CONTINUE_WITHOUT_IMAGE_PROMPT);
                if (!continueWithoutImages) return;
                questionImageForSave = null;
                solutionImageForSave = null;
                sourceImageForSave = null;
            } else if (isStorageRetryLimitExceededError(err)) {
                return alert(`⚠️ ${STORAGE_UPLOAD_TIMEOUT_REASON} Lütfen tekrar deneyin veya Cihaza Kaydet seçeneğini kullanın.`);
            } else {
                const errDetail = err && err.message ? ` (${err.message})` : '';
                return alert(`⚠️ Soru, çözüm veya kaynak görseli buluta yüklenemedi${errDetail}. Lütfen tekrar deneyin.`);
            }
        }
    }

    const q = { 
        studentName: studentName, 
        ders: finalDers, 
        kitap: finalBook, 
        konu: finalTopic, 
        not: qText, 
        sourceImage: sourceImageForSave || null,
        image: questionImageForSave, 
        nextReviewDate: nextReviewDate, 
        solutionImage: solutionImageForSave, 
        solutionText: qSolText, 
        dogru: correctIdx, 
        soru: qText || "Görseli inceleyiniz.", 
        siklar: ["A", "B", "C", "D", "E"] 
    };
    if (target !== 'cloud') q.id = generateUniqueId('local');
    
    if (target === 'cloud') {
        socket.emit("addStudentQuestion", q);
        alert(`✅ Soru BULUT Hata Defterinize eklendi!`);
    } else {
        let localNotebook = getLocalNotebookQuestions(); 
        localNotebook.push(q); 
        setLocalNotebookQuestions(localNotebook);
        alert(`💾 Soru CİHAZINIZA başarıyla kaydedildi!\nİnternetsiz de çözebilirsiniz.`);
    }
    
    document.getElementById('std-q-text').value = ""; 
    document.getElementById('std-q-sol-text').value = ""; 
    const stdImgPreview = document.getElementById('std-img-preview');
    if (stdImgPreview) stdImgPreview.style.display = "none"; 
    const stdSolutionPreview = document.getElementById('std-solution-preview');
    if (stdSolutionPreview) stdSolutionPreview.style.display = "none";
    stdUploadedImageBase64 = null; 
    stdSolutionBase64 = null;
    if (customKonuInput) customKonuInput.value = "";
    window.updateLocalListCounts();
    } finally {
        window.isStudentUploadInProgress = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            window.updateStudentSaveTargetLabel();
        }
    }
};

window.fetchStudentLibrary = (source = 'cloud', onlyReviews = false) => {
    if (!window.pendingLibraryFilter) window.libraryViewingTopicPath = null;
    if(source === 'cloud') {
        if(!socket) return alert("Sunucu bağlantısı yok."); 
        const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
        socket.emit("getStudentLibrary", { studentName: studentName, onlyReviews: onlyReviews });
    } else {
        let localData = getLocalNotebookQuestions();
        if(onlyReviews) { 
            const now = Date.now(); 
            localData = localData.filter(q => q.nextReviewDate && q.nextReviewDate <= now); 
        } else { 
            localData = [...localData].reverse(); 
        }
        renderStudentLibraryHTML(localData, "💾 Cihaz Hata Defterim");
    }
};

window.applyReviewFilter = () => {
    const now = Date.now();
    const due = window.originalStdQuestions.filter(q => q.nextReviewDate && q.nextReviewDate <= now);
    renderStudentLibraryListOnly(due);
};

window.applyLibraryFilters = () => {
    renderStudentLibraryListOnly(window.originalStdQuestions);
};

function populateLibraryFilters(data) {
    return data;
}

function getSavedReviewDelayDays() {
    const saved = CLIENT_STORE.getItem('gazi_review_delay_days', '');
    const allowed = getReminderIntervals().map((value) => String(value));
    if (allowed.includes(saved)) return saved;
    return allowed[0] || '7';
}

function renderStudentLibraryListOnly(data) {
    window.tempStdQuestions = data; 
    const div = document.getElementById('list-content');
    const savedReviewDelayDays = getSavedReviewDelayDays();
    const reminderIntervals = getReminderIntervals();
    
    if(data.length === 0) { 
        div.innerHTML = "<p class='list-empty-message'>Bu filtreye uygun soru bulunamadı.</p>"; 
    } else {
        const isLocal = document.getElementById('list-title').innerText.includes("Cihaz");
        const cloudBadge = !isLocal
            ? `<span class="cloud-badge" title="Bu soru buluta kaydetilmiştir, internet bağlantısı gerektirir">☁️ ℹ️</span>`
            : '';
        div.innerHTML = data.map((q, i) => {
            const kitapText = typeof q.kitap === 'string' ? q.kitap.trim() : '';
            const showKitap = !!kitapText && kitapText.toLowerCase() !== LEGACY_EMPTY_BOOK_TEXT;
            return `
            <div class="list-item list-item-student-card">
                <button onclick="reportQuestionFromLibrary(${i})" title="Hatalı Bildir" aria-label="Hatalı bildir" class="library-report-btn">🚨</button>
                <div class="list-item-header-row">
                    <div>
                        <span class="list-item-subject-badge">${escapeHtml(q.ders || 'Genel')}</span>
                        <b class="list-item-topic-text">${escapeHtml(q.konu)}</b>${cloudBadge}
                    </div>
                    <div>${formatReminderDate(q.nextReviewDate)}</div>
                </div>
                ${showKitap ? `<small class="list-item-source-text"><b>Kaynak:</b> ${escapeHtml(kitapText)}</small><br>` : ''}
                ${q.not ? `<small><b>Soru Notu:</b> ${escapeHtml(q.not)}</small><br>` : ''}
                ${q.image ? `<img src="${safeImageSrc(q.image)}" class="list-item-question-image">` : ''}
                <div class="abcde-grid" id="std-qbox-${i}">
                    ${['A','B','C','D','E'].map((s, idx) => `<button class="abcde-btn" onclick="checkStdAnswer(this, ${idx}, ${i})">${s}</button>`).join('')}
                </div>
                <div id="sol-std-qbox-${i}" class="list-item-solution-box"></div>
                ${q.id ? `<div class="list-item-review-wrap">
                    <label class="list-item-review-label">🔁 Erteleme Süresi</label>
                    <select id="std-review-delay-${i}" class="list-item-review-select">
                        ${reminderIntervals.map((days) => `<option value="${days}" ${savedReviewDelayDays === String(days) ? 'selected' : ''}>${escapeHtml(buildReminderOptionLabel(days))}</option>`).join('')}
                    </select>
                </div>` : ''}
                <div class="list-item-action-row">
                    ${q.id ? `<button onclick="updateReviewDateByIndex(${i}, ${isLocal})" class="outline list-item-review-btn">✅ Tekrar Ettim (Ertele)</button>` : ''}
                    ${q.id ? `<button onclick="deleteStudentQuestionByIndex(${i}, ${isLocal})" class="outline list-item-delete-btn">🗑️ Sil</button>` : ''}
                </div>
            </div>`;
        }).join(''); 
    }
}

function renderStudentLibraryHTML(data, title) { 
    window.originalStdQuestions = data; 
    currentListType = "student_library"; 
    document.getElementById('list-title').innerText = `${title} (${data.length})`; 
    const filterArea = document.getElementById('library-filter-area');
    if (filterArea) filterArea.style.display = 'none';

    const now = Date.now();
    const dueQuestions = data.filter(q => q.nextReviewDate && q.nextReviewDate <= now);
    const reviewHeader = document.getElementById('review-section-header');
    if (reviewHeader) {
        if (dueQuestions.length > 0) {
            reviewHeader.style.display = 'block';
            reviewHeader.innerHTML = `<div style="background:#fff3cd; border:2px solid #f39c12; border-radius:10px; padding:10px; text-align:center; cursor:pointer;" onclick="applyReviewFilter()">
                <b style="color:#e67e22;">🔔 Hatırlatılacak Sorular: ${dueQuestions.length} Soru</b><br>
                <small style="color:#555;">Tekrar zamanı gelmiş sorular var. Görmek için tıklayın veya aşağı kaydırın.</small>
            </div>`;
        } else {
            reviewHeader.style.display = 'none';
        }
    }

    const pendingFilter = window.pendingLibraryFilter;
    let resolvedTopicContext = null;
    if (pendingFilter && typeof pendingFilter === 'object') {
        const filtered = data.filter((q) => {
            const sameSubject = String(q?.ders || '').trim() === String(pendingFilter.subject || '').trim();
            const sameTopic = String(q?.konu || q?.deneme || '').trim() === String(pendingFilter.topic || '').trim();
            return sameSubject && sameTopic;
        });
        if (filtered.length > 0) {
            renderStudentLibraryListOnly(filtered);
            resolvedTopicContext = { subject: pendingFilter.subject, topic: pendingFilter.topic };
        } else {
            renderStudentLibraryListOnly(data);
        }
        window.pendingLibraryFilter = null;
    } else {
        renderStudentLibraryListOnly(data);
    }
    if (resolvedTopicContext) window.libraryViewingTopicPath = resolvedTopicContext;
    window.renderLibraryTopicAddButton();

    const startBtn = document.getElementById('start-library-test-btn');
    if (startBtn) startBtn.style.display = data.length > 0 ? 'block' : 'none';

    showScreen('screen-list'); 
}

window.updateReviewDateByIndex = (questionIndex, isLocal = false) => {
    const q = window.tempStdQuestions[questionIndex];
    if (!q || !q.id) return;
    const selectedEl = document.getElementById(`std-review-delay-${questionIndex}`);
    const selectedDays = parseFloat(selectedEl ? selectedEl.value : getSavedReviewDelayDays());
    window.updateReviewDate(q.id, isLocal, selectedDays);
};

window.updateReviewDate = (questionId, isLocal = false, selectedDays = null) => {
    const days = parseFloat(selectedDays || getSavedReviewDelayDays());
    if(days && days > 0) {
        CLIENT_STORE.setItem('gazi_review_delay_days', String(days));
        const newDate = Date.now() + (days * 24 * 60 * 60 * 1000);
        if(!isLocal) { 
            socket.emit("updateReviewDate", { questionId: questionId, additionalDays: days }); 
        } else { 
            let localData = getLocalNotebookQuestions(); 
            const idx = localData.findIndex(x => x.id === questionId); 
            if(idx !== -1) { 
                localData[idx].nextReviewDate = newDate; 
                setLocalNotebookQuestions(localData); 
            } 
        }
        alert(`✅ Tamamdır! Bu soru sistem takvimine işlendi.`);
        showScreen('screen-main');
        const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
        socket.emit("checkNotebookReviews", studentName);
    }
};

window.deleteStudentQuestionByIndex = (questionIndex, isLocal) => {
    const q = window.tempStdQuestions[questionIndex];
    if (!q || !q.id) return;
    window.deleteStudentQuestion(q.id, isLocal);
};

window.deleteStudentQuestion = (questionId, isLocal) => {
    if (!confirm("Bu soruyu silmek istediğinizden emin misiniz?")) return;
    if (!isLocal) {
        if (socket) {
            const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı";
            socket.emit("deleteStudentQuestion", { questionId: questionId, studentName: studentName });
        }
    } else {
        let localData = getLocalNotebookQuestions();
        localData = localData.filter(x => x.id !== questionId);
        setLocalNotebookQuestions(localData);
        window.updateLocalListCounts();
    }
    window.originalStdQuestions = window.originalStdQuestions.filter(q => q.id !== questionId);
    window.tempStdQuestions = window.tempStdQuestions.filter(q => q.id !== questionId);
    renderStudentLibraryListOnly(window.tempStdQuestions);
    const titleEl = document.getElementById('list-title');
    if (titleEl) {
        titleEl.innerText = titleEl.innerText.replace(/\(\d+\)/, `(${window.originalStdQuestions.length})`);
    }
};

function setTrialListMode(enabled = false) {
    const gameScreen = document.getElementById('screen-game');
    const map = document.getElementById('question-map-accordion');
    const navButtons = document.getElementById('trial-nav-buttons');
    const qText = document.getElementById('q-text');
    const qImage = document.getElementById('q-image-display');
    const qMulti = document.getElementById('q-multi-image-container');
    const boxQuestion = document.getElementById('box-question');
    const boxTotal = document.getElementById('box-total');
    const reportBtn = document.querySelector('#screen-game button[onclick="reportQuestion()"]');
    const favBtn = document.getElementById('btn-fav-current');
    if (gameScreen) gameScreen.classList.toggle('trial-list-mode', !!enabled);
    if (map) map.style.display = enabled ? 'none' : 'block';
    if (navButtons) navButtons.style.display = enabled ? 'none' : 'flex';
    if (qText) qText.style.display = enabled ? 'none' : 'block';
    if (qImage) qImage.style.display = enabled ? 'none' : qImage.style.display;
    if (qMulti) qMulti.style.display = enabled ? 'none' : qMulti.style.display;
    if (boxQuestion) {
        if (enabled) {
            boxQuestion.dataset.prevDisplay = boxQuestion.style.display || '';
            boxQuestion.style.display = 'none';
        } else if ('prevDisplay' in boxQuestion.dataset) {
            boxQuestion.style.display = boxQuestion.dataset.prevDisplay;
            delete boxQuestion.dataset.prevDisplay;
        }
    }
    if (boxTotal) {
        if (enabled) {
            boxTotal.dataset.prevDisplay = boxTotal.style.display || '';
            boxTotal.style.display = 'none';
        } else if ('prevDisplay' in boxTotal.dataset) {
            boxTotal.style.display = boxTotal.dataset.prevDisplay;
            delete boxTotal.dataset.prevDisplay;
        }
    }
    if (reportBtn) reportBtn.style.display = enabled ? 'none' : 'block';
    if (favBtn) favBtn.style.display = enabled ? 'none' : 'block';
}

window.selectTrialListAnswer = (questionIndex, optionIndex) => {
    const qIndex = Number(questionIndex);
    const oIndex = Number(optionIndex);
    if (!Number.isInteger(qIndex) || !Number.isInteger(oIndex)) return;
    if (qIndex < 0 || qIndex >= trialQuestions.length) return;
    trialAnswers[qIndex] = oIndex;
    window.renderTrialQuestionList();
};

window.renderTrialQuestionList = () => {
    const area = document.getElementById('opts-area');
    if (!area) return;
    area.innerHTML = trialQuestions.map((q, i) => {
        const answered = trialAnswers[i];
        const options = Array.isArray(q?.siklar) && q.siklar.length > 0 ? q.siklar : ["A", "B", "C", "D", "E"];
        const hasSolution = !!(q?.solutionText || q?.solutionImage);
        const questionText = String(q?.soru || q?.not || "Görseli inceleyiniz.");
        return `
            <article class="trial-list-card">
                <h4 class="trial-list-title">${i + 1}. ${escapeHtml(questionText)}</h4>
                ${q?.image ? `<img src="${safeImageSrc(q.image)}" class="trial-list-image" alt="Soru görseli">` : ''}
                <div class="trial-list-options">
                    ${options.map((option, optionIndex) => {
                        const isCorrect = answered !== null && optionIndex === Number(q?.dogru);
                        const isWrong = answered !== null && answered === optionIndex && optionIndex !== Number(q?.dogru);
                        const cls = isCorrect ? 'correct' : isWrong ? 'wrong' : '';
                        return `<button type="button" class="opt-btn ${cls}" onclick="window.selectTrialListAnswer(${i}, ${optionIndex})">${escapeHtml(String(option))}</button>`;
                    }).join('')}
                </div>
                ${answered !== null && hasSolution ? `
                    <div class="solution-revealed trial-list-solution">
                        <b>👨‍🏫 Çözüm Notu:</b><br>${escapeHtml(q.solutionText || 'Yazılı açıklama eklenmemiş.')}<br>
                        ${q.solutionImage ? `<img src="${safeImageSrc(q.solutionImage)}" class="trial-list-image" alt="Çözüm görseli">` : ''}
                    </div>
                ` : ''}
            </article>
        `;
    }).join('');
};

window.startLibraryTest = () => {
    if (!canStartLibraryTest(window.tempStdQuestions)) return alert("Kütüphanende çözülecek soru yok. Önce listeyi açmayı veya soru eklemeyi dene!");
    let pool = [...window.tempStdQuestions]; 
    for (let i = pool.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [pool[i], pool[j]] = [pool[j], pool[i]]; 
    } 
    trialQuestions = pool; 
    trialAnswers = new Array(trialQuestions.length).fill(null); 
    currentQIndex = 0; 
    currentMode = 'trial'; 
    document.getElementById('trial-nav-buttons').style.display = 'none'; 
    document.getElementById('btn-finish-trial').style.display = 'block'; 
    showScreen('screen-game');
    setTrialListMode(true);
    window.renderTrialQuestionList();
};

window.reportQuestionFromLibrary = (index) => { 
    const q = window.tempStdQuestions[index]; 
    if(q && socket) { 
        socket.emit('reportQuestion', q); 
        alert("🚨 Bu soru başarıyla merkeze bildirildi!"); 
    } 
};

window.checkStdAnswer = (btn, selectedIdx, qIndex) => { 
    const q = window.tempStdQuestions[qIndex]; 
    const boxId = 'std-qbox-' + qIndex; 
    const btns = document.querySelectorAll(`#${boxId} button`); 
    btns.forEach(b => b.disabled = true); 
    const answerState = evaluateStdAnswer(selectedIdx, q.dogru);
    
    if(answerState.isCorrect) { 
        btn.classList.add('correct'); 
        confetti({ particleCount: 100 }); 
    } else { 
        btn.classList.add('wrong'); 
        if(btns[answerState.correctIndex]) btns[answerState.correctIndex].classList.add('correct'); 
    } 
    
    const sDiv = document.getElementById('sol-' + boxId); 
    sDiv.style.display = 'block'; 
    sDiv.classList.remove('solution-revealed');
    void sDiv.offsetWidth;
    sDiv.classList.add('solution-revealed');
    sDiv.innerHTML = `<b>✏️ Çözüm Notu:</b><br>${escapeHtml(q.solutionText || 'Yazılı çözüm notu bulunmuyor.')}<br>${q.solutionImage ? `<img src="${safeImageSrc(q.solutionImage)}" class="list-item-question-image">` : ''}`; 
};

function formatReminderDate(nextReviewDate) {
    if (!nextReviewDate) return '';
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const diff = nextReviewDate - now;
    if (diff <= 0) return '<span class="review-reminder review-reminder-due">⏰ Tekrar zamanı geldi!</span>';
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.ceil(diff / MS_PER_DAY);
    if (hours < 24) return `<span class="review-reminder review-reminder-soon">⏳ ${hours} saat sonra hatırlatılacak</span>`;
    return `<span class="review-reminder review-reminder-later">📅 ${days} gün sonra hatırlatılacak</span>`;
}

window.openReviewLibrary = () => {
    window.libraryViewingTopicPath = null;
    if (!socket) return alert("Sunucu bağlantısı yok.");
    const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı";
    socket.emit("getStudentLibrary", { studentName: studentName, onlyReviews: true });
};

window.showInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChromeIOS = navigator.userAgent.includes('CriOS') || navigator.userAgent.includes('FxiOS');
    if (isIOS && isChromeIOS) {
        document.getElementById('ios-chrome-prompt').style.display = 'flex';
    } else if (isIOS) {
        document.getElementById('ios-pwa-prompt').style.display = 'block';
    } else if (isAndroid) {
        document.getElementById('android-pwa-prompt').style.display = 'block';
    } else if (deferredPrompt) {
        window.installPWA();
    } else {
        alert("Uygulamayı indirmek için tarayıcınızın adres çubuğundaki 'Yükle' veya '⊕' simgesine tıklayın.");
    }
};

function getStudentSavedTeacherMaterials() {
    const raw = CLIENT_STORE.getJSON(STUDENT_SAVED_MATERIALS_STORAGE_KEY, []);
    return Array.isArray(raw) ? raw : [];
}

function setStudentSavedTeacherMaterials(list) {
    CLIENT_STORE.setJSON(STUDENT_SAVED_MATERIALS_STORAGE_KEY, Array.isArray(list) ? list : []);
}

window.renderStudentSavedTeacherMaterials = () => {
    const listEl = document.getElementById('student-saved-materials-list');
    if (!listEl) return;
    const list = getStudentSavedTeacherMaterials();
    if (list.length === 0) {
        listEl.innerHTML = 'Henüz kayıtlı gönderi yok.';
        return;
    }
    listEl.innerHTML = list
        .map((item, index) => `
            <div style="padding:6px; border:1px solid #e8edf3; border-radius:6px; margin-bottom:6px; background:#f9fcff;">
                <div style="display:flex; justify-content:space-between; gap:6px; align-items:center;">
                    <strong style="color:#1e3c72; font-size:0.78rem;">${escapeHtml(item.title || `Sınıf ${item.classCode || '-'}`)}</strong>
                    <small style="color:#6b7280;">${escapeHtml(item.savedAtText || '-')}</small>
                </div>
                <small style="display:block; color:#4b5563; margin-top:2px;">${escapeHtml(String(item.questionCount || 0))} soru</small>
                <div style="display:flex; gap:5px; margin-top:6px;">
                    <button type="button" class="outline" style="flex:1; font-size:0.72rem; padding:5px;" onclick="window.openSavedTeacherMaterials(${index})">🧠 Çöz</button>
                    <button type="button" class="outline" style="width:auto; font-size:0.72rem; padding:5px 8px; border-color:#c0392b; color:#c0392b;" onclick="window.deleteSavedTeacherMaterials(${index})">Sil</button>
                </div>
            </div>
        `)
        .join('');
};

window.saveLatestTeacherClassMaterials = () => {
    const latestQuestions = Array.isArray(window.latestFetchedClassQuestions) ? window.latestFetchedClassQuestions : [];
    const classCode = String(window.latestFetchedClassCode || document.getElementById('class-code-input')?.value || '').trim().toUpperCase();
    if (!classCode || latestQuestions.length === 0) {
        return window.showSoftFeedback('Önce öğretmenin sorularını açın.');
    }
    const list = getStudentSavedTeacherMaterials();
    const title = `Sınıf ${classCode}`;
    const now = new Date();
    const payload = {
        classCode,
        title,
        questionCount: latestQuestions.length,
        savedAt: now.getTime(),
        savedAtText: now.toLocaleString('tr-TR'),
        questions: latestQuestions
    };
    const existingIndex = list.findIndex((item) => String(item?.classCode || '').toUpperCase() === classCode);
    if (existingIndex >= 0) list[existingIndex] = payload;
    else list.unshift(payload);
    setStudentSavedTeacherMaterials(list.slice(0, 25));
    window.renderStudentSavedTeacherMaterials();
    window.showSoftFeedback('Öğretmen gönderileri kaydedildi.');
};

window.openSavedTeacherMaterials = (index) => {
    const list = getStudentSavedTeacherMaterials();
    const item = list[Number(index)];
    if (!item || !Array.isArray(item.questions) || item.questions.length === 0) return;
    window.tempStdQuestions = item.questions;
    startLibraryTest();
};

window.deleteSavedTeacherMaterials = (index) => {
    const list = getStudentSavedTeacherMaterials();
    const safeIndex = Number(index);
    if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= list.length) return;
    if (!confirm("Bu kaydı silmek istediğinizden emin misiniz?")) return;
    list.splice(safeIndex, 1);
    setStudentSavedTeacherMaterials(list);
    window.renderStudentSavedTeacherMaterials();
};

window.fetchClassQuestions = () => { 
    const code = document.getElementById('class-code-input').value.trim().toUpperCase(); 
    if(!code) return alert("Lütfen önce sınıf kodunu girin!"); 
    socket.emit("getClassQuestions", code); 
};

if(socket) {
    socket.on("studentLibraryData", (data) => renderStudentLibraryHTML(data, "☁️ Bulut Hata Defterim"));
    socket.on("classQuestionsData", (data) => { 
        if(data.length === 0) return alert("Bu sınıfa henüz öğretmen tarafından soru eklenmemiş."); 
        window.latestFetchedClassCode = String(document.getElementById('class-code-input')?.value || '').trim().toUpperCase();
        window.latestFetchedClassQuestions = data;
        window.tempStdQuestions = data; 
        startLibraryTest(); 
    });

    socket.on("teacherReportsData", (data) => {
        currentListType = "teacher_report"; 
        document.getElementById('list-title').innerText = "📊 Sınıf İstihbarat Raporu"; 
        const startBtn = document.getElementById('start-library-test-btn');
        if (startBtn) startBtn.style.display = 'none';
        const reviewHeader = document.getElementById('review-section-header');
        if (reviewHeader) reviewHeader.style.display = 'none';
        const reports = data.reports || []; 
        const roster = data.roster || [];
        const solvedNames = reports.map(r => r.name); 
        const notSolved = roster.filter(name => !solvedNames.includes(name));
        
        let html = `<h4 style="color:#27ae60; margin-top:0;">✅ Çözenler</h4>`;
        if(reports.length === 0) html += "<p style='font-size:0.85rem;'>Henüz çözen öğrenci yok.</p>";
        else html += reports.map(r => `<div class="list-item" style="border-left:4px solid #27ae60;"><b>${escapeHtml(r.name)}</b> <span style="float:right; color:#27ae60; font-weight:bold;">${escapeHtml(r.score)} Puan</span></div>`).join('');
        
        html += `<h4 style="color:#c0392b; margin-top:20px;">💤 Çözmeyenler</h4>`;
        if(notSolved.length === 0) html += "<p style='font-size:0.85rem;'>Sınıf listesi boş veya tüm sınıf görevini tamamlamış!</p>";
        else html += notSolved.map(name => `<div class="list-item" style="border-left:4px solid #c0392b; color:#666;">${escapeHtml(name)}</div>`).join('');
        
        document.getElementById('list-content').innerHTML = html; 
        showScreen('screen-list');
    });

    socket.on("classMistakesData", (data) => {
        currentListType = "class_mistakes"; 
        document.getElementById('list-title').innerText = "📉 Sınıf Yanlış Analizi"; 
        const div = document.getElementById('list-content');
        
        if(data.length === 0) div.innerHTML = "<p style='text-align:center;'>Bu sınıfa ait hata kaydı bulunamadı.</p>"; 
        else div.innerHTML = data.map(m => `
            <div class="list-item" style="border-left: 5px solid #c0392b;">
                <small style="color:#1e3c72; font-weight:bold;">${escapeHtml(m.ders)} | ${escapeHtml(m.konu)}</small><br>
                <b>Soru Metni:</b> ${escapeHtml(m.soru)} <br>
                <div style="margin-top:5px; background:#fff3f3; padding:5px; border-radius:5px; color:#c0392b; font-weight:bold; font-size:0.85rem;">
                    ⚠️ Bu soru sınıfta toplam ${escapeHtml(m.count)} kez yanlış yapıldı!
                </div>
            </div>`).join(''); 
        showScreen('screen-list');
    });

    socket.on("teacherLibraryData", (data) => { 
        document.getElementById('library-filter-area').style.display = 'none'; 
        window.tempStdQuestions = data; 
        currentListType = "teacher_library"; 
        document.getElementById('list-title').innerText = "📚 Soru Kütüphanem"; 
        const div = document.getElementById('list-content'); 
        
        if(data.length === 0) div.innerHTML = "<p style='text-align:center;'>Kütüphanenizde henüz soru bulunmuyor.</p>"; 
        else div.innerHTML = data.map((q, i) => `
            <div class="list-item" style="border-left: 5px solid #e67e22;">
                <b>Soru:</b> ${escapeHtml(q.soru)} <br>
                <span style="color:#27ae60;"><b>Cevap:</b> ${escapeHtml(q.siklar ? q.siklar[q.dogru] : 'Bilinmiyor')}</span> <br>
                <small>Ders: ${escapeHtml(q.ders)} | Konu: ${escapeHtml(q.deneme)}</small><br>
                ${q.image ? `<img src="${safeImageSrc(q.image)}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''} 
                ${q.solutionText || q.solutionImage ? `<div style="background:#e8f4f8; padding:8px; border-radius:5px; margin-top:5px; font-size:0.8rem; color:#1e3c72;"><b>👨‍🏫 Çözüm:</b> ${escapeHtml(q.solutionText || '')} ${q.solutionImage ? '<br><span style="color:#27ae60;">[Görsel Ekli]</span>' : ''}</div>` : ''} 
                <button onclick="reportQuestionFromLibrary(${i})" class="outline" style="margin-top:10px; font-size:0.75rem; border-color:#c0392b; color:#c0392b;">🚨 Hatalı Bildir</button>
                <div style="display:flex; gap:6px; margin-top:8px;">
                    <button onclick="window.reaskTeacherLibraryQuestion(${i})" class="outline" style="flex:1; font-size:0.75rem; border-color:#27ae60; color:#27ae60;">🔁 Tekrar Sor</button>
                    <button onclick="window.deleteTeacherLibraryQuestion(${i})" class="outline" style="flex:1; font-size:0.75rem; border-color:#c0392b; color:#c0392b;">🗑️ Sil</button>
                </div>
            </div>`).join(''); 
        showScreen('screen-list'); 
    });
    socket.on("teacherQuestionDeleted", ({ success, message }) => {
        if (success) {
            window.showSoftFeedback('Soru silindi.');
            window.fetchMyLibrary();
            return;
        }
        if (message) alert(`⚠️ ${message}`);
    });

    socket.on("notebookReviewsCount", (count) => { 
        const box = document.getElementById('review-alert-box'); 
        const countEl = document.getElementById('review-q-count');
        const btnCount = document.getElementById('review-btn-count');
        if (btnCount) btnCount.innerText = count;
        if(box) { 
            if(count > 0) { 
                box.style.display = 'block'; 
                if(countEl) countEl.innerText = count; 
            } else { 
                box.style.display = 'none'; 
            }
        }
    });
    
    socket.on("pendingTeachersData", (data) => { 
        currentListType = "admin_approval"; 
        document.getElementById('list-title').innerText = "👨‍🏫 Onay Bekleyen Öğretmenler"; 
        const div = document.getElementById('list-content'); 
        if(data.length === 0) div.innerHTML = "<p style='text-align:center;'>Onay bekleyen öğretmen bulunmuyor.</p>"; 
        else div.innerHTML = data.map((t, i) => `<div class="list-item" style="border-left: 5px solid #8e44ad;"><b>İsim:</b> ${escapeHtml(t.name)} <br><b>E-posta:</b> ${escapeHtml(t.email)} <br><button onclick="approveTeacher(${JSON.stringify(t.email)})" class="green" style="margin-top:5px; padding:5px 10px; font-size:0.8rem; width:auto;">✅ Onayla</button></div>`).join(''); 
        showScreen('screen-list'); 
    });
}

window.refreshTeacherClasses = () => {
    document.getElementById('teacher-classes-list').innerHTML = "Yükleniyor...";
    if(socket) socket.emit("getTeacherClass", auth.currentUser.email);
    setTimeout(() => { 
        const div = document.getElementById('teacher-classes-list'); 
        if(div.innerHTML === "Yükleniyor...") div.innerHTML = "Sınıf bulunamadı veya bağlantı kurulamadı."; 
    }, 3000);
};

window.reaskTeacherLibraryQuestion = (index) => {
    const q = Array.isArray(window.tempStdQuestions) ? window.tempStdQuestions[Number(index)] : null;
    if (!q || !socket) return;
    const classCode = String(q.classCode || window.myClassCode || '').trim().toUpperCase();
    if (!classCode) return alert("Bu soru için sınıf bilgisi bulunamadı.");
    socket.emit("addNewQuestion", {
        soru: String(q.soru || ''),
        ders: String(q.ders || 'GENEL'),
        deneme: String(q.deneme || ''),
        dogru: Number.isInteger(q.dogru) ? q.dogru : 0,
        siklar: Array.isArray(q.siklar) ? q.siklar : [],
        image: q.image || '',
        solutionText: q.solutionText || '',
        solutionImage: q.solutionImage || '',
        classCode
    });
    window.showSoftFeedback('Soru tekrar öğrencilere gönderildi.');
};

window.deleteTeacherLibraryQuestion = (index) => {
    const q = Array.isArray(window.tempStdQuestions) ? window.tempStdQuestions[Number(index)] : null;
    if (!q || !socket) return;
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    socket.emit("deleteTeacherQuestion", {
        classCode: String(q.classCode || window.myClassCode || '').trim().toUpperCase(),
        questionId: String(q.id || ''),
        questionText: String(q.soru || '')
    });
};

window.fetchTeacherReports = () => { 
    if(socket) { 
        const code = document.getElementById('report-class-select').value; 
        if(!code) return alert("Lütfen rapor almak istediğiniz sınıfı seçin!"); 
        socket.emit("getTeacherReports", code.toUpperCase()); 
    } 
};

window.fetchClassMistakes = () => { 
    if(socket) { 
        const code = document.getElementById('report-class-select').value; 
        if(!code) return alert("Lütfen rapor almak istediğiniz sınıfı seçin!"); 
        socket.emit("getClassMistakes", code.toUpperCase()); 
    } 
};

window.fetchMyLibrary = () => { 
    if(!socket) return; 
    if(!window.myClassCode) return alert("Önce bir sınıf seçmelisiniz."); 
    socket.emit("getTeacherLibrary", window.myClassCode); 
};

window.fetchPendingTeachers = () => { if(socket) socket.emit("getPendingTeachers"); };
window.approveTeacher = (email) => { if(socket) { socket.emit("approveTeacher", email); alert("✅ Onay isteği sunucuya gönderildi!"); } };
window.openEvaluation = () => { if(socket) { socket.emit("getEvaluationData", window.myClassCode); showScreen('screen-eval'); } };

window.createNewNamedClass = () => { 
    const className = document.getElementById('new-class-name').value.trim(); 
    if(!className) return alert("Lütfen bir sınıf adı girin!"); 
    const teacherEmail = getAuth().currentUser.email; 
    if(socket) socket.emit("createNamedClass", { teacherEmail, className }); 
    document.getElementById('new-class-name').value = ""; 
};

window.uploadQuestionToNamedClass = () => { 
    const selectedClass = document.getElementById('target-class-select').value; 
    if(!selectedClass) return alert("Lütfen önce soruyu göndereceğiniz sınıfı seçin!"); 
    window.myClassCode = selectedClass; 
    window.uploadQuestion(); 
};

if(socket) {
    socket.on("teacherClassesData", (classes) => {
        if(classes.length > 0) {
            localStorage.setItem('gazi_teacher_classes', JSON.stringify(classes));
        }
        renderTeacherClasses(classes);
    });
    socket.on("evaluationData", (payload) => {
        const reports = Array.isArray(payload?.reports) ? payload.reports : [];
        const averageScore = Number(payload?.averageScore) || 0;
        const board = document.getElementById('eval-content') || document.getElementById('list-content');
        if (!board) return;
        board.innerHTML = `
            <div class="list-item" style="border-left:5px solid #2980b9;">
                <b>📊 Ortalama Puan:</b> ${averageScore}<br>
                <small>Toplam kayıt: ${reports.length}</small>
            </div>
        ` + reports.slice(0, 20).map(r => `
            <div class="list-item">
                <b>${escapeHtml(r.name || 'Öğrenci')}</b>
                <span style="float:right; color:#27ae60; font-weight:bold;">${escapeHtml(String(r.score || 0))} Puan</span>
                <br><small>${escapeHtml(r.date || '-')}</small>
            </div>
        `).join('');
    });
}

function renderTeacherClasses(classes) {
    const listDiv = document.getElementById('teacher-classes-list'); 
    const select = document.getElementById('target-class-select');
    const instructorClassesDiv = document.getElementById('instructor-my-classes-list');
    
    if(!listDiv || !select) return;

    if(classes.length === 0) { 
        listDiv.innerHTML = "Henüz sınıf oluşturulmadı."; 
        if (instructorClassesDiv) instructorClassesDiv.innerHTML = "Henüz sınıf oluşturulmadı.";
        select.innerHTML = '<option value="">Önce Sınıf Oluşturun</option>'; 
        return; 
    }
    
    listDiv.innerHTML = classes.map(c => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; background:rgba(255,255,255,0.1); padding:8px; border-radius:6px;">
            <span><b>${escapeHtml(c.name)}</b> (${escapeHtml(c.code)})</span>
            <button onclick="copyToClipboard(${JSON.stringify(c.code)})" style="width:auto; padding:4px 8px; font-size:0.7rem; background:#3498db; border:none; color:white; border-radius:4px; cursor:pointer;">Kopyala</button>
        </div>`).join('');
    
    select.innerHTML = '<option value="">--- Sınıf Seçin ---</option>' + classes.map(c => `<option value="${escapeHtml(c.code)}">${escapeHtml(c.name)}</option>`).join('');
    
    const reportSelect = document.getElementById('report-class-select');
    if(reportSelect) reportSelect.innerHTML = '<option value="">--- Sınıf Seçin ---</option>' + classes.map(c => `<option value="${escapeHtml(c.code)}">${escapeHtml(c.name)}</option>`).join('');
    if (instructorClassesDiv) {
        instructorClassesDiv.innerHTML = classes.map((c) => `
            <div style="padding:6px; margin-bottom:6px; background:rgba(255,255,255,0.08); border-radius:6px;">
                <strong>${escapeHtml(c.name)}</strong><br>
                <small>Kod: ${escapeHtml(c.code)}</small>
            </div>
        `).join('');
    }
}

window.copyToClipboard = (text) => { 
    navigator.clipboard.writeText(text).then(() => { alert("✅ Sınıf kodu kopyalandı: " + text); }); 
};

window.createClass = () => { 
    if(socket) { 
        const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
        socket.emit("createClass", name); 
    } 
};

if(socket) { 
    socket.on("classCreated", (code) => { 
        document.getElementById('generated-code').innerText = "KODUNUZ: " + code; 
        window.myClassCode = code; 
        localStorage.setItem("gazi_class_code", code); 
        socket.emit("getFilters", window.myClassCode); 
    }); 
    socket.on("teacherClassFound", (code) => { 
        document.getElementById('generated-code').innerText = "KODUNUZ: " + code; 
        window.myClassCode = code; 
        localStorage.setItem("gazi_class_code", code); 
        socket.emit("getFilters", window.myClassCode); 
    }); 
}

window.joinClass = () => { 
    if(!socket) return; 
    const code = document.getElementById('class-code-input').value.trim().toUpperCase(); 
    const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    if(!code) return alert("Sınıf kodu girin!"); 
    socket.emit("joinClass", { code, studentName: name }); 
    localStorage.setItem("gazi_class_code", code); 
    document.getElementById('btn-class-questions').style.display = 'block';
};

if(socket) socket.on("classJoined", (res) => { 
    if(res.success) { 
        window.myClassCode = res.code; 
        localStorage.setItem("gazi_class_code", res.code); 
        socket.emit("getFilters", window.myClassCode); 
        subscribeToClassPushNotifications(res.code, { forcePrompt: true });
        alert("✅ Sınıfa katıldın!"); 
        document.getElementById('btn-class-questions').style.display = 'block'; 
    } else {
        alert("❌ Geçersiz Sınıf Kodu!"); 
    }
});

if(socket) socket.on("notificationSubscriptionUpdated", (res) => {
    if (!res || res.success !== true) return;
    if (res.classCode) {
        localStorage.setItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY, String(res.classCode).trim().toUpperCase());
    }
});

window.publishAlert = () => { 
    if(!socket) return; 
    const msg = document.getElementById('alert-text').value.trim(); 
    if(!msg) return alert("Boş duyuru gönderilemez!"); 
    const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    socket.emit("sendGlobalAlert", { message: msg, sender: name }); 
    document.getElementById('alert-text').value = ""; 
    alert("🚀 Duyuru gönderildi!"); 
};

if(socket) socket.on("receiveGlobalAlert", (data) => { 
    const toast = document.getElementById('notification-toast'); 
    document.getElementById('toast-message').innerHTML = `<span style="color:#e67e22;">${escapeHtml(data.sender)}:</span><br>${escapeHtml(data.message)}`; 
    toast.classList.add('show'); 
    setTimeout(() => { toast.classList.remove('show'); }, 6000); 
});

function saveToLocal(key, qObj) { 
    let list = JSON.parse(localStorage.getItem(key)) || []; 
    if(!list.find(x => x.soru === qObj.soru)) { 
        list.push(qObj); 
        localStorage.setItem(key, JSON.stringify(list)); 
    } 
}

function removeFromLocal(key, qObj) { 
    let list = JSON.parse(localStorage.getItem(key)) || []; 
    list = list.filter(x => x.soru !== qObj.soru); 
    localStorage.setItem(key, JSON.stringify(list)); 
}

function checkIsFav(qObj) { 
    return (JSON.parse(localStorage.getItem('kpss_favs')) || []).some(x => x.soru === qObj.soru); 
}

window.toggleFavCurrent = () => { 
    if(!currentQObject) return; 
    const btn = document.getElementById('btn-fav-current'); 
    if(checkIsFav(currentQObject)) { 
        removeFromLocal('kpss_favs', currentQObject); 
        btn.style.color = "#ccc"; 
        btn.innerText = "☆"; 
    } else { 
        saveToLocal('kpss_favs', currentQObject); 
        btn.style.color = "#f1c40f"; 
        btn.innerText = "⭐"; 
    } 
};

window.reportQuestion = () => { 
    if(!currentQObject || !socket) return; 
    socket.emit('reportQuestion', currentQObject); 
    saveToLocal('kpss_reports', currentQObject); 
    alert("🚨 Bu soru merkeze bildirildi."); 
};

window.fetchAdminReports = () => { if(socket) socket.emit("adminGetReports"); };

if(socket) socket.on("allReportsData", (data) => { 
    currentListType = "admin_report"; 
    document.getElementById('list-title').innerText = "👑 Merkezi Hata Raporları"; 
    const contentDiv = document.getElementById('list-content'); 
    if(data.length === 0) contentDiv.innerHTML = "<p style='text-align:center;'>Henüz rapor yok.</p>"; 
    else contentDiv.innerHTML = data.map((q, i) => `<div class="list-item" style="border-left: 5px solid #c0392b;"><b>Soru:</b> ${escapeHtml(q.soru)} <br><span style="color:#27ae60;"><b>Cevap:</b> ${escapeHtml(q.siklar ? q.siklar[q.dogru] : '---')}</span> <br><small style="color:#666;">Tarih: ${escapeHtml(q.reportedAt || '---')}</small></div>`).join(''); 
    showScreen('screen-list'); 
});

window.updateLocalListCounts = () => {
    const keys = { 'wrong': 'kpss_wrongs', 'fav': 'kpss_favs', 'blank': 'kpss_blanks', 'report': 'kpss_reports' };
    Object.entries(keys).forEach(([type, key]) => {
        const el = document.getElementById('count-' + type);
        if (el) el.innerText = (JSON.parse(localStorage.getItem(key)) || []).length;
    });
    const localNB = getLocalNotebookQuestions().length;
    const btnLocal = document.getElementById('btn-local-open');
    if (btnLocal) btnLocal.innerText = `💾 Cihazdan Aç (${localNB})`;
    window.renderSavedLibraryCoursesPanel();
};

window.showLocalList = (type) => { 
    document.getElementById('library-filter-area').style.display = 'none'; 
    const reviewHeader = document.getElementById('review-section-header');
    if (reviewHeader) reviewHeader.style.display = 'none';
    const startBtn = document.getElementById('start-library-test-btn');
    if (startBtn) startBtn.style.display = 'none';
    currentListType = type; 
    const keys = { 'wrong': 'kpss_wrongs', 'fav': 'kpss_favs', 'blank': 'kpss_blanks', 'report': 'kpss_reports' }; 
    const titles = { 'wrong': '❌ Yanlışlarım', 'fav': '⭐ Favorilerim', 'blank': '⬜ Boş Bıraktıklarım', 'report': '🚨 Hatalı Bildirdiklerim' }; 
    const list = JSON.parse(localStorage.getItem(keys[type])) || []; 
    document.getElementById('list-title').innerText = `${titles[type]} (${list.length})`; 
    const contentDiv = document.getElementById('list-content'); 
    if(list.length === 0) contentDiv.innerHTML = "<p style='text-align:center;'>Bu liste şu an boş.</p>"; 
    else contentDiv.innerHTML = list.map((q, i) => `<div class="list-item"><b>Soru ${i+1}:</b> ${escapeHtml(q.soru)} <br><span style="color:#27ae60; font-weight:bold; font-size:0.9rem;">Cevap: ${escapeHtml(q.siklar ? q.siklar[q.dogru] : 'Bilinmiyor')}</span></div>`).join(''); 
    showScreen('screen-list'); 
};

window.downloadPDF = () => { 
    const keys = { 'wrong': 'kpss_wrongs', 'fav': 'kpss_favs', 'blank': 'kpss_blanks', 'report': 'kpss_reports' }; 
    const list = JSON.parse(localStorage.getItem(keys[currentListType])) || []; 
    if(list.length === 0) return alert("Liste boş!"); 
    const win = window.open('', '', 'height=600,width=800');
    if (!win) { alert("Tarayıcınız açılır pencereyi engelledi. Lütfen açılır pencerelere izin verip tekrar deneyin."); return; }
    win.document.write('<html><body style="font-family:sans-serif;"><h2>Gazililer Yanlış Soru Kumbaram</h2><hr>'); 
    list.forEach((q, i) => win.document.write(`<p><b>Soru ${i+1}:</b> ${escapeHtml(q.soru)}<br><span style="color:green;">Cevap: ${escapeHtml(q.siklar[q.dogru])}</span></p>`)); 
    win.document.write('</body></html>'); 
    win.document.close(); 
    win.print(); 
};

window.goToLobby = (mode) => {
    currentMode = mode;
    APP_STATE.room.mode = mode;
    const realName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    if (mode === 'room' && socket) { 
        socket.emit('createRoom', { username: realName }); 
        document.getElementById('room-code-display').style.display = 'block'; 
        document.getElementById('lobby-players-area').style.display = 'block'; 
    } 
    else { 
        document.getElementById('room-code-display').style.display = 'none'; 
        document.getElementById('lobby-players-area').style.display = 'none'; 
    }

    const trialSourceArea = document.getElementById('trial-source-area');
    if (trialSourceArea) trialSourceArea.style.display = mode === 'trial' ? 'block' : 'none';

    const dersFiltSec = document.getElementById('ders-filter-section');
    const denemeFiltSec = document.getElementById('deneme-filter-section');
    if (dersFiltSec) dersFiltSec.style.display = mode === 'room' ? 'block' : 'none';
    if (denemeFiltSec) denemeFiltSec.style.display = mode === 'room' ? 'block' : 'none';

    showScreen('screen-lobby');
};

window.onSourceChange = () => {
    const source = document.getElementById('set-source').value;
    const dersFiltSec = document.getElementById('ders-filter-section');
    const denemeFiltSec = document.getElementById('deneme-filter-section');
    if (dersFiltSec) dersFiltSec.style.display = 'none';
    if (denemeFiltSec) denemeFiltSec.style.display = 'none';
};

if(socket) {
    socket.on('roomCreated', c => { myRoom = c; APP_STATE.room.code = c; document.getElementById('lobby-room-code').innerText = c; });
    socket.on('updatePlayerList', p => { 
        const l = document.getElementById('lobby-players-list'); 
        if(l) l.innerHTML = p.map(x => `<span class="player-badge">${x.username}</span>`).join(''); 
        
        const live = document.getElementById('live-leaderboard'); 
        if(live) { 
            live.style.display = currentMode === 'room' ? 'block' : 'none'; 
            live.innerHTML = "🏆 " + p.sort((a,b)=>b.score-a.score).map(x => `<b>${x.username}:</b> ${x.score}p`).join(' | '); 
        }
    });
    socket.on('gameOver', (players) => {
        if(totalInt) clearInterval(totalInt); 
        if(qInt) clearInterval(qInt); 
        showScreen('screen-result');
        
        players.sort((a,b) => b.score - a.score); 
        let html = `<h3 style="color:#e67e22; margin-bottom:5px;">Oda Sınavı Sona Erdi!</h3>`;
        html += players.map((p, i) => `
            <div class="list-item" style="border-left:5px solid ${i===0?'#f1c40f':'#3498db'}; font-size:1.1rem; text-align:left;">
                <b>${i === 0 ? '👑' : ''} ${i+1}. ${p.username}</b> 
                <span style="float:right; color:#27ae60; font-weight:bold;">${p.score} Puan</span>
            </div>`).join('');
        
        document.getElementById('result-board').innerHTML = html; 
        confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
    });
}

window.startGame = () => {
    if(!socket && currentMode !== 'trial') return alert("Sunucu bağlantısı yok!");

    const sourceEl = document.getElementById('set-source');
    const source = (sourceEl && currentMode === 'trial') ? sourceEl.value : 'sistem';

    // Yerel kaynaklardan (Yanlışlarım, Boşlarım, Hata Defteri) doğrudan başlat
    if (currentMode === 'trial' && source !== 'sistem') {
        const sourceKeys = { 'yanlis': 'kpss_wrongs', 'bos': 'kpss_blanks', 'local': LOCAL_NOTEBOOK_STORAGE_KEY };
        const sourceNames = { 'yanlis': '❌ Yanlışlarım', 'bos': '⬜ Boş Bıraktıklarım', 'local': '📓 Hata Defterim' };
        let pool = source === 'local'
            ? getLocalNotebookQuestions()
            : (CLIENT_STORE.getJSON(sourceKeys[source], []) || []);
        if (pool.length === 0) return alert(`${sourceNames[source]} listesi şu an boş! Önce sorularınızı kaydedin.`);
        const count = parseInt(document.getElementById('set-count').value) || 10;
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        trialQuestions = pool.slice(0, count);
        trialAnswers = new Array(trialQuestions.length).fill(null);
        currentQIndex = 0;
        currentMode = 'trial';
        document.getElementById('box-total').style.display = 'none';
        document.getElementById('box-question').style.display = 'none';
        document.getElementById('trial-nav-buttons').style.display = 'flex';
        document.getElementById('btn-finish-trial').style.display = 'block';
        showScreen('screen-game');
        setTrialListMode(false);
        renderQuestionMap(trialQuestions.length, 0, []);
        openMap();
        renderTrialQuestion();
        return;
    }

    const dur = parseInt(document.getElementById('room-q-time').value); 
    if(!dur || dur <= 0) return alert("Süre zorunludur!");
    
    const d = []; document.querySelectorAll('input[name="ders-secim"]:checked').forEach(c => d.push(c.value)); 
    const k = []; document.querySelectorAll('input[name="deneme-secim"]:checked').forEach(c => k.push(c.value));
    
    const s = { 
        count: document.getElementById('set-count').value, 
        subject: d.includes("HEPSI") ? "HEPSI" : d, 
        deneme: k.includes("HEPSI") ? "HEPSI" : k, 
        difficulty: document.getElementById('set-difficulty').value, 
        optionsCount: parseInt(document.getElementById('set-options').value), 
        timerMode: selectedTimerMode, 
        duration: dur, 
        classCode: window.myClassCode 
    };
    
    if (currentMode === 'trial' && socket) {
        socket.emit('startTrial', s);
    } else if (currentMode === 'trial') {
        fetch(buildRelativeResourceUrl('questions.json'))
            .then(r => r.json())
            .then(allQuestions => {
                const filterSubject = s.subject !== "HEPSI" && Array.isArray(s.subject) && s.subject.length > 0;
                const filterDeneme = s.deneme !== "HEPSI" && Array.isArray(s.deneme) && s.deneme.length > 0;
                let pool = (filterSubject || filterDeneme)
                    ? allQuestions.filter(q =>
                        (!filterSubject || s.subject.includes(q.ders)) &&
                        (!filterDeneme || s.deneme.includes(q.denemeName)))
                    : allQuestions;
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                const count = parseInt(s.count) || 10;
                trialQuestions = pool.slice(0, count);
                if (trialQuestions.length === 0) return alert("Soru bulunamadı!");
                trialAnswers = new Array(trialQuestions.length).fill(null);
                currentQIndex = 0;
                document.getElementById('trial-nav-buttons').style.display = 'flex';
                document.getElementById('btn-finish-trial').style.display = 'block';
                showScreen('screen-game');
                setTrialListMode(false);
                renderQuestionMap(trialQuestions.length, 0, []);
                openMap();
                renderTrialQuestion();
            })
            .catch(() => alert("Soru dosyası yüklenemedi. Lütfen daha sonra tekrar deneyin."));
    } else if (socket) {
        socket.emit('startGame', { roomCode: myRoom, settings: s });
    }
};

if(socket) {
    socket.on('newQuestion', d => {
        showScreen('screen-game'); 
        setTrialListMode(false);
        currentQObject = d; 
        document.getElementById('opts-area').innerHTML = ""; 
        currentQIndex = d.index - 1; 
        APP_STATE.quiz.index = currentQIndex;
        APP_STATE.quiz.total = d.total || 0;
        APP_STATE.quiz.timerMode = d.timerMode || "question";
        document.getElementById('q-text').innerText = d.soru;
        
        const imgDisp = document.getElementById('q-image-display'); 
        if(d.image) { imgDisp.src = d.image; imgDisp.style.display = "block"; } else { imgDisp.style.display = "none"; }
        
        document.getElementById('box-question').style.display = (d.timerMode === 'question') ? 'block' : 'none'; 
        document.getElementById('box-total').style.display = (d.timerMode === 'general') ? 'block' : 'none';
        
        if(d.timerMode === 'general' && d.index === 1) startTotalTimer(d.duration); 
        if(d.timerMode === 'question') startQuestionTimer(d.duration);
        
        if(d.index === 1) { roomSolvedIndices = new Set(); roomTotalQuestions = d.total; openMap(); }
        renderNavigator(d.total, currentQIndex, 'room');
        
        d.siklar.forEach((s, i) => {
            const b = document.createElement('button'); 
            b.innerText = s; 
            b.className = "opt-btn";
            b.onclick = () => { 
                document.querySelectorAll('.opt-btn').forEach(x => x.classList.remove('selected')); 
                b.classList.add('selected'); 
                socket.emit('submitAnswer', {roomCode: myRoom, answerIndex: i}); 
                clearInterval(qInt); 
            };
            document.getElementById('opts-area').appendChild(b);
        });
    });

    socket.on('answerResult', data => { 
        if (!roomSolvedIndices.has(currentQIndex)) roomSolvedIndices.add(currentQIndex);
        renderQuestionMap(roomTotalQuestions, currentQIndex, roomSolvedIndices);
        if(!data.correct) { 
            if(data.selectedIndex === -1) saveToLocal('kpss_blanks', currentQObject); 
            else saveToLocal('kpss_wrongs', currentQObject); 
        } 
    });

    socket.on('trialStarted', data => {
        trialQuestions = data.questions || data; 
        if(trialQuestions.length === 0) return alert("Soru bulunamadı!");
        trialAnswers = new Array(trialQuestions.length).fill(null); 
        currentQIndex = 0;
        showScreen('screen-game'); 
        setTrialListMode(false);
        document.getElementById('trial-nav-buttons').style.display = 'flex'; 
        document.getElementById('btn-finish-trial').style.display = 'block';
        
        if(data.timerMode === 'general') { 
            document.getElementById('box-total').style.display = 'block'; 
            startTotalTimer(data.duration); 
        }
        renderQuestionMap(trialQuestions.length, 0, []);
        openMap();
        renderTrialQuestion();
    });
}

function renderTrialQuestion() {
    currentQObject = trialQuestions[currentQIndex]; 
    document.getElementById('q-text').innerText = `(${currentQIndex+1}/${trialQuestions.length}) ` + (currentQObject.soru || currentQObject.not || "Görseli inceleyiniz.");
    
    const imgDisp = document.getElementById('q-image-display'); 
    if(currentQObject.image) { imgDisp.src = currentQObject.image; imgDisp.style.display = "block"; } else { imgDisp.style.display = "none"; }
    
    renderNavigator(trialQuestions.length, currentQIndex, 'trial'); 
    const a = document.getElementById('opts-area'); 
    a.innerHTML = "";
    
    const siklarListesi = currentQObject.siklar || ["A", "B", "C", "D", "E"]; 
    siklarListesi.forEach((s, i) => { 
        const b = document.createElement('button'); 
        b.innerText = s; 
        
        if (trialAnswers[currentQIndex] !== null) { 
            if (i === currentQObject.dogru) { b.className = "opt-btn correct selected"; } 
            else if (i === trialAnswers[currentQIndex]) { b.className = "opt-btn wrong selected"; } 
            else { b.className = "opt-btn"; } 
        } else { 
            b.className = "opt-btn"; 
        }
        
        b.onclick = () => { 
            if(trialAnswers[currentQIndex] === null) { 
                trialAnswers[currentQIndex] = i; 
                renderTrialQuestion(); 
                if (!(currentQObject.solutionText || currentQObject.solutionImage)) { 
                    setTimeout(() => { if(currentQIndex < trialQuestions.length - 1) trialNext(); }, 600); 
                } 
            } else { 
                trialAnswers[currentQIndex] = i; 
                renderTrialQuestion(); 
            }
        }; 
        a.appendChild(b); 
    });

    let solArea = document.getElementById('trial-solution-area'); 
    if(!solArea) { 
        solArea = document.createElement('div'); 
        solArea.id = 'trial-solution-area'; 
        a.parentNode.appendChild(solArea); 
    }
    
    if (trialAnswers[currentQIndex] !== null && (currentQObject.solutionText || currentQObject.solutionImage)) {
        solArea.style.display = 'block'; 
        solArea.innerHTML = `
        <div class="solution-revealed" style="margin-top:15px; padding:15px; background:#e8f4f8; border-radius:8px; border: 1px solid #3498db; text-align:left; color:#1e3c72; font-size:0.9rem;">
            <b>👨‍🏫 Çözüm Notu:</b><br>${escapeHtml(currentQObject.solutionText || 'Yazılı açıklama eklenmemiş.')}<br>
            ${currentQObject.solutionImage ? `<img src="${safeImageSrc(currentQObject.solutionImage)}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''}
        </div>`;
    } else { 
        solArea.style.display = 'none'; 
    }
}

window.trialNext = () => { if(currentQIndex < trialQuestions.length-1) { currentQIndex++; renderTrialQuestion(); } }; 
window.trialPrev = () => { if(currentQIndex > 0) { currentQIndex--; renderTrialQuestion(); } };

window.finishTrial = () => {
    if(totalInt) clearInterval(totalInt); 
    setTrialListMode(false);
    let s = 0; let d = 0; let y = 0; let b = 0; 
    const realName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı";
    const mistakesToCloud = [];
    
    trialQuestions.forEach((q, i) => { 
        if(trialAnswers[i] === q.dogru) { 
            s+=10; d++; 
        } 
        else if(trialAnswers[i] !== null) { 
            s-=5; y++; 
            saveToLocal('kpss_wrongs', q); 
            mistakesToCloud.push(q);
            if(socket) socket.emit("addToReviewQueue", { studentName: realName, question: q }); 
        }
        else { 
            b++; 
            saveToLocal('kpss_blanks', q); 
        }
    });
    
    if(socket) socket.emit("saveStudentResult", { name: realName, classCode: window.myClassCode, score: s, correct: d, wrong: y, blank: b });
    
    if(socket && mistakesToCloud.length > 0 && window.myClassCode) {
         socket.emit("saveClassMistakes", { classCode: window.myClassCode, mistakes: mistakesToCloud });
    }

    showScreen('screen-result'); 
    document.getElementById('result-board').innerHTML = `<h3 style="color:#333;">Doğru: ${d} | Yanlış: ${y} | Boş: ${b}</h3><h2>Puan: ${s}</h2>`; 
    confetti({ particleCount: 150 });
    window.updateLocalListCounts();
};

function startQuestionTimer(s) { 
    let t = s; 
    if(qInt) clearInterval(qInt); 
    qInt = setInterval(() => { 
        t--; 
        document.getElementById('time-q').innerText = t + "s"; 
        if(t<=0) { 
            clearInterval(qInt); 
            if(socket) socket.emit('submitAnswer', {roomCode: myRoom, answerIndex: -1}); 
        }
    }, 1000); 
}

function startTotalTimer(minutes) { 
    let t = minutes * 60; 
    if(totalInt) clearInterval(totalInt); 
    totalInt = setInterval(() => { 
        t--; 
        let m = Math.floor(t/60), sec = t%60; 
        document.getElementById('time-total').innerText = `${m}:${sec<10?'0'+sec:sec}`; 
        if(t<=0) { 
            clearInterval(totalInt); 
            if(currentMode === 'trial') window.finishTrial(); 
        } 
    }, 1000); 
}

window.toggleMap = function() {
    const content = document.getElementById('question-map-content');
    const arrow = document.getElementById('map-arrow');
    if (!content) return;
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'flex';
        if (arrow) arrow.textContent = '▲';
    } else {
        content.style.display = 'none';
        if (arrow) arrow.textContent = '▼';
    }
};

function openMap() {
    const content = document.getElementById('question-map-content');
    const arrow = document.getElementById('map-arrow');
    if (!content) return;
    content.style.display = 'flex';
    if (arrow) arrow.textContent = '▲';
}

function renderQuestionMap(totalQuestions, currentIndex, solvedArray) {
    const div = document.getElementById('question-map-content');
    if (!div) return;
    div.innerHTML = '';
    const solved = solvedArray instanceof Set ? solvedArray : new Set(solvedArray);
    for (let i = 0; i < totalQuestions; i++) {
        const b = document.createElement('div');
        b.className = 'q-box';
        b.innerText = i + 1;
        b.title = `Soru ${i + 1}`;
        if (solved.has(i)) b.classList.add('solved');
        if (i === currentIndex) b.classList.add('active');
        b.onclick = () => { if (currentMode !== 'trial') return; currentQIndex = i; renderTrialQuestion(); };
        div.appendChild(b);
    }
}

function renderNavigator(total, curr, mode) {
    const solved = mode === 'trial'
        ? trialAnswers.reduce((acc, v, i) => { if (v !== null) acc.add(i); return acc; }, new Set())
        : roomSolvedIndices;
    renderQuestionMap(total, curr, solved);
}
