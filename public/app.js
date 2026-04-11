import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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

// 🚨 YENİ NESİL MÜFREDAT AĞACI VE KAPSÜL (BUTON) SİSTEMİ BAŞLANGICI 🚨
window.mufredat = {
    "KPSS": {
        "A Grubu": {
            "Muhasebe": ["Genel Muhasebe", "Maliyet Muhasebesi", "Mali Tablolar Analizi"],
            "İktisat": ["Mikro İktisat", "Makro İktisat", "Türkiye Ekonomisi"],
            "Maliye": ["Kamu Maliyesi", "Bütçe", "Vergi Hukuku"],
            "Hukuk": ["Anayasa", "İdare", "Ceza", "Medeni Hukuk"]
        },
        "B Grubu (Tümü)": {
            "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Dil Bilgisi", "Sözel Mantık"],
            "Matematik": ["Temel Kavramlar", "Rasyonel Sayılar", "Problemler", "Sayısal Mantık", "Geometri"],
            "Tarih": ["İslamiyet Öncesi", "Osmanlı Devleti", "İnkılap Tarihi", "Çağdaş Türk ve Dünya"],
            "Coğrafya": ["Türkiye Fiziki", "Türkiye Beşeri", "Türkiye Ekonomik"],
            "Vatandaşlık": ["Hukukun Temel Kavramları", "Anayasa Hukuku", "İdare Hukuku", "Güncel Bilgiler"]
        },
        "Eğitim Bilimleri": {
            "Gelişim Psikolojisi": ["Bilişsel Gelişim", "Kişilik Gelişimi", "Ahlak Gelişimi"],
            "Öğrenme Psikolojisi": ["Davranışçı Kuramlar", "Bilişsel Kuramlar"],
            "Ölçme ve Değerlendirme": ["Temel Kavramlar", "İstatistik", "Test Hazırlama"]
        }
    },
    "YKS": {
        "TYT": {
            "Türkçe": ["Anlam Bilgisi", "Dil Bilgisi", "Noktalama İşaretleri"],
            "Matematik": ["Sayılar", "Problemler", "Olasılık"],
            "Fen Bilimleri": ["Fizik", "Kimya", "Biyoloji"],
            "Sosyal Bilgiler": ["Tarih", "Coğrafya", "Felsefe", "Din K."]
        },
        "AYT": {
            "Matematik": ["Polinom", "Türev", "İntegral", "Logaritma", "Trigonometri"],
            "Edebiyat": ["Şiir Bilgisi", "Divan Edebiyatı", "Cumhuriyet Dönemi"],
            "Fen Bilimleri": ["AYT Fizik", "AYT Kimya", "AYT Biyoloji"]
        }
    },
    "MEB AGS": {
        "Ortak": {
            "Eğitim Bilimleri": ["Eğitime Giriş", "Öğretim İlke ve Yöntemleri"],
            "Genel Kültür": ["Türkçe", "Tarih", "Eğitim Mevzuatı"]
        }
    },
    "LGS": {
        "Sayısal": {
            "Matematik": ["Çarpanlar", "Kareköklü Sayılar", "Veri Analizi"],
            "Fen Bilimleri": ["Mevsimler", "DNA ve Genetik Kod", "Basınç"]
        },
        "Sözel": {
            "Türkçe": ["Paragraf", "Fiilimsiler", "Cümlenin Ögeleri"],
            "İnkılap Tarihi": ["Bir Kahraman Doğuyor", "Milli Uyanış"],
            "İngilizce": ["Kelime Bilgisi", "Okuduğunu Anlama"]
        }
    }
};

window.secilenSinav = "";
window.secilenGrup = "";
window.secilenDers = "";
window.secilenKonu = "";

const DEFAULT_PROFILE_SUBJECTS = ['Tarih', 'Coğrafya', 'Vatandaşlık', 'Matematik', 'Türkçe', 'Eğitim Bilimleri', 'Fizik', 'Kimya', 'Biyoloji', 'Fen Bilimleri'];
const READY_SOURCES_STORAGE_KEY = 'gazi_ready_sources_v1';
const ADD_QUESTION_UI_PREFS_STORAGE_KEY = 'gazi_add_question_ui_prefs_v1';
const USER_CURRICULUM_STORAGE_KEY = 'gazi_user_curriculum_v1';
const SOFT_DARK_THEME_STORAGE_KEY = 'gazi_soft_dark_theme_v1';
// CSS'teki .gpu-transition (0.3s) ile senkronize tutulur.
const LIBRARY_MODAL_SWAP_DELAY_MS = 300;
const LIBRARY_MODAL_WILL_CHANGE_CLEANUP_BUFFER_MS = 20;
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

function uniqueSubjects(list) {
    return Array.from(new Set((Array.isArray(list) ? list : []).filter(Boolean).map(s => String(s).trim()).filter(Boolean)));
}

function getAddQuestionUIPrefs() {
    try {
        const parsed = JSON.parse(localStorage.getItem(ADD_QUESTION_UI_PREFS_STORAGE_KEY)) || {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function saveAddQuestionUIPrefs(nextPrefs = {}) {
    const current = getAddQuestionUIPrefs();
    localStorage.setItem(ADD_QUESTION_UI_PREFS_STORAGE_KEY, JSON.stringify({ ...current, ...nextPrefs }));
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
    try {
        const parsed = JSON.parse(localStorage.getItem(USER_CURRICULUM_STORAGE_KEY));
        const normalized = normalizeCurriculumData(parsed);
        if (Object.keys(normalized).length > 0) return normalized;
    } catch (e) {}

    const built = {};
    try {
        const savedSubjects = JSON.parse(localStorage.getItem('gazi_subjects_v2')) || [];
        savedSubjects.forEach((row) => {
            const subjectName = String(row?.name || '').trim();
            if (!subjectName) return;
            const topics = String(row?.topics || '')
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);
            built[subjectName] = Array.from(new Set(topics));
        });
    } catch (e) {}

    if (Object.keys(built).length > 0) return built;
    return { "Genel Ders": ["Genel Konu"] };
}

function persistUserCurriculum() {
    localStorage.setItem(USER_CURRICULUM_STORAGE_KEY, JSON.stringify(window.userCurriculum || {}));
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
window.selectedLibraryPath = { subject: "", topic: "" };
window.currentLibraryModalSubject = "";
window.currentLibraryModalMode = "select";
window.libraryViewingTopicPath = null;
window.smartAddTopicPath = null;
window.pendingLibraryFilter = null;
window.isStudentUploadInProgress = false;

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
    selectionArea.style.display = window.smartAddTopicPath ? 'none' : 'block';
};

function animateLibraryModalSwap(renderFn, direction = 'left') {
    const content = document.getElementById('library-modal-content');
    if (!content || typeof renderFn !== 'function') {
        console.warn('Library modal transition skipped: modal content element missing or render function is not callable.');
        return;
    }

    content.style.willChange = 'transform, opacity';
    content.style.transform = direction === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
    content.style.opacity = '0.25';
    setTimeout(() => {
        renderFn();
        content.style.transition = 'none';
        content.style.transform = direction === 'left' ? 'translateX(100%)' : 'translateX(-100%)';
        content.style.opacity = '0.25';
        requestAnimationFrame(() => {
            content.style.transition = '';
            content.style.transform = 'translateX(0)';
            content.style.opacity = '1';
            setTimeout(() => {
                content.style.willChange = '';
            }, LIBRARY_MODAL_SWAP_DELAY_MS + LIBRARY_MODAL_WILL_CHANGE_CLEANUP_BUFFER_MS);
        });
    }, LIBRARY_MODAL_SWAP_DELAY_MS);
}

function createLibraryCard(label, onClick, options = {}) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `library-card ${options.isAdd ? 'add-card' : ''}`;
    card.innerHTML = `<span>${escapeHtml(label)}</span>`;
    card.addEventListener('click', onClick);
    if (options.onDelete) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'library-card-delete';
        delBtn.textContent = '🗑';
        delBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            options.onDelete();
        });
        card.appendChild(delBtn);
    }
    return card;
}

window.renderLibrarySubjectList = () => {
    const title = document.getElementById('library-modal-title');
    const content = document.getElementById('library-modal-content');
    if (!content) return;
    if (title) title.textContent = window.currentLibraryModalMode === 'view' ? '📚 Kütüphanem' : '📁 Kütüphaneye Ekle';
    content.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'library-grid';
    Object.keys(window.userCurriculum || {}).sort((a, b) => a.localeCompare(b, 'tr')).forEach((subject) => {
        grid.appendChild(createLibraryCard(subject, () => {
            window.currentLibraryModalSubject = subject;
            animateLibraryModalSwap(() => window.renderLibraryTopicList(subject), 'left');
        }, {
            onDelete: () => window.deleteCurriculumSubject(subject)
        }));
    });
    grid.appendChild(createLibraryCard('➕ Yeni Ders Ekle', () => window.addCurriculumSubject(), { isAdd: true }));
    content.appendChild(grid);
};

window.renderLibraryTopicList = (subject) => {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject || !window.userCurriculum[safeSubject]) return window.renderLibrarySubjectList();
    const title = document.getElementById('library-modal-title');
    const content = document.getElementById('library-modal-content');
    if (!content) return;
    const titlePrefix = window.currentLibraryModalMode === 'view' ? '📚' : '📁';
    if (title) title.textContent = `${titlePrefix} ${safeSubject}`;
    content.innerHTML = '';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'library-back-btn';
    backBtn.textContent = '⬅️ Geri';
    backBtn.addEventListener('click', () => {
        animateLibraryModalSwap(() => window.renderLibrarySubjectList(), 'right');
    });
    content.appendChild(backBtn);

    const list = document.createElement('div');
    list.className = 'library-topic-list';
    const topics = Array.isArray(window.userCurriculum[safeSubject]) ? window.userCurriculum[safeSubject] : [];
    topics.forEach((topic) => {
        const safeTopic = String(topic || '').trim();
        if (!safeTopic) return;
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'library-topic-item';
        row.innerHTML = `<span>${escapeHtml(safeTopic)}</span>`;
        row.addEventListener('click', () => {
            setSelectedLibraryPath(safeSubject, safeTopic);
            if (window.currentLibraryModalMode === 'view') {
                const selectedPath = { subject: safeSubject, topic: safeTopic };
                window.libraryViewingTopicPath = selectedPath;
                window.pendingLibraryFilter = selectedPath;
                window.closeLibraryModal();
                window.openStudentLibrary({ keepTopicContext: true });
                return;
            }
            window.closeLibraryModal();
        });
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'library-card-delete';
        delBtn.textContent = '🗑';
        delBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            window.deleteCurriculumTopic(safeSubject, topic);
        });
        row.appendChild(delBtn);
        list.appendChild(row);
    });
    const addTopicBtn = document.createElement('button');
    addTopicBtn.type = 'button';
    addTopicBtn.className = 'library-topic-add';
    addTopicBtn.textContent = '➕ Yeni Konu Ekle';
    addTopicBtn.addEventListener('click', () => window.addCurriculumTopic(safeSubject));
    list.appendChild(addTopicBtn);
    content.appendChild(list);
};

window.openLibraryModal = (mode = 'select') => {
    const currentUser = APP_STATE.currentUser || {};
    if (currentUser.role !== 'student' && currentUser.role !== 'admin') return;
    const overlay = document.getElementById('library-modal-overlay');
    const content = document.getElementById('library-modal-content');
    if (!overlay || !content) return;
    window.currentLibraryModalMode = mode === 'view' ? 'view' : 'select';
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
    content.style.transform = 'translateX(0)';
    content.style.opacity = '1';
    window.renderLibrarySubjectList();
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
};

window.addCurriculumSubject = () => {
    const input = window.prompt('Yeni ders adını girin:');
    if (input === null) return;
    const subject = String(input || '').trim();
    if (!subject) return;
    if (!window.userCurriculum[subject]) window.userCurriculum[subject] = [];
    persistUserCurriculum();
    syncUserCurriculumIfGodMode();
    window.renderLibrarySubjectList();
};

window.addCurriculumTopic = (subject) => {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject) return;
    const input = window.prompt(`"${safeSubject}" için yeni konu adı girin:`);
    if (input === null) return;
    const topic = String(input || '').trim();
    if (!topic) return;
    if (!window.userCurriculum[safeSubject]) window.userCurriculum[safeSubject] = [];
    if (!window.userCurriculum[safeSubject].includes(topic)) window.userCurriculum[safeSubject].push(topic);
    persistUserCurriculum();
    syncUserCurriculumIfGodMode();
    window.renderLibraryTopicList(safeSubject);
};

window.deleteCurriculumSubject = (subject) => {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject || !window.userCurriculum[safeSubject]) return;
    if (!window.confirm(`"${safeSubject}" dersini silmek istiyor musun?`)) return;
    delete window.userCurriculum[safeSubject];
    persistUserCurriculum();
    syncUserCurriculumIfGodMode();
    window.renderLibrarySubjectList();
};

window.deleteCurriculumTopic = (subject, topic) => {
    const safeSubject = String(subject || '').trim();
    const safeTopic = String(topic || '').trim();
    if (!safeSubject || !safeTopic || !window.userCurriculum[safeSubject]) return;
    if (!window.confirm(`"${safeTopic}" konusunu silmek istiyor musun?`)) return;
    window.userCurriculum[safeSubject] = (window.userCurriculum[safeSubject] || []).filter(t => t !== safeTopic);
    persistUserCurriculum();
    syncUserCurriculumIfGodMode();
    window.renderLibraryTopicList(safeSubject);
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
    const listContent = document.getElementById('list-content');
    if (!listContent || !listContent.parentElement) return;
    let container = document.getElementById('library-topic-add-cta');
    if (!container) {
        container = document.createElement('div');
        container.id = 'library-topic-add-cta';
        container.style.marginBottom = '10px';
        listContent.parentElement.insertBefore(container, listContent);
    }
    if (!context) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    container.style.display = 'block';
    container.innerHTML = `
        <button type="button" class="green" style="width:100%; margin:0;" onclick="window.openSmartAddForCurrentLibraryTopic()">
            ➕ Bu Konuya Soru Ekle (${escapeHtml(context.subject)} / ${escapeHtml(context.topic)})
        </button>
    `;
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

function getSubjectsByExamType(examType) {
    const mapByType = {
        kpss_lisans: ['KPSS', ['B Grubu (Tümü)', 'Eğitim Bilimleri']],
        kpss_onlisans: ['KPSS', ['B Grubu (Tümü)']],
        kpss_ortaogretim: ['KPSS', ['B Grubu (Tümü)']],
        kpss_egitim: ['KPSS', ['Eğitim Bilimleri']],
        yks_tyt: ['YKS', ['TYT']],
        yks_ayt: ['YKS', ['AYT']],
        lise_okul: ['YKS', ['TYT', 'AYT']],
        ortaokul: ['LGS', ['Sayısal', 'Sözel']]
    };
    const conf = mapByType[examType];
    if (!conf || !window.mufredat[conf[0]]) return DEFAULT_PROFILE_SUBJECTS;
    const [examKey, groups] = conf;
    const subjectNames = [];
    groups.forEach(group => {
        const groupData = window.mufredat[examKey][group];
        if (groupData) subjectNames.push(...Object.keys(groupData));
    });
    return uniqueSubjects(subjectNames.length > 0 ? subjectNames : DEFAULT_PROFILE_SUBJECTS);
}

window.renderProfileSubjectsByExam = (savedSubjectsInput = null) => {
    const container = document.getElementById('profile-subjects-area');
    const examTypeEl = document.getElementById('profile-exam-type');
    if (!container || !examTypeEl) return;
    const subjects = getSubjectsByExamType(examTypeEl.value);
    const savedSubjects = Array.isArray(savedSubjectsInput) ? savedSubjectsInput : (JSON.parse(localStorage.getItem('gazi_subjects_v2')) || []);
    const savedMap = new Map(savedSubjects.map(item => [normalizeText(item.name), item.topics || '']));
    container.innerHTML = subjects.map((subject, i) => {
        const key = slugifySubjectName(subject);
        const checkboxId = `subj-dyn-${key}-${i}`;
        const topicId = `topic-dyn-${key}-${i}`;
        const savedTopic = savedMap.get(normalizeText(subject)) || '';
        const checked = savedMap.has(normalizeText(subject)) ? 'checked' : '';
        return `
            <div class="subject-row" data-subject-name="${escapeHtml(subject)}">
                <input type="checkbox" id="${checkboxId}" value="${escapeHtml(subject)}" ${checked}>
                <label for="${checkboxId}">${escapeHtml(subject)}</label>
                <input type="text" id="${topicId}" value="${escapeHtml(savedTopic)}" placeholder="Alt Konu">
            </div>
        `;
    }).join('');
};

window.toggleDerslerimSection = (contentId, arrowId) => {
    const content = document.getElementById(contentId);
    const arrow = document.getElementById(arrowId);
    if (!content) return;
    content.classList.toggle('collapsed');
    if (arrow) arrow.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
};

window.applyDerslerimTheme = (enabled) => {
    const isEnabled = !!enabled;
    document.body.classList.toggle('full-dark-theme', isEnabled);
    document.body.classList.remove('soft-dark-theme');
    localStorage.setItem(SOFT_DARK_THEME_STORAGE_KEY, isEnabled ? '1' : '0');
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
    const saved = localStorage.getItem(SOFT_DARK_THEME_STORAGE_KEY) === '1';
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
    try {
        const saved = JSON.parse(localStorage.getItem('gazi_subjects_v2')) || [];
        const selected = saved
            .map(item => String(item?.name || '').trim())
            .filter(Boolean);
        return uniqueSubjects(selected);
    } catch (e) {
        return [];
    }
}

function getTopicsForDerslerimSubject(subject) {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject) return [];
    const fromCurriculum = Array.isArray(window.userCurriculum?.[safeSubject]) ? window.userCurriculum[safeSubject] : [];
    if (fromCurriculum.length > 0) return uniqueSubjects(fromCurriculum);
    try {
        const saved = JSON.parse(localStorage.getItem('gazi_subjects_v2')) || [];
        const row = saved.find(item => String(item?.name || '').trim() === safeSubject);
        const parsedTopics = String(row?.topics || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
        return uniqueSubjects(parsedTopics);
    } catch (e) {
        return [];
    }
}

window.openLibraryTopicFromDerslerim = (subject, topic) => {
    const safeSubject = String(subject || '').trim();
    const safeTopic = String(topic || '').trim();
    if (!safeSubject || !safeTopic) return;
    window.libraryViewingTopicPath = { subject: safeSubject, topic: safeTopic };
    window.pendingLibraryFilter = { subject: safeSubject, topic: safeTopic };
    window.openStudentLibrary({ keepTopicContext: true });
};

window.toggleDerslerimLibrarySubject = (subjectSlug) => {
    const el = document.getElementById(`derslerim-topics-${subjectSlug}`);
    const arrowEl = document.getElementById(`derslerim-subj-arrow-${subjectSlug}`);
    if (!el) return;
    el.classList.toggle('open');
    if (arrowEl) arrowEl.textContent = el.classList.contains('open') ? '▲' : '▼';
};

window.renderDerslerimLibraryTree = () => {
    const treeEl = document.getElementById('derslerim-library-tree');
    if (!treeEl) return;
    const selectedSubjects = getDerslerimSubjectsFromStorage();
    const subjectList = selectedSubjects.length > 0
        ? selectedSubjects
        : Object.keys(window.userCurriculum || {});
    if (!subjectList.length) {
        treeEl.innerHTML = `<small style="color:#6b7280;">Önce Derslerim bölümünden ders ekleyin.</small>`;
        return;
    }
    treeEl.innerHTML = subjectList.map((subject) => {
        const slug = slugifySubjectName(subject);
        const topics = getTopicsForDerslerimSubject(subject);
        const topicHtml = topics.length > 0
            ? topics.map((topic) => `<button type="button" class="derslerim-topic-btn" onclick="window.openLibraryTopicFromDerslerim(${JSON.stringify(subject)}, ${JSON.stringify(topic)})">📄 ${escapeHtml(topic)}</button>`).join('')
            : `<small style="color:#7f8c8d;">Konu bulunamadı.</small>`;
        return `
            <button type="button" class="derslerim-library-subject" onclick="window.toggleDerslerimLibrarySubject('${slug}')">
                <span>📘 ${escapeHtml(subject)}</span>
                <span id="derslerim-subj-arrow-${slug}">▼</span>
            </button>
            <div id="derslerim-topics-${slug}" class="derslerim-library-topics">${topicHtml}</div>
        `;
    }).join('');
};

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
    const mem = JSON.parse(localStorage.getItem('gazi_sticky_memory')) || {};
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
    const customTopics = JSON.parse(localStorage.getItem('gazi_custom_topics')) || {};
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
});
// 🚨 YENİ NESİL MÜFREDAT AĞACI BİTİŞ 🚨

// 🚨 TEMEL ARAYÜZ VE PWA FONKSİYONLARI 🚨
window.onload = () => { 
    window.updateRegGradeDropdown(); 
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
    navigator.clipboard.writeText("https://gazililer.com.tr").then(() => {
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
        window.openSettingsPanel(); 
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

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => console.log("PWA Aktif."));
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
    settingsEl.classList.remove('derslerim-mode');
    settingsEl.classList.add('profile-mode');
    document.getElementById('settings-screen-title').textContent = '👤 Profil & Ayarlar';
    NAV_ITEM_MAP['screen-settings'] = 'nav-profil';
    window.openSettingsPanel();
};

window.openDerslerimPanel = () => {
    if (activeNavRole !== ROLE_STUDENT) return;
    const settingsEl = document.getElementById('screen-settings');
    settingsEl.classList.remove('profile-mode');
    settingsEl.classList.add('derslerim-mode');
    document.getElementById('settings-screen-title').textContent = '📚 Derslerim';
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

window.toggleDropdown = (id) => document.getElementById(id).classList.toggle('show');
window.myClassCode = localStorage.getItem("gazi_class_code") || "";
let selectedRole = 'student';

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
    
    document.getElementById('profile-exam-type').value = localStorage.getItem('gazi_exam_type') || 'kpss_lisans'; 
    window.updateGradeDropdown();
    
    const savedGrade = localStorage.getItem('gazi_grade');
    if(savedGrade) { 
        document.getElementById('profile-grade').value = savedGrade; 
        setTimeout(() => { 
            document.querySelectorAll('.grade-btn').forEach(btn => { 
                if(btn.innerText === savedGrade) btn.classList.add('selected'); 
            }); 
        }, 100); 
    }

    const savedSubjects = JSON.parse(localStorage.getItem('gazi_subjects_v2')) || [];
    window.renderProfileSubjectsByExam(savedSubjects);
    if (document.getElementById('screen-settings')?.classList.contains('derslerim-mode')) {
        window.renderDerslerimLibraryTree();
    }
    window.restoreDerslerimTheme();
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

    localStorage.setItem('gazi_exam_type', document.getElementById('profile-exam-type').value); 
    localStorage.setItem('gazi_grade', document.getElementById('profile-grade').value);
    
    const subjectsData = [];
    document.querySelectorAll('#profile-subjects-area .subject-row').forEach(row => {
        const cb = row.querySelector('input[type="checkbox"]');
        const txt = row.querySelector('input[type="text"]');
        if (cb && cb.checked) {
            subjectsData.push({ name: cb.value, topics: (txt ? txt.value : '').trim() });
        }
    });

    localStorage.setItem('gazi_subjects_v2', JSON.stringify(subjectsData)); 
    localStorage.setItem('gazi_onboarding_done', 'true');
    window.renderDerslerimLibraryTree();
    
    alert("✅ Çalışma Masası Ayarlarınız Kaydedildi!");
    
    const dersSelect = document.getElementById('std-q-ders'); 
    if(dersSelect) { 
        dersSelect.innerHTML = subjectsData.length > 0 
            ? subjectsData.map(s => `<option value="${s.name}">${s.name}</option>`).join('') 
            : `<option value="Genel">Genel</option>`; 
    }
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
        if (teacherMainTools) teacherMainTools.style.display = isTeacher ? "block" : "none";
        if (adminBtn) adminBtn.style.display = isAdmin ? "block" : "none";
        if (adminApproveBtn) adminApproveBtn.style.display = isAdmin ? "block" : "none";
        window.applyRoleBasedBottomNav(isTeacher ? ROLE_TEACHER : ROLE_STUDENT);

        const settingsEl = document.getElementById('screen-settings');
        if (isTeacher) {
            settingsEl.classList.remove('derslerim-mode');
            settingsEl.classList.add('profile-mode');
            document.getElementById('settings-screen-title').textContent = '👤 Profil & Ayarlar';
            NAV_ITEM_MAP['screen-settings'] = 'nav-profil';
        } else {
            settingsEl.classList.remove('profile-mode');
            settingsEl.classList.add('derslerim-mode');
            document.getElementById('settings-screen-title').textContent = '📚 Derslerim';
            NAV_ITEM_MAP['screen-settings'] = 'nav-derslerim';
        }

        const stdClassCode = localStorage.getItem("gazi_class_code");
        if(stdClassCode && !isTeacher) { 
            document.getElementById('class-code-input').value = stdClassCode; 
            document.getElementById('btn-class-questions').style.display = 'block'; 
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
                : `<option value="Genel">Genel</option>`; 
        }

        const onboardingDone = localStorage.getItem('gazi_onboarding_done');
        if(!isTeacher && !onboardingDone) {
            const hasSeenIntro = localStorage.getItem('gazi_intro_seen');
            if(!hasSeenIntro) { 
                document.getElementById('intro-overlay').style.display = 'flex'; 
            } else { 
                window.openSettingsPanel(); 
            }
        } else { 
            window.showScreen('screen-main'); 
        }

        if (!isTeacher) window.updateLocalListCounts();

    } else { 
        APP_STATE.currentUser = { name: "", role: "guest", email: "" };
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
        alert(`⚠️ ${safeMsg}`);
    });
    socket.on("userCurriculumData", (payload) => {
        const remote = normalizeCurriculumData(payload);
        if (Object.keys(remote).length === 0) return;
        window.userCurriculum = remote;
        persistUserCurriculum();
        if (document.getElementById('library-modal-overlay')?.style.display === 'flex') {
            window.renderLibrarySubjectList();
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
        const errDetail = err && err.message ? ` (${err.message})` : '';
        return alert(`⚠️ Soru veya çözüm görseli yüklenemedi${errDetail}. Lütfen tekrar deneyin.`);
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
    const nextReviewDate = Date.now() + (reminderDays * 24 * 60 * 60 * 1000); 

    if(!stdUploadedImageBase64 && !qText) return alert("Lütfen bir fotoğraf yükleyin veya kendinize bir not yazın!");

    if(customKonu && !smartTopicContext && finalDers !== "Genel Ders") {
        let customTopics = JSON.parse(localStorage.getItem('gazi_custom_topics')) || {};
        if(!customTopics[finalDers]) customTopics[finalDers] = [];
        if(!customTopics[finalDers].includes(customKonu)) {
            customTopics[finalDers].push(customKonu);
            localStorage.setItem('gazi_custom_topics', JSON.stringify(customTopics));
        }
    }

    localStorage.setItem('gazi_sticky_memory', JSON.stringify({
        exam: window.secilenSinav, group: window.secilenGrup, subject: finalDers, topic: finalTopic, book: finalBook, sourceImage: stdSourceImageBase64 || null
    }));
    
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

    if (target === 'cloud') {
        try {
            [questionImageForSave, solutionImageForSave, sourceImageForSave] = await Promise.all([
                uploadImageDataUrlIfNeeded(stdUploadedImageBase64, 'questions'),
                uploadImageDataUrlIfNeeded(stdSolutionBase64, 'solutions'),
                uploadImageDataUrlIfNeeded(stdSourceImageBase64, 'sources')
            ]);
        } catch (err) {
            console.error("Öğrenci soru/çözüm/kaynak görselleri Storage'a yüklenemedi:", err);
            const errDetail = err && err.message ? ` (${err.message})` : '';
            return alert(`⚠️ Soru, çözüm veya kaynak görseli buluta yüklenemedi${errDetail}. Lütfen tekrar deneyin.`);
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
        let localNotebook = JSON.parse(localStorage.getItem('gazi_local_notebook')) || []; 
        localNotebook.push(q); 
        localStorage.setItem('gazi_local_notebook', JSON.stringify(localNotebook));
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
        let localData = JSON.parse(localStorage.getItem('gazi_local_notebook')) || [];
        if(onlyReviews) { 
            const now = Date.now(); 
            localData = localData.filter(q => q.nextReviewDate && q.nextReviewDate <= now); 
        } else { 
            localData.reverse(); 
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
    const secilenDers = document.getElementById('filter-ders').value; 
    const secilenKonu = document.getElementById('filter-konu').value; 
    const secilenKitap = document.getElementById('filter-kitap').value;
    
    let filteredData = window.originalStdQuestions.filter(q => {
        let dersMatch = (secilenDers === "ALL" || (q.ders && q.ders === secilenDers)); 
        let konuMatch = (secilenKonu === "ALL" || (q.konu && q.konu === secilenKonu)); 
        let kitapMatch = (secilenKitap === "ALL" || (q.kitap && q.kitap === secilenKitap));
        return dersMatch && konuMatch && kitapMatch;
    });
    
    renderStudentLibraryListOnly(filteredData);
};

function populateLibraryFilters(data) {
    const dersler = new Set(); 
    const konular = new Set(); 
    const kitaplar = new Set();
    
    data.forEach(q => { 
        if (q.ders) dersler.add(q.ders); 
        if (q.konu) konular.add(q.konu); 
        if (q.kitap) kitaplar.add(q.kitap); 
    });
    
    document.getElementById('filter-ders').innerHTML = '<option value="ALL">Tüm Dersler</option>' + Array.from(dersler).map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
    document.getElementById('filter-konu').innerHTML = '<option value="ALL">Tüm Konular</option>' + Array.from(konular).map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
    document.getElementById('filter-kitap').innerHTML = '<option value="ALL">Tüm Kaynaklar/Kitaplar</option>' + Array.from(kitaplar).map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
}

function getSavedReviewDelayDays() {
    const saved = localStorage.getItem('gazi_review_delay_days');
    const allowed = ['1', '3', '7', '14', '30'];
    return allowed.includes(saved) ? saved : '7';
}

function renderStudentLibraryListOnly(data) {
    window.tempStdQuestions = data; 
    const div = document.getElementById('list-content');
    const savedReviewDelayDays = getSavedReviewDelayDays();
    
    if(data.length === 0) { 
        div.innerHTML = "<p style='text-align:center;'>Bu filtreye uygun soru bulunamadı.</p>"; 
    } else {
        const isLocal = document.getElementById('list-title').innerText.includes("Cihaz");
        const cloudBadge = !isLocal
            ? `<span class="cloud-badge" title="Bu soru buluta kaydetilmiştir, internet bağlantısı gerektirir">☁️ ℹ️</span>`
            : '';
        div.innerHTML = data.map((q, i) => {
            const kitapText = typeof q.kitap === 'string' ? q.kitap.trim() : '';
            const showKitap = !!kitapText && kitapText.toLowerCase() !== LEGACY_EMPTY_BOOK_TEXT;
            return `
            <div class="list-item" style="border: 2px solid #e67e22; background:#fff; position:relative;">
                <button onclick="reportQuestionFromLibrary(${i})" title="Hatalı Bildir" style="position:absolute; top:6px; right:6px; width:auto; padding:2px 7px; font-size:0.7rem; background:transparent; border:1px solid #e0e0e0; color:#bbb; border-radius:4px; cursor:pointer; line-height:1.4;">🚨</button>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:4px; margin-bottom:4px; padding-right:36px;">
                    <div>
                        <span style="background:#1e3c72; color:#fff; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">${escapeHtml(q.ders || 'Genel')}</span>
                        <b style="color:#e67e22; margin-left:5px;">${escapeHtml(q.konu)}</b>${cloudBadge}
                    </div>
                    <div>${formatReminderDate(q.nextReviewDate)}</div>
                </div>
                ${showKitap ? `<small style="color:#666;"><b>Kaynak:</b> ${escapeHtml(kitapText)}</small><br>` : ''}
                ${q.not ? `<small><b>Soru Notu:</b> ${escapeHtml(q.not)}</small><br>` : ''}
                ${q.image ? `<img src="${safeImageSrc(q.image)}" style="width:100%; border-radius:5px; margin-top:5px;">` : ''}
                <div class="abcde-grid" id="std-qbox-${i}">
                    ${['A','B','C','D','E'].map((s, idx) => `<button class="abcde-btn" onclick="checkStdAnswer(this, ${idx}, ${i})">${s}</button>`).join('')}
                </div>
                <div id="sol-std-qbox-${i}" style="display:none; margin-top:10px; padding:10px; background:#e8f4f8; border-radius:8px; font-size:0.8rem; color:#333; text-align:left;"></div>
                ${q.id ? `<div style="margin-top:10px;">
                    <label style="font-size:0.72rem; font-weight:bold; color:#8e44ad; display:block; margin-bottom:4px;">🔁 Erteleme Süresi</label>
                    <select id="std-review-delay-${i}" style="font-weight:bold; border-color:#8e44ad; color:#8e44ad; width:100%;">
                        <option value="1" ${savedReviewDelayDays === '1' ? 'selected' : ''}>1 gün</option>
                        <option value="3" ${savedReviewDelayDays === '3' ? 'selected' : ''}>3 gün</option>
                        <option value="7" ${savedReviewDelayDays === '7' ? 'selected' : ''}>7 gün</option>
                        <option value="14" ${savedReviewDelayDays === '14' ? 'selected' : ''}>14 gün</option>
                        <option value="30" ${savedReviewDelayDays === '30' ? 'selected' : ''}>30 gün</option>
                    </select>
                </div>` : ''}
                <div style="display:flex; gap:5px; margin-top:10px;">
                    ${q.id ? `<button onclick="updateReviewDateByIndex(${i}, ${isLocal})" class="outline" style="flex:2; font-size:0.8rem; border-color:#27ae60; color:#27ae60;">✅ Tekrar Ettim (Ertele)</button>` : ''}
                    ${q.id ? `<button onclick="deleteStudentQuestionByIndex(${i}, ${isLocal})" class="outline" style="flex:1; font-size:0.8rem; border-color:#c0392b; color:#c0392b;">🗑️ Sil</button>` : ''}
                </div>
            </div>`;
        }).join(''); 
    }
}

function renderStudentLibraryHTML(data, title) { 
    window.originalStdQuestions = data; 
    currentListType = "student_library"; 
    document.getElementById('list-title').innerText = `${title} (${data.length})`; 
    document.getElementById('library-filter-area').style.display = 'block'; 
    populateLibraryFilters(data);

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
        const dersSelect = document.getElementById('filter-ders');
        const konuSelect = document.getElementById('filter-konu');
        const dersOptions = dersSelect ? Array.from(dersSelect.options) : [];
        const konuOptions = konuSelect ? Array.from(konuSelect.options) : [];
        const hasDers = dersOptions.some(o => o.value === pendingFilter.subject);
        const hasKonu = konuOptions.some(o => o.value === pendingFilter.topic);
        if (hasDers) dersSelect.value = pendingFilter.subject;
        if (hasKonu) konuSelect.value = pendingFilter.topic;
        if (hasDers || hasKonu) window.applyLibraryFilters();
        else renderStudentLibraryListOnly(data);
        if (hasDers && hasKonu) {
            resolvedTopicContext = { subject: pendingFilter.subject, topic: pendingFilter.topic };
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
        localStorage.setItem('gazi_review_delay_days', String(days));
        const newDate = Date.now() + (days * 24 * 60 * 60 * 1000);
        if(!isLocal) { 
            socket.emit("updateReviewDate", { questionId: questionId, additionalDays: days }); 
        } else { 
            let localData = JSON.parse(localStorage.getItem('gazi_local_notebook')) || []; 
            const idx = localData.findIndex(x => x.id === questionId); 
            if(idx !== -1) { 
                localData[idx].nextReviewDate = newDate; 
                localStorage.setItem('gazi_local_notebook', JSON.stringify(localData)); 
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
        let localData = JSON.parse(localStorage.getItem('gazi_local_notebook')) || [];
        localData = localData.filter(x => x.id !== questionId);
        localStorage.setItem('gazi_local_notebook', JSON.stringify(localData));
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

window.startLibraryTest = () => {
    if (!window.tempStdQuestions || window.tempStdQuestions.length === 0) return alert("Kütüphanende çözülecek soru yok. Önce listeyi açmayı veya soru eklemeyi dene!");
    let pool = [...window.tempStdQuestions]; 
    for (let i = pool.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [pool[i], pool[j]] = [pool[j], pool[i]]; 
    } 
    trialQuestions = pool; 
    trialAnswers = new Array(trialQuestions.length).fill(null); 
    currentQIndex = 0; 
    currentMode = 'trial'; 
    document.getElementById('box-total').style.display = 'none'; 
    document.getElementById('trial-nav-buttons').style.display = 'flex'; 
    document.getElementById('btn-finish-trial').style.display = 'block'; 
    showScreen('screen-game');
    renderQuestionMap(trialQuestions.length, 0, []);
    openMap();
    renderTrialQuestion();
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
    
    if(selectedIdx === q.dogru) { 
        btn.classList.add('correct'); 
        confetti({ particleCount: 100 }); 
    } else { 
        btn.classList.add('wrong'); 
        if(btns[q.dogru]) btns[q.dogru].classList.add('correct'); 
    } 
    
    const sDiv = document.getElementById('sol-' + boxId); 
    sDiv.style.display = 'block'; 
    sDiv.className = 'solution-loaded';
    sDiv.innerHTML = `<b>✏️ Çözüm Notu:</b><br>${escapeHtml(q.solutionText || 'Yazılı çözüm notu bulunmuyor.')}<br>${q.solutionImage ? `<img src="${safeImageSrc(q.solutionImage)}" style="width:100%; margin-top:5px; border-radius:5px;">` : ''}`; 
};

function formatReminderDate(nextReviewDate) {
    if (!nextReviewDate) return '';
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const diff = nextReviewDate - now;
    if (diff <= 0) return '<span style="color:#e74c3c; font-weight:bold; font-size:0.75rem;">⏰ Tekrar zamanı geldi!</span>';
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.ceil(diff / MS_PER_DAY);
    if (hours < 24) return `<span style="color:#e67e22; font-size:0.75rem;">⏳ ${hours} saat sonra hatırlatılacak</span>`;
    return `<span style="color:#8e44ad; font-size:0.75rem;">📅 ${days} gün sonra hatırlatılacak</span>`;
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

window.fetchClassQuestions = () => { 
    const code = document.getElementById('class-code-input').value.trim().toUpperCase(); 
    if(!code) return alert("Lütfen önce sınıf kodunu girin!"); 
    socket.emit("getClassQuestions", code); 
};

if(socket) {
    socket.on("studentLibraryData", (data) => renderStudentLibraryHTML(data, "☁️ Bulut Hata Defterim"));
    socket.on("classQuestionsData", (data) => { 
        if(data.length === 0) return alert("Bu sınıfa henüz öğretmen tarafından soru eklenmemiş."); 
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
            </div>`).join(''); 
        showScreen('screen-list'); 
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
    
    if(!listDiv || !select) return;

    if(classes.length === 0) { 
        listDiv.innerHTML = "Henüz sınıf oluşturulmadı."; 
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
        alert("✅ Sınıfa katıldın!"); 
        document.getElementById('btn-class-questions').style.display = 'block'; 
    } else {
        alert("❌ Geçersiz Sınıf Kodu!"); 
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
    const localNB = (JSON.parse(localStorage.getItem('gazi_local_notebook')) || []).length;
    const btnLocal = document.getElementById('btn-local-open');
    if (btnLocal) btnLocal.innerText = `💾 Cihazdan Aç (${localNB})`;
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
        const sourceKeys = { 'yanlis': 'kpss_wrongs', 'bos': 'kpss_blanks', 'local': 'gazi_local_notebook' };
        const sourceNames = { 'yanlis': '❌ Yanlışlarım', 'bos': '⬜ Boş Bıraktıklarım', 'local': '📓 Hata Defterim' };
        let pool = JSON.parse(localStorage.getItem(sourceKeys[source])) || [];
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
        fetch('/questions.json')
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
        <div class="solution-loaded" style="margin-top:15px; padding:15px; background:#e8f4f8; border-radius:8px; border: 1px solid #3498db; text-align:left; color:#1e3c72; font-size:0.9rem;">
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
