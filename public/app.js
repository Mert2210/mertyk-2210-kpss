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

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => console.log("PWA Aktif."));
}

window.showScreen = (id) => { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
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
    showScreen('screen-settings');
};

// 🚨 FİREBASE KULLANICI İŞLEMLERİ 🚨
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
    ['tarih', 'cografya', 'vatandaslik', 'matematik', 'turkce', 'egitim', 'fizik', 'kimya', 'biyoloji', 'fen'].forEach(sub => { 
        const cb = document.getElementById('subj-' + sub); 
        if(cb && cb.checked) {
            subjectsData.push({ name: cb.value, topics: document.getElementById('topic-' + sub).value.trim() }); 
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
        await signInWithPopup(auth, new GoogleAuthProvider()); 
    } catch(e) { 
        alert(e.message); 
    } 
};

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
            document.getElementById('class-code-input').value = stdClassCode; 
            document.getElementById('btn-class-questions').style.display = 'block'; 
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

// 🚨 OYUN MANTIĞI VE SOCKET İŞLEMLERİ 🚨
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

window.uploadStudentQuestion = (target = 'cloud') => {
    const qDersObj = document.getElementById('std-q-ders'); 
    const qDers = qDersObj ? qDersObj.value : 'Genel';
    const qKitap = document.getElementById('std-q-kitap').value.trim(); 
    const qKonu = document.getElementById('std-q-konu').value.trim();
    const qText = document.getElementById('std-q-text').value.trim(); 
    const qSolText = document.getElementById('std-q-sol-text').value.trim(); 
    const correctIdx = parseInt(document.getElementById('std-q-correct-idx').value) || 0;
    const studentName = document.getElementById('display-user').innerText.replace("Hoş Geldin, ", "").trim() || "Gazi Adayı";
    
    const reminderDays = parseFloat(document.getElementById('std-q-reminder').value) || 1;
    const nextReviewDate = Date.now() + (reminderDays * 24 * 60 * 60 * 1000); 

    if(!qKitap || !qKonu) return alert("Lütfen Kitap/Kaynak ve Konu alanlarını doldurun!");
    if(!stdUploadedImageBase64 && !qText) return alert("Lütfen bir fotoğraf yükleyin veya kendinize bir not yazın!");

    const q = { 
        id: 'local_' + Date.now(), 
        studentName: studentName, 
        ders: qDers, 
        kitap: qKitap, 
        konu: qKonu, 
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
        let localNotebook = JSON.parse(localStorage.getItem('gazi_local_notebook')) || []; 
        localNotebook.push(q); 
        localStorage.setItem('gazi_local_notebook', JSON.stringify(localNotebook));
        alert(`💾 Soru CİHAZINIZA başarıyla kaydedildi!\nİnternetsiz de çözebilirsiniz.`);
    }
    
    document.getElementById('std-q-kitap').value = ""; 
    document.getElementById('std-q-konu').value = ""; 
    document.getElementById('std-q-text').value = ""; 
    document.getElementById('std-q-sol-text').value = ""; 
    document.getElementById('std-img-preview').style.display = "none"; 
    stdUploadedImageBase64 = null; 
    stdSolutionBase64 = null;
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

window.updateReviewDate = (questionId, isLocal = false) => {
    const d = prompt("Harika! Bu soruyu tekrar ettin. Peki sana bir daha ne zaman hatırlatayım? \n(Örn: 1 Saat için 0.04, Akşam için 0.25, Yarın Sabah için 0.5, 3 Gün için 3 yazın)");
    const days = parseFloat(d ? d.replace(',', '.') : 0);
    
    if(days && days > 0) {
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
    sDiv.innerHTML = `<b>✏️ Çözüm Notu:</b><br>${q.solutionText || 'Yazılı çözüm notu bulunmuyor.'}<br>${q.solutionImage ? `<img src="${q.solutionImage}" style="width:100%; margin-top:5px; border-radius:5px;">` : ''}`; 
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
        
        const reports = data.reports || []; 
        const roster = data.roster || [];
        const solvedNames = reports.map(r => r.name); 
        const notSolved = roster.filter(name => !solvedNames.includes(name));
        
        let html = `<h4 style="color:#27ae60; margin-top:0;">✅ Çözenler</h4>`;
        if(reports.length === 0) html += "<p style='font-size:0.85rem;'>Henüz çözen öğrenci yok.</p>";
        else html += reports.map(r => `<div class="list-item" style="border-left:4px solid #27ae60;"><b>${r.name}</b> <span style="float:right; color:#27ae60; font-weight:bold;">${r.score} Puan</span></div>`).join('');
        
        html += `<h4 style="color:#c0392b; margin-top:20px;">💤 Çözmeyenler</h4>`;
        if(notSolved.length === 0) html += "<p style='font-size:0.85rem;'>Sınıf listesi boş veya tüm sınıf görevini tamamlamış!</p>";
        else html += notSolved.map(name => `<div class="list-item" style="border-left:4px solid #c0392b; color:#666;">${name}</div>`).join('');
        
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

    socket.on("teacherLibraryData", (data) => { 
        document.getElementById('library-filter-area').style.display = 'none'; 
        window.tempStdQuestions = data; 
        currentListType = "teacher_library"; 
        document.getElementById('list-title').innerText = "📚 Soru Kütüphanem"; 
        const div = document.getElementById('list-content'); 
        
        if(data.length === 0) div.innerHTML = "<p style='text-align:center;'>Kütüphanenizde henüz soru bulunmuyor.</p>"; 
        else div.innerHTML = data.map((q, i) => `
            <div class="list-item" style="border-left: 5px solid #e67e22;">
                <b>Soru:</b> ${q.soru} <br>
                <span style="color:#27ae60;"><b>Cevap:</b> ${q.siklar ? q.siklar[q.dogru] : 'Bilinmiyor'}</span> <br>
                <small>Ders: ${q.ders} | Konu: ${q.deneme}</small><br>
                ${q.image ? `<img src="${q.image}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''} 
                ${q.solutionText || q.solutionImage ? `<div style="background:#e8f4f8; padding:8px; border-radius:5px; margin-top:5px; font-size:0.8rem; color:#1e3c72;"><b>👨‍🏫 Çözüm:</b> ${q.solutionText || ''} ${q.solutionImage ? '<br><span style="color:#27ae60;">[Görsel Ekli]</span>' : ''}</div>` : ''} 
                <button onclick="reportQuestionFromLibrary(${i})" class="outline" style="margin-top:10px; font-size:0.75rem; border-color:#c0392b; color:#c0392b;">🚨 Hatalı Bildir</button>
            </div>`).join(''); 
        showScreen('screen-list'); 
    });

    socket.on("notebookReviewsCount", (count) => { 
        const box = document.getElementById('notebook-alert-box'); 
        if(count > 0) box.style.display = 'block'; 
        else box.style.display = 'none'; 
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

window.fetchAdminReports = () => { if(socket) socket.emit("adminGetReports"); };

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
