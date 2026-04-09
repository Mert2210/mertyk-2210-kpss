import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";

const firebaseConfig = { 
    apiKey: "AIzaSyDkZI-LxCOaog4kyb4YSquEK6ZpLNH2pqs", 
    authDomain: "kpss-genel-kultur-soru-havuzu.firebaseapp.com", 
    projectId: "kpss-genel-kultur-soru-havuzu", 
    storageBucket: "kpss-genel-kultur-soru-havuzu.firebasestorage.app",
    messagingSenderId: "435941343639",
    appId: "1:435941343639:web:3ce323e0f8386d796c04d2",
    measurementId: "G-CMLQJ746WT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🛡️ 1. ZIRH: BİLDİRİM SİSTEMİ ÇÖKME KORUMASI
let messaging;
try {
    messaging = getMessaging(app);
} catch (e) {
    console.warn("Bildirim sistemi şu anki bağlantı türünde desteklenmiyor, ama uygulama çalışmaya devam edecek.");
}

// 🚨 YENİ: FIREBASE BİLDİRİM (MESSAGING) İZNİ VE TOKEN ALMA FONKSİYONU
window.askNotificationPermission = async () => {
    if (!('Notification' in window)) {
        return alert("Cihazınız bildirim sistemini desteklemiyor.");
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            if (!messaging) return alert("Bildirim sistemi şu an aktif değil.");
            
            const currentToken = await getToken(messaging, { 
                vapidKey: "BDX4qn3lgjY4ymc5lCAyJVsF8aOCx7suWf12o9m5tA5WLcOLADHPPYxfGL1plWjOMMB_kgxXIfU1WY1yZgMYbmE" 
            });

            if (currentToken) {
                console.log("✅ Bildirim Token'ı Alındı:", currentToken);
                localStorage.setItem('gazi_fcm_token', currentToken);
                alert("✅ Harika! Bildirimler aktif edildi.");
            } else {
                console.warn("Token alınamadı, izin verilmemiş olabilir.");
            }
        } else {
            alert("⚠️ Bildirimlere izin vermediniz.");
        }
    } catch (error) {
        console.error("Bildirim İzni Hatası:", error);
        alert("Bildirim izni alınırken bir sorun oluştu.");
    }
};

// 🚨 YEREL VERİTABANI (INDEXED-DB) YÖNETİCİSİ 🚨
window.LocalDB = {
    dbName: "GaziKumbaramDB",
    dbVersion: 1,
    storeName: "Sorular",

    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: "id" });
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject("Veritabanı açılamadı.");
        });
    },

    saveQuestion: async function(questionObj) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], "readwrite");
                const store = transaction.objectStore(this.storeName);
                const request = store.put(questionObj); 
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(false);
            });
        } catch (error) { return false; }
    },

    getAllQuestions: async function() {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], "readonly");
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject([]);
            });
        } catch (error) { return []; }
    },

    updateQuestion: async function(questionId, updatedData) {
         try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], "readwrite");
                const store = transaction.objectStore(this.storeName);
                const getRequest = store.get(questionId);

                getRequest.onsuccess = () => {
                    const data = getRequest.result;
                    if (data) {
                        const mergedData = { ...data, ...updatedData };
                        const putRequest = store.put(mergedData);
                        putRequest.onsuccess = () => resolve(true);
                        putRequest.onerror = () => reject(false);
                    } else {
                        resolve(false);
                    }
                };
                getRequest.onerror = () => reject(false);
            });
        } catch(e) { return false; }
    }
};

// 🚨 YENİ NESİL DEV MÜFREDAT AĞACI 🚨
window.mufredat = {
    "KPSS (B Grubu & A Grubu)": {
        "Genel Yetenek - Genel Kültür (B Grubu)": {
            "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Dil Bilgisi", "Sözel Mantık"],
            "Matematik": ["Temel Kavramlar", "Rasyonel Sayılar", "Problemler", "Sayısal Mantık", "Geometri"],
            "Tarih": ["İslamiyet Öncesi", "Osmanlı Devleti", "İnkılap Tarihi", "Çağdaş Türk ve Dünya"],
            "Coğrafya": ["Türkiye Fiziki", "Türkiye Beşeri", "Türkiye Ekonomik"],
            "Vatandaşlık": ["Hukukun Temel Kavramları", "İdare Hukuku", "Güncel Bilgiler"]
        },
        "A Grubu": {
            "Muhasebe": ["Genel Muhasebe", "Maliyet", "Mali Tablolar"],
            "İktisat": ["Mikro", "Makro", "Türkiye Ekonomisi"],
            "Maliye": ["Kamu Maliyesi", "Bütçe", "Vergi Hukuku"],
            "Hukuk": ["Anayasa", "İdare", "Ceza", "Medeni"]
        }
    },
    "YKS": {
        "TYT": {
            "Türkçe": ["Anlam Bilgisi", "Dil Bilgisi", "Noktalama"],
            "Matematik": ["Sayılar", "Problemler", "Mantık", "Geometri"],
            "Fen Bilimleri": ["TYT Fizik", "TYT Kimya", "TYT Biyoloji"],
            "Sosyal Bilgiler": ["Tarih", "Coğrafya", "Felsefe", "Din"]
        },
        "AYT": {
            "Matematik": ["Polinomlar", "Türev", "İntegral", "Logaritma", "Trigonometri"],
            "Edebiyat": ["Şiir", "Divan", "Cumhuriyet"],
            "Fen Bilimleri": ["AYT Fizik", "AYT Kimya", "AYT Biyoloji"],
            "Sosyal Bilgiler": ["Tarih 1-2", "Coğrafya 1-2", "Felsefe Grubu"]
        }
    },
    "MEB AGS (Öğretmenlik Akademi Giriş)": {
        "Sözel ve Sayısal Yetenek": {
            "Sözel Yetenek": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Sözel Mantık"],
            "Sayısal Yetenek": ["Temel Kavramlar", "Problemler", "Tablo ve Grafik Okuma", "Sayısal Mantık"]
        },
        "Eğitim Bilimleri": {
            "Eğitime Giriş": ["Eğitimin Temelleri", "Türk Eğitim Sistemi"],
            "Öğretim İlke ve Yöntemleri": ["Öğretim İlkeleri", "Öğretim Stratejileri ve Modelleri", "Kavram Öğretimi"],
            "Sınıf Yönetimi": ["Sınıf Ortamı", "Disiplin ve Kurallar", "Öğretmen-Öğrenci İletişimi"],
            "Eğitim Psikolojisi": ["Gelişim Psikolojisi", "Öğrenme Psikolojisi"],
            "Ölçme ve Değerlendirme": ["Güvenirlik ve Geçerlik", "Test Geliştirme", "İstatistik"]
        },
        "Tarih ve Türkiye Coğrafyası": {
            "Tarih": ["İslamiyet Öncesi", "Osmanlı Devleti", "İnkılap Tarihi"],
            "Türkiye Coğrafyası": ["Türkiye Fiziki", "Türkiye Beşeri", "Türkiye Ekonomik"]
        },
        "ÖABT (Alan Bilgisi)": {
            "Öğretmenlik Alanları": ["Türkçe", "İlköğretim Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "Sınıf Öğretmenliği", "Okul Öncesi", "Tarih", "Coğrafya", "Lise Matematik", "Fizik", "Kimya", "Biyoloji", "İngilizce", "Din Kültürü", "PDR", "Beden Eğitimi"]
        }
    },
    "LGS": {
        "Sayısal Bölüm": {
            "Matematik": ["Çarpanlar", "Üslü/Köklü Sayılar", "Veri Analizi", "Olasılık"],
            "Fen Bilimleri": ["Mevsimler", "DNA", "Basınç", "Basit Makineler"]
        },
        "Sözel Bölüm": {
            "Türkçe": ["Paragraf", "Fiilimsiler", "Cümle Ögeleri", "Mantık Muhakeme"],
            "İnkılap Tarihi": ["Bir Kahraman Doğuyor", "Milli Uyanış"],
            "Din ve İngilizce": ["Kader İnancı", "Friendship", "Teen Life"]
        }
    },
    " Ortaokul ": {
        "Ortaokul (5, 6 ve 7. Sınıflar)": {
            "Türkçe": ["Okuma Anlama", "Sözcükte Anlam", "Dil Bilgisi", "Yazım ve Noktalama"],
            "Matematik": ["Doğal Sayılar", "Kesirler ve Ondalık", "Cebirsel İfadeler", "Geometri ve Ölçme"],
            "Fen Bilimleri": ["Güneş Sistemi", "Kuvvet ve Hareket", "Madde ve Doğası", "Işık ve Ses"],
            "Sosyal Bilgiler": ["Birey ve Toplum", "Kültür ve Miras", "Üretim ve Tüketim"]
        },
        "Lise (9, 10 ve 11. Sınıflar)": {
            "Türk Dili ve Edebiyatı": ["Şiir", "Hikaye", "Roman", "Tiyatro", "Dil Bilgisi"],
            "Matematik": ["Mantık", "Kümeler", "Denklem ve Eşitsizlik", "Fonksiyonlar", "Trigonometri", "Polinomlar"],
            "Fizik": ["Madde ve Özellikleri", "Kuvvet ve Hareket", "Elektrik", "Optik"],
            "Kimya": ["Kimya Bilimi", "Atom ve Periyodik Sistem", "Karışımlar", "Asit, Baz ve Tuzlar"],
            "Biyoloji": ["Yaşam Bilimi", "Hücre", "Kalıtım", "Sistemler"],
            "Tarih": ["Tarih ve Zaman", "İlk ve Orta Çağ", "İslam Tarihi", "Osmanlı Tarihi"],
            "Coğrafya": ["Doğa ve İnsan", "Dünya'nın Şekli", "İklim", "Nüfus ve Göç"]
        }
    }
};

window.secilenSinav = "";
window.secilenGrup = "";
window.secilenDers = "";
window.secilenKonu = "";

window.applyCustomMufredat = () => {
    const customExams = getStoredJSON('gazi_custom_exams', []);
    customExams.forEach(ex => {
        if (!window.mufredat[ex]) {
            window.mufredat[ex] = { "Genel": { "Genel Ders": [] } };
        }
    });

    const customDersler = getStoredJSON('gazi_custom_dersler', []);
    if (window.secilenSinav && window.secilenGrup && window.mufredat[window.secilenSinav]) {
        customDersler.forEach(ders => {
            if (!window.mufredat[window.secilenSinav][window.secilenGrup][ders]) {
                window.mufredat[window.secilenSinav][window.secilenGrup][ders] = ["Genel Konu"];
            }
        });
    }
};

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function isValidStoredValue(parsedValue, fallback) {
    if (Array.isArray(fallback)) return Array.isArray(parsedValue);
    if (fallback !== null && typeof fallback === 'object') {
        return parsedValue !== null && typeof parsedValue === 'object' && !Array.isArray(parsedValue);
    }
    if (fallback !== null && typeof fallback !== 'object') {
        return typeof parsedValue === typeof fallback;
    }
    return true;
}

function getStoredJSON(key, fallback) {
    try {
        const rawValue = localStorage.getItem(key);
        if (!rawValue) return fallback;
        const parsedValue = JSON.parse(rawValue);

        if (!isValidStoredValue(parsedValue, fallback)) {
            console.warn(`⚠️ '${key}' beklenen formatta olmadığı için sıfırlandı.`);
            localStorage.removeItem(key);
            return fallback;
        }

        return parsedValue;
    } catch (error) {
        console.warn(`⚠️ '${key}' verisi bozuk olduğu için sıfırlandı.`);
        localStorage.removeItem(key);
        return fallback;
    }
}

window.renderExams = (fromMemory = false) => {
    const container = document.getElementById('box-exams');
    if (!container) return;

    const exams = Object.keys(window.mufredat);
    const customExams = getStoredJSON('gazi_custom_exams', []);

    container.innerHTML = exams.map(ex => {
        const isCustom = customExams.includes(ex);
        let actionBtns = "";

        if (window.isEditMode) {
            actionBtns = `
                <span class="edit-plus-btn" title="Yeni Ders Ekle" onclick="event.stopPropagation(); window.openQuickAdd('ders', '${escapeHtml(ex)}')">➕</span>
                ${isCustom ? `<span class="edit-del-btn" title="Sınavı Sil" onclick="event.stopPropagation(); window.manageCustomItem('sinav', 'remove', '${escapeHtml(ex)}')">✖</span>` : ''}
            `;
        }

        return `<div class="chip ${window.secilenSinav === ex ? 'active' : ''}" onclick="window.selectExam('${escapeHtml(ex)}', false, this)">
                    ${ex} ${actionBtns}
                </div>`;
    }).join('');

    if (fromMemory && window.secilenSinav) {
        window.selectExam(window.secilenSinav, true);
    }
};

window.initEtiketleme = () => {
    const mem = getStoredJSON('gazi_sticky_memory', {});
    if(mem.exam) window.secilenSinav = mem.exam;
    if(mem.group) window.secilenGrup = mem.group;
    if(mem.subject) window.secilenDers = mem.subject;
    if(mem.topic) window.secilenKonu = mem.topic;
    if(mem.book) {
        const bookInput = document.getElementById('std-q-kitap');
        if (bookInput) bookInput.value = mem.book;
    }

    if(mem.exam) {
        const memBadge = document.getElementById('mem-badge');
        if (memBadge) memBadge.style.display = "inline-block";
    }

    window.renderExams(mem.exam ? true : false);
};

window.isEditMode = false;
window.toggleEditMode = () => {
    window.isEditMode = !window.isEditMode;
    const panel = document.getElementById('main-custom-panel');
    if (panel) panel.style.display = window.isEditMode ? 'block' : 'none';
    window.initEtiketleme(); 
};

window.renderSubjects = (fromMemory = false) => {
    const container = document.getElementById('box-dersler');
    const area = document.getElementById('area-ders');
    if (!container || !area) return;

    if(!window.secilenSinav || !window.secilenGrup || !window.mufredat[window.secilenSinav]?.[window.secilenGrup]) { 
        area.style.display = 'none'; return; 
    }
    
    const subjects = Object.keys(window.mufredat[window.secilenSinav][window.secilenGrup]);
    const customDersler = getStoredJSON('gazi_custom_dersler', []);

    area.style.display = 'block';
    container.innerHTML = subjects.map(s => {
        const isCustom = customDersler.includes(s);
        let actionBtns = "";

        if (window.isEditMode) {
            actionBtns = `
                <span class="edit-plus-btn" onclick="event.stopPropagation(); window.openQuickAdd('kaynak', '${escapeHtml(s)}')">➕</span>
                ${isCustom ? `<span class="edit-del-btn" onclick="event.stopPropagation(); window.manageCustomItem('ders', 'remove', '${escapeHtml(s)}')">✖</span>` : ''}
            `;
        }

        return `<div class="chip ${window.secilenDers === s ? 'active' : ''}" onclick="window.selectSubject('${escapeHtml(s)}', false, this)">
                    ${s} ${actionBtns}
                </div>`;
    }).join('');
    
    if(fromMemory && window.secilenDers) window.selectSubject(window.secilenDers, true);
};

window.selectExam = (ex, fromMemory = false, el = null) => {
    window.secilenSinav = ex;
    if(!fromMemory) { window.secilenGrup = ""; window.secilenDers = ""; window.secilenKonu = ""; 
        const memBadge = document.getElementById('mem-badge');
        if (memBadge) memBadge.style.display = "none"; 
    }
    
    document.querySelectorAll('#box-exams .chip').forEach(c => c.classList.remove('active'));
    if(el && el.classList) el.classList.add('active');
    
    window.renderGroups(fromMemory);
};

window.renderGroups = (fromMemory = false) => {
    const container = document.getElementById('box-kpss-group');
    const area = document.getElementById('area-kpss-group');
    if (!container || !area) return;

    if(!window.secilenSinav || !window.mufredat[window.secilenSinav]) { area.style.display = 'none'; return; }
    
    const groups = Object.keys(window.mufredat[window.secilenSinav]);
    area.style.display = 'block';
    container.innerHTML = groups.map(g => `<div class="chip ${window.secilenGrup === g ? 'active' : ''}" onclick="window.selectGroup('${escapeHtml(g)}', false, this)">${g}</div>`).join('');
    
    if(fromMemory && window.secilenGrup) window.selectGroup(window.secilenGrup, true);
    else {
        const areaDers = document.getElementById('area-ders');
        if (areaDers) areaDers.style.display = 'none';
    }
};

window.selectGroup = (g, fromMemory = false, el = null) => {
    window.secilenGrup = g;
    if(!fromMemory) { window.secilenDers = ""; window.secilenKonu = ""; }
    
    document.querySelectorAll('#box-kpss-group .chip').forEach(c => c.classList.remove('active'));
    if(el && el.classList) el.classList.add('active');

    window.renderSubjects(fromMemory);
};

window.selectSubject = (s, fromMemory = false, el = null) => {
    window.secilenDers = s;
    if(!fromMemory) window.secilenKonu = "";
    
    document.querySelectorAll('#box-dersler .chip').forEach(c => c.classList.remove('active'));
    if(el && el.classList) el.classList.add('active');

    window.renderTopics(fromMemory);
};

window.renderTopics = (fromMemory = false) => {
    const container = document.getElementById('box-konular');
    const area = document.getElementById('area-konu');
    if (!container || !area) return;

    if(!window.secilenDers) { area.style.display = 'none'; return; }
    
    let topics = window.mufredat[window.secilenSinav][window.secilenGrup][window.secilenDers] || [];
    const customTopics = getStoredJSON('gazi_custom_topics', {});
    if(customTopics[window.secilenDers]) topics = [...topics, ...customTopics[window.secilenDers]];

    area.style.display = 'block';
    container.innerHTML = topics.map(t => `<div class="chip ${window.secilenKonu === t ? 'active' : ''}" onclick="window.selectTopic('${escapeHtml(t)}', this)">${t}</div>`).join('');
};

window.selectTopic = (t, el = null) => {
    window.secilenKonu = t;
    document.querySelectorAll('#box-konular .chip').forEach(c => c.classList.remove('active'));
    if(el && el.classList) el.classList.add('active');
    const customInput = document.getElementById('custom-konu-input');
    if (customInput) customInput.value = ""; 
};

document.addEventListener("DOMContentLoaded", () => {
    window.applyCustomMufredat(); 
    setTimeout(() => { window.initEtiketleme(); }, 500); 
});

// 🚨 PWA VE TEMEL FONKSİYONLAR 🚨
window.onload = () => { 
    if(typeof window.updateRegGradeDropdown === 'function') window.updateRegGradeDropdown(); 
    window.checkPWAPrompts();
};

window.checkPWAPrompts = () => {
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone && !localStorage.getItem('gazi_pwa_dismissed')) {
        console.log("Uygulama tarayıcıdan açıldı. İndirme yönlendirmesi hazır.");
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
    } else {
        document.getElementById('install-guide-modal').style.display = 'flex';
    }
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Çevrimdışı mod aktif: ', reg.scope))
            .catch(err => console.log('❌ PWA Hatası: ', err));
    });
}

window.showScreen = (id) => { 
    const targetScreen = document.getElementById(id);
    if (!targetScreen) {
        console.warn(`⚠️ HATA: Gidilecek '${id}' ekranı bulunamadı!`);
        alert("Görünüm yüklenirken bir sorun oluştu. Sayfayı yenileyebilirsiniz.");
        return; 
    }

    const filterChips = document.getElementById('archive-filter-chips');
    if (filterChips) filterChips.style.display = 'none';
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    targetScreen.classList.add('active'); 
};

window.toggleDropdown = (id) => { const el = document.getElementById(id); if (el) el.classList.toggle('show'); };
window.myClassCode = localStorage.getItem("gazi_class_code") || "";
window.selectedRole = 'student';

window.setMainRole = (role) => {
    window.selectedRole = role;
    const btnS = document.getElementById('btn-main-student'); 
    const btnT = document.getElementById('btn-main-teacher');
    const tInfo = document.getElementById('teacher-info-text'); 
    const subtitle = document.getElementById('role-subtitle');
    const studentOpts = document.getElementById('reg-student-options'); 
    const teacherOpts = document.getElementById('reg-teacher-options');
    
    if(role === 'student') {
        if(btnS) btnS.classList.add('active'); 
        if(btnT) btnT.classList.remove('active');
        if(subtitle) subtitle.innerText = '(Öğrenci)';
        if(tInfo) tInfo.style.display = 'none';
        if(studentOpts) studentOpts.style.display = 'block';
        if(teacherOpts) teacherOpts.style.display = 'none';
    } else {
        if(btnT) btnT.classList.add('active'); 
        if(btnS) btnS.classList.remove('active');
        if(subtitle) subtitle.innerText = '(Öğretmen)';
        if(tInfo) tInfo.style.display = 'block';
        if(studentOpts) studentOpts.style.display = 'none';
        if(teacherOpts) teacherOpts.style.display = 'block';
    }
};

window.switchAuth = (t) => { 
    const loginBox = document.getElementById('login-box');
    const regBox = document.getElementById('reg-box');
    if (loginBox) loginBox.style.display = t === 'login' ? 'block' : 'none'; 
    if (regBox) regBox.style.display = t === 'register' ? 'block' : 'none'; 
};

window.updateRegGradeDropdown = () => {
    const typeEl = document.getElementById('reg-exam-type');
    if(!typeEl) return;
    const type = typeEl.value; 
    const area = document.getElementById('reg-grade-area'); 
    const select = document.getElementById('reg-grade'); 
    if(!area || !select) return;
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
    const type = document.getElementById('profile-exam-type')?.value; 
    const area = document.getElementById('grade-selection-area'); 
    const boxContainer = document.getElementById('grade-boxes'); 
    if(!area || !boxContainer) return;

    boxContainer.innerHTML = ''; 
    const profileGrade = document.getElementById('profile-grade');
    if (profileGrade) profileGrade.value = '';

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
};

window.openSettingsPanel = () => {
    const displayUser = document.getElementById('display-user');
    const userNameText = displayUser ? displayUser.innerText : "";
    
    const passArea = document.getElementById('password-update-area');
    if(passArea) {
        passArea.style.display = userNameText.includes("Misafir") ? 'none' : 'block';
    }
    
    const savedExams = getStoredJSON('gazi_selected_exams', []);
    document.querySelectorAll('.profile-exam-cb').forEach(cb => cb.checked = false);
    
    if (savedExams.length > 0) {
        savedExams.forEach(examVal => {
            const cb = document.querySelector(`.profile-exam-cb[value="${examVal}"]`);
            if (cb) cb.checked = true;
        });
    } else {
        const oldExam = localStorage.getItem('gazi_exam_type');
        if (oldExam) {
            const cb = document.querySelector(`.profile-exam-cb[value="${oldExam}"]`);
            if (cb) cb.checked = true;
        }
    }

    const oldDropdown = document.getElementById('profile-exam-type');
    if (oldDropdown) {
        oldDropdown.value = localStorage.getItem('gazi_exam_type') || 'kpss_lisans'; 
        if(typeof window.updateGradeDropdown === 'function') window.updateGradeDropdown();
    }
    
    const savedGrade = localStorage.getItem('gazi_grade');
    if(savedGrade) { 
        const gradeInput = document.getElementById('profile-grade');
        if (gradeInput) gradeInput.value = savedGrade; 
        setTimeout(() => { 
            document.querySelectorAll('.grade-btn').forEach(btn => { 
                if(btn.innerText === savedGrade) btn.classList.add('selected'); 
            }); 
        }, 100); 
    }

    const savedSubjects = getStoredJSON('gazi_subjects_v2', []);
    const subjects = ['tarih', 'cografya', 'vatandaslik', 'matematik', 'turkce', 'egitim', 'fizik', 'kimya', 'biyoloji', 'fen'];
    subjects.forEach(sub => { 
        const cb = document.getElementById('subj-' + sub); 
        const txt = document.getElementById('topic-' + sub); 
        if(cb && txt) { 
            cb.checked = false; 
            txt.value = ''; 
            const found = savedSubjects.find(s => s.name === cb.value); 
            if(found) { cb.checked = true; txt.value = found.topics; } 
        } 
    });

    const savedReminders = getStoredJSON('gazi_reminder_prefs', null);
    if (savedReminders) {
        const autoReminderCb = document.getElementById('set-auto-reminder');
        const reminderDaysSel = document.getElementById('set-reminder-days');
        
        if (autoReminderCb) autoReminderCb.checked = savedReminders.autoSchedule;
        if (reminderDaysSel) reminderDaysSel.value = savedReminders.defaultDays;
    }

    window.showScreen('screen-settings');
};

window.saveProfileSettings = async () => {
    try {
        const user = auth.currentUser;
        const newName = document.getElementById('profile-new-name')?.value.trim();
        const oldPass = document.getElementById('profile-old-pass')?.value.trim();
        const newPass = document.getElementById('profile-new-pass')?.value.trim();

        if (user && newName) {
            const role = (user.displayName || "").split('|')[1] || 'student';
            await updateProfile(user, { displayName: newName + "|" + role });
            const displayUser = document.getElementById('display-user');
            if(displayUser) displayUser.innerText = "Hoş Geldin, " + newName;
        }

        if (user && newPass && !user.isAnonymous) {
            if (!oldPass) return alert("⚠️ Şifre değiştirmek için lütfen mevcut şifrenizi giriniz!");
            const cred = EmailAuthProvider.credential(user.email, oldPass);
            await reauthenticateWithCredential(user, cred);
            await updatePassword(user, newPass);
            alert("✅ Şifreniz güvenle güncellendi!");
            const oldPassEl = document.getElementById('profile-old-pass');
            const newPassEl = document.getElementById('profile-new-pass');
            if (oldPassEl) oldPassEl.value = '';
            if (newPassEl) newPassEl.value = '';
        }

        const selectedExams = Array.from(document.querySelectorAll('.profile-exam-cb:checked')).map(cb => cb.value);
        if (selectedExams.length > 0) {
            localStorage.setItem('gazi_selected_exams', JSON.stringify(selectedExams));
        } else {
            const examType = document.getElementById('profile-exam-type');
            if(examType) localStorage.setItem('gazi_exam_type', examType.value);
        }

        const grade = document.getElementById('profile-grade');
        if(grade) localStorage.setItem('gazi_grade', grade.value);

        const subjectsData = [];
        ['tarih', 'cografya', 'vatandaslik', 'matematik', 'turkce', 'egitim', 'fizik', 'kimya', 'biyoloji', 'fen'].forEach(sub => {
            const cb = document.getElementById('subj-' + sub);
            if (cb && cb.checked) {
                const topicVal = document.getElementById('topic-' + sub)?.value.trim() || "";
                subjectsData.push({ name: cb.value, topics: topicVal });
            }
        });
        localStorage.setItem('gazi_subjects_v2', JSON.stringify(subjectsData));

        const overlayPrefs = {
            showResult: document.getElementById('set-show-result')?.checked ?? true,
            showText: document.getElementById('set-show-text')?.checked ?? true,
            showImage: document.getElementById('set-show-image')?.checked ?? true
        };
        localStorage.setItem('gazi_overlay_prefs', JSON.stringify(overlayPrefs));

        const reminderPrefs = {
            autoSchedule: document.getElementById('set-auto-reminder')?.checked ?? true,
            defaultDays: parseFloat(document.getElementById('set-reminder-days')?.value) || 1 
        };
        localStorage.setItem('gazi_reminder_prefs', JSON.stringify(reminderPrefs));

        localStorage.setItem('gazi_onboarding_done', 'true');
        alert("✅ Tüm çalışma masası ayarlarınız kaydedildi!");
        window.showScreen('screen-main');
        
    } catch (e) {
        console.error("Profil Kayıt Hatası:", e);
        alert("⚠️ Bir sorun oluştu. Lütfen eski şifrenizi doğru girdiğinizden emin olun.");
    }
};

// 🚨 GÜVENLİ GİRİŞ MOTORU VE ŞİFRE SIFIRLAMA (ZIRHLI VERSİYON) 🚨
window.handleLogin = async () => { 
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-pass');
    
    if(!emailEl || !passEl || !emailEl.value || !passEl.value) {
        return alert("⚠️ Lütfen e-posta ve şifrenizi eksiksiz girin!");
    }

    try { 
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'flex'; 
        
        await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value); 
    } catch(e) { 
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'none'; 
        alert("❌ Giriş Başarısız: E-posta veya şifre hatalı."); 
    } 
};

window.handleRegister = async () => {
    const e = document.getElementById('reg-email')?.value.trim(); 
    const u = document.getElementById('reg-username')?.value.trim(); 
    const p1 = document.getElementById('reg-pass')?.value; 
    const p2 = document.getElementById('reg-pass-confirm')?.value;
    
    if(!e || !u || !p1 || !p2) return alert("⚠️ Lütfen tüm alanları doldurun!");
    if(p1 !== p2) return alert("❌ Şifreler uymuyor!");
    if(p1.length < 6) return alert("❌ Şifre en az 6 karakter olmalıdır!");
    
    const regExamType = document.getElementById('reg-exam-type')?.value || "KPSS"; 
    const regGrade = document.getElementById('reg-grade')?.value || "";
    
    try { 
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'flex';
        
        const res = await createUserWithEmailAndPassword(auth, e, p1); 
        await updateProfile(res.user, { displayName: u + "|" + window.selectedRole }); 
        await sendEmailVerification(res.user);
        
        if(window.selectedRole === 'student') { 
            localStorage.setItem('gazi_exam_type', regExamType); 
            if(regGrade) localStorage.setItem('gazi_grade', regGrade); 
        } else if (window.selectedRole === 'teacher_pending') { 
            const selectedExams = Array.from(document.querySelectorAll('.t-exam-cb:checked')).map(cb => cb.value); 
            localStorage.setItem('gazi_teacher_exams', JSON.stringify(selectedExams)); 
        }

        alert("✅ Kayıt başarılı! Lütfen doğrulama maili için Gelen Kutunuzu ve SPAM (gereksiz) klasörünü kontrol edin.");
        await signOut(auth); 
        location.reload(); 
    } catch(e) { 
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'none';
        alert("❌ Kayıt Hatası: " + e.message); 
    }
};

window.handleGuestLogin = async () => { 
    try { 
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'flex';
        
        const guestName = "Misafir-" + Math.floor(1000 + Math.random() * 9000); 
        const res = await signInAnonymously(auth); 
        await updateProfile(res.user, { displayName: guestName + "|student" }); 
    } catch(e) { 
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'none';
        alert("Bağlantı Hatası: İnternetinizi kontrol edin."); 
    } 
};

window.handleGoogleLogin = async () => { 
    try { 
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'flex';
        
        await signInWithPopup(auth, new GoogleAuthProvider()); 
    } catch(e) { 
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'none';
        alert("Bağlantı iptal edildi veya hata oluştu: " + e.message); 
    } 
};

window.handleResetPassword = async () => {
    const email = prompt("Şifresini sıfırlamak istediğiniz E-posta adresinizi girin:");
    if (!email) return;
    
    try {
        await sendPasswordResetEmail(auth, email.trim());
        alert("✅ Şifre sıfırlama bağlantısı gönderildi. Lütfen spam (gereksiz) kutunuzu da kontrol edin.");
    } catch (error) {
        alert("❌ Hata: Bu e-postaya ait kayıt bulunamadı veya geçersiz e-posta.");
    }
};

// 🚨 GİRİŞ DURUMUNU KONTROL ET VE EKRANI AÇ 🚨
onAuthStateChanged(auth, user => {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.style.display = 'none';
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
        
        const displayUserEl = document.getElementById('display-user');
        if(displayUserEl) displayUserEl.innerText = "Hoş Geldin, " + realName; 
        
        const profileNewNameEl = document.getElementById('profile-new-name');
        if(profileNewNameEl) profileNewNameEl.value = realName;
        
        const isAdmin = (user.email === "kayamert319@gmail.com"); 
        const isTeacher = (role === "teacher" || isAdmin); 
        const isPending = (role === "teacher_pending");

        if(isPending && !isAdmin) alert("⏳ Öğretmen hesabınız yönetici onayı bekliyor. Şimdilik öğrenci görünümündesiniz.");
        
        if (instPanel) instPanel.style.display = isTeacher ? "block" : "none";
        if (studentArea) studentArea.style.display = isTeacher ? "none" : "block"; 
        if (studentLibPanel) studentLibPanel.style.display = isTeacher ? "none" : "block";
        if (adminBtn) adminBtn.style.display = isAdmin ? "block" : "none";
        if (adminApproveBtn) adminApproveBtn.style.display = isAdmin ? "block" : "none";

       const stdClassCode = localStorage.getItem("gazi_class_code");
        if(stdClassCode && !isTeacher) { 
            const classInput = document.getElementById('class-code-input');
            const classBtn = document.getElementById('btn-class-questions');
            
            if(classInput) classInput.value = stdClassCode; 
            if(classBtn) classBtn.style.display = 'block'; 
        }

        if(typeof window.socket !== 'undefined' && window.socket) {
            if (isTeacher) window.socket.emit("getTeacherClass", user.email);
            window.socket.emit("getFilters", window.myClassCode || "");
            if (!isTeacher) window.socket.emit("checkNotebookReviews", realName);
        }

        const savedSubjects = getStoredJSON('gazi_subjects_v2', []);
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

    } else { 
        window.showScreen('screen-auth'); 
    }
});

window.logout = () => signOut(auth).then(() => location.reload());

window.socket = null; 
try { window.socket = io(); } catch(e) { console.warn("Socket sunucusu yok."); }

window.currentMode = "room"; window.myRoom = ""; window.currentQIndex = 0; window.qInt = null; window.totalInt = null; window.trialQuestions = []; window.trialAnswers = [];
window.currentQObject = null; window.currentListType = ""; window.selectedTimerMode = "question";
window.uploadedImageBase64 = null; window.uploadedSolutionBase64 = null; 
window.stdUploadedImageBase64 = null; window.stdSolutionBase64 = null; 
window.tempStdQuestions = []; window.originalStdQuestions = [];

window.setTimerMode = (mode) => { 
    window.selectedTimerMode = mode; 
    document.getElementById('btn-mode-sec').className = mode === 'question' ? 'green' : 'outline'; 
    document.getElementById('btn-mode-min').className = mode === 'general' ? 'green' : 'outline'; 
    document.getElementById('room-q-time').placeholder = mode === 'question' ? 'Örn: 45 (Saniye)' : 'Örn: 15 (Dakika)'; 
};

window.updateFilterText = (type, el = null) => {
    const checkboxes = document.querySelectorAll(`input[name="${type}-secim"]`);
    if (el && el.type === 'checkbox') {
        if (el.value === "HEPSI" && el.checked) { 
            checkboxes.forEach(cb => { if(cb.value !== "HEPSI") cb.checked = false; }); 
        } 
        else if (el.value !== "HEPSI" && el.checked) { 
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

if(window.socket) {
    window.socket.on('updateFilters', data => {
        const dersContent = document.getElementById('ders-content');
        if (dersContent && data.dersler) { 
            dersContent.innerHTML = `<div class="checkbox-item"><input type="checkbox" name="ders-secim" value="HEPSI" checked onchange="window.updateFilterText('ders', this)"><label>TÜMÜ</label></div>` + 
            data.dersler.map(x => `<div class="checkbox-item"><input type="checkbox" name="ders-secim" value="${x}" onchange="window.updateFilterText('ders', this)"><label>${x}</label></div>`).join(''); 
            window.updateFilterText('ders'); 
        }
        const denemeContent = document.getElementById('deneme-content');
        if (denemeContent && data.denemeler) { 
            const denemeKeys = Object.keys(data.denemeler); 
            denemeContent.innerHTML = `<div class="checkbox-item"><input type="checkbox" name="deneme-secim" value="HEPSI" checked onchange="window.updateFilterText('deneme', this)"><label>TÜMÜ</label></div>` + 
            denemeKeys.map(x => `<div class="checkbox-item"><input type="checkbox" name="deneme-secim" value="${x}" onchange="window.updateFilterText('deneme', this)"><label>${x}</label></div>`).join(''); 
            window.updateFilterText('deneme'); 
        }
    });
}

window.fetchMyStats = () => { 
    if(!window.socket) return alert("Sunucuya bağlanılamadı!"); 
    const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    window.socket.emit("getMyStats", name); 
};

if(window.socket) {
    window.socket.on("myStatsData", (history) => {
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
            <div style="background:#27ae60; padding:15px; border-radius:10px; color:white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                <div style="font-size:2rem; font-weight:bold;">%${successRate}</div>
                <div style="font-size:0.8rem;">Başarı Oranı</div>
            </div>
            <div style="background:#2980b9; padding:15px; border-radius:10px; color:white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                <div style="font-size:2rem; font-weight:bold;">${totalExams}</div>
                <div style="font-size:0.8rem;">Çözülen Deneme</div>
            </div>
            <div style="background:#e67e22; padding:10px; border-radius:10px; grid-column: span 2; color:white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                <div style="font-size:1.1rem; font-weight:bold;">Toplam: ${tCorrect} Doğru | ${tWrong} Yanlış</div>
            </div>`;
        
        const histDiv = document.getElementById('stats-history');
        if(history.length === 0) { 
            histDiv.innerHTML = "<p>Henüz çözülmüş bir deneme yok.</p>"; 
        } else { 
            histDiv.innerHTML = history.slice(0,10).map(r => `
                <div class="list-item" style="border-left: 5px solid #2980b9; background: #fff; padding: 10px; margin-bottom: 8px; border-radius: 6px;">
                    <span style="float:right; color:#666; font-size:0.8rem;">${r.date}</span>
                    <b style="color:#1e3c72;">Puan: ${r.score}</b> <br>
                    <small style="color:#27ae60; font-weight:bold;">Doğru: ${r.correct}</small> | 
                    <small style="color:#c0392b; font-weight:bold;">Yanlış: ${r.wrong}</small>
                </div>`).join(''); 
        }
        window.showScreen('screen-stats');
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
            const scale = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; 
            canvas.height = img.height * scale; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            if (type === 'question') { 
                window.uploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.8); 
                document.getElementById(previewId).src = window.uploadedImageBase64; 
            } else { 
                window.uploadedSolutionBase64 = canvas.toDataURL('image/jpeg', 0.8); 
                document.getElementById(previewId).src = window.uploadedSolutionBase64; 
            }
        }; 
        img.src = event.target.result;
    }; 
    reader.readAsDataURL(file);
    e.target.value = '';
};

window.processStudentImageUpload = (e, type = 'image') => {
    const file = e.target.files[0]; 
    if(!file) return;
    
    if(type === 'image') { 
        document.getElementById('std-img-preview').style.display = 'block'; 
        document.getElementById('std-img-preview').src = "https://i.gifer.com/ZKZg.gif"; 
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image(); 
        img.onload = () => {
            const canvas = document.createElement('canvas'); 
            const MAX_WIDTH = 800; 
            const scale = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; 
            canvas.height = img.height * scale; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            if(type === 'image') { 
                window.stdUploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.8); 
                document.getElementById('std-img-preview').src = window.stdUploadedImageBase64; 
            } else { 
                window.stdSolutionBase64 = canvas.toDataURL('image/jpeg', 0.8); 
                alert("✅ Çözüm fotoğrafı başarıyla eklendi!"); 
            }
        }; 
        img.src = event.target.result;
    }; 
    reader.readAsDataURL(file);
};

window.uploadQuestion = () => {
    if(!window.socket) return alert("Sunucuya bağlanılamadı!");
    
    const qDers = document.getElementById('new-q-ders').value.trim(); 
    const qKonu = document.getElementById('new-q-deneme').value.trim();
    const qSoru = document.getElementById('new-q-text').value.trim() || "Aşağıdaki görseli inceleyiniz."; 
    const qSiklar = document.getElementById('new-q-opts').value ? document.getElementById('new-q-opts').value.split(',').map(s => s.trim()) : ["A", "B", "C", "D", "E"];
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
        image: window.uploadedImageBase64, 
        classCode: window.myClassCode, 
        solutionText: qSolText, 
        solutionImage: window.uploadedSolutionBase64 
    };
    
    window.socket.emit("addNewQuestion", q);
    
    document.getElementById('new-q-text').value = ""; 
    document.getElementById('new-q-opts').value = ""; 
    document.getElementById('new-q-ders').value = ""; 
    document.getElementById('new-q-deneme').value = ""; 
    document.getElementById('img-preview').style.display = "none"; 
    window.uploadedImageBase64 = null; 
    document.getElementById('new-q-sol-text').value = ""; 
    document.getElementById('img-preview-solution').style.display = "none"; 
    window.uploadedSolutionBase64 = null;
    
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
    
    const reminderDays = parseFloat(document.getElementById('std-q-reminder')?.value) || 1;
    const nextReviewDate = Date.now() + (reminderDays * 24 * 60 * 60 * 1000); 

    if(!window.stdUploadedImageBase64 && !qText) return alert("Lütfen bir fotoğraf yükleyin veya kendinize bir not yazın!");

    if(customKonu && finalDers !== "Genel Ders") {
        let customTopics = getStoredJSON('gazi_custom_topics', {});
        if(!customTopics[finalDers]) customTopics[finalDers] = [];
        if(!customTopics[finalDers].includes(customKonu)) {
            customTopics[finalDers].push(customKonu);
            localStorage.setItem('gazi_custom_topics', JSON.stringify(customTopics));
        }
    }

    localStorage.setItem('gazi_sticky_memory', JSON.stringify({
        exam: window.secilenSinav, group: window.secilenGrup, subject: finalDers, topic: finalTopic, book: qKitap
    }));
    
    const memBadge = document.getElementById('mem-badge');
    if (memBadge) memBadge.style.display = "inline-block";

    const q = { 
        id: 'local_' + Date.now(), 
        studentName: studentName, 
        ders: finalDers, 
        kitap: qKitap, 
        konu: finalTopic, 
        not: qText, 
        image: window.stdUploadedImageBase64, 
        nextReviewDate: nextReviewDate, 
        solutionImage: window.stdSolutionBase64, 
        solutionText: qSolText, 
        dogru: correctIdx, 
        soru: qText || "Görseli inceleyiniz.", 
        siklar: ["A", "B", "C", "D", "E"] 
    };
    
    if (target === 'cloud') {
        if(!window.socket) return alert("Buluta bağlanılamadı, lütfen Cihaza Kaydet seçeneğini kullanın."); 
        delete q.id; 
        window.socket.emit("addStudentQuestion", q);
        alert(`✅ Soru BULUT Hata Defterinize eklendi!`);
    } else {
        window.LocalDB.saveQuestion(q).then((basariliMi) => {
            if(basariliMi) {
                alert(`💾 Soru CİHAZINIZA başarıyla kaydedildi!\nİnternetsiz de çözebilirsiniz.`);
            } else {
                alert("❌ Soru cihazınıza kaydedilemedi. Lütfen tekrar deneyin.");
            }
        });
    }
    
    document.getElementById('std-q-text').value = ""; 
    document.getElementById('std-q-sol-text').value = ""; 
    const stdImgPreview = document.getElementById('std-img-preview');
    if (stdImgPreview) stdImgPreview.style.display = "none"; 
    window.stdUploadedImageBase64 = null; 
    window.stdSolutionBase64 = null;
    if (customKonuInput) customKonuInput.value = "";
};

window.fetchStudentLibrary = async (source = 'cloud', onlyReviews = false) => {
    try {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.style.display = 'flex'; 

        const filterChips = document.getElementById('archive-filter-chips');
        if (filterChips) filterChips.style.display = 'flex';

        window.currentListType = "student_library";
        const listTitle = document.getElementById('list-title');
        if (listTitle) listTitle.innerText = "📚 Soru Arşivim";

        if(source === 'cloud') {
            if(!window.socket) {
                if (loader) loader.style.display = 'none';
                return alert("❌ Sunucu bağlantısı yok! Lütfen Node.js sunucunuzun (backend) çalıştığından emin olun.");
            }
            
            const displayUser = document.getElementById('display-user');
            const studentName = displayUser ? displayUser.innerText.replace("Hoş Geldin, ", "").trim() : "Gazi Adayı";
            
            window.socket.emit("getStudentLibrary", { studentName: studentName, onlyReviews: onlyReviews });
            
            setTimeout(() => {
                const listScreen = document.getElementById('screen-list');
                if (listScreen && !listScreen.classList.contains('active')) {
                    if (loader) loader.style.display = 'none';
                    alert("⏳ Sunucudan zamanında cevap gelmedi. İnternetinizi veya backend'i kontrol edin.");
                }
            }, 4000);

        } else {
            let localData = await window.LocalDB.getAllQuestions();
            if (!Array.isArray(localData)) localData = [];
            
            if(onlyReviews) {
                const now = Date.now();
                localData = localData.filter(q => q.nextReviewDate && q.nextReviewDate <= now);
            } else {
                localData.reverse();
            }
            
            if (loader) loader.style.display = 'none';
            window.renderStudentLibraryHTML(localData, "💾 Cihaz Hata Defterim");
        }
    } catch (e) {
        if (document.getElementById('loading-overlay')) document.getElementById('loading-overlay').style.display = 'none';
        alert("❌ Arşiv açılırken kritik bir hata oluştu: " + e.message);
    }
};

window.applyLibraryFilters = () => {
    try {
        const secilenDers = document.getElementById('filter-ders')?.value || "ALL"; 
        const secilenKonu = document.getElementById('filter-konu')?.value || "ALL"; 
        const secilenKitap = document.getElementById('filter-kitap')?.value || "ALL";
        
        let filteredData = window.originalStdQuestions.filter(q => {
            let dersMatch = (secilenDers === "ALL" || (q.ders && q.ders === secilenDers)); 
            let konuMatch = (secilenKonu === "ALL" || (q.konu && q.konu === secilenKonu)); 
            let kitapMatch = (secilenKitap === "ALL" || (q.kitap && q.kitap === secilenKitap));
            return dersMatch && konuMatch && kitapMatch;
        });
        
        window.renderStudentLibraryListOnly(filteredData);
    } catch (e) {
        console.error("Filtre hatası:", e);
    }
};

window.populateLibraryFilters = (data) => {
    const dersler = new Set(); 
    const konular = new Set(); 
    const kitaplar = new Set();
    
    data.forEach(q => { 
        if (q.ders) dersler.add(q.ders); 
        if (q.konu) konular.add(q.konu); 
        if (q.kitap) kitaplar.add(q.kitap); 
    });
    
    const filterDers = document.getElementById('filter-ders');
    const filterKonu = document.getElementById('filter-konu');
    const filterKitap = document.getElementById('filter-kitap');

    if(filterDers) filterDers.innerHTML = '<option value="ALL">Tüm Dersler</option>' + Array.from(dersler).map(d => `<option value="${d}">${d}</option>`).join('');
    if(filterKonu) filterKonu.innerHTML = '<option value="ALL">Tüm Konular</option>' + Array.from(konular).map(k => `<option value="${k}">${k}</option>`).join('');
    if(filterKitap) filterKitap.innerHTML = '<option value="ALL">Tüm Kaynaklar/Kitaplar</option>' + Array.from(kitaplar).map(k => `<option value="${k}">${k}</option>`).join('');
};

window.renderStudentLibraryListOnly = (data) => {
    const safeData = Array.isArray(data) ? data : [];
    window.tempStdQuestions = safeData; 
    const div = document.getElementById('list-content');
    if (!div) return;
    
    if(safeData.length === 0) { 
        div.innerHTML = `
        <div style="text-align:center; padding:30px; background:#fff3f3; border-radius:10px; border:2px dashed #e74c3c; margin-top:20px;">
            <h1 style="font-size:3rem; margin:0;">📭</h1>
            <h3 style="color:#c0392b; margin-top:10px;">Arşivin Şu An Bomboş!</h3>
            <p style="color:#666; font-size:0.9rem;">Henüz bu filtreye uygun bir soru eklememişsin veya sorular buluta yüklenmemiş.</p>
        </div>`; 
    } else {
        const listTitleEl = document.getElementById('list-title');
        const isLocal = listTitleEl ? listTitleEl.innerText.includes("Cihaz") : false;

        div.innerHTML = safeData.map((q, i) => `
        <div class="list-item" style="border: 2px solid #e67e22; background:#fff; margin-bottom:10px; padding: 15px; border-radius: 8px;">
            <span style="background:#1e3c72; color:#fff; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">${q.ders || 'Genel'}</span> 
            <b style="color:#e67e22; margin-left:5px;">${q.konu || ''}</b><br>
            <small style="color:#666;"><b>Kaynak:</b> ${q.kitap || ''}</small><br>
            ${q.not ? `<small style="display:block; margin-top:5px; padding:5px; background:#f9f9f9; border-radius:5px; color:#333;"><b>Not:</b> ${q.not}</small>` : ''}
            ${q.image ? `<img src="${q.image}" style="width:100%; border-radius:5px; margin-top:5px;">` : ''}
            <div class="abcde-grid" id="std-qbox-${i}">
                ${['A','B','C','D','E'].map((s, idx) => `<button class="abcde-btn" onclick="window.checkStdAnswer(this, ${idx}, ${i})">${s}</button>`).join('')}
            </div>
            <div id="sol-std-qbox-${i}" style="display:none; margin-top:10px; padding:10px; background:#e8f4f8; border-radius:8px; font-size:0.8rem; color:#333; text-align:left;"></div>
            <div style="display:flex; gap:5px; margin-top:10px;">
                ${q.id ? `<button onclick="window.updateReviewDate('${q.id}', ${isLocal})" class="outline" style="flex:2; font-size:0.8rem; border-color:#27ae60; color:#27ae60;">✅ Tekrar Ettim (Ertele)</button>` : ''}
                <button onclick="window.reportQuestionFromLibrary(${i})" class="outline" style="flex:1; font-size:0.8rem; border-color:#c0392b; color:#c0392b;">🚨 Bildir</button>
            </div>
        </div>`).join(''); 
    }
};

window.renderStudentLibraryHTML = (data, title) => { 
    try {
        const safeData = Array.isArray(data) ? data : [];
        window.originalStdQuestions = safeData; 
        window.currentListType = "student_library"; 
        
        const titleEl = document.getElementById('list-title');
        if(titleEl) titleEl.innerText = title; 
        
        const filterArea = document.getElementById('library-filter-area');
        if(filterArea) filterArea.style.display = 'block'; 
        
        window.populateLibraryFilters(safeData); 
        window.renderStudentLibraryListOnly(safeData); 
        window.showScreen('screen-list'); 
    } catch (e) {
        alert("Ekrana çizim yapılırken hata oluştu: " + e.message);
    }
};

window.startLibraryTest = () => {
    if (!window.tempStdQuestions || window.tempStdQuestions.length === 0) return alert("Kütüphanende çözülecek soru yok. Önce listeyi açmayı veya soru eklemeyi dene!");
    let pool = [...window.tempStdQuestions]; 
    for (let i = pool.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [pool[i], pool[j]] = [pool[j], pool[i]]; 
    } 
    window.trialQuestions = pool; 
    window.trialAnswers = new Array(window.trialQuestions.length).fill(null); 
    window.currentQIndex = 0; 
    window.currentMode = 'trial'; 
    document.getElementById('box-total').style.display = 'none'; 
    document.getElementById('trial-nav-buttons').style.display = 'flex'; 
    document.getElementById('btn-finish-trial').style.display = 'block'; 
    window.showScreen('screen-game'); 
    window.renderTrialQuestion();
};

window.reportQuestionFromLibrary = (index) => { 
    const q = window.tempStdQuestions[index]; 
    if(q && window.socket) { 
        window.socket.emit('reportQuestion', q); 
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

    const overlay = document.getElementById('solution-overlay');
    const content = document.getElementById('overlay-solution-content');
    
    if(overlay && content) {
        overlay.classList.add('active');

        const prefs = getStoredJSON('gazi_overlay_prefs', { showResult: true, showText: true, showImage: true });
        
        let resultHTML = prefs.showResult ? `
            <p style="margin-bottom:5px;"><b>Senin Cevabın:</b> ${['A','B','C','D','E'][selectedIdx]}</p>
            <p style="margin-bottom:15px;"><b>Doğru Cevap:</b> ${['A','B','C','D','E'][q.dogru]}</p>
            <hr style="opacity:0.2;">` : '';

        let textHTML = prefs.showText ? `
            <b style="color:#1e3c72; font-size:1.2rem;">✏️ Çözüm Analizi</b><br>
            <p style="margin-top:10px;">${q.solutionText || 'Yazılı bir not bulunmuyor.'}</p>` : '';

        let imageHTML = (prefs.showImage && q.solutionImage) ? `
            <img src="${q.solutionImage}" style="width:100%; border-radius:10px; margin-top:15px; box-shadow:0 5px 15px rgba(0,0,0,0.1);">` : '';

        content.innerHTML = `
            <div style="background:#fff; padding:15px; border-radius:10px; border:1px solid #eee; margin-top:10px; color:#333;">
                ${resultHTML}
                <div style="margin-top:15px;">
                    ${textHTML}
                    ${imageHTML}
                </div>
            </div>
        `;

        const timeArea = document.getElementById('time-selector-area');
        if(timeArea) timeArea.style.display = 'none';
    }
};

window.showTimeOptions = () => {
    const area = document.getElementById('time-selector-area');
    if(area) {
        area.style.display = 'block';
        area.scrollIntoView({ behavior: 'smooth' });
    }
};

window.scheduleAndNext = async (days) => {
    const q = window.tempStdQuestions[window.currentQIndex];
    if(q && (q.id || q._id)) {
        const targetId = q.id || q._id;
        const newDate = Date.now() + (days * 24 * 60 * 60 * 1000);
        
        if(String(targetId).startsWith('local_')) {
            await window.LocalDB.updateQuestion(targetId, { nextReviewDate: newDate });
        } else {
            if(window.socket) window.socket.emit("updateReviewDate", { questionId: targetId, additionalDays: days });
        }
        alert("✅ Soru " + (days < 1 ? "saatler" : days + " gün") + " sonrasına planlandı!");
    }
    window.closeOverlayAndNext();
};

window.pushToBack = () => {
    if(window.tempStdQuestions.length > 1) {
        const q = window.tempStdQuestions.splice(window.currentQIndex, 1)[0];
        window.tempStdQuestions.push(q); 
        alert("🔄 Soru listenin sonuna atıldı, tur bitince tekrar sorulacak.");
    }
    window.closeOverlayAndNext();
};

window.closeOverlayAndNext = () => {
    const overlay = document.getElementById('solution-overlay');
    if(overlay) overlay.classList.remove('active');
    
    if(window.currentMode === 'trial' || window.currentMode === 'room') {
        if(typeof window.trialNext === 'function') window.trialNext();
    }
};

window.fetchClassQuestions = () => { 
    const code = document.getElementById('class-code-input').value.trim().toUpperCase(); 
    if(!code) return alert("Lütfen önce sınıf kodunu girin!"); 
    if (!window.socket) return alert("❌ Sunucu bağlantısı koptu. Sayfayı yenileyiniz.");
    window.socket.emit("getClassQuestions", code); 
};

if(window.socket) {
    window.socket.on("studentLibraryData", (data) => {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.style.display = 'none';
        window.renderStudentLibraryHTML(data, "☁️ Bulut Hata Defterim");
    });
    
    window.socket.on("classQuestionsData", (data) => { 
        if(data.length === 0) return alert("Bu sınıfa henüz öğretmen tarafından soru eklenmemiş."); 
        window.tempStdQuestions = data; 
        window.startLibraryTest(); 
    });

    window.socket.on("teacherReportsData", (data) => {
        window.currentListType = "teacher_report"; 
        document.getElementById('list-title').innerText = "📊 Sınıf İstihbarat Raporu"; 
        
        const reports = Array.isArray(data) ? data : []; 
        
        if(reports.length === 0) {
            document.getElementById('list-content').innerHTML = `
                <div style="text-align:center; padding:20px; background:#fff; border-radius:10px;">
                    <h1 style="font-size:3rem; margin:0; opacity:0.5;">📭</h1>
                    <p style="color:#666;">Henüz bu sınıfa ait çözülmüş bir deneme yok.</p>
                </div>`;
            window.showScreen('screen-list');
            return;
        }

        let totalScore = 0, totalCorrect = 0, totalWrong = 0, totalBlank = 0;
        reports.forEach(r => {
            totalScore += (r.score || 0);
            totalCorrect += (r.correct || 0);
            totalWrong += (r.wrong || 0);
            totalBlank += (r.blank || 0);
        });
        const count = reports.length;
        const avgScore = Math.round(totalScore / count);
        
        let html = `
        <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding:15px; border-radius:12px; color:white; margin-bottom:20px; box-shadow:0 4px 15px rgba(0,0,0,0.15);">
            <h4 style="margin:0 0 15px 0; color:#f1c40f; text-align:center; font-size:1.1rem;">🌟 Sınıf Genel Durumu</h4>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="text-align:center; flex:1;">
                    <div style="font-size:2rem; font-weight:bold; color:#fff;">${avgScore}</div>
                    <div style="font-size:0.75rem; opacity:0.9;">Ort. Puan</div>
                </div>
                <div style="text-align:center; flex:1; border-left:1px solid rgba(255,255,255,0.2); border-right:1px solid rgba(255,255,255,0.2);">
                    <div style="font-size:2rem; font-weight:bold; color:#fff;">${count}</div>
                    <div style="font-size:0.75rem; opacity:0.9;">Deneme</div>
                </div>
                <div style="text-align:center; flex:1; line-height:1.2;">
                    <div style="font-size:0.85rem; color:#2ecc71; font-weight:bold;">${totalCorrect} D</div>
                    <div style="font-size:0.85rem; color:#e74c3c; font-weight:bold;">${totalWrong} Y</div>
                    <div style="font-size:0.85rem; color:#bdc3c7; font-weight:bold;">${totalBlank} B</div>
                </div>
            </div>
        </div>`;

        html += `<h4 style="color:#27ae60; margin-top:0; border-bottom:2px solid #eee; padding-bottom:5px; background:#fff; padding:10px; border-radius:5px;">Sıralama ve Performanslar</h4>`;
        
        reports.sort((a,b) => (b.score || 0) - (a.score || 0));

        html += reports.map((r, index) => {
            let medal = `<span style="color:#7f8c8d; font-weight:900;">${index+1}.</span>`;
            if(index === 0) medal = "🥇";
            else if (index === 1) medal = "🥈";
            else if (index === 2) medal = "🥉";

            const totalQ = (r.correct||0) + (r.wrong||0) + (r.blank||0);
            const cPct = totalQ > 0 ? ((r.correct||0) / totalQ) * 100 : 0;
            const wPct = totalQ > 0 ? ((r.wrong||0) / totalQ) * 100 : 0;
            const bPct = totalQ > 0 ? ((r.blank||0) / totalQ) * 100 : 0;

            return `
            <div class="list-item" style="border-left:5px solid ${index === 0 ? '#f1c40f' : (index === 1 ? '#bdc3c7' : (index === 2 ? '#cd7f32' : '#3498db'))}; margin-bottom:12px; box-shadow:0 2px 5px rgba(0,0,0,0.05); background:#fff; padding:15px; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <b style="font-size:1.05rem; color:#1e3c72; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:65%;">${medal} ${r.name}</b>
                    <span style="background:#e8f4f8; color:#2980b9; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:0.85rem;">${r.score} Puan</span>
                </div>
                
                <div style="width:100%; height:8px; background:#ecf0f1; border-radius:4px; display:flex; overflow:hidden; margin-bottom:6px;">
                    <div style="width:${cPct}%; background:#2ecc71;" title="Doğru"></div>
                    <div style="width:${wPct}%; background:#e74c3c;" title="Yanlış"></div>
                    <div style="width:${bPct}%; background:#bdc3c7;" title="Boş"></div>
                </div>
                
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:bold;">
                    <span style="color:#27ae60;">${r.correct||0} Doğru</span>
                    <span style="color:#c0392b;">${r.wrong||0} Yanlış</span>
                    <span style="color:#7f8c8d;">${r.blank||0} Boş</span>
                </div>
            </div>`;
        }).join('');
        
        document.getElementById('list-content').innerHTML = html; 
        window.showScreen('screen-list');
    });

    window.socket.on("classMistakesData", (data) => {
        window.currentListType = "class_mistakes"; 
        document.getElementById('list-title').innerText = "📉 Sınıf Yanlış Analizi"; 
        const div = document.getElementById('list-content');
        
        if(data.length === 0) div.innerHTML = "<p style='text-align:center; background:#fff; padding:20px; border-radius:10px;'>Bu sınıfa ait hata kaydı bulunamadı.</p>"; 
        else div.innerHTML = data.map(m => `
            <div class="list-item" style="border-left: 5px solid #c0392b; background:#fff; padding:15px; border-radius:8px; margin-bottom:10px;">
                <small style="color:#1e3c72; font-weight:bold;">${m.ders} | ${m.konu}</small><br>
                <b style="color:#333;">Soru Metni:</b> <span style="color:#555;">${m.soru}</span> <br>
                <div style="margin-top:5px; background:#fff3f3; padding:5px; border-radius:5px; color:#c0392b; font-weight:bold; font-size:0.85rem;">
                    ⚠️ Bu soru sınıfta toplam ${m.count} kez yanlış yapıldı!
                </div>
            </div>`).join(''); 
        window.showScreen('screen-list');
    });

    window.socket.on("teacherLibraryData", (data) => { 
        const filterArea = document.getElementById('library-filter-area');
        if (filterArea) filterArea.style.display = 'none'; 
        
        window.tempStdQuestions = data; 
        window.currentListType = "teacher_library"; 
        
        const listTitle = document.getElementById('list-title');
        if(listTitle) listTitle.innerText = "📚 Soru Kütüphanem"; 
        
        const div = document.getElementById('list-content'); 
        if(!div) return; 

        if(data.length === 0) {
            div.innerHTML = "<p style='text-align:center; background:#fff; padding:20px; border-radius:10px;'>Kütüphanenizde henüz soru bulunmuyor.</p>"; 
        } else {
            div.innerHTML = data.map((q, i) => `
            <div class="list-item" style="border-left: 5px solid #e67e22; background:#fff; padding:15px; border-radius:8px; margin-bottom:10px;">
                <b style="color:#333;">Soru:</b> <span style="color:#555;">${q.soru}</span> <br>
                <span style="color:#27ae60;"><b>Cevap:</b> ${q.siklar ? q.siklar[q.dogru] : 'Bilinmiyor'}</span> <br>
                <small style="color:#777;">Ders: ${q.ders} | Konu: ${q.deneme}</small><br>
                ${q.image ? `<img src="${q.image}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''} 
                ${q.solutionText || q.solutionImage ? `<div style="background:#e8f4f8; padding:8px; border-radius:5px; margin-top:5px; font-size:0.8rem; color:#1e3c72;"><b>👨‍🏫 Çözüm:</b> ${q.solutionText || ''} ${q.solutionImage ? '<br><span style="color:#27ae60;">[Görsel Ekli]</span>' : ''}</div>` : ''} 
                <button onclick="window.reportQuestionFromLibrary(${i})" class="outline" style="margin-top:10px; font-size:0.75rem; border-color:#c0392b; color:#c0392b;">🚨 Hatalı Bildir</button>
            </div>`).join(''); 
        }
        window.showScreen('screen-list'); 
    });

    window.socket.on("notebookReviewsCount", (count) => { 
        const box = document.getElementById('review-alert-box'); 
        if (box) { 
            if(count > 0) {
                box.style.display = 'block'; 
                const countText = document.getElementById('review-q-count');
                if (countText) countText.innerText = count;
            } else {
                box.style.display = 'none'; 
            }
        }
    });
    
    window.socket.on("pendingTeachersData", (data) => { 
        window.currentListType = "admin_approval"; 
        document.getElementById('list-title').innerText = "👨‍🏫 Onay Bekleyen Öğretmenler"; 
        const div = document.getElementById('list-content'); 
        if(data.length === 0) div.innerHTML = "<p style='text-align:center; background:#fff; padding:20px; border-radius:10px;'>Onay bekleyen öğretmen bulunmuyor.</p>"; 
        else div.innerHTML = data.map((t, i) => `
            <div class="list-item" style="border-left: 5px solid #8e44ad; background:#fff; padding:15px; border-radius:8px; margin-bottom:10px;">
                <b style="color:#333;">İsim:</b> <span style="color:#555;">${t.name}</span> <br>
                <b style="color:#333;">E-posta:</b> <span style="color:#555;">${t.email}</span> <br>
                <button onclick="window.approveTeacher('${t.email}')" class="green" style="margin-top:5px; padding:5px 10px; font-size:0.8rem; width:auto;">✅ Onayla</button>
            </div>`).join(''); 
        window.showScreen('screen-list'); 
    });
}

window.refreshTeacherClasses = () => {
    document.getElementById('teacher-classes-list').innerHTML = "Yükleniyor...";
    if(window.socket) window.socket.emit("getTeacherClass", auth.currentUser.email);
    setTimeout(() => { 
        const div = document.getElementById('teacher-classes-list'); 
        if(div.innerHTML === "Yükleniyor...") div.innerHTML = "Sınıf bulunamadı veya bağlantı kurulamadı."; 
    }, 3000);
};

window.fetchTeacherReports = () => { 
    if(window.socket) { 
        const code = prompt("Sınıf Kodunuzu Giriniz (Örn: GZ123):", window.myClassCode); 
        if(code) window.socket.emit("getTeacherReports", code.toUpperCase()); 
    } 
};

window.fetchClassMistakes = () => { 
    if(window.socket) { 
        const code = prompt("Sınıf Kodunuzu Giriniz (Örn: GZ123):", window.myClassCode); 
        if(code) window.socket.emit("getClassMistakes", code.toUpperCase()); 
    } 
};

window.fetchMyLibrary = () => { 
    if(!window.socket) return; 
    if(!window.myClassCode) return alert("Önce bir sınıf seçmelisiniz."); 
    window.socket.emit("getTeacherLibrary", window.myClassCode); 
};

window.fetchPendingTeachers = () => { if(window.socket) window.socket.emit("getPendingTeachers"); };
window.approveTeacher = (email) => { if(window.socket) { window.socket.emit("approveTeacher", email); alert("✅ Onay isteği sunucuya gönderildi!"); } };
window.openEvaluation = () => { if(window.socket) { window.socket.emit("getEvaluationData", window.myClassCode); window.showScreen('screen-eval'); } };

window.createNewNamedClass = () => { 
    const className = document.getElementById('new-class-name').value.trim(); 
    if(!className) return alert("Lütfen bir sınıf adı girin!"); 
    const teacherEmail = auth.currentUser.email; 
    if(window.socket) window.socket.emit("createNamedClass", { teacherEmail, className }); 
    document.getElementById('new-class-name').value = ""; 
};

window.uploadQuestionToNamedClass = () => { 
    const selectedClass = document.getElementById('target-class-select').value; 
    if(!selectedClass) return alert("Lütfen önce soruyu göndereceğiniz sınıfı seçin!"); 
    window.myClassCode = selectedClass; 
    window.uploadQuestion(); 
};

if(window.socket) {
    window.socket.on("teacherClassesData", (classes) => {
        const listDiv = document.getElementById('teacher-classes-list'); 
        const select = document.getElementById('target-class-select');
        
        if(classes.length === 0) { 
            listDiv.innerHTML = "Henüz sınıf oluşturulmadı."; 
            select.innerHTML = '<option value="">Önce Sınıf Oluşturun</option>'; 
            return; 
        }
        
        listDiv.innerHTML = classes.map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; background:rgba(255,255,255,0.1); padding:8px; border-radius:6px; color:white;">
                <span><b>${c.name}</b> (${c.code})</span>
                <button onclick="window.copyToClipboard('${c.code}')" style="width:auto; padding:4px 8px; font-size:0.7rem; background:#3498db; border:none; color:white; border-radius:4px; cursor:pointer;">Kopyala</button>
            </div>`).join('');
        
        select.innerHTML = '<option value="">--- Sınıf Seçin ---</option>' + classes.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
    });
}

window.copyToClipboard = (text) => { 
    navigator.clipboard.writeText(text).then(() => { alert("✅ Sınıf kodu kopyalandı: " + text); }); 
};

window.createClass = () => { 
    if(window.socket) { 
        const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
        window.socket.emit("createClass", name); 
    } 
};

if(window.socket) { 
    window.socket.on("classCreated", (code) => { 
        document.getElementById('generated-code').innerText = "KODUNUZ: " + code; 
        window.myClassCode = code; 
        localStorage.setItem("gazi_class_code", code); 
        window.socket.emit("getFilters", window.myClassCode); 
    }); 
    window.socket.on("teacherClassFound", (code) => { 
        document.getElementById('generated-code').innerText = "KODUNUZ: " + code; 
        window.myClassCode = code; 
        localStorage.setItem("gazi_class_code", code); 
        window.socket.emit("getFilters", window.myClassCode); 
    }); 
}

window.joinClass = () => { 
    if(!window.socket) return; 
    const code = document.getElementById('class-code-input').value.trim().toUpperCase(); 
    const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    if(!code) return alert("Sınıf kodu girin!"); 
    window.socket.emit("joinClass", { code, studentName: name }); 
    localStorage.setItem("gazi_class_code", code); 
    document.getElementById('btn-class-questions').style.display = 'block';
};

if(window.socket) {
    window.socket.on("classJoined", (res) => { 
        if(res.success) { 
            window.myClassCode = res.code; 
            localStorage.setItem("gazi_class_code", res.code); 
            window.socket.emit("getFilters", window.myClassCode); 
            alert("✅ Sınıfa katıldın!"); 
            document.getElementById('btn-class-questions').style.display = 'block'; 
        } else {
            alert("❌ Geçersiz Sınıf Kodu!"); 
        }
    });
}

window.publishAlert = () => { 
    if(!window.socket) return; 
    const msg = document.getElementById('alert-text').value.trim(); 
    if(!msg) return alert("Boş duyuru gönderilemez!"); 
    const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    window.socket.emit("sendGlobalAlert", { message: msg, sender: name }); 
    document.getElementById('alert-text').value = ""; 
    alert("🚀 Duyuru gönderildi!"); 
};

if(window.socket) {
    window.socket.on("receiveGlobalAlert", (data) => { 
        const toast = document.getElementById('notification-toast'); 
        const toastMessage = document.getElementById('toast-message');
        if (toast && toastMessage) {
            toastMessage.innerHTML = `<span style="color:#e67e22;">${data.sender}:</span><br>${data.message}`; 
            toast.classList.add('show'); 
            setTimeout(() => { toast.classList.remove('show'); }, 6000); 
        }
    });
}

window.saveToLocal = (key, qObj) => { 
    let list = getStoredJSON(key, []); 
    if(!list.find(x => x.soru === qObj.soru)) { 
        list.push(qObj); 
        localStorage.setItem(key, JSON.stringify(list)); 
    } 
};

window.removeFromLocal = (key, qObj) => { 
    let list = getStoredJSON(key, []); 
    list = list.filter(x => x.soru !== qObj.soru); 
    localStorage.setItem(key, JSON.stringify(list)); 
};

window.checkIsFav = (qObj) => { 
    return getStoredJSON('kpss_favs', []).some(x => x.soru === qObj.soru); 
};

window.toggleFavCurrent = () => { 
    if(!window.currentQObject) return; 
    const btn = document.getElementById('btn-fav-current'); 
    if(window.checkIsFav(window.currentQObject)) { 
        window.removeFromLocal('kpss_favs', window.currentQObject); 
        btn.style.color = "#ccc"; 
        btn.innerText = "☆"; 
    } else { 
        window.saveToLocal('kpss_favs', window.currentQObject); 
        btn.style.color = "#f1c40f"; 
        btn.innerText = "⭐"; 
    } 
};

window.reportQuestion = () => { 
    if(!window.currentQObject || !window.socket) return; 
    window.socket.emit('reportQuestion', window.currentQObject); 
    window.saveToLocal('kpss_reports', window.currentQObject); 
    alert("🚨 Bu soru merkeze bildirildi."); 
};

window.fetchAdminReports = () => { 
    if(window.socket) {
        const currentUserEmail = auth.currentUser ? auth.currentUser.email : "misafir";
        window.socket.emit("adminGetReports", currentUserEmail); 
    }
};

if(window.socket) {
    window.socket.on("allReportsData", (data) => { 
        window.currentListType = "admin_report"; 
        document.getElementById('list-title').innerText = "👑 Merkezi Hata Raporları"; 
        const contentDiv = document.getElementById('list-content'); 
        if(data.length === 0) {
            contentDiv.innerHTML = "<p style='text-align:center; background:#fff; padding:20px; border-radius:10px;'>Henüz rapor yok.</p>"; 
        } else {
            contentDiv.innerHTML = data.map((q, i) => `
                <div class="list-item" style="border-left: 5px solid #c0392b; background:#fff; padding:15px; border-radius:8px; margin-bottom:10px;">
                    <b style="color:#333;">Soru:</b> <span style="color:#555;">${q.soru}</span> <br>
                    <span style="color:#27ae60;"><b>Cevap:</b> ${q.siklar ? q.siklar[q.dogru] : '---'}</span> <br>
                    <small style="color:#777;">Tarih: ${q.reportedAt || '---'}</small>
                </div>`).join(''); 
        }
        window.showScreen('screen-list'); 
    });
}

window.showLocalList = (type) => { 
    document.getElementById('library-filter-area').style.display = 'none'; 
    window.currentListType = type; 
    const keys = { 'wrong': 'kpss_wrongs', 'fav': 'kpss_favs', 'blank': 'kpss_blanks', 'report': 'kpss_reports' }; 
    const titles = { 'wrong': '❌ Yanlışlarım', 'fav': '⭐ Favorilerim', 'blank': '⬜ Boş Bıraktıklarım', 'report': '🚨 Hatalı Bildirdiklerim' }; 
    document.getElementById('list-title').innerText = titles[type]; 
    const list = getStoredJSON(keys[type], []); 
    const contentDiv = document.getElementById('list-content'); 
    
    if(list.length === 0) {
        contentDiv.innerHTML = "<p style='text-align:center; background:#fff; padding:20px; border-radius:10px;'>Bu liste şu an boş.</p>"; 
    } else {
        contentDiv.innerHTML = list.map((q, i) => `
            <div class="list-item" style="background:#fff; padding:15px; border-radius:8px; margin-bottom:10px;">
                <b style="color:#333;">Soru ${i+1}:</b> <span style="color:#555;">${q.soru}</span> <br>
                <span style="color:#27ae60; font-weight:bold; font-size:0.9rem;">Cevap: ${q.siklar ? q.siklar[q.dogru] : 'Bilinmiyor'}</span>
            </div>`).join(''); 
    }
    window.showScreen('screen-list'); 
};

window.downloadPDF = () => { 
    const keys = { 'wrong': 'kpss_wrongs', 'fav': 'kpss_favs', 'blank': 'kpss_blanks', 'report': 'kpss_reports' }; 
    const list = getStoredJSON(keys[window.currentListType], []); 
    if(list.length === 0) return alert("Liste boş!"); 
    const win = window.open('', '', 'height=600,width=800'); 
    win.document.write('<html><body style="font-family:sans-serif;"><h2>Gazililer Yanlış Soru Kumbaram</h2><hr>'); 
    list.forEach((q, i) => win.document.write(`<p><b>Soru ${i+1}:</b> ${q.soru}<br><span style="color:green;">Cevap: ${q.siklar[q.dogru]}</span></p>`)); 
    win.document.write('</body></html>'); 
    win.document.close(); 
    win.print(); 
};

window.goToLobby = (mode) => {
    window.currentMode = mode;
    const realName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    if (mode === 'room' && window.socket) { 
        window.socket.emit('createRoom', { username: realName }); 
        document.getElementById('room-code-display').style.display = 'block'; 
        document.getElementById('lobby-players-area').style.display = 'block'; 
    } 
    else { 
        document.getElementById('room-code-display').style.display = 'none'; 
        document.getElementById('lobby-players-area').style.display = 'none'; 
    }
    window.showScreen('screen-lobby');
};

if(window.socket) {
    window.socket.on('roomCreated', c => { 
        window.myRoom = c; 
        document.getElementById('lobby-room-code').innerText = c; 
    });
    
    window.socket.on('updatePlayerList', p => { 
        const l = document.getElementById('lobby-players-list'); 
        if(l) l.innerHTML = p.map(x => `<span class="player-badge">${x.username}</span>`).join(''); 
        
        const live = document.getElementById('live-leaderboard'); 
        if(live) { 
            live.style.display = window.currentMode === 'room' ? 'block' : 'none'; 
            live.innerHTML = "🏆 " + p.sort((a,b)=>b.score-a.score).map(x => `<b>${x.username}:</b> ${x.score}p`).join(' | '); 
        }
    });
    
    window.socket.on('gameOver', (players) => {
        if(window.totalInt) clearInterval(window.totalInt); 
        if(window.qInt) clearInterval(window.qInt); 
        window.showScreen('screen-result');
        
        players.sort((a,b) => b.score - a.score); 
        let html = `<h3 style="color:#e67e22; margin-bottom:5px;">Oda Sınavı Sona Erdi!</h3>`;
        html += players.map((p, i) => `
            <div class="list-item" style="border-left:5px solid ${i===0?'#f1c40f':'#3498db'}; font-size:1.1rem; text-align:left; background:#fff; padding:15px; border-radius:8px; margin-bottom:10px;">
                <b style="color:#333;">${i === 0 ? '👑' : ''} ${i+1}. ${p.username}</b> 
                <span style="float:right; color:#27ae60; font-weight:bold;">${p.score} Puan</span>
            </div>`).join('');
        
        document.getElementById('result-board').innerHTML = html; 
        confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
    });
}

window.startGame = () => {
    if(!window.socket && window.currentMode !== 'trial') return alert("Sunucu bağlantısı yok!");
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
        timerMode: window.selectedTimerMode, 
        duration: dur, 
        classCode: window.myClassCode 
    };
    
    if (window.currentMode === 'trial' && window.socket) window.socket.emit('startTrial', s); 
    else if (window.socket) window.socket.emit('startGame', { roomCode: window.myRoom, settings: s });
};

if(window.socket) {
    window.socket.on('newQuestion', d => {
        window.showScreen('screen-game'); 
        window.currentQObject = d; 
        document.getElementById('opts-area').innerHTML = ""; 
        window.currentQIndex = d.index - 1; 
        document.getElementById('q-text').innerText = d.soru;
        
        const imgDisp = document.getElementById('q-image-display'); 
        if(d.image) { imgDisp.src = d.image; imgDisp.style.display = "block"; } else { imgDisp.style.display = "none"; }
        
        document.getElementById('box-question').style.display = (d.timerMode === 'question') ? 'block' : 'none'; 
        document.getElementById('box-total').style.display = (d.timerMode === 'general') ? 'block' : 'none';
        
        if(d.timerMode === 'general' && d.index === 1) window.startTotalTimer(d.duration); 
        if(d.timerMode === 'question') window.startQuestionTimer(d.duration);
        
        window.renderNavigator(d.total, window.currentQIndex, 'room');
        
        d.siklar.forEach((s, i) => {
            const b = document.createElement('button'); 
            b.innerText = s; 
            b.className = "opt-btn";
            b.onclick = () => { 
                document.querySelectorAll('.opt-btn').forEach(x => x.classList.remove('selected')); 
                b.classList.add('selected'); 
                window.socket.emit('submitAnswer', {roomCode: window.myRoom, answerIndex: i}); 
                clearInterval(window.qInt); 
            };
            document.getElementById('opts-area').appendChild(b);
        });
    });

    window.socket.on('answerResult', data => { 
        const b = document.getElementById('nav-box-' + window.currentQIndex); 
        if(b) b.classList.add(data.correct ? 'correct' : 'wrong'); 
        if(!data.correct) { 
            if(data.selectedIndex === -1) window.saveToLocal('kpss_blanks', window.currentQObject); 
            else window.saveToLocal('kpss_wrongs', window.currentQObject); 
        } 
    });

    window.socket.on('trialStarted', data => {
        window.trialQuestions = data.questions || data; 
        if(window.trialQuestions.length === 0) return alert("Soru bulunamadı!");
        
        window.trialAnswers = new Array(window.trialQuestions.length).fill(null); 
        window.currentQIndex = 0; 
        window.showScreen('screen-game'); 
        
        document.getElementById('trial-nav-buttons').style.display = 'flex'; 
        document.getElementById('btn-finish-trial').style.display = 'block';
        
        if(data.timerMode === 'general') { 
            document.getElementById('box-total').style.display = 'block'; 
            window.startTotalTimer(data.duration); 
        } 
        window.renderTrialQuestion();
    });
}

window.renderTrialQuestion = () => {
    window.currentQObject = window.trialQuestions[window.currentQIndex]; 
    document.getElementById('q-text').innerText = `(${window.currentQIndex+1}/${window.trialQuestions.length}) ` + (window.currentQObject.soru || window.currentQObject.not || "Görseli inceleyiniz.");
    
    const imgDisp = document.getElementById('q-image-display'); 
    if(window.currentQObject.image) { imgDisp.src = window.currentQObject.image; imgDisp.style.display = "block"; } else { imgDisp.style.display = "none"; }
    
    window.renderNavigator(window.trialQuestions.length, window.currentQIndex, 'trial'); 
    const a = document.getElementById('opts-area'); 
    a.innerHTML = "";
    
    const siklarListesi = window.currentQObject.siklar || ["A", "B", "C", "D", "E"]; 
    siklarListesi.forEach((s, i) => { 
        const b = document.createElement('button'); 
        b.innerText = s; 
        
        if (window.trialAnswers[window.currentQIndex] !== null) { 
            if (i === window.currentQObject.dogru) { b.className = "opt-btn correct selected"; } 
            else if (i === window.trialAnswers[window.currentQIndex]) { b.className = "opt-btn wrong selected"; } 
            else { b.className = "opt-btn"; } 
        } else { 
            b.className = "opt-btn"; 
        }
        
        b.onclick = () => { 
            if(window.trialAnswers[window.currentQIndex] === null) { 
                window.trialAnswers[window.currentQIndex] = i; 
                window.renderTrialQuestion(); 
                if (!(window.currentQObject.solutionText || window.currentQObject.solutionImage)) { 
                    setTimeout(() => { if(window.currentQIndex < window.trialQuestions.length - 1) window.trialNext(); }, 600); 
                } 
            } else { 
                window.trialAnswers[window.currentQIndex] = i; 
                window.renderTrialQuestion(); 
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
    
    if (window.trialAnswers[window.currentQIndex] !== null && (window.currentQObject.solutionText || window.currentQObject.solutionImage)) {
        solArea.style.display = 'block'; 
        solArea.innerHTML = `
        <div style="margin-top:15px; padding:15px; background:#e8f4f8; border-radius:8px; border: 1px solid #3498db; text-align:left; color:#1e3c72; font-size:0.9rem;">
            <b>👨‍🏫 Çözüm Notu:</b><br>${window.currentQObject.solutionText || 'Yazılı açıklama eklenmemiş.'}<br>
            ${window.currentQObject.solutionImage ? `<img src="${window.currentQObject.solutionImage}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''}
        </div>`;
    } else { 
        solArea.style.display = 'none'; 
    }
};

window.trialNext = () => { if(window.currentQIndex < window.trialQuestions.length-1) { window.currentQIndex++; window.renderTrialQuestion(); } }; 
window.trialPrev = () => { if(window.currentQIndex > 0) { window.currentQIndex--; window.renderTrialQuestion(); } };

window.finishTrial = () => {
    if(window.totalInt) clearInterval(window.totalInt); 
    let s = 0; let d = 0; let y = 0; let b = 0; 
    const realName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı";
    const mistakesToCloud = [];
    
    window.trialQuestions.forEach((q, i) => { 
        if(window.trialAnswers[i] === q.dogru) { 
            s+=10; d++; 
        } 
        else if(window.trialAnswers[i] !== null) { 
            s-=5; y++; 
            window.saveToLocal('kpss_wrongs', q); 
            mistakesToCloud.push(q);
            if(window.socket) window.socket.emit("addToReviewQueue", { studentName: realName, question: q }); 
        }
        else { 
            b++; 
            window.saveToLocal('kpss_blanks', q); 
        }
    });
    
    if(window.socket) window.socket.emit("saveStudentResult", { name: realName, classCode: window.myClassCode, score: s, correct: d, wrong: y, blank: b });
    
    if(window.socket && mistakesToCloud.length > 0 && window.myClassCode) { 
        window.socket.emit("saveClassMistakes", { classCode: window.myClassCode, mistakes: mistakesToCloud }); 
    }

    window.showScreen('screen-result'); 
    document.getElementById('result-board').innerHTML = `<h3 style="color:#333; background:#fff; padding:10px; border-radius:8px;">Doğru: ${d} | Yanlış: ${y} | Boş: ${b}</h3><h2 style="color:#fff; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">Puan: ${s}</h2>`; 
    confetti({ particleCount: 150 });
};

window.startQuestionTimer = (s) => { 
    let t = s; 
    if(window.qInt) clearInterval(window.qInt); 
    window.qInt = setInterval(() => { 
        t--; 
        document.getElementById('time-q').innerText = t + "s"; 
        if(t<=0) { 
            clearInterval(window.qInt); 
            if(window.socket) window.socket.emit('submitAnswer', {roomCode: window.myRoom, answerIndex: -1}); 
        }
    }, 1000); 
};

window.startTotalTimer = (minutes) => { 
    let t = minutes * 60; 
    if(window.totalInt) clearInterval(window.totalInt); 
    window.totalInt = setInterval(() => { 
        t--; 
        let m = Math.floor(t/60), sec = t%60; 
        document.getElementById('time-total').innerText = `${m}:${sec<10?'0'+sec:sec}`; 
        if(t<=0) { 
            clearInterval(window.totalInt); 
            if(window.currentMode === 'trial') window.finishTrial(); 
        } 
    }, 1000); 
};

window.renderNavigator = (total, curr, mode) => { 
    const div = document.getElementById('question-navigator'); 
    if(div.innerHTML === "") { 
        for(let i=0; i<total; i++) { 
            const b = document.createElement('div'); 
            b.id = 'nav-box-'+i; 
            b.className = 'nav-box'; 
            b.innerText = i+1; 
            if(mode === 'trial') b.onclick = () => { window.currentQIndex = i; window.renderTrialQuestion(); }; 
            div.appendChild(b); 
        } 
    } 
    document.querySelectorAll('.nav-box').forEach(x => x.classList.remove('current')); 
    const cb = document.getElementById('nav-box-' + curr); 
    if(cb) { 
        cb.classList.add('current'); 
        if(mode === 'trial') { 
            for(let i=0; i<total; i++) { 
                let box = document.getElementById('nav-box-'+i); 
                if(window.trialAnswers[i] !== null) box.classList.add('answered'); 
                else box.classList.remove('answered'); 
            } 
        } 
    } 
};

// =======================================================
// 🚨 HATIRLATMA TAKVİMİ VE SÜRE HESAPLAMA SİSTEMİ 🚨
// =======================================================
window.openReviewCalendar = async () => {
    let localData = await window.LocalDB.getAllQuestions();
    let reviewQuestions = localData.filter(q => q.nextReviewDate);
    reviewQuestions.sort((a, b) => a.nextReviewDate - b.nextReviewDate);
    
    window.currentListType = "review_calendar";
    document.getElementById('list-title').innerText = "📅 Hatırlatma Takvimi";
    
    const filterArea = document.getElementById('library-filter-area');
    if (filterArea) filterArea.style.display = 'none'; 
    
    const div = document.getElementById('list-content');
    
    if (reviewQuestions.length === 0) {
        div.innerHTML = `
            <div style="text-align:center; padding:20px; background:#fff; border-radius:10px;">
                <h1 style="font-size:3rem; margin:0; opacity:0.5;">🎉</h1>
                <p style="color:#666; font-weight:bold;">Harika! Şu an tekrar etmen gereken hiçbir soru yok.</p>
            </div>`;
    } else {
        const now = Date.now();
        div.innerHTML = reviewQuestions.map((q, i) => {
            let timeDiff = q.nextReviewDate - now;
            let badgeHTML = "";
            
            if (timeDiff <= 0) {
                badgeHTML = `<span style="background:#e74c3c; color:white; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; box-shadow:0 2px 4px rgba(231,76,60,0.3);">🔴 Çözüm Vakti Geldi</span>`;
            } else {
                let minutes = Math.floor(timeDiff / (1000 * 60)); 
                let hours = Math.floor(minutes / 60); 
                let days = Math.floor(hours / 24);
                
                let timeText = "";
                if (days > 0) timeText = `${days} Gün Kaldı`; 
                else if (hours > 0) timeText = `${hours} Saat Kaldı`; 
                else if (minutes > 0) timeText = `${minutes} Dakika Kaldı`; 
                else timeText = "Birazdan...";
                
                badgeHTML = `<span style="background:#f39c12; color:white; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; box-shadow:0 2px 4px rgba(243,156,18,0.3);">⏳ ${timeText}</span>`;
            }

            return `
            <div class="list-item" style="border-left: 5px solid #8e44ad; background:#fff; padding:15px; border-radius:8px; margin-bottom:10px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="background:#1e3c72; color:#fff; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">${q.ders || 'Genel'}</span> 
                    ${badgeHTML}
                </div>
                <b style="color:#e67e22; font-size:0.95rem;">${q.konu || 'Konu Belirtilmemiş'}</b><br>
                ${q.not ? `<div style="background:#f9f9f9; padding:8px; border-radius:6px; margin-top:5px; font-size:0.85rem; color:#444; border:1px dashed #ccc;"><b>📝 Notun:</b> ${q.not}</div>` : ''}
                ${q.image ? `<img src="${q.image}" style="width:100%; border-radius:8px; margin-top:8px; border:1px solid #eee;">` : ''}
                
                ${timeDiff <= 0 ? `<button onclick="window.updateReviewDate('${q.id}', true)" class="green" style="width:100%; margin-top:10px; font-size:0.8rem; padding:8px;">✅ Çözdüm (Tekrar Ertele)</button>` : ''}
            </div>`;
        }).join('');
    }
    
    window.showScreen('screen-list');
};

// 🚨 ETİKETLİ FİLTRELEME MOTORU
window.fetchFilteredLibrary = async (targetCategory) => {
    document.getElementById('archive-filter-chips').style.display = 'flex';
    const div = document.getElementById('list-content');
    div.innerHTML = `<div style="text-align:center; padding:20px; background:#fff; border-radius:10px;">🔍 Analiz ediliyor...</div>`;
    
    const allQuestions = await window.LocalDB.getAllQuestions();
    const filtered = allQuestions.filter(q => q.category === targetCategory);

    if (filtered.length === 0) {
        div.innerHTML = `
            <div style="text-align:center; padding:40px; background:#fff; border-radius:10px; opacity:0.6;">
                <p style="font-size:3rem;">📭</p>
                <p style="color:#333;">Bu kategoride henüz bir soru etiketlemedin.</p>
            </div>`;
    } else {
        div.innerHTML = filtered.map(q => `
            <div class="list-item" style="border-left:5px solid ${targetCategory === 'exam' ? '#2980b9' : '#c0392b'}; margin-bottom:10px; background:#fff; padding:15px; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <b style="color:#1e3c72; font-size:0.9rem;">${q.ders} - ${q.konu}</b>
                    <span style="font-size:0.65rem; background:#eee; padding:2px 5px; border-radius:4px; color:#333;">${q.kaynak || 'Genel'}</span>
                </div>
                ${q.personalNote ? `<div style="font-size:0.8rem; color:#666; margin-top:5px; font-style:italic;">📝 ${q.personalNote}</div>` : ''}
                <button onclick="window.viewSingleQuestion('${q.id}')" style="margin-top:10px; padding:6px; font-size:0.75rem; width:100%; border-color:#eee; color:#333;">Soruyu Gör</button>
            </div>
        `).join('');
    }

    document.querySelectorAll('#archive-filter-chips .chip').forEach(c => c.classList.remove('active'));
    document.getElementById(`btn-filter-${targetCategory}`).classList.add('active');
};

// ➕ HIZLI EKLEME PENCERESİ
window.openQuickAdd = (type, parentName) => {
    const newItem = prompt(`'${parentName}' altına yeni bir ${type === 'ders' ? 'DERS' : 'KAYNAK'} ekleyin:`);
    if (newItem && newItem.trim() !== "") { 
        window.manageCustomItem(type, 'add', newItem); 
    }
};

// 🛠️ YÖNETİM MODÜLÜ (SINAV/DERS EKLE-SİL)
window.manageCustomItem = (type, action, itemName = '') => {
    let key = type === 'sinav' ? 'gazi_custom_exams' : (type === 'ders' ? 'gazi_custom_dersler' : 'gazi_custom_sources');
    let list = getStoredJSON(key, []); 

    if (action === 'add') {
        const nameVal = itemName || document.getElementById(`custom-input-${type}`)?.value.trim();
        if (!nameVal) return alert("Lütfen bir isim giriniz!");
        if (list.includes(nameVal)) return alert("Bu zaten ekli!");

        list.push(nameVal); 
        localStorage.setItem(key, JSON.stringify(list));

        if (type === 'sinav') { 
            if (!window.mufredat[nameVal]) window.mufredat[nameVal] = { "Genel": { "Genel Ders": [] } }; 
        }
        alert(`✅ ${nameVal} başarıyla eklendi.`);
    } else if (action === 'remove') {
        list = list.filter(i => i !== itemName); 
        localStorage.setItem(key, JSON.stringify(list));
        
        if (type === 'sinav') delete window.mufredat[itemName];
        alert(`❌ ${itemName} başarıyla silindi.`);
    }

   window.applyCustomMufredat(); 
   window.renderExams(); 
   window.renderSubjects();
};
