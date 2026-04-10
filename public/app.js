import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, GoogleAuthProvider, signInWithRedirect, getRedirectResult, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";

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
const APP_STATE = {
    currentUser: { name: "", role: "guest", email: "" },
    room: { code: "", mode: "room" },
    quiz: { index: 0, total: 0, timerMode: "question" },
    activeListType: ""
};
const DEFAULT_ERROR_MESSAGE = "İşlem sırasında bir hata oluştu.";

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
const MAX_READY_SOURCES = 30;
// 1x1 şeffaf GIF placeholder (kaynak görseli olmayan kartlar için)
const PLACEHOLDER_IMAGE_SRC = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

function normalizeText(v) {
    return String(v || '').trim().toLocaleLowerCase('tr');
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
    setTimeout(() => { window.initEtiketleme(); }, 500);
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
const BOTTOM_NAV_SCREENS = new Set(['screen-main', 'screen-settings', 'screen-gelisim', 'screen-friends', 'screen-stats', 'screen-list', 'screen-teacher']);
const NAV_ITEM_MAP = {
    'screen-main': 'nav-ev',
    'screen-settings': null, // set dynamically by mode
    'screen-gelisim': 'nav-gelisim',
    'screen-friends': 'nav-arkadaslar',
    'screen-stats': 'nav-gelisim',
    'screen-list': 'nav-gelisim',
    'screen-teacher': 'nav-ogretmen',
};
let activeNavRole = ROLE_STUDENT;

window.applyRoleBasedBottomNav = (role = ROLE_STUDENT) => {
    activeNavRole = role === ROLE_TEACHER ? ROLE_TEACHER : ROLE_STUDENT;
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
    if (BOTTOM_NAV_SCREENS.has(id)) {
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
    try { 
        await signInWithRedirect(auth, new GoogleAuthProvider()); 
    } catch(e) { 
        alert(e.message); 
    } 
};

getRedirectResult(auth).catch(e => {
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

    if (user) { 
        let nameFromAuth = user.displayName;
        if (!nameFromAuth || nameFromAuth.split('|')[0].trim() === "") { 
            const fallbackName = user.email ? user.email.split('@')[0] : (user.isAnonymous ? "Misafir-" + user.uid.substring(0,4) : "Gazi Adayı"); 
            nameFromAuth = fallbackName + "|student"; 
        }
        
        const nameParts = nameFromAuth.split('|'); 
        const realName = nameParts[0]; 
        const role = nameParts[1] || "student";
        APP_STATE.currentUser = { name: realName, role, email: user.email || "" };
        
        document.getElementById('display-user').innerText = "Hoş Geldin, " + realName; 
        document.getElementById('profile-new-name').value = realName;
        
        const isAdmin = (user.email === "kayamert319@gmail.com"); 
        const isTeacher = (role === "teacher" || isAdmin); 
        const isPending = (role === "teacher_pending");

        if(isPending && !isAdmin) alert("⏳ Öğretmen hesabınız yönetici onayı bekliyor. Şimdilik öğrenci görünümündesiniz.");
        
        if (instPanel) instPanel.style.display = isTeacher ? "block" : "none";
        if (studentArea) studentArea.style.display = isTeacher ? "none" : "block"; 
        if (studentLibPanel) studentLibPanel.style.display = isTeacher ? "none" : "block";
        if (adminBtn) adminBtn.style.display = isAdmin ? "block" : "none";
        if (adminApproveBtn) adminApproveBtn.style.display = isAdmin ? "block" : "none";
        window.applyRoleBasedBottomNav(isTeacher ? ROLE_TEACHER : ROLE_STUDENT);

        if (isTeacher) {
            const settingsEl = document.getElementById('screen-settings');
            settingsEl.classList.remove('derslerim-mode');
            settingsEl.classList.add('profile-mode');
            document.getElementById('settings-screen-title').textContent = '👤 Profil & Ayarlar';
            NAV_ITEM_MAP['screen-settings'] = 'nav-profil';
        } else {
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

window.processImageUpload = (e, type = 'question') => {
    const file = e.target.files[0]; 
    if(!file) return; 
    
    const previewId = type === 'question' ? 'img-preview' : 'img-preview-solution';
    document.getElementById(previewId).style.display = 'block'; 
    document.getElementById(previewId).src = "https://i.gifer.com/ZKZg.gif"; 
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image(); 
        img.onload = () => {
            const canvas = document.createElement('canvas'); 
            const MAX_WIDTH = 800; 
            const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
            canvas.width = img.width * scale; 
            canvas.height = img.height * scale; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            if (type === 'question') { 
                uploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.7); 
                document.getElementById(previewId).src = uploadedImageBase64; 
            } else { 
                uploadedSolutionBase64 = canvas.toDataURL('image/jpeg', 0.7); 
                document.getElementById(previewId).src = uploadedSolutionBase64; 
            }
        }; 
        img.src = event.target.result;
    }; 
    reader.readAsDataURL(file);
};

window.processStudentImageUpload = (e, type = 'image') => {
    const file = e.target.files[0]; 
    if(!file) return;
    
    if(type === 'image') { 
        document.getElementById('std-img-preview').style.display = 'block'; 
        document.getElementById('std-img-preview').src = "https://i.gifer.com/ZKZg.gif"; 
    } else if (type === 'source') {
        const sourcePreview = document.getElementById('std-source-image-preview');
        if (sourcePreview) {
            sourcePreview.style.display = 'block';
            sourcePreview.src = "https://i.gifer.com/ZKZg.gif";
        }
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image(); 
        img.onload = () => {
            const canvas = document.createElement('canvas'); 
            const MAX_WIDTH = 800; 
            const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
            canvas.width = img.width * scale; 
            canvas.height = img.height * scale; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            if(type === 'image') { 
                stdUploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.7); 
                document.getElementById('std-img-preview').src = stdUploadedImageBase64; 
            } else if (type === 'solution') { 
                stdSolutionBase64 = canvas.toDataURL('image/jpeg', 0.7); 
                alert("✅ Çözüm fotoğrafı başarıyla eklendi!"); 
            } else if (type === 'source') {
                stdSourceImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
                const sourcePreview = document.getElementById('std-source-image-preview');
                if (sourcePreview) {
                    sourcePreview.src = stdSourceImageBase64;
                    sourcePreview.style.display = 'block';
                }
                alert("✅ Kaynakça resmi eklendi.");
            } else {
                return;
            }
        }; 
        img.src = event.target.result;
    }; 
    reader.readAsDataURL(file);
};

window.uploadQuestion = () => {
    if(!socket) return alert("Sunucuya bağlanılamadı!");
    
    const qDers = document.getElementById('new-q-ders').value.trim(); 
    const qKonu = document.getElementById('new-q-deneme').value.trim();
    const qSoru = document.getElementById('new-q-text').value.trim() || "Aşağıdaki görseli inceleyiniz."; 
    const qSiklar = ["A", "B", "C", "D", "E"];
    const qDogru = parseInt(document.getElementById('new-q-correct').value) || 0; 
    const qSolText = document.getElementById('new-q-sol-text').value.trim();
    
    if(!qDers || !qKonu) return alert("Lütfen Ders ve Konu alanlarını doldurun!"); 
    if(!window.myClassCode) return alert("⚠️ Lütfen önce bir sınıf seçin veya oluşturun!");
    
    const q = { 
        soru: qSoru, 
        siklar: qSiklar, 
        dogru: qDogru, 
        ders: qDers.toUpperCase(), 
        deneme: qKonu, 
        image: uploadedImageBase64, 
        classCode: window.myClassCode, 
        solutionText: qSolText, 
        solutionImage: uploadedSolutionBase64 
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
window.uploadStudentQuestion = (target = 'cloud') => {
    const customKonuInput = document.getElementById('custom-konu-input');
    const customKonu = customKonuInput ? customKonuInput.value.trim() : "";
    const finalTopic = customKonu || window.secilenKonu || "Genel Konu";
    const finalDers = window.secilenDers || "Genel Ders";
    
    const stdQKitap = document.getElementById('std-q-kitap');
    const qKitap = stdQKitap ? stdQKitap.value.trim() : ""; 
    
    if(!qKitap || finalTopic === "Genel Konu" || finalDers === "Genel Ders") return alert("Komutanım, lütfen Sınav, Ders, Konu ve Kaynak alanlarını eksiksiz doldurun!");
    
    const qText = document.getElementById('std-q-text').value.trim(); 
    const qSolText = document.getElementById('std-q-sol-text').value.trim(); 
    const correctIdx = parseInt(document.getElementById('std-q-correct-idx').value) || 0;
    const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı";
    
    const reminderDays = parseFloat(document.getElementById('std-q-reminder').value) || 1;
    const nextReviewDate = Date.now() + (reminderDays * 24 * 60 * 60 * 1000); 

    if(!stdUploadedImageBase64 && !qText) return alert("Lütfen bir fotoğraf yükleyin veya kendinize bir not yazın!");

    if(customKonu && finalDers !== "Genel Ders") {
        let customTopics = JSON.parse(localStorage.getItem('gazi_custom_topics')) || {};
        if(!customTopics[finalDers]) customTopics[finalDers] = [];
        if(!customTopics[finalDers].includes(customKonu)) {
            customTopics[finalDers].push(customKonu);
            localStorage.setItem('gazi_custom_topics', JSON.stringify(customTopics));
        }
    }

    localStorage.setItem('gazi_sticky_memory', JSON.stringify({
        exam: window.secilenSinav, group: window.secilenGrup, subject: finalDers, topic: finalTopic, book: qKitap, sourceImage: stdSourceImageBase64 || null
    }));
    saveReadySource(qKitap, stdSourceImageBase64);
    window.renderReadySources();
    
    const memBadge = document.getElementById('mem-badge');
    if (memBadge) memBadge.style.display = "inline-block";

    const q = { 
        id: 'local_' + Date.now(), 
        studentName: studentName, 
        ders: finalDers, 
        kitap: qKitap, 
        konu: finalTopic, 
        not: qText, 
        sourceImage: stdSourceImageBase64 || null,
        image: stdUploadedImageBase64, 
        nextReviewDate: nextReviewDate, 
        solutionImage: stdSolutionBase64, 
        solutionText: qSolText, 
        dogru: correctIdx, 
        soru: qText || "Görseli inceleyiniz.", 
        siklar: ["A", "B", "C", "D", "E"] 
    };
    
    if (target === 'cloud') {
        if(!socket) return alert("Buluta bağlanılamadı, lütfen Cihaza Kaydet seçeneğini kullanın."); 
        delete q.id; 
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
    stdUploadedImageBase64 = null; 
    stdSolutionBase64 = null;
    if (customKonuInput) customKonuInput.value = "";
    window.updateLocalListCounts();
};

window.fetchStudentLibrary = (source = 'cloud', onlyReviews = false) => {
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
                <small style="color:#666;"><b>Kaynak:</b> ${escapeHtml(q.kitap)}</small><br>
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

    renderStudentLibraryListOnly(data); 

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
