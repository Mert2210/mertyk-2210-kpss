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
const messaging = getMessaging(app);
// 🚨 YEREL VERİTABANI (INDEXED-DB) YÖNETİCİSİ 🚨
const LocalDB = {
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

// 🚨 YENİ NESİL DEV MÜFREDAT AĞACI (AGS GÜNCELLEMELİ & ARA SINIFLAR DAHİL) 🚨
// 🚨 YENİ NESİL DEV MÜFREDAT AĞACI (SIRALAMASI DÜZENLENMİŞ HALİ) 🚨
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

// 🚨 1. EKSİK PARÇA: Özel Sınav ve Dersleri Hafızadan Çağırma Motoru
window.applyCustomMufredat = () => {
    const customExams = JSON.parse(localStorage.getItem('gazi_custom_exams')) || [];
    customExams.forEach(ex => {
        if (!window.mufredat[ex]) {
            window.mufredat[ex] = { "Genel": { "Genel Ders": [] } };
        }
    });

    const customDersler = JSON.parse(localStorage.getItem('gazi_custom_dersler')) || [];
    if (window.secilenSinav && window.secilenGrup && window.mufredat[window.secilenSinav]) {
        customDersler.forEach(ders => {
            if (!window.mufredat[window.secilenSinav][window.secilenGrup][ders]) {
                window.mufredat[window.secilenSinav][window.secilenGrup][ders] = ["Genel Konu"];
            }
        });
    }
};

// 🚨 2. EKSİK PARÇA: Ana Sınavları (KPSS, YKS vb.) Ekrana Çizme Motoru
window.renderExams = (fromMemory = false) => {
    const container = document.getElementById('box-exams');
    if (!container) return;

    const exams = Object.keys(window.mufredat);
    const customExams = JSON.parse(localStorage.getItem('gazi_custom_exams')) || [];

    container.innerHTML = exams.map(ex => {
        const isCustom = customExams.includes(ex);
        let actionBtns = "";

        if (window.isEditMode) {
            actionBtns = `
                <span class="edit-plus-btn" title="Yeni Ders Ekle" onclick="event.stopPropagation(); window.openQuickAdd('ders', '${ex}')">➕</span>
                ${isCustom ? `<span class="edit-del-btn" title="Sınavı Sil" onclick="event.stopPropagation(); window.manageCustomItem('sinav', 'remove', '${ex}')">✖</span>` : ''}
            `;
        }

        return `<div class="chip ${window.secilenSinav === ex ? 'active' : ''}" onclick="window.selectExam('${ex}')">
                    ${ex} ${actionBtns}
                </div>`;
    }).join('');

    if (fromMemory && window.secilenSinav) {
        window.selectExam(window.secilenSinav, true);
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

    if(mem.exam) {
        const memBadge = document.getElementById('mem-badge');
        if (memBadge) memBadge.style.display = "inline-block";
    }

    window.renderExams(mem.exam ? true : false);
};

// 🚨 DÜZENLEME MODU (EDIT MODE) KONTROLÜ 🚨
window.isEditMode = false;
window.toggleEditMode = () => {
    window.isEditMode = !window.isEditMode;
    const panel = document.getElementById('main-custom-panel');
    if (panel) panel.style.display = window.isEditMode ? 'block' : 'none';
    window.initEtiketleme(); // Çarpı (X) işaretlerini göstermek/gizlemek için ekranı yenile
};
// 🚨 GÜNCELLENMİŞ VE TEKLEŞTİRİLMİŞ DERS ÇİZDİRİCİ
window.renderSubjects = (fromMemory = false) => {
    const container = document.getElementById('box-dersler');
    const area = document.getElementById('area-ders');
    if (!container || !area) return;

    if(!window.secilenSinav || !window.secilenGrup || !window.mufredat[window.secilenSinav]?.[window.secilenGrup]) { 
        area.style.display = 'none'; return; 
    }
    
    const subjects = Object.keys(window.mufredat[window.secilenSinav][window.secilenGrup]);
    const customDersler = JSON.parse(localStorage.getItem('gazi_custom_dersler')) || [];

    area.style.display = 'block';
    container.innerHTML = subjects.map(s => {
        const isCustom = customDersler.includes(s);
        let actionBtns = "";

        if (window.isEditMode) {
            actionBtns = `
                <span class="edit-plus-btn" onclick="event.stopPropagation(); window.openQuickAdd('kaynak', '${s}')">➕</span>
                ${isCustom ? `<span class="edit-del-btn" onclick="event.stopPropagation(); window.manageCustomItem('ders', 'remove', '${s}')">✖</span>` : ''}
            `;
        }

        return `<div class="chip ${window.secilenDers === s ? 'active' : ''}" onclick="window.selectSubject('${s}')">
                    ${s} ${actionBtns}
                </div>`;
    }).join('');
    
    if(fromMemory && window.secilenDers) window.selectSubject(window.secilenDers, true);
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
    window.applyCustomMufredat(); // Önce özel müfredatı sisteme yükle
    setTimeout(() => { window.initEtiketleme(); }, 500); // Sonra etiketleri diz
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
    const isChromeIOS = navigator.userAgent.match("CriOS") || navigator.userAgent.match("FxiOS");
    
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

// 📱 SAĞLAM PWA KAYIT MOTORU
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Çevrimdışı mod aktif: ', reg.scope))
            .catch(err => console.log('❌ PWA Hatası: ', err));
    });
}

window.showScreen = (id) => { 
    const targetScreen = document.getElementById(id);
    
    // 🚨 SİHİRLİ ZIRH: Eğer gidilecek ekran bulunamazsa işlemi DURDUR. 
    // Böylece mevcut ekran silinmez ve MAVİ EKRAN hatası önlenmiş olur.
    if (!targetScreen) {
        console.warn(`⚠️ HATA: Gidilecek '${id}' ekranı bulunamadı!`);
        alert("Görünüm yüklenirken bir sorun oluştu. Sayfayı yenileyebilirsiniz.");
        return; 
    }

    const filterChips = document.getElementById('archive-filter-chips');
    if (filterChips) filterChips.style.display = 'none';
    
    // Gidilecek ekran sağlamsa, eski ekranları kapat ve yenisini aç
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    targetScreen.classList.add('active'); 
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
};
window.openSettingsPanel = () => {
    const displayUser = document.getElementById('display-user');
    const userNameText = displayUser ? displayUser.innerText : "";
    
    const passArea = document.getElementById('password-update-area');
    if(passArea) {
        passArea.style.display = userNameText.includes("Misafir") ? 'none' : 'block';
    }
    
    // 🌟 YENİ SİSTEM: ÇOKLU SINAV KUTUCUKLARINI HAFIZADAN OKU VE İŞARETLE 🌟
    const savedExams = JSON.parse(localStorage.getItem('gazi_selected_exams')) || [];
    
    // Önce ekrandaki tüm sınav kutucuklarının işaretini kaldır
    document.querySelectorAll('.profile-exam-cb').forEach(cb => cb.checked = false);
    
    // Eğer hafızada kaydedilmiş sınavlar varsa, onları tikle (işaretle)
    if (savedExams.length > 0) {
        savedExams.forEach(examVal => {
            const cb = document.querySelector(`.profile-exam-cb[value="${examVal}"]`);
            if (cb) cb.checked = true;
        });
    } else {
        // Eski sistemden (açılır menüden) kalma tek bir sınav varsa onu işaretle
        const oldExam = localStorage.getItem('gazi_exam_type');
        if (oldExam) {
            const cb = document.querySelector(`.profile-exam-cb[value="${oldExam}"]`);
            if (cb) cb.checked = true;
        }
    }

    // 🛡️ ESKİ KODUN ÇÖKMESİNİ ENGELLEYEN ZIRH (Dropdown hala varsa çalışır, yoksa atlar)
    const oldDropdown = document.getElementById('profile-exam-type');
    if (oldDropdown) {
        oldDropdown.value = localStorage.getItem('gazi_exam_type') || 'kpss_lisans'; 
        if(typeof window.updateGradeDropdown === 'function') window.updateGradeDropdown();
    }
    
    // Sınıf / Lise derecesini seç
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

    // Dersleri ve alt konuları doldur
    const savedSubjects = JSON.parse(localStorage.getItem('gazi_subjects_v2')) || [];
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

    // 🌟 YENİ SİSTEM: HATIRLATMA AYARLARINI DOLDUR 🌟
    const savedReminders = JSON.parse(localStorage.getItem('gazi_reminder_prefs'));
    if (savedReminders) {
        const autoReminderCb = document.getElementById('set-auto-reminder');
        const reminderDaysSel = document.getElementById('set-reminder-days');
        
        if (autoReminderCb) autoReminderCb.checked = savedReminders.autoSchedule;
        if (reminderDaysSel) reminderDaysSel.value = savedReminders.defaultDays;
    }

    // Ekranı Göster
    showScreen('screen-settings');
};

window.saveProfileSettings = async () => {
    try {
        const user = auth.currentUser;
        const newName = document.getElementById('profile-new-name')?.value.trim();
        const oldPass = document.getElementById('profile-old-pass')?.value.trim();
        const newPass = document.getElementById('profile-new-pass')?.value.trim();

        // 1. İSİM GÜNCELLEME
        if (user && newName) {
            const role = (user.displayName || "").split('|')[1] || 'student';
            await updateProfile(user, { displayName: newName + "|" + role });
            const displayUser = document.getElementById('display-user');
            if(displayUser) displayUser.innerText = "Hoş Geldin, " + newName;
        }

        // 2. ŞİFRE GÜNCELLEME (Güvenli Zırhlı Versiyon)
        if (user && newPass && !user.isAnonymous) {
            if (!oldPass) return alert("⚠️ Şifre değiştirmek için lütfen mevcut şifrenizi giriniz!");
            const cred = EmailAuthProvider.credential(user.email, oldPass);
            await reauthenticateWithCredential(user, cred);
            await updatePassword(user, newPass);
            alert("✅ Şifreniz güvenle güncellendi!");
            document.getElementById('profile-old-pass').value = '';
            document.getElementById('profile-new-pass').value = '';
        }

        // 3. KUTUCUKLU (CHECKBOX) ÇOKLU SINAV VE SINIF KAYDETME
        // Kullanıcının seçtiği tüm kutucuklu sınavları topluyoruz (Örn: TYT ve AYT aynı anda)
        const selectedExams = Array.from(document.querySelectorAll('.profile-exam-cb:checked')).map(cb => cb.value);
        if (selectedExams.length > 0) {
            localStorage.setItem('gazi_selected_exams', JSON.stringify(selectedExams));
        } else {
            // Eğer kutucuk sistemi kullanılmıyorsa, eski açılır menüyü (dropdown) yedek olarak kullan
            const examType = document.getElementById('profile-exam-type');
            if(examType) localStorage.setItem('gazi_exam_type', examType.value);
        }

        const grade = document.getElementById('profile-grade');
        if(grade) localStorage.setItem('gazi_grade', grade.value);

        // 4. DERS SEÇİMLERİNİ KAYDET
        const subjectsData = [];
        ['tarih', 'cografya', 'vatandaslik', 'matematik', 'turkce', 'egitim', 'fizik', 'kimya', 'biyoloji', 'fen'].forEach(sub => {
            const cb = document.getElementById('subj-' + sub);
            if (cb && cb.checked) {
                const topicVal = document.getElementById('topic-' + sub)?.value.trim() || "";
                subjectsData.push({ name: cb.value, topics: topicVal });
            }
        });
        localStorage.setItem('gazi_subjects_v2', JSON.stringify(subjectsData));

        // 5. GÖRÜNÜM (ÇÖZÜM PANELİ) AYARLARI
        const overlayPrefs = {
            showResult: document.getElementById('set-show-result')?.checked ?? true,
            showText: document.getElementById('set-show-text')?.checked ?? true,
            showImage: document.getElementById('set-show-image')?.checked ?? true
        };
        localStorage.setItem('gazi_overlay_prefs', JSON.stringify(overlayPrefs));

        // 🌟 6. YENİ: BULUT HATIRLATMA (TEKRAR) AYARLARI 🌟
        const reminderPrefs = {
            autoSchedule: document.getElementById('set-auto-reminder')?.checked ?? true,
            defaultDays: parseFloat(document.getElementById('set-reminder-days')?.value) || 1 // Varsayılan 1 Gün
        };
        localStorage.setItem('gazi_reminder_prefs', JSON.stringify(reminderPrefs));

        // Her şey başarıyla bitti
        localStorage.setItem('gazi_onboarding_done', 'true');
        alert("✅ Tüm çalışma masası ayarlarınız kaydedildi!");
        window.showScreen('screen-main');
        
    } catch (e) {
        console.error("Profil Kayıt Hatası:", e);
        alert("⚠️ Bir sorun oluştu. Lütfen eski şifrenizi doğru girdiğinizden emin olun.");
    }
};
window.handleLogin = async () => { 
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-pass');
    
    if(!emailEl || !passEl || !emailEl.value || !passEl.value) {
        return alert("⚠️ Lütfen e-posta ve şifrenizi eksiksiz girin!");
    }

    try { 
        document.getElementById('loading-overlay').style.display = 'flex'; // Yükleniyor ekranını aç
        await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value); 
    } catch(e) { 
        document.getElementById('loading-overlay').style.display = 'none'; // Hatada yükleniyor'u kapat
        alert("❌ Giriş Başarısız: E-posta veya şifre hatalı. (" + e.message + ")"); 
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
        document.getElementById('loading-overlay').style.display = 'flex';
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

        alert("✅ Kayıt başarılı! Lütfen doğrulama maili için Gelen Kutunuzu ve SPAM klasörünü kontrol edin.");
        await signOut(auth); 
        location.reload(); 
    } catch(e) { 
        document.getElementById('loading-overlay').style.display = 'none';
        alert("❌ Kayıt Hatası: " + e.message); 
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
        document.getElementById('loading-overlay').style.display = 'flex';
        const guestName = "Misafir-" + Math.floor(1000 + Math.random() * 9000); 
        const res = await signInAnonymously(auth); 
        await updateProfile(res.user, { displayName: guestName + "|student" }); 
    } catch(e) { 
        document.getElementById('loading-overlay').style.display = 'none';
        alert("Bağlantı Hatası: İnternetinizi kontrol edin."); 
    } 
};

window.handleGoogleLogin = async () => { 
    try { 
        document.getElementById('loading-overlay').style.display = 'flex';
        await signInWithPopup(auth, new GoogleAuthProvider()); 
    } catch(e) { 
        document.getElementById('loading-overlay').style.display = 'none';
        alert("Bağlantı iptal edildi veya hata oluştu: " + e.message); 
    } 
};

window.handleGoogleLogin = async () => { 
    try { 
        await signInWithPopup(auth, new GoogleAuthProvider()); 
    } catch(e) { 
        alert(e.message); 
    } 
};

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

       const stdClassCode = localStorage.getItem("gazi_class_code");
        if(stdClassCode && !isTeacher) { 
            const classInput = document.getElementById('class-code-input');
            const classBtn = document.getElementById('btn-class-questions');
            
            if(classInput) classInput.value = stdClassCode; 
            if(classBtn) classBtn.style.display = 'block'; 
        }

        if(typeof socket !== 'undefined') {
            if (isTeacher) socket.emit("getTeacherClass", user.email);
            socket.emit("getFilters", window.myClassCode || "");
            if (!isTeacher) socket.emit("checkNotebookReviews", realName);
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

    } else { 
        window.showScreen('screen-auth'); 
    }
});

window.logout = () => signOut(auth).then(() => location.reload());

let socket; 
try { socket = io(); } catch(e) { console.warn("Socket sunucusu yok."); }
let currentMode = "room", myRoom = "", currentQIndex = 0, qInt = null, totalInt = null, trialQuestions = [], trialAnswers = [];
let currentQObject = null, currentListType = "", selectedTimerMode = "question";
let uploadedImageBase64 = null; let uploadedSolutionBase64 = null; 
let stdUploadedImageBase64 = null; let stdSolutionBase64 = null; 
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
            data.dersler.map(x => `<div class="checkbox-item"><input type="checkbox" name="ders-secim" value="${x}" onchange="updateFilterText('ders')"><label>${x}</label></div>`).join(''); 
            updateFilterText('ders'); 
        }
        const denemeContent = document.getElementById('deneme-content');
        if (denemeContent && data.denemeler) { 
            const denemeKeys = Object.keys(data.denemeler); 
            denemeContent.innerHTML = `<div class="checkbox-item"><input type="checkbox" name="deneme-secim" value="HEPSI" checked onchange="updateFilterText('deneme')"><label>TÜMÜ</label></div>` + 
            denemeKeys.map(x => `<div class="checkbox-item"><input type="checkbox" name="deneme-secim" value="${x}" onchange="updateFilterText('deneme')"><label>${x}</label></div>`).join(''); 
            updateFilterText('deneme'); 
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
                    <span style="float:right; color:#666; font-size:0.8rem;">${r.date}</span>
                    <b style="color:#1e3c72;">Puan: ${r.score}</b> <br>
                    <small style="color:#27ae60; font-weight:bold;">Doğru: ${r.correct}</small> | 
                    <small style="color:#c0392b; font-weight:bold;">Yanlış: ${r.wrong}</small>
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
            const scale = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; 
            canvas.height = img.height * scale; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            if (type === 'question') { 
                uploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.8); 
                document.getElementById(previewId).src = uploadedImageBase64; 
            } else { 
                uploadedSolutionBase64 = canvas.toDataURL('image/jpeg', 0.8); 
                document.getElementById(previewId).src = uploadedSolutionBase64; 
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
                stdUploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.8); 
                document.getElementById('std-img-preview').src = stdUploadedImageBase64; 
            } else { 
                stdSolutionBase64 = canvas.toDataURL('image/jpeg', 0.8); 
                alert("✅ Çözüm fotoğrafı başarıyla eklendi!"); 
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
        image: uploadedImageBase64, 
        classCode: window.myClassCode, 
        solutionText: qSolText, 
        solutionImage: uploadedSolutionBase64 
    };
    
    socket.emit("addNewQuestion", q);
    
    document.getElementById('new-q-text').value = ""; 
    document.getElementById('new-q-opts').value = ""; 
    document.getElementById('new-q-ders').value = ""; 
    document.getElementById('new-q-deneme').value = ""; 
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
        LocalDB.saveQuestion(q).then((basariliMi) => {
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
    stdUploadedImageBase64 = null; 
    stdSolutionBase64 = null;
    if (customKonuInput) customKonuInput.value = "";
};

window.fetchStudentLibrary = async (source = 'cloud', onlyReviews = false) => {
    try {
        // Yükleniyor ekranını aç (Daha önce eklediğimiz)
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.style.display = 'flex'; 

        const filterChips = document.getElementById('archive-filter-chips');
        if (filterChips) filterChips.style.display = 'flex';

        currentListType = "student_library";
        const listTitle = document.getElementById('list-title');
        if (listTitle) listTitle.innerText = "📚 Soru Arşivim";

        if(source === 'cloud') {
            if(!socket) {
                if (loader) loader.style.display = 'none';
                return alert("❌ Sunucu bağlantısı yok! Lütfen Node.js sunucunuzun (backend) çalıştığından emin olun.");
            }
            
            const displayUser = document.getElementById('display-user');
            const studentName = displayUser ? displayUser.innerText.replace("Hoş Geldin, ", "").trim() : "Gazi Adayı";
            
            console.log("☁️ Buluttan sorular isteniyor... Öğrenci:", studentName);
            socket.emit("getStudentLibrary", { studentName: studentName, onlyReviews: onlyReviews });
            
            // DİKKAT: Sunucu çöktüyse sonsuza kadar beklemesin diye 5 saniye sınır koyuyoruz
            setTimeout(() => {
                if (document.getElementById('loading-overlay')?.style.display === 'flex') {
                    document.getElementById('loading-overlay').style.display = 'none';
                    alert("⏳ Sunucudan cevap gelmedi (Zaman Aşımı). Backend (server.js) açık mı?");
                }
            }, 5000);

        } else {
            console.log("💾 Cihazdan sorular çekiliyor...");
            let localData = await LocalDB.getAllQuestions();
            
            if(onlyReviews) {
                const now = Date.now();
                localData = localData.filter(q => q.nextReviewDate && q.nextReviewDate <= now);
            } else {
                localData.reverse();
            }
            
            if (loader) loader.style.display = 'none';
            renderStudentLibraryHTML(localData, "💾 Cihaz Hata Defterim");
        }
    } catch (e) {
        if (document.getElementById('loading-overlay')) document.getElementById('loading-overlay').style.display = 'none';
        alert("❌ Arşiv açılırken bir hata oluştu: " + e.message);
        console.error("Arşiv Hatası:", e);
    }
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
    
    document.getElementById('filter-ders').innerHTML = '<option value="ALL">Tüm Dersler</option>' + Array.from(dersler).map(d => `<option value="${d}">${d}</option>`).join('');
    document.getElementById('filter-konu').innerHTML = '<option value="ALL">Tüm Konular</option>' + Array.from(konular).map(k => `<option value="${k}">${k}</option>`).join('');
    document.getElementById('filter-kitap').innerHTML = '<option value="ALL">Tüm Kaynaklar/Kitaplar</option>' + Array.from(kitaplar).map(k => `<option value="${k}">${k}</option>`).join('');
}

function renderStudentLibraryListOnly(data) {
    window.tempStdQuestions = data; 
    const div = document.getElementById('list-content');
    
    if(data.length === 0) { 
        div.innerHTML = "<p style='text-align:center;'>Bu filtreye uygun soru bulunamadı.</p>"; 
    } else {
        div.innerHTML = data.map((q, i) => {
            const isLocal = document.getElementById('list-title').innerText.includes("Cihaz");
            return `
            <div class="list-item" style="border: 2px solid #e67e22; background:#fff;">
                <span style="background:#1e3c72; color:#fff; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">${q.ders || 'Genel'}</span> 
                <b style="color:#e67e22; margin-left:5px;">${q.konu}</b><br>
                <small style="color:#666;"><b>Kaynak:</b> ${q.kitap}</small><br>
                ${q.not ? `<small><b>Soru Notu:</b> ${q.not}</small><br>` : ''}
                ${q.image ? `<img src="${q.image}" style="width:100%; border-radius:5px; margin-top:5px;">` : ''}
                <div class="abcde-grid" id="std-qbox-${i}">
                    ${['A','B','C','D','E'].map((s, idx) => `<button class="abcde-btn" onclick="checkStdAnswer(this, ${idx}, ${i})">${s}</button>`).join('')}
                </div>
                <div id="sol-std-qbox-${i}" style="display:none; margin-top:10px; padding:10px; background:#e8f4f8; border-radius:8px; font-size:0.8rem; color:#333; text-align:left;"></div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    ${q.id ? `<button onclick="updateReviewDate('${q.id}', ${isLocal})" class="outline" style="flex:2; font-size:0.8rem; border-color:#27ae60; color:#27ae60;">✅ Tekrar Ettim (Ertele)</button>` : ''}
                    <button onclick="reportQuestionFromLibrary(${i})" class="outline" style="flex:1; font-size:0.8rem; border-color:#c0392b; color:#c0392b;">🚨 Bildir</button>
                </div>
            </div>`;
        }).join(''); 
    }
}

function renderStudentLibraryHTML(data, title) { 
    window.originalStdQuestions = data; 
    currentListType = "student_library"; 
    document.getElementById('list-title').innerText = title; 
    document.getElementById('library-filter-area').style.display = 'block'; 
    populateLibraryFilters(data); 
    renderStudentLibraryListOnly(data); 
    showScreen('screen-list'); 
}

window.updateReviewDate = async (questionId, isLocal = false) => {
    const d = prompt("Harika! Bu soruyu tekrar ettin. Peki sana bir daha ne zaman hatırlatayım? \n(Örn: 1 Saat için 0.04, Akşam için 0.25, Yarın Sabah için 0.5, 3 Gün için 3 yazın)");
    const days = parseFloat(d ? d.replace(',', '.') : 0);
    
    if(days && days > 0) {
        const newDate = Date.now() + (days * 24 * 60 * 60 * 1000);
        
        if(!isLocal) { 
            socket.emit("updateReviewDate", { questionId: questionId, additionalDays: days }); 
        } else { 
            await LocalDB.updateQuestion(questionId, { nextReviewDate: newDate });
        }
        
        alert(`✅ Tamamdır! Bu soru sistem takvimine işlendi.`);
        showScreen('screen-main');
        const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
        socket.emit("checkNotebookReviews", studentName);
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
    renderTrialQuestion();
};

window.reportQuestionFromLibrary = (index) => { 
    const q = window.tempStdQuestions[index]; 
    if(q && socket) { 
        socket.emit('reportQuestion', q); 
        alert("🚨 Bu soru başarıyla merkeze bildirildi!"); 
    } 
};
// 🚨 GÜNCELLENMİŞ: AYARLARA DUYARLI AKILLI ÇÖZÜM PANELİ
window.checkStdAnswer = (btn, selectedIdx, qIndex) => { 
    const q = window.tempStdQuestions[qIndex]; 
    const boxId = 'std-qbox-' + qIndex; 
    const btns = document.querySelectorAll(`#${boxId} button`); 
    
    // Şıkları kilitle
    btns.forEach(b => b.disabled = true); 
    
    // Doğru-Yanlış kontrolü ve Konfeti
    if(selectedIdx === q.dogru) { 
        btn.classList.add('correct'); 
        confetti({ particleCount: 100 }); 
    } else { 
        btn.classList.add('wrong'); 
        if(btns[q.dogru]) btns[q.dogru].classList.add('correct'); 
    } 

    // Çözüm Perdesini (Overlay) Hazırla
    const overlay = document.getElementById('solution-overlay');
    const content = document.getElementById('overlay-solution-content');
    
    if(overlay && content) {
        overlay.classList.add('active');

        // 🧠 SÜZGEÇ: Kullanıcının Ayarlarını Oku (Ayarlar yoksa hepsini göster)
        const prefs = JSON.parse(localStorage.getItem('gazi_overlay_prefs')) || { showResult: true, showText: true, showImage: true };
        
        // 1. Kısım: Cevaplar (Eğer ayarı açıksa)
        let resultHTML = prefs.showResult ? `
            <p style="margin-bottom:5px;"><b>Senin Cevabın:</b> ${['A','B','C','D','E'][selectedIdx]}</p>
            <p style="margin-bottom:15px;"><b>Doğru Cevap:</b> ${['A','B','C','D','E'][q.dogru]}</p>
            <hr style="opacity:0.2;">` : '';

        // 2. Kısım: Yazılı Metin (Eğer ayarı açıksa)
        let textHTML = prefs.showText ? `
            <b style="color:#1e3c72; font-size:1.2rem;">✏️ Çözüm Analizi</b><br>
            <p style="margin-top:10px;">${q.solutionText || 'Yazılı bir not bulunmuyor.'}</p>` : '';

        // 3. Kısım: Fotoğraf (Eğer ayarı açıksa ve soruda fotoğraf varsa)
        let imageHTML = (prefs.showImage && q.solutionImage) ? `
            <img src="${q.solutionImage}" style="width:100%; border-radius:10px; margin-top:15px; box-shadow:0 5px 15px rgba(0,0,0,0.1);">` : '';

        // Tüm parçaları birleştir ve ekrana bas
        content.innerHTML = `
            <div style="background:#fff; padding:15px; border-radius:10px; border:1px solid #eee; margin-top:10px;">
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

// 🚨 SAĞ BUTON: ZAMAN SEÇENEKLERİNİ GÖSTER
window.showTimeOptions = () => {
    const area = document.getElementById('time-selector-area');
    if(area) {
        area.style.display = 'block';
        area.scrollIntoView({ behavior: 'smooth' });
    }
};

// 🚨 TAKVİME KAYDET VE SIRADAKİNE GEÇ
window.scheduleAndNext = async (days) => {
    const q = window.tempStdQuestions[currentQIndex];
    if(q && (q.id || q._id)) {
        const targetId = q.id || q._id;
        const newDate = Date.now() + (days * 24 * 60 * 60 * 1000);
        
        // Cihazdaysa IndexedDB'yi, buluttaysa Sunucuyu güncelle
        if(String(targetId).startsWith('local_')) {
            await LocalDB.updateQuestion(targetId, { nextReviewDate: newDate });
        } else {
            if(socket) socket.emit("updateReviewDate", { questionId: targetId, additionalDays: days });
        }
        alert("✅ Soru " + (days < 1 ? "saatler" : days + " gün") + " sonrasına planlandı!");
    }
    window.closeOverlayAndNext();
};

// 🚨 SOL BUTON: ANLAMADIM, SONA AT (TEKRAR SORACAK)
window.pushToBack = () => {
    if(window.tempStdQuestions.length > 1) {
        const q = window.tempStdQuestions.splice(currentQIndex, 1)[0];
        window.tempStdQuestions.push(q); // Soruyu listenin en sonuna ekle
        alert("🔄 Soru listenin sonuna atıldı, tur bitince tekrar sorulacak.");
    }
    window.closeOverlayAndNext();
};

// 🚨 PERDEYİ KAPAT VE EKRANI TAZELE
window.closeOverlayAndNext = () => {
    const overlay = document.getElementById('solution-overlay');
    if(overlay) overlay.classList.remove('active');
    
    // Eğer Test/Deneme modundaysak bir sonraki soruya geç
    if(currentMode === 'trial' || currentMode === 'room') {
        if(typeof trialNext === 'function') trialNext();
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

   // 🚨 YENİ NESİL ÖĞRETMEN İSTİHBARAT RAPORU (DASHBOARD) 🚨
    socket.on("teacherReportsData", (data) => {
        currentListType = "teacher_report"; 
        document.getElementById('list-title').innerText = "📊 Sınıf İstihbarat Raporu"; 
        
        const reports = Array.isArray(data) ? data : []; 
        
        if(reports.length === 0) {
            document.getElementById('list-content').innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <h1 style="font-size:3rem; margin:0; opacity:0.5;">📭</h1>
                    <p style="color:#666;">Henüz bu sınıfa ait çözülmüş bir deneme yok.</p>
                </div>`;
            showScreen('screen-list');
            return;
        }

        // Sınıfın Genel İstatistiklerini Hesapla
        let totalScore = 0, totalCorrect = 0, totalWrong = 0, totalBlank = 0;
        reports.forEach(r => {
            totalScore += (r.score || 0);
            totalCorrect += (r.correct || 0);
            totalWrong += (r.wrong || 0);
            totalBlank += (r.blank || 0);
        });
        const count = reports.length;
        const avgScore = Math.round(totalScore / count);
        
        // 1. BÖLÜM: Üst Taraf Sınıf Ortalaması Kartı
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

        html += `<h4 style="color:#27ae60; margin-top:0; border-bottom:2px solid #eee; padding-bottom:5px;">Sıralama ve Performanslar</h4>`;
        
        // Öğrencileri en yüksek puandan en düşüğe sırala
        reports.sort((a,b) => (b.score || 0) - (a.score || 0));

        // 2. BÖLÜM: Öğrenci Kartları ve Mini Grafikler
        html += reports.map((r, index) => {
            let medal = `<span style="color:#7f8c8d; font-weight:900;">${index+1}.</span>`;
            if(index === 0) medal = "🥇";
            else if (index === 1) medal = "🥈";
            else if (index === 2) medal = "🥉";

            // Yüzdelik oranları hesapla (Bar grafiği için)
            const totalQ = (r.correct||0) + (r.wrong||0) + (r.blank||0);
            const cPct = totalQ > 0 ? ((r.correct||0) / totalQ) * 100 : 0;
            const wPct = totalQ > 0 ? ((r.wrong||0) / totalQ) * 100 : 0;
            const bPct = totalQ > 0 ? ((r.blank||0) / totalQ) * 100 : 0;

            return `
            <div class="list-item" style="border-left:5px solid ${index === 0 ? '#f1c40f' : (index === 1 ? '#bdc3c7' : (index === 2 ? '#cd7f32' : '#3498db'))}; margin-bottom:12px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
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
        showScreen('screen-list');
    });

    socket.on("classMistakesData", (data) => {
        currentListType = "class_mistakes"; 
        document.getElementById('list-title').innerText = "📉 Sınıf Yanlış Analizi"; 
        const div = document.getElementById('list-content');
        
        if(data.length === 0) div.innerHTML = "<p style='text-align:center;'>Bu sınıfa ait hata kaydı bulunamadı.</p>"; 
        else div.innerHTML = data.map(m => `
            <div class="list-item" style="border-left: 5px solid #c0392b;">
                <small style="color:#1e3c72; font-weight:bold;">${m.ders} | ${m.konu}</small><br>
                <b>Soru Metni:</b> ${m.soru} <br>
                <div style="margin-top:5px; background:#fff3f3; padding:5px; border-radius:5px; color:#c0392b; font-weight:bold; font-size:0.85rem;">
                    ⚠️ Bu soru sınıfta toplam ${m.count} kez yanlış yapıldı!
                </div>
            </div>`).join(''); 
        showScreen('screen-list');
    });

// 🛡️ KORUMALI: ÖĞRETMEN KÜTÜPHANESİ
    socket.on("teacherLibraryData", (data) => { 
        const filterArea = document.getElementById('library-filter-area');
        if (filterArea) filterArea.style.display = 'none'; // Kutu yoksa hata vermez
        
        window.tempStdQuestions = data; 
        currentListType = "teacher_library"; 
        
        const listTitle = document.getElementById('list-title');
        if(listTitle) listTitle.innerText = "📚 Soru Kütüphanem"; 
        
        const div = document.getElementById('list-content'); 
        if(!div) return; // Liste kutusu yoksa işlemi durdur

        if(data.length === 0) {
            div.innerHTML = "<p style='text-align:center;'>Kütüphanenizde henüz soru bulunmuyor.</p>"; 
        } else {
            div.innerHTML = data.map((q, i) => `
            <div class="list-item" style="border-left: 5px solid #e67e22;">
                <b>Soru:</b> ${q.soru} <br>
                <span style="color:#27ae60;"><b>Cevap:</b> ${q.siklar ? q.siklar[q.dogru] : 'Bilinmiyor'}</span> <br>
                <small>Ders: ${q.ders} | Konu: ${q.deneme}</small><br>
                ${q.image ? `<img src="${q.image}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''} 
                ${q.solutionText || q.solutionImage ? `<div style="background:#e8f4f8; padding:8px; border-radius:5px; margin-top:5px; font-size:0.8rem; color:#1e3c72;"><b>👨‍🏫 Çözüm:</b> ${q.solutionText || ''} ${q.solutionImage ? '<br><span style="color:#27ae60;">[Görsel Ekli]</span>' : ''}</div>` : ''} 
                <button onclick="reportQuestionFromLibrary(${i})" class="outline" style="margin-top:10px; font-size:0.75rem; border-color:#c0392b; color:#c0392b;">🚨 Hatalı Bildir</button>
            </div>`).join(''); 
        }
        showScreen('screen-list'); 
    });

    // 🛡️ KORUMALI: TEKRAR HATIRLATICISI
    socket.on("notebookReviewsCount", (count) => { 
        const box = document.getElementById('review-alert-box'); // İSİM DÜZELTİLDİ
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
    
    socket.on("pendingTeachersData", (data) => { 
        currentListType = "admin_approval"; 
        document.getElementById('list-title').innerText = "👨‍🏫 Onay Bekleyen Öğretmenler"; 
        const div = document.getElementById('list-content'); 
        if(data.length === 0) div.innerHTML = "<p style='text-align:center;'>Onay bekleyen öğretmen bulunmuyor.</p>"; 
        else div.innerHTML = data.map((t, i) => `<div class="list-item" style="border-left: 5px solid #8e44ad;"><b>İsim:</b> ${t.name} <br><b>E-posta:</b> ${t.email} <br><button onclick="approveTeacher('${t.email}')" class="green" style="margin-top:5px; padding:5px 10px; font-size:0.8rem; width:auto;">✅ Onayla</button></div>`).join(''); 
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
        const code = prompt("Sınıf Kodunuzu Giriniz (Örn: GZ123):", window.myClassCode); 
        if(code) socket.emit("getTeacherReports", code.toUpperCase()); 
    } 
};

window.fetchClassMistakes = () => { 
    if(socket) { 
        const code = prompt("Sınıf Kodunuzu Giriniz (Örn: GZ123):", window.myClassCode); 
        if(code) socket.emit("getClassMistakes", code.toUpperCase()); 
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
        const listDiv = document.getElementById('teacher-classes-list'); 
        const select = document.getElementById('target-class-select');
        
        if(classes.length === 0) { 
            listDiv.innerHTML = "Henüz sınıf oluşturulmadı."; 
            select.innerHTML = '<option value="">Önce Sınıf Oluşturun</option>'; 
            return; 
        }
        
        listDiv.innerHTML = classes.map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; background:rgba(255,255,255,0.1); padding:8px; border-radius:6px;">
                <span><b>${c.name}</b> (${c.code})</span>
                <button onclick="copyToClipboard('${c.code}')" style="width:auto; padding:4px 8px; font-size:0.7rem; background:#3498db; border:none; color:white; border-radius:4px; cursor:pointer;">Kopyala</button>
            </div>`).join('');
        
        select.innerHTML = '<option value="">--- Sınıf Seçin ---</option>' + classes.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
    });
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
    document.getElementById('toast-message').innerHTML = `<span style="color:#e67e22;">${data.sender}:</span><br>${data.message}`; 
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

window.fetchAdminReports = () => { 
    if(socket) {
        // Sunucuya istek atarken, o an giriş yapmış kişinin e-postasını da bilet olarak gönderiyoruz.
        const currentUserEmail = auth.currentUser ? auth.currentUser.email : "misafir";
        socket.emit("adminGetReports", currentUserEmail); 
    }
};

if(socket) socket.on("allReportsData", (data) => { 
    currentListType = "admin_report"; 
    document.getElementById('list-title').innerText = "👑 Merkezi Hata Raporları"; 
    const contentDiv = document.getElementById('list-content'); 
    if(data.length === 0) contentDiv.innerHTML = "<p style='text-align:center;'>Henüz rapor yok.</p>"; 
    else contentDiv.innerHTML = data.map((q, i) => `<div class="list-item" style="border-left: 5px solid #c0392b;"><b>Soru:</b> ${q.soru} <br><span style="color:#27ae60;"><b>Cevap:</b> ${q.siklar ? q.siklar[q.dogru] : '---'}</span> <br><small style="color:#666;">Tarih: ${q.reportedAt || '---'}</small></div>`).join(''); 
    showScreen('screen-list'); 
});

window.showLocalList = (type) => { 
    document.getElementById('library-filter-area').style.display = 'none'; 
    currentListType = type; 
    const keys = { 'wrong': 'kpss_wrongs', 'fav': 'kpss_favs', 'blank': 'kpss_blanks', 'report': 'kpss_reports' }; 
    const titles = { 'wrong': '❌ Yanlışlarım', 'fav': '⭐ Favorilerim', 'blank': '⬜ Boş Bıraktıklarım', 'report': '🚨 Hatalı Bildirdiklerim' }; 
    document.getElementById('list-title').innerText = titles[type]; 
    const list = JSON.parse(localStorage.getItem(keys[type])) || []; 
    const contentDiv = document.getElementById('list-content'); 
    if(list.length === 0) contentDiv.innerHTML = "<p style='text-align:center;'>Bu liste şu an boş.</p>"; 
    else contentDiv.innerHTML = list.map((q, i) => `<div class="list-item"><b>Soru ${i+1}:</b> ${q.soru} <br><span style="color:#27ae60; font-weight:bold; font-size:0.9rem;">Cevap: ${q.siklar ? q.siklar[q.dogru] : 'Bilinmiyor'}</span></div>`).join(''); 
    showScreen('screen-list'); 
};

window.downloadPDF = () => { 
    const keys = { 'wrong': 'kpss_wrongs', 'fav': 'kpss_favs', 'blank': 'kpss_blanks', 'report': 'kpss_reports' }; 
    const list = JSON.parse(localStorage.getItem(keys[currentListType])) || []; 
    if(list.length === 0) return alert("Liste boş!"); 
    const win = window.open('', '', 'height=600,width=800'); 
    win.document.write('<html><body style="font-family:sans-serif;"><h2>Gazililer Yanlış Soru Kumbaram</h2><hr>'); 
    list.forEach((q, i) => win.document.write(`<p><b>Soru ${i+1}:</b> ${q.soru}<br><span style="color:green;">Cevap: ${q.siklar[q.dogru]}</span></p>`)); 
    win.document.write('</body></html>'); 
    win.document.close(); 
    win.print(); 
};

window.goToLobby = (mode) => {
    currentMode = mode;
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
    showScreen('screen-lobby');
};

if(socket) {
    socket.on('roomCreated', c => { myRoom = c; document.getElementById('lobby-room-code').innerText = c; });
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
    
    if (currentMode === 'trial' && socket) socket.emit('startTrial', s); 
    else if (socket) socket.emit('startGame', { roomCode: myRoom, settings: s });
};

if(socket) {
    socket.on('newQuestion', d => {
        showScreen('screen-game'); 
        currentQObject = d; 
        document.getElementById('opts-area').innerHTML = ""; 
        currentQIndex = d.index - 1; 
        document.getElementById('q-text').innerText = d.soru;
        
        const imgDisp = document.getElementById('q-image-display'); 
        if(d.image) { imgDisp.src = d.image; imgDisp.style.display = "block"; } else { imgDisp.style.display = "none"; }
        
        document.getElementById('box-question').style.display = (d.timerMode === 'question') ? 'block' : 'none'; 
        document.getElementById('box-total').style.display = (d.timerMode === 'general') ? 'block' : 'none';
        
        if(d.timerMode === 'general' && d.index === 1) startTotalTimer(d.duration); 
        if(d.timerMode === 'question') startQuestionTimer(d.duration);
        
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
        const b = document.getElementById('nav-box-' + currentQIndex); 
        if(b) b.classList.add(data.correct ? 'correct' : 'wrong'); 
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
        <div style="margin-top:15px; padding:15px; background:#e8f4f8; border-radius:8px; border: 1px solid #3498db; text-align:left; color:#1e3c72; font-size:0.9rem;">
            <b>👨‍🏫 Çözüm Notu:</b><br>${currentQObject.solutionText || 'Yazılı açıklama eklenmemiş.'}<br>
            ${currentQObject.solutionImage ? `<img src="${currentQObject.solutionImage}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''}
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

function renderNavigator(total, curr, mode) { 
    const div = document.getElementById('question-navigator'); 
    if(div.innerHTML === "") { 
        for(let i=0; i<total; i++) { 
            const b = document.createElement('div'); 
            b.id = 'nav-box-'+i; 
            b.className = 'nav-box'; 
            b.innerText = i+1; 
            if(mode === 'trial') b.onclick = () => { currentQIndex = i; renderTrialQuestion(); }; 
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
                if(trialAnswers[i] !== null) box.classList.add('answered'); 
                else box.classList.remove('answered'); 
            } 
        } 
    } 
}

// =======================================================
// 🚨 HATIRLATMA TAKVİMİ VE SÜRE HESAPLAMA SİSTEMİ 🚨
// =======================================================
window.openReviewCalendar = async () => {
    // Cihazdaki tüm soruları çek
    let localData = await LocalDB.getAllQuestions();
    
    // Sadece "nextReviewDate" (Hatırlatma tarihi) atanmış olanları filtrele
    let reviewQuestions = localData.filter(q => q.nextReviewDate);
    
    // Tarihi en yakın olan (en acil olan) en üstte çıkacak şekilde sırala
    reviewQuestions.sort((a, b) => a.nextReviewDate - b.nextReviewDate);
    
    currentListType = "review_calendar";
    document.getElementById('list-title').innerText = "📅 Hatırlatma Takvimi";
    
    const filterArea = document.getElementById('library-filter-area');
    if (filterArea) filterArea.style.display = 'none'; // Filtreyi gizle
    
    const div = document.getElementById('list-content');
    
    if (reviewQuestions.length === 0) {
        div.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <h1 style="font-size:3rem; margin:0; opacity:0.5;">🎉</h1>
                <p style="color:#666; font-weight:bold;">Harika! Şu an tekrar etmen gereken hiçbir soru yok.</p>
            </div>`;
    } else {
        const now = Date.now();
        div.innerHTML = reviewQuestions.map((q, i) => {
            let timeDiff = q.nextReviewDate - now;
            let badgeHTML = "";
            
            // SÜRE HESAPLAMA MANTIĞI
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
            <div class="list-item" style="border-left: 5px solid #8e44ad; background:#fff; margin-bottom:10px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="background:#1e3c72; color:#fff; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">${q.ders || 'Genel'}</span> 
                    ${badgeHTML}
                </div>
                <b style="color:#e67e22; font-size:0.95rem;">${q.konu || 'Konu Belirtilmemiş'}</b><br>
                ${q.not ? `<div style="background:#f9f9f9; padding:8px; border-radius:6px; margin-top:5px; font-size:0.85rem; color:#444; border:1px dashed #ccc;"><b>📝 Notun:</b> ${q.not}</div>` : ''}
                ${q.image ? `<img src="${q.image}" style="width:100%; border-radius:8px; margin-top:8px; border:1px solid #eee;">` : ''}
                
                ${timeDiff <= 0 ? `<button onclick="updateReviewDate('${q.id}', true)" class="green" style="width:100%; margin-top:10px; font-size:0.8rem; padding:8px;">✅ Çözdüm (Tekrar Ertele)</button>` : ''}
            </div>`;
        }).join('');
    }
    
    showScreen('screen-list');
};
// 🚨 ADIM 9: ETİKETLİ FİLTRELEME MOTORU
window.fetchFilteredLibrary = async (targetCategory) => {
    // 1. Arayüz hazırlığı
    document.getElementById('archive-filter-chips').style.display = 'flex';
    const div = document.getElementById('list-content');
    div.innerHTML = `<div style="text-align:center; padding:20px;">🔍 Analiz ediliyor...</div>`;

    // 2. Veritabanından (IndexedDB) tüm soruları al
    const allQuestions = await LocalDB.getAllQuestions();
    
    // 3. Kategoriye göre süz (targetCategory: 'exam' veya 'wrong')
    const filtered = allQuestions.filter(q => q.category === targetCategory);

    // 4. Ekrana Yazdır
    if (filtered.length === 0) {
        div.innerHTML = `
            <div style="text-align:center; padding:40px; opacity:0.6;">
                <p style="font-size:3rem;">📭</p>
                <p>Bu kategoride henüz bir soru etiketlemedin.</p>
            </div>`;
    } else {
        div.innerHTML = filtered.map(q => `
            <div class="list-item" style="border-left:5px solid ${targetCategory === 'exam' ? '#2980b9' : '#c0392b'}; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <b style="color:#1e3c72; font-size:0.9rem;">${q.ders} - ${q.konu}</b>
                    <span style="font-size:0.65rem; background:#eee; padding:2px 5px; border-radius:4px;">${q.kaynak || 'Genel'}</span>
                </div>
                ${q.personalNote ? `<div style="font-size:0.8rem; color:#666; margin-top:5px; font-style:italic;">📝 ${q.personalNote}</div>` : ''}
                <button onclick="viewSingleQuestion('${q.id}')" style="margin-top:10px; padding:6px; font-size:0.75rem; width:100%; border-color:#eee;">Soruyu Gör</button>
            </div>
        `).join('');
    }

    // Buton görsellerini güncelle (Hangi filtre aktifse o parlasın)
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
window.manageCustomItem = async (type, action, itemName = '') => {
    let key = type === 'sinav' ? 'gazi_custom_exams' : (type === 'ders' ? 'gazi_custom_dersler' : 'gazi_custom_sources');
    let list = JSON.parse(localStorage.getItem(key)) || [];

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

   // Değişiklikleri ana listeye uygula ve ekranda tazele
    window.applyCustomMufredat();
    window.renderExams();
    window.renderSubjects();
};
