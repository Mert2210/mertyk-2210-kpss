// 🚨 BÖLÜK 1 (KİMLİK) BURADAN SİSTEME BAĞLANIYOR 🚨
import './firebase-auth.js';
// import './swipe-engine.js'; // <-- 3. Bölüğü kurunca bunu aktif edeceğiz, şimdilik kapalı!

// 🚨 YENİ NESİL MÜFREDAT AĞACI VE KAPSÜL (BUTON) SİSTEMİ 🚨
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

window.secilenSinav = ""; window.secilenGrup = ""; window.secilenDers = ""; window.secilenKonu = "";
window.myClassCode = localStorage.getItem("gazi_class_code") || "";
try { window.socket = io(); } catch(e) { console.warn("Socket sunucusu yok."); }

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
    if(window.event && window.event.target) window.event.target.classList.add('active');
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
    if(window.event && window.event.target) window.event.target.classList.add('active');
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
    if(window.event && window.event.target) window.event.target.classList.add('active');
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
    if(window.event && window.event.target) window.event.target.classList.add('active');
    const customInput = document.getElementById('custom-konu-input');
    if (customInput) customInput.value = ""; 
};

// 🚨 TEMEL ARAYÜZ VE PWA FONKSİYONLARI 🚨
window.checkPWAPrompts = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isChromeIOS = navigator.userAgent.match("CriOS") || navigator.userAgent.match("FxiOS");
    
    if (!isStandalone) {
        if (isIOS && isChromeIOS) {
            const el = document.getElementById('ios-chrome-prompt');
            if(el) el.style.display = 'flex';
        } else if (isIOS && !isChromeIOS) {
            if(!localStorage.getItem('gazi_ios_prompt')) { 
                const el = document.getElementById('ios-pwa-prompt');
                if(el) el.style.display = 'block'; 
            }
        } else if (isAndroid) {
            if(!localStorage.getItem('gazi_android_prompt')) { 
                const el = document.getElementById('android-pwa-prompt');
                if(el) el.style.display = 'block'; 
            }
        }
    }
};

window.closePWAPrompt = (os) => {
    if(os === 'ios') { 
        const el = document.getElementById('ios-pwa-prompt');
        if(el) el.style.display = 'none'; 
        localStorage.setItem('gazi_ios_prompt', 'true'); 
    } else { 
        const el = document.getElementById('android-pwa-prompt');
        if(el) el.style.display = 'none'; 
        localStorage.setItem('gazi_android_prompt', 'true'); 
    }
};

window.copyLinkAndAlert = () => { navigator.clipboard.writeText("https://gazililer.com.tr").then(() => { alert("✅ Link kopyalandı! Şimdi iPhone'unuzdan Safari uygulamasını açıp linki yapıştırın."); }); };
window.nextSlide = (slideNum) => { document.querySelectorAll('.intro-slide').forEach(s => s.classList.remove('active')); const slide = document.getElementById('slide-' + slideNum); if(slide) slide.classList.add('active'); };
window.finishIntro = () => { const el = document.getElementById('intro-overlay'); if(el) el.style.opacity = '0'; setTimeout(() => { if(el) el.style.display = 'none'; localStorage.setItem('gazi_intro_seen', 'true'); window.openSettingsPanel(); }, 500); };

window.deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.deferredPrompt = e; const btn = document.getElementById('pwa-install-btn'); if(btn) btn.style.display = 'block'; });
window.installPWA = () => { if(window.deferredPrompt) { window.deferredPrompt.prompt(); window.deferredPrompt.userChoice.then((choiceResult) => { window.deferredPrompt = null; const btn = document.getElementById('pwa-install-btn'); if(btn) btn.style.display = 'none'; }); } };
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').then(() => console.log("PWA Aktif.")); }

window.showScreen = (id) => { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    const sc = document.getElementById(id);
    if(sc) sc.classList.add('active'); 
    if(id === 'screen-main' && typeof window.checkAlerts === 'function') window.checkAlerts();
};

window.toggleDropdown = (id) => { const el = document.getElementById(id); if(el) el.classList.toggle('show'); };

window.setMainRole = (role) => {
    window.selectedRole = role;
    const btnS = document.getElementById('btn-main-student'); const btnT = document.getElementById('btn-main-teacher');
    const tInfo = document.getElementById('teacher-info-text'); const subtitle = document.getElementById('role-subtitle');
    const studentOpts = document.getElementById('reg-student-options'); const teacherOpts = document.getElementById('reg-teacher-options');
    
    if(role === 'student') {
        if(btnS) btnS.classList.add('active'); if(btnT) btnT.classList.remove('active');
        if(subtitle) subtitle.innerText = '(Öğrenci)';
        if(tInfo) tInfo.style.display = 'none';
        if(studentOpts) studentOpts.style.display = 'block';
        if(teacherOpts) teacherOpts.style.display = 'none';
    } else {
        if(btnT) btnT.classList.add('active'); if(btnS) btnS.classList.remove('active');
        if(subtitle) subtitle.innerText = '(Öğretmen)';
        if(tInfo) tInfo.style.display = 'block';
        if(studentOpts) studentOpts.style.display = 'none';
        if(teacherOpts) teacherOpts.style.display = 'block';
    }
};

window.switchAuth = (t) => { 
    const lb = document.getElementById('login-box'); if(lb) lb.style.display = t === 'login' ? 'block' : 'none'; 
    const rb = document.getElementById('reg-box'); if(rb) rb.style.display = t === 'register' ? 'block' : 'none'; 
};

window.updateRegGradeDropdown = () => {
    const typeObj = document.getElementById('reg-exam-type'); if(!typeObj) return;
    const type = typeObj.value; const area = document.getElementById('reg-grade-area'); const select = document.getElementById('reg-grade'); 
    if(select) select.innerHTML = '';
    let grades = [];
    if(type === 'lise_okul') grades = ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Mezun']; else if (type === 'ortaokul') grades = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf (LGS)'];
    if(grades.length > 0) { if(area) area.style.display = 'block'; grades.forEach(val => { if(select) select.innerHTML += `<option value="${val}">${val}</option>`; }); } else { if(area) area.style.display = 'none'; }
};

window.updateGradeDropdown = () => {
    const typeObj = document.getElementById('profile-exam-type'); if(!typeObj) return;
    const type = typeObj.value; const area = document.getElementById('grade-selection-area'); const boxContainer = document.getElementById('grade-boxes'); 
    if(boxContainer) boxContainer.innerHTML = ''; 
    const pg = document.getElementById('profile-grade'); if(pg) pg.value = '';
    let grades = [];
    if(type === 'lise_okul') grades = ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Mezun']; else if (type === 'ortaokul') grades = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf (LGS)'];
    if(grades.length > 0) { 
        if(area) area.style.display = 'block'; 
        grades.forEach(val => { 
            const btn = document.createElement('div'); btn.className = 'grade-btn'; btn.innerText = val; 
            btn.onclick = () => { document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); if(pg) pg.value = val; }; 
            if(boxContainer) boxContainer.appendChild(btn); 
        }); 
    } else { if(area) area.style.display = 'none'; }
};

window.openSettingsPanel = () => {
    const displayUser = document.getElementById('display-user');
    if(displayUser && displayUser.innerText.includes("Misafir")) { const pa = document.getElementById('password-update-area'); if(pa) pa.style.display = 'none'; } 
    else { const pa = document.getElementById('password-update-area'); if(pa) pa.style.display = 'block'; }
    
    const pet = document.getElementById('profile-exam-type');
    if(pet) pet.value = localStorage.getItem('gazi_exam_type') || 'kpss_lisans'; 
    window.updateGradeDropdown();
    
    const savedGrade = localStorage.getItem('gazi_grade');
    if(savedGrade) { 
        const pg = document.getElementById('profile-grade'); if(pg) pg.value = savedGrade; 
        setTimeout(() => { document.querySelectorAll('.grade-btn').forEach(btn => { if(btn.innerText === savedGrade) btn.classList.add('selected'); }); }, 100); 
    }

    const savedSubjects = JSON.parse(localStorage.getItem('gazi_subjects_v2')) || [];
    const subjects = ['tarih', 'cografya', 'vatandaslik', 'matematik', 'turkce', 'egitim', 'fizik', 'kimya', 'biyoloji', 'fen'];
    subjects.forEach(sub => { 
        const cb = document.getElementById('subj-' + sub); const txt = document.getElementById('topic-' + sub); 
        if(cb && txt) { 
            cb.checked = false; txt.value = ''; 
            const found = savedSubjects.find(s => s.name === cb.value); 
            if(found) { cb.checked = true; txt.value = found.topics; } 
        } 
    });
    window.showScreen('screen-settings');
};


// 🚨 OYUN MANTIĞI VE DEĞİŞKENLERİ 🚨
window.currentMode = "room"; window.myRoom = ""; window.currentQIndex = 0; window.qInt = null; window.totalInt = null; window.trialQuestions = []; window.trialAnswers = [];
window.currentQObject = null; window.currentListType = ""; window.selectedTimerMode = "question";
window.uploadedImageBase64 = null; window.uploadedSolutionBase64 = null; 
window.stdUploadedImageBase64 = null; window.stdSolutionBase64 = null; 
window.tempStdQuestions = []; window.originalStdQuestions = [];

window.setTimerMode = (mode) => { 
    window.selectedTimerMode = mode; 
    const b1 = document.getElementById('btn-mode-sec'); if(b1) b1.className = mode === 'question' ? 'green' : 'outline'; 
    const b2 = document.getElementById('btn-mode-min'); if(b2) b2.className = mode === 'general' ? 'green' : 'outline'; 
    const t = document.getElementById('room-q-time'); if(t) t.placeholder = mode === 'question' ? 'Örn: 45 (Saniye)' : 'Örn: 15 (Dakika)'; 
};

window.updateFilterText = (type) => {
    const checkboxes = document.querySelectorAll(`input[name="${type}-secim"]`);
    if (window.event && window.event.target && window.event.target.type === 'checkbox') {
        if (window.event.target.value === "HEPSI" && window.event.target.checked) { checkboxes.forEach(cb => { if(cb.value !== "HEPSI") cb.checked = false; }); } 
        else if (window.event.target.value !== "HEPSI" && window.event.target.checked) { checkboxes.forEach(cb => { if(cb.value === "HEPSI") cb.checked = false; }); }
    }
    const checkedBoxes = document.querySelectorAll(`input[name="${type}-secim"]:checked`); const trigger = document.getElementById(`${type}-trigger`); if (!trigger) return;
    let count = checkedBoxes.length; const hasHepsi = Array.from(checkedBoxes).some(cb => cb.value === "HEPSI");
    if (count === 0) trigger.innerText = "Seçim Yapılmadı ▼"; else if (hasHepsi) trigger.innerText = "Tümü Seçili ▼"; else trigger.innerText = `${count} Adet Seçildi ▼`;
};

if(window.socket) {
    window.socket.on('updateFilters', data => {
        const dersContent = document.getElementById('ders-content');
        if (dersContent && data.dersler) { 
            dersContent.innerHTML = `<div class="checkbox-item"><input type="checkbox" name="ders-secim" value="HEPSI" checked onchange="window.updateFilterText('ders')"><label>TÜMÜ</label></div>` + data.dersler.map(x => `<div class="checkbox-item"><input type="checkbox" name="ders-secim" value="${x}" onchange="window.updateFilterText('ders')"><label>${x}</label></div>`).join(''); 
            window.updateFilterText('ders'); 
        }
        const denemeContent = document.getElementById('deneme-content');
        if (denemeContent && data.denemeler) { 
            const denemeKeys = Object.keys(data.denemeler); 
            denemeContent.innerHTML = `<div class="checkbox-item"><input type="checkbox" name="deneme-secim" value="HEPSI" checked onchange="window.updateFilterText('deneme')"><label>TÜMÜ</label></div>` + denemeKeys.map(x => `<div class="checkbox-item"><input type="checkbox" name="deneme-secim" value="${x}" onchange="window.updateFilterText('deneme')"><label>${x}</label></div>`).join(''); 
            window.updateFilterText('deneme'); 
        }
    });
}

window.fetchMyStats = () => { if(!window.socket) return alert("Sunucuya bağlanılamadı!"); const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; window.socket.emit("getMyStats", name); };

if(window.socket) {
    window.socket.on("myStatsData", (history) => {
        let totalExams = history.length; let tCorrect = 0, tWrong = 0, tBlank = 0, tScore = 0;
        history.forEach(r => { tCorrect += r.correct || 0; tWrong += r.wrong || 0; tBlank += r.blank || 0; tScore += r.score || 0; });
        const totalQs = tCorrect + tWrong + tBlank; const successRate = totalQs > 0 ? Math.round((tCorrect / totalQs) * 100) : 0;
        
        const sumBox = document.getElementById('stats-summary');
        if(sumBox) sumBox.innerHTML = `<div style="background:#27ae60; padding:15px; border-radius:10px;"><div style="font-size:2rem; font-weight:bold;">%${successRate}</div><div style="font-size:0.8rem;">Başarı Oranı</div></div><div style="background:#2980b9; padding:15px; border-radius:10px;"><div style="font-size:2rem; font-weight:bold;">${totalExams}</div><div style="font-size:0.8rem;">Çözülen Deneme</div></div><div style="background:#e67e22; padding:10px; border-radius:10px; grid-column: span 2;"><div style="font-size:1.1rem; font-weight:bold;">Toplam: ${tCorrect} Doğru | ${tWrong} Yanlış</div></div>`;
        
        const histDiv = document.getElementById('stats-history');
        if(histDiv) {
            if(history.length === 0) { histDiv.innerHTML = "<p>Henüz çözülmüş bir deneme yok.</p>"; } 
            else { histDiv.innerHTML = history.slice(0,10).map(r => `<div class="list-item" style="border-left: 5px solid #2980b9;"><span style="float:right; color:#666; font-size:0.8rem;">${r.date}</span><b style="color:#1e3c72;">Puan: ${r.score}</b> <br><small style="color:#27ae60; font-weight:bold;">Doğru: ${r.correct}</small> | <small style="color:#c0392b; font-weight:bold;">Yanlış: ${r.wrong}</small></div>`).join(''); }
        }
        window.showScreen('screen-stats');
    });
}

window.processImageUpload = (e, type = 'question') => {
    const file = e.target.files[0]; if(!file) return; 
    const previewId = type === 'question' ? 'img-preview' : 'img-preview-solution';
    const pv = document.getElementById(previewId);
    if(pv) { pv.style.display = 'block'; pv.src = "https://i.gifer.com/ZKZg.gif"; }
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image(); img.onload = () => {
            const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const scale = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; canvas.height = img.height * scale; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if (type === 'question') { window.uploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.8); if(pv) pv.src = window.uploadedImageBase64; } 
            else { window.uploadedSolutionBase64 = canvas.toDataURL('image/jpeg', 0.8); if(pv) pv.src = window.uploadedSolutionBase64; }
        }; img.src = event.target.result;
    }; reader.readAsDataURL(file);
};

window.processStudentImageUpload = (e, type = 'image') => {
    const file = e.target.files[0]; if(!file) return;
    if(type === 'image') { const pv = document.getElementById('std-img-preview'); if(pv) { pv.style.display = 'block'; pv.src = "https://i.gifer.com/ZKZg.gif"; } }
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image(); img.onload = () => {
            const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const scale = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; canvas.height = img.height * scale; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if(type === 'image') { window.stdUploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.8); const pv = document.getElementById('std-img-preview'); if(pv) pv.src = window.stdUploadedImageBase64; } 
            else { window.stdSolutionBase64 = canvas.toDataURL('image/jpeg', 0.8); alert("✅ Çözüm fotoğrafı başarıyla eklendi!"); }
        }; img.src = event.target.result;
    }; reader.readAsDataURL(file);
};

window.uploadQuestion = () => {
    if(!window.socket) return alert("Sunucuya bağlanılamadı!");
    const qDers = document.getElementById('new-q-ders').value.trim(); const qKonu = document.getElementById('new-q-deneme').value.trim();
    const qTextObj = document.getElementById('new-q-text'); const qSoru = qTextObj ? qTextObj.value.trim() : "Aşağıdaki görseli inceleyiniz."; 
    const qOptsObj = document.getElementById('new-q-opts'); const qSiklar = qOptsObj && qOptsObj.value ? qOptsObj.value.split(',').map(s => s.trim()) : ["A", "B", "C", "D", "E"];
    const qCorObj = document.getElementById('new-q-correct'); const qDogru = qCorObj ? parseInt(qCorObj.value) || 0 : 0; 
    const qSolObj = document.getElementById('new-q-sol-text'); const qSolText = qSolObj ? qSolObj.value.trim() : "";
    
    if(!qDers || !qKonu) return alert("Lütfen Ders ve Konu alanlarını doldurun!"); if(!window.myClassCode) return alert("⚠️ Lütfen önce bir sınıf seçin veya oluşturun!");
    const q = { soru: qSoru, siklar: qSiklar, dogru: qDogru, ders: qDers.toUpperCase(), deneme: qKonu, image: window.uploadedImageBase64, classCode: window.myClassCode, solutionText: qSolText, solutionImage: window.uploadedSolutionBase64 };
    window.socket.emit("addNewQuestion", q);
    
    if(qTextObj) qTextObj.value = ""; if(qOptsObj) qOptsObj.value = ""; document.getElementById('new-q-ders').value = ""; document.getElementById('new-q-deneme').value = ""; 
    const pv1 = document.getElementById('img-preview'); if(pv1) pv1.style.display = "none"; window.uploadedImageBase64 = null; 
    if(qSolObj) qSolObj.value = ""; const pv2 = document.getElementById('img-preview-solution'); if(pv2) pv2.style.display = "none"; window.uploadedSolutionBase64 = null;
    alert(`✅ Soru (ve varsa çözümü) kütüphanenize eklendi!`);
};

window.uploadStudentQuestion = (target = 'cloud') => {
    const customKonuInput = document.getElementById('custom-konu-input');
    const customKonu = customKonuInput ? customKonuInput.value.trim() : "";
    const finalTopic = customKonu || window.secilenKonu || "Genel Konu";
    const finalDers = window.secilenDers || "Genel Ders";
    
    const stdQKitap = document.getElementById('std-q-kitap');
    const qKitap = stdQKitap ? stdQKitap.value.trim() : ""; 
    
    if(!qKitap || finalTopic === "Genel Konu" || finalDers === "Genel Ders") return alert("Komutanım, lütfen Sınav, Ders, Konu ve Kaynak alanlarını eksiksiz doldurun!");
    
    const qTextObj = document.getElementById('std-q-text'); const qText = qTextObj ? qTextObj.value.trim() : ""; 
    const qSolTextObj = document.getElementById('std-q-sol-text'); const qSolText = qSolTextObj ? qSolTextObj.value.trim() : ""; 
    const correctIdxObj = document.getElementById('std-q-correct-idx'); const correctIdx = correctIdxObj ? parseInt(correctIdxObj.value) : 0;
    const studentNameObj = document.getElementById('display-user'); const studentName = studentNameObj ? studentNameObj.innerText.replace("Hoş Geldin, ", "").trim() : "Gazi Adayı";
    
    const reminderObj = document.getElementById('std-q-reminder'); const reminderDays = reminderObj ? parseFloat(reminderObj.value) : 1;
    const nextReviewDate = Date.now() + (reminderDays * 24 * 60 * 60 * 1000); 

    if(!window.stdUploadedImageBase64 && !qText) return alert("Lütfen bir fotoğraf yükleyin veya kendinize bir not yazın!");

    if(customKonu && finalDers !== "Genel Ders") {
        let customTopics = JSON.parse(localStorage.getItem('gazi_custom_topics')) || {};
        if(!customTopics[finalDers]) customTopics[finalDers] = [];
        if(!customTopics[finalDers].includes(customKonu)) {
            customTopics[finalDers].push(customKonu);
            localStorage.setItem('gazi_custom_topics', JSON.stringify(customTopics));
        }
    }

    localStorage.setItem('gazi_sticky_memory', JSON.stringify({ exam: window.secilenSinav, group: window.secilenGrup, subject: finalDers, topic: finalTopic, book: qKitap }));
    const memBadge = document.getElementById('mem-badge'); if (memBadge) memBadge.style.display = "inline-block";

    const q = { id: 'local_' + Date.now(), studentName: studentName, ders: finalDers, kitap: qKitap, konu: finalTopic, not: qText, image: window.stdUploadedImageBase64, nextReviewDate: nextReviewDate, solutionImage: window.stdSolutionBase64, solutionText: qSolText, dogru: correctIdx, soru: qText || "Görseli inceleyiniz.", siklar: ["A", "B", "C", "D", "E"] };
    
    if (target === 'cloud') {
        if(!window.socket) return alert("Buluta bağlanılamadı, lütfen Cihaza Kaydet seçeneğini kullanın."); delete q.id; window.socket.emit("addStudentQuestion", q);
        alert(`✅ Soru BULUT Hata Defterinize eklendi!`);
    } else {
        let localNotebook = JSON.parse(localStorage.getItem('gazi_local_notebook')) || []; localNotebook.push(q); localStorage.setItem('gazi_local_notebook', JSON.stringify(localNotebook));
        alert(`💾 Soru CİHAZINIZA başarıyla kaydedildi!\nİnternetsiz de çözebilirsiniz.`);
    }
    
    if(qTextObj) qTextObj.value = ""; if(qSolTextObj) qSolTextObj.value = ""; 
    const stdImgPreview = document.getElementById('std-img-preview'); if (stdImgPreview) stdImgPreview.style.display = "none"; 
    window.stdUploadedImageBase64 = null; window.stdSolutionBase64 = null; if (customKonuInput) customKonuInput.value = "";
    
    if(typeof window.checkAlerts === 'function') window.checkAlerts();
};

window.fetchStudentLibrary = (source = 'cloud', onlyReviews = false) => {
    if(source === 'cloud') {
        if(!window.socket) return alert("Sunucu bağlantısı yok."); const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; window.socket.emit("getStudentLibrary", { studentName: studentName, onlyReviews: onlyReviews });
    } else {
        let localData = JSON.parse(localStorage.getItem('gazi_local_notebook')) || [];
        if(onlyReviews) { const now = Date.now(); localData = localData.filter(q => q.nextReviewDate && q.nextReviewDate <= now); } else { localData.reverse(); }
        window.renderStudentLibraryHTML(localData, "💾 Cihaz Hata Defterim");
    }
};

window.applyLibraryFilters = () => {
    const secilenDers = document.getElementById('filter-ders').value; const secilenKonu = document.getElementById('filter-konu').value; const secilenKitap = document.getElementById('filter-kitap').value;
    let filteredData = window.originalStdQuestions.filter(q => {
        let dersMatch = (secilenDers === "ALL" || (q.ders && q.ders === secilenDers)); let konuMatch = (secilenKonu === "ALL" || (q.konu && q.konu === secilenKonu)); let kitapMatch = (secilenKitap === "ALL" || (q.kitap && q.kitap === secilenKitap));
        return dersMatch && konuMatch && kitapMatch;
    });
    window.renderStudentLibraryListOnly(filteredData);
};

window.populateLibraryFilters = (data) => {
    const dersler = new Set(); const konular = new Set(); const kitaplar = new Set();
    data.forEach(q => { if (q.ders) dersler.add(q.ders); if (q.konu) konular.add(q.konu); if (q.kitap) kitaplar.add(q.kitap); });
    const fd = document.getElementById('filter-ders'); if(fd) fd.innerHTML = '<option value="ALL">Tüm Dersler</option>' + Array.from(dersler).map(d => `<option value="${d}">${d}</option>`).join('');
    const fk = document.getElementById('filter-konu'); if(fk) fk.innerHTML = '<option value="ALL">Tüm Konular</option>' + Array.from(konular).map(k => `<option value="${k}">${k}</option>`).join('');
    const fki = document.getElementById('filter-kitap'); if(fki) fki.innerHTML = '<option value="ALL">Tüm Kaynaklar/Kitaplar</option>' + Array.from(kitaplar).map(k => `<option value="${k}">${k}</option>`).join('');
};

window.renderStudentLibraryListOnly = (data) => {
    window.tempStdQuestions = data; const div = document.getElementById('list-content');
    if(!div) return;
    if(data.length === 0) { div.innerHTML = "<p style='text-align:center;'>Bu filtreye uygun soru bulunamadı.</p>"; } else {
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
                    ${['A','B','C','D','E'].map((s, idx) => `<button class="abcde-btn" onclick="window.checkStdAnswer(this, ${idx}, ${i})">${s}</button>`).join('')}
                </div>
                <div id="sol-std-qbox-${i}" style="display:none; margin-top:10px; padding:10px; background:#e8f4f8; border-radius:8px; font-size:0.8rem; color:#333; text-align:left;"></div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    ${q.id ? `<button onclick="window.updateReviewDate('${q.id}', ${isLocal})" class="outline" style="flex:2; font-size:0.8rem; border-color:#27ae60; color:#27ae60;">✅ Tekrar Ettim (Ertele)</button>` : ''}
                    <button onclick="window.reportQuestionFromLibrary(${i})" class="outline" style="flex:1; font-size:0.8rem; border-color:#c0392b; color:#c0392b;">🚨 Bildir</button>
                </div>
            </div>`;
        }).join(''); 
    }
};

window.renderStudentLibraryHTML = (data, title) => { 
    window.originalStdQuestions = data; window.currentListType = "student_library"; 
    const lt = document.getElementById('list-title'); if(lt) lt.innerText = title; 
    const lfa = document.getElementById('library-filter-area'); if(lfa) lfa.style.display = 'block'; 
    window.populateLibraryFilters(data); window.renderStudentLibraryListOnly(data); window.showScreen('screen-list'); 
};

window.updateReviewDate = (questionId, isLocal = false) => {
    const d = prompt("Harika! Bu soruyu tekrar ettin. Peki sana bir daha ne zaman hatırlatayım? \n(Örn: 1 Saat için 0.04, Akşam için 0.25, Yarın Sabah için 0.5, 3 Gün için 3 yazın)");
    const days = parseFloat(d ? d.replace(',', '.') : 0);
    
    if(days && days > 0) {
        const newDate = Date.now() + (days * 24 * 60 * 60 * 1000);
        if(!isLocal) { window.socket.emit("updateReviewDate", { questionId: questionId, additionalDays: days }); } else { 
            let localData = JSON.parse(localStorage.getItem('gazi_local_notebook')) || []; const idx = localData.findIndex(x => x.id === questionId); 
            if(idx !== -1) { localData[idx].nextReviewDate = newDate; localStorage.setItem('gazi_local_notebook', JSON.stringify(localData)); } 
        }
        alert(`✅ Tamamdır! Bu soru sistem takvimine işlendi.`); window.showScreen('screen-main');
        const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; window.socket.emit("checkNotebookReviews", studentName);
    }
};

window.checkStdAnswer = (btn, selectedIdx, qIndex) => { 
    const q = window.tempStdQuestions[qIndex]; const boxId = 'std-qbox-' + qIndex; const btns = document.querySelectorAll(`#${boxId} button`); btns.forEach(b => b.disabled = true); 
    if(selectedIdx === q.dogru) { btn.classList.add('correct'); confetti({ particleCount: 100 }); } else { btn.classList.add('wrong'); if(btns[q.dogru]) btns[q.dogru].classList.add('correct'); } 
    const sDiv = document.getElementById('sol-' + boxId); if(sDiv) { sDiv.style.display = 'block'; sDiv.innerHTML = `<b>✏️ Çözüm Notu:</b><br>${q.solutionText || 'Yazılı çözüm notu bulunmuyor.'}<br>${q.solutionImage ? `<img src="${q.solutionImage}" style="width:100%; margin-top:5px; border-radius:5px;">` : ''}`; }
};

// 🚨 ODA VE ÖĞRETMEN FONKSİYONLARI 🚨
window.fetchClassQuestions = () => { const code = document.getElementById('class-code-input').value.trim().toUpperCase(); if(!code) return alert("Lütfen önce sınıf kodunu girin!"); window.socket.emit("getClassQuestions", code); };
window.refreshTeacherClasses = () => { document.getElementById('teacher-classes-list').innerHTML = "Yükleniyor..."; if(window.socket) window.socket.emit("getTeacherClass", window.auth.currentUser.email); setTimeout(() => { const div = document.getElementById('teacher-classes-list'); if(div && div.innerHTML === "Yükleniyor...") div.innerHTML = "Sınıf bulunamadı veya bağlantı kurulamadı."; }, 3000); };
window.fetchTeacherReports = () => { if(window.socket) { const code = prompt("Sınıf Kodunuzu Giriniz (Örn: GZ123):", window.myClassCode); if(code) window.socket.emit("getTeacherReports", code.toUpperCase()); } };
window.fetchClassMistakes = () => { if(window.socket) { const code = prompt("Sınıf Kodunuzu Giriniz (Örn: GZ123):", window.myClassCode); if(code) window.socket.emit("getClassMistakes", code.toUpperCase()); } };
window.fetchMyLibrary = () => { if(!window.socket) return; if(!window.myClassCode) return alert("Önce bir sınıf seçmelisiniz."); window.socket.emit("getTeacherLibrary", window.myClassCode); };
window.fetchPendingTeachers = () => { if(window.socket) window.socket.emit("getPendingTeachers"); };
window.approveTeacher = (email) => { if(window.socket) { window.socket.emit("approveTeacher", email); alert("✅ Onay isteği sunucuya gönderildi!"); } };
window.openEvaluation = () => { if(window.socket) { window.socket.emit("getEvaluationData", window.myClassCode); window.showScreen('screen-eval'); } };
window.createNewNamedClass = () => { const className = document.getElementById('new-class-name').value.trim(); if(!className) return alert("Lütfen bir sınıf adı girin!"); const teacherEmail = window.auth.currentUser.email; if(window.socket) window.socket.emit("createNamedClass", { teacherEmail, className }); document.getElementById('new-class-name').value = ""; };
window.uploadQuestionToNamedClass = () => { const selectedClass = document.getElementById('target-class-select').value; if(!selectedClass) return alert("Lütfen önce soruyu göndereceğiniz sınıfı seçin!"); window.myClassCode = selectedClass; window.uploadQuestion(); };
window.copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(() => { alert("✅ Sınıf kodu kopyalandı: " + text); }); };
window.createClass = () => { if(window.socket) { const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; window.socket.emit("createClass", name); } };

window.joinClass = () => { 
    if(!window.socket) return; const code = document.getElementById('class-code-input').value.trim().toUpperCase(); const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    if(!code) return alert("Sınıf kodu girin!"); window.socket.emit("joinClass", { code, studentName: name }); localStorage.setItem("gazi_class_code", code); const btn = document.getElementById('btn-class-questions'); if(btn) btn.style.display = 'block';
};
window.publishAlert = () => { if(!window.socket) return; const msg = document.getElementById('alert-text').value.trim(); if(!msg) return alert("Boş duyuru gönderilemez!"); const name = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; window.socket.emit("sendGlobalAlert", { message: msg, sender: name }); document.getElementById('alert-text').value = ""; alert("🚀 Duyuru gönderildi!"); };

window.saveToLocal = (key, qObj) => { let list = JSON.parse(localStorage.getItem(key)) || []; if(!list.find(x => x.soru === qObj.soru)) { list.push(qObj); localStorage.setItem(key, JSON.stringify(list)); } };
window.removeFromLocal = (key, qObj) => { let list = JSON.parse(localStorage.getItem(key)) || []; list = list.filter(x => x.soru !== qObj.soru); localStorage.setItem(key, JSON.stringify(list)); };
window.checkIsFav = (qObj) => { return (JSON.parse(localStorage.getItem('kpss_favs')) || []).some(x => x.soru === qObj.soru); };

window.toggleFavCurrent = () => { 
    if(!window.currentQObject) return; const btn = document.getElementById('btn-fav-current'); 
    if(window.checkIsFav(window.currentQObject)) { window.removeFromLocal('kpss_favs', window.currentQObject); if(btn) { btn.style.color = "#ccc"; btn.innerText = "☆"; } } 
    else { window.saveToLocal('kpss_favs', window.currentQObject); if(btn) { btn.style.color = "#f1c40f"; btn.innerText = "⭐"; } } 
};
window.reportQuestion = () => { if(!window.currentQObject || !window.socket) return; window.socket.emit('reportQuestion', window.currentQObject); window.saveToLocal('kpss_reports', window.currentQObject); alert("🚨 Bu soru merkeze bildirildi."); };
window.fetchAdminReports = () => { if(window.socket) window.socket.emit("adminGetReports"); };

window.showLocalList = (type) => { 
    const lfa = document.getElementById('library-filter-area'); if(lfa) lfa.style.display = 'none'; 
    window.currentListType = type; const keys = { 'wrong': 'kpss_wrongs', 'fav': 'kpss_favs', 'blank': 'kpss_blanks', 'report': 'kpss_reports' }; const titles = { 'wrong': '❌ Yanlışlarım', 'fav': '⭐ Favorilerim', 'blank': '⬜ Boş Bıraktıklarım', 'report': '🚨 Hatalı Bildirdiklerim' }; 
    const lt = document.getElementById('list-title'); if(lt) lt.innerText = titles[type]; 
    const list = JSON.parse(localStorage.getItem(keys[type])) || []; const contentDiv = document.getElementById('list-content'); 
    if(contentDiv) { if(list.length === 0) contentDiv.innerHTML = "<p style='text-align:center;'>Bu liste şu an boş.</p>"; else contentDiv.innerHTML = list.map((q, i) => `<div class="list-item"><b>Soru ${i+1}:</b> ${q.soru} <br><span style="color:#27ae60; font-weight:bold; font-size:0.9rem;">Cevap: ${q.siklar ? q.siklar[q.dogru] : 'Bilinmiyor'}</span></div>`).join(''); }
    window.showScreen('screen-list'); 
};
window.downloadPDF = () => { const keys = { 'wrong': 'kpss_wrongs', 'fav': 'kpss_favs', 'blank': 'kpss_blanks', 'report': 'kpss_reports' }; const list = JSON.parse(localStorage.getItem(keys[window.currentListType])) || []; if(list.length === 0) return alert("Liste boş!"); const win = window.open('', '', 'height=600,width=800'); win.document.write('<html><body style="font-family:sans-serif;"><h2>Gazililer Yanlış Soru Kumbaram</h2><hr>'); list.forEach((q, i) => win.document.write(`<p><b>Soru ${i+1}:</b> ${q.soru}<br><span style="color:green;">Cevap: ${q.siklar[q.dogru]}</span></p>`)); win.document.write('</body></html>'); win.document.close(); win.print(); };

window.goToLobby = (mode) => {
    window.currentMode = mode; const realName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; 
    const rcd = document.getElementById('room-code-display'); const lpa = document.getElementById('lobby-players-area');
    if (mode === 'room' && window.socket) { window.socket.emit('createRoom', { username: realName }); if(rcd) rcd.style.display = 'block'; if(lpa) lpa.style.display = 'block'; } 
    else { if(rcd) rcd.style.display = 'none'; if(lpa) lpa.style.display = 'none'; }
    window.showScreen('screen-lobby');
};

window.startGame = () => {
    if(!window.socket && window.currentMode !== 'trial') return alert("Sunucu bağlantısı yok!");
    const durObj = document.getElementById('room-q-time'); const dur = durObj ? parseInt(durObj.value) : 0; if(!dur || dur <= 0) return alert("Süre zorunludur!");
    const d = []; document.querySelectorAll('input[name="ders-secim"]:checked').forEach(c => d.push(c.value)); const k = []; document.querySelectorAll('input[name="deneme-secim"]:checked').forEach(c => k.push(c.value));
    const sc = document.getElementById('set-count'); const countVal = sc ? sc.value : 10;
    const sd = document.getElementById('set-difficulty'); const diffVal = sd ? sd.value : 'HEPSI';
    const so = document.getElementById('set-options'); const optsVal = so ? parseInt(so.value) : 5;
    const s = { count: countVal, subject: d.includes("HEPSI") ? "HEPSI" : d, deneme: k.includes("HEPSI") ? "HEPSI" : k, difficulty: diffVal, optionsCount: optsVal, timerMode: window.selectedTimerMode, duration: dur, classCode: window.myClassCode };
    if (window.currentMode === 'trial' && window.socket) window.socket.emit('startTrial', s); else if (window.socket) window.socket.emit('startGame', { roomCode: window.myRoom, settings: s });
};

// 🚨 SOCKET DİNLEYİCİLERİ 🚨
if(window.socket) {
    window.socket.on("studentLibraryData", (data) => window.renderStudentLibraryHTML(data, "☁️ Bulut Hata Defterim"));
    window.socket.on("classQuestionsData", (data) => { if(data.length === 0) return alert("Bu sınıfa henüz öğretmen tarafından soru eklenmemiş."); window.tempStdQuestions = data; window.startLibraryTest(); });
    window.socket.on("teacherReportsData", (data) => {
        window.currentListType = "teacher_report"; const lt = document.getElementById('list-title'); if(lt) lt.innerText = "📊 Sınıf İstihbarat Raporu"; 
        const reports = data.reports || []; const roster = data.roster || [];
        const solvedNames = reports.map(r => r.name); const notSolved = roster.filter(name => !solvedNames.includes(name));
        let html = `<h4 style="color:#27ae60; margin-top:0;">✅ Çözenler</h4>`;
        if(reports.length === 0) html += "<p style='font-size:0.85rem;'>Henüz çözen öğrenci yok.</p>"; else html += reports.map(r => `<div class="list-item" style="border-left:4px solid #27ae60;"><b>${r.name}</b> <span style="float:right; color:#27ae60; font-weight:bold;">${r.score} Puan</span></div>`).join('');
        html += `<h4 style="color:#c0392b; margin-top:20px;">💤 Çözmeyenler</h4>`;
        if(notSolved.length === 0) html += "<p style='font-size:0.85rem;'>Sınıf listesi boş veya tüm sınıf görevini tamamlamış!</p>"; else html += notSolved.map(name => `<div class="list-item" style="border-left:4px solid #c0392b; color:#666;">${name}</div>`).join('');
        const lc = document.getElementById('list-content'); if(lc) lc.innerHTML = html; window.showScreen('screen-list');
    });
    window.socket.on("classMistakesData", (data) => {
        window.currentListType = "class_mistakes"; const lt = document.getElementById('list-title'); if(lt) lt.innerText = "📉 Sınıf Yanlış Analizi"; const div = document.getElementById('list-content');
        if(div) { if(data.length === 0) div.innerHTML = "<p style='text-align:center;'>Bu sınıfa ait hata kaydı bulunamadı.</p>"; 
        else div.innerHTML = data.map(m => `<div class="list-item" style="border-left: 5px solid #c0392b;"><small style="color:#1e3c72; font-weight:bold;">${m.ders} | ${m.konu}</small><br><b>Soru Metni:</b> ${m.soru} <br><div style="margin-top:5px; background:#fff3f3; padding:5px; border-radius:5px; color:#c0392b; font-weight:bold; font-size:0.85rem;">⚠️ Bu soru sınıfta toplam ${m.count} kez yanlış yapıldı!</div></div>`).join(''); }
        window.showScreen('screen-list');
    });
    window.socket.on("teacherLibraryData", (data) => { 
        const lfa = document.getElementById('library-filter-area'); if(lfa) lfa.style.display = 'none'; window.tempStdQuestions = data; window.currentListType = "teacher_library"; const lt = document.getElementById('list-title'); if(lt) lt.innerText = "📚 Soru Kütüphanem"; const div = document.getElementById('list-content'); 
        if(div) { if(data.length === 0) div.innerHTML = "<p style='text-align:center;'>Kütüphanenizde henüz soru bulunmuyor.</p>"; 
        else div.innerHTML = data.map((q, i) => `<div class="list-item" style="border-left: 5px solid #e67e22;"><b>Soru:</b> ${q.soru} <br><span style="color:#27ae60;"><b>Cevap:</b> ${q.siklar ? q.siklar[q.dogru] : 'Bilinmiyor'}</span> <br><small>Ders: ${q.ders} | Konu: ${q.deneme}</small><br>${q.image ? `<img src="${q.image}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''} ${q.solutionText || q.solutionImage ? `<div style="background:#e8f4f8; padding:8px; border-radius:5px; margin-top:5px; font-size:0.8rem; color:#1e3c72;"><b>👨‍🏫 Çözüm:</b> ${q.solutionText || ''} ${q.solutionImage ? '<br><span style="color:#27ae60;">[Görsel Ekli]</span>' : ''}</div>` : ''} <button onclick="window.reportQuestionFromLibrary(${i})" class="outline" style="margin-top:10px; font-size:0.75rem; border-color:#c0392b; color:#c0392b;">🚨 Hatalı Bildir</button></div>`).join(''); } window.showScreen('screen-list'); 
    });
    window.socket.on("notebookReviewsCount", (count) => { const box = document.getElementById('notebook-alert-box'); if(box) { if(count > 0) box.style.display = 'block'; else box.style.display = 'none'; } });
    window.socket.on("pendingTeachersData", (data) => { window.currentListType = "admin_approval"; const lt = document.getElementById('list-title'); if(lt) lt.innerText = "👨‍🏫 Onay Bekleyen Öğretmenler"; const div = document.getElementById('list-content'); if(div) { if(data.length === 0) div.innerHTML = "<p style='text-align:center;'>Onay bekleyen öğretmen bulunmuyor.</p>"; else div.innerHTML = data.map((t, i) => `<div class="list-item" style="border-left: 5px solid #8e44ad;"><b>İsim:</b> ${t.name} <br><b>E-posta:</b> ${t.email} <br><button onclick="window.approveTeacher('${t.email}')" class="green" style="margin-top:5px; padding:5px 10px; font-size:0.8rem; width:auto;">✅ Onayla</button></div>`).join(''); } window.showScreen('screen-list'); });
    window.socket.on("teacherClassesData", (classes) => {
        const listDiv = document.getElementById('teacher-classes-list'); const select = document.getElementById('target-class-select');
        if(listDiv && select) {
            if(classes.length === 0) { listDiv.innerHTML = "Henüz sınıf oluşturulmadı."; select.innerHTML = '<option value="">Önce Sınıf Oluşturun</option>'; return; }
            listDiv.innerHTML = classes.map(c => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; background:rgba(255,255,255,0.1); padding:8px; border-radius:6px;"><span><b>${c.name}</b> (${c.code})</span><button onclick="window.copyToClipboard('${c.code}')" style="width:auto; padding:4px 8px; font-size:0.7rem; background:#3498db; border:none; color:white; border-radius:4px; cursor:pointer;">Kopyala</button></div>`).join('');
            select.innerHTML = '<option value="">--- Sınıf Seçin ---</option>' + classes.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
        }
    });
    window.socket.on("classCreated", (code) => { const gc = document.getElementById('generated-code'); if(gc) gc.innerText = "KODUNUZ: " + code; window.myClassCode = code; localStorage.setItem("gazi_class_code", code); window.socket.emit("getFilters", window.myClassCode); }); 
    window.socket.on("teacherClassFound", (code) => { const gc = document.getElementById('generated-code'); if(gc) gc.innerText = "KODUNUZ: " + code; window.myClassCode = code; localStorage.setItem("gazi_class_code", code); window.socket.emit("getFilters", window.myClassCode); }); 
    window.socket.on("classJoined", (res) => { if(res.success) { window.myClassCode = res.code; localStorage.setItem("gazi_class_code", res.code); window.socket.emit("getFilters", window.myClassCode); alert("✅ Sınıfa katıldın!"); const btn = document.getElementById('btn-class-questions'); if(btn) btn.style.display = 'block'; } else { alert("❌ Geçersiz Sınıf Kodu!"); } });
    window.socket.on("receiveGlobalAlert", (data) => { const toast = document.getElementById('notification-toast'); const tm = document.getElementById('toast-message'); if(toast && tm) { tm.innerHTML = `<span style="color:#e67e22;">${data.sender}:</span><br>${data.message}`; toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); }, 6000); } });
    window.socket.on("allReportsData", (data) => { window.currentListType = "admin_report"; const lt = document.getElementById('list-title'); if(lt) lt.innerText = "👑 Merkezi Hata Raporları"; const contentDiv = document.getElementById('list-content'); if(contentDiv) { if(data.length === 0) contentDiv.innerHTML = "<p style='text-align:center;'>Henüz rapor yok.</p>"; else contentDiv.innerHTML = data.map((q, i) => `<div class="list-item" style="border-left: 5px solid #c0392b;"><b>Soru:</b> ${q.soru} <br><span style="color:#27ae60;"><b>Cevap:</b> ${q.siklar ? q.siklar[q.dogru] : '---'}</span> <br><small style="color:#666;">Tarih: ${q.reportedAt || '---'}</small></div>`).join(''); } window.showScreen('screen-list'); });
    window.socket.on('roomCreated', c => { window.myRoom = c; const lrc = document.getElementById('lobby-room-code'); if(lrc) lrc.innerText = c; });
    window.socket.on('updatePlayerList', p => { 
        const l = document.getElementById('lobby-players-list'); if(l) l.innerHTML = p.map(x => `<span class="player-badge">${x.username}</span>`).join(''); 
        const live = document.getElementById('live-leaderboard'); if(live) { live.style.display = window.currentMode === 'room' ? 'block' : 'none'; live.innerHTML = "🏆 " + p.sort((a,b)=>b.score-a.score).map(x => `<b>${x.username}:</b> ${x.score}p`).join(' | '); }
    });
    window.socket.on('gameOver', (players) => {
        if(window.totalInt) clearInterval(window.totalInt); if(window.qInt) clearInterval(window.qInt); window.showScreen('screen-result');
        players.sort((a,b) => b.score - a.score); let html = `<h3 style="color:#e67e22; margin-bottom:5px;">Oda Sınavı Sona Erdi!</h3>`;
        html += players.map((p, i) => `<div class="list-item" style="border-left:5px solid ${i===0?'#f1c40f':'#3498db'}; font-size:1.1rem; text-align:left;"><b>${i === 0 ? '👑' : ''} ${i+1}. ${p.username}</b> <span style="float:right; color:#27ae60; font-weight:bold;">${p.score} Puan</span></div>`).join('');
        const rb = document.getElementById('result-board'); if(rb) rb.innerHTML = html; confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
    });
    window.socket.on('newQuestion', d => {
        window.showScreen('screen-game'); window.currentQObject = d; const oa = document.getElementById('opts-area'); if(oa) oa.innerHTML = ""; window.currentQIndex = d.index - 1; const qt = document.getElementById('q-text'); if(qt) qt.innerText = d.soru;
        const imgDisp = document.getElementById('q-image-display'); if(imgDisp) { if(d.image) { imgDisp.src = d.image; imgDisp.style.display = "block"; } else { imgDisp.style.display = "none"; } }
        const bq = document.getElementById('box-question'); if(bq) bq.style.display = (d.timerMode === 'question') ? 'block' : 'none'; const bt = document.getElementById('box-total'); if(bt) bt.style.display = (d.timerMode === 'general') ? 'block' : 'none';
        if(d.timerMode === 'general' && d.index === 1) window.startTotalTimer(d.duration); if(d.timerMode === 'question') window.startQuestionTimer(d.duration);
        window.renderNavigator(d.total, window.currentQIndex, 'room');
        if(oa) d.siklar.forEach((s, i) => { const b = document.createElement('button'); b.innerText = s; b.className = "opt-btn"; b.onclick = () => { document.querySelectorAll('.opt-btn').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); window.socket.emit('submitAnswer', {roomCode: window.myRoom, answerIndex: i}); clearInterval(window.qInt); }; oa.appendChild(b); });
    });
    window.socket.on('answerResult', data => { const b = document.getElementById('nav-box-' + window.currentQIndex); if(b) b.classList.add(data.correct ? 'correct' : 'wrong'); if(!data.correct) { if(data.selectedIndex === -1) window.saveToLocal('kpss_blanks', window.currentQObject); else window.saveToLocal('kpss_wrongs', window.currentQObject); } });
    window.socket.on('trialStarted', data => {
        window.trialQuestions = data.questions || data; if(window.trialQuestions.length === 0) return alert("Soru bulunamadı!");
        window.trialAnswers = new Array(window.trialQuestions.length).fill(null); window.currentQIndex = 0; window.showScreen('screen-game'); const tnb = document.getElementById('trial-nav-buttons'); if(tnb) tnb.style.display = 'flex'; const bft = document.getElementById('btn-finish-trial'); if(bft) bft.style.display = 'block';
        if(data.timerMode === 'general') { const bt = document.getElementById('box-total'); if(bt) bt.style.display = 'block'; window.startTotalTimer(data.duration); } window.renderTrialQuestion();
    });
}

window.renderTrialQuestion = () => {
    window.currentQObject = window.trialQuestions[window.currentQIndex]; const qt = document.getElementById('q-text'); if(qt) qt.innerText = `(${window.currentQIndex+1}/${window.trialQuestions.length}) ` + (window.currentQObject.soru || window.currentQObject.not || "Görseli inceleyiniz.");
    const imgDisp = document.getElementById('q-image-display'); if(imgDisp) { if(window.currentQObject.image) { imgDisp.src = window.currentQObject.image; imgDisp.style.display = "block"; } else { imgDisp.style.display = "none"; } }
    window.renderNavigator(window.trialQuestions.length, window.currentQIndex, 'trial'); const a = document.getElementById('opts-area'); if(a) a.innerHTML = "";
    const siklarListesi = window.currentQObject.siklar || ["A", "B", "C", "D", "E"]; 
    if(a) { siklarListesi.forEach((s, i) => { 
        const b = document.createElement('button'); b.innerText = s; 
        if (window.trialAnswers[window.currentQIndex] !== null) { if (i === window.currentQObject.dogru) { b.className = "opt-btn correct selected"; } else if (i === window.trialAnswers[window.currentQIndex]) { b.className = "opt-btn wrong selected"; } else { b.className = "opt-btn"; } } else { b.className = "opt-btn"; }
        b.onclick = () => { if(window.trialAnswers[window.currentQIndex] === null) { window.trialAnswers[window.currentQIndex] = i; window.renderTrialQuestion(); if (!(window.currentQObject.solutionText || window.currentQObject.solutionImage)) { setTimeout(() => { if(window.currentQIndex < window.trialQuestions.length - 1) window.trialNext(); }, 600); } } else { window.trialAnswers[window.currentQIndex] = i; window.renderTrialQuestion(); } }; a.appendChild(b); 
    }); }
    let solArea = document.getElementById('trial-solution-area'); if(!solArea && a) { solArea = document.createElement('div'); solArea.id = 'trial-solution-area'; a.parentNode.appendChild(solArea); }
    if(solArea) { if (window.trialAnswers[window.currentQIndex] !== null && (window.currentQObject.solutionText || window.currentQObject.solutionImage)) { solArea.style.display = 'block'; solArea.innerHTML = `<div style="margin-top:15px; padding:15px; background:#e8f4f8; border-radius:8px; border: 1px solid #3498db; text-align:left; color:#1e3c72; font-size:0.9rem;"><b>👨‍🏫 Çözüm Notu:</b><br>${window.currentQObject.solutionText || 'Yazılı açıklama eklenmemiş.'}<br>${window.currentQObject.solutionImage ? `<img src="${window.currentQObject.solutionImage}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''}</div>`; } else { solArea.style.display = 'none'; } }
};

window.trialNext = () => { if(window.currentQIndex < window.trialQuestions.length-1) { window.currentQIndex++; window.renderTrialQuestion(); } }; window.trialPrev = () => { if(window.currentQIndex > 0) { window.currentQIndex--; window.renderTrialQuestion(); } };
window.finishTrial = () => {
    if(window.totalInt) clearInterval(window.totalInt); let s = 0; let d = 0; let y = 0; let b = 0; const realName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı"; const mistakesToCloud = [];
    window.trialQuestions.forEach((q, i) => { if(window.trialAnswers[i] === q.dogru) { s+=10; d++; } else if(window.trialAnswers[i] !== null) { s-=5; y++; window.saveToLocal('kpss_wrongs', q); mistakesToCloud.push(q); if(window.socket) window.socket.emit("addToReviewQueue", { studentName: realName, question: q }); } else { b++; window.saveToLocal('kpss_blanks', q); } });
    if(window.socket) window.socket.emit("saveStudentResult", { name: realName, classCode: window.myClassCode, score: s, correct: d, wrong: y, blank: b });
    if(window.socket && mistakesToCloud.length > 0 && window.myClassCode) { window.socket.emit("saveClassMistakes", { classCode: window.myClassCode, mistakes: mistakesToCloud }); }
    window.showScreen('screen-result'); const rb = document.getElementById('result-board'); if(rb) rb.innerHTML = `<h3 style="color:#333;">Doğru: ${d} | Yanlış: ${y} | Boş: ${b}</h3><h2>Puan: ${s}</h2>`; confetti({ particleCount: 150 });
};

window.startQuestionTimer = (s) => { let t = s; if(window.qInt) clearInterval(window.qInt); window.qInt = setInterval(() => { t--; const tq = document.getElementById('time-q'); if(tq) tq.innerText = t + "s"; if(t<=0) { clearInterval(window.qInt); if(window.socket) window.socket.emit('submitAnswer', {roomCode: window.myRoom, answerIndex: -1}); }}, 1000); };
window.startTotalTimer = (minutes) => { let t = minutes * 60; if(window.totalInt) clearInterval(window.totalInt); window.totalInt = setInterval(() => { t--; let m = Math.floor(t/60), sec = t%60; const tt = document.getElementById('time-total'); if(tt) tt.innerText = `${m}:${sec<10?'0'+sec:sec}`; if(t<=0) { clearInterval(window.totalInt); if(window.currentMode === 'trial') window.finishTrial(); } }, 1000); };
window.renderNavigator = (total, curr, mode) => { const div = document.getElementById('question-navigator'); if(div) { if(div.innerHTML === "") { for(let i=0; i<total; i++) { const b = document.createElement('div'); b.id = 'nav-box-'+i; b.className = 'nav-box'; b.innerText = i+1; if(mode === 'trial') b.onclick = () => { window.currentQIndex = i; window.renderTrialQuestion(); }; div.appendChild(b); } } document.querySelectorAll('.nav-box').forEach(x => x.classList.remove('current')); const cb = document.getElementById('nav-box-' + curr); if(cb) { cb.classList.add('current'); if(mode === 'trial') { for(let i=0; i<total; i++) { let box = document.getElementById('nav-box-'+i); if(box) { if(window.trialAnswers[i] !== null) box.classList.add('answered'); else box.classList.remove('answered'); } } } } } };

// 🚨 SİSTEM İLK YÜKLEME TETİKLEYİCİSİ 🚨
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { 
        window.initEtiketleme(); 
        if(typeof window.checkAlerts === 'function') window.checkAlerts();
        
        // 1. Bölükteki Firebase işlemlerini şimdi güvenle başlatıyoruz:
        if(typeof window.baslatFirebaseAuth === 'function') {
            window.baslatFirebaseAuth();
        }
    }, 500);
});
