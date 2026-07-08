import sys
import re

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

# 1. Update teacherClassesData to populate manage-class-select too
old_teacher_data = """    socket.on("teacherClassesData", (classes) => {
        const select = document.getElementById('target-class-select');
        if (!select) return;
        select.innerHTML = '<option value="">🏫 --- Sınıf Seçin ---</option>';
        for (const code in classes) {
            select.innerHTML += `<option value="${code}">${classes[code].name} (${classes[code].students.length} Öğrenci)</option>`;
        }
    });"""

new_teacher_data = """    socket.on("teacherClassesData", (classes) => {
        const select = document.getElementById('target-class-select');
        const manageSelect = document.getElementById('manage-class-select');
        const defaultOption = '<option value="">🏫 --- Sınıf Seçin ---</option>';
        
        if (select) select.innerHTML = defaultOption;
        if (manageSelect) manageSelect.innerHTML = defaultOption;
        
        for (const code in classes) {
            const opt = `<option value="${code}">${classes[code].name} (${classes[code].students.length} Öğrenci)</option>`;
            if (select) select.innerHTML += opt;
            if (manageSelect) manageSelect.innerHTML += opt;
        }
        
        // Push notification aboneliği (öğretmen kendi sınıflarına abone olur)
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            for (const code in classes) {
                subscribeToClassPushNotifications(`teacher_${code}`, { forcePrompt: false });
            }
        }
    });"""

js = js.replace(old_teacher_data, new_teacher_data)

# 2. Add class management functions to window
management_functions = """
window.onManageClassChange = (classCode) => {
    const actionsArea = document.getElementById('manage-class-actions');
    const codeDisplay = document.getElementById('manage-class-code-display');
    const renameInput = document.getElementById('manage-class-rename-input');
    
    if (classCode) {
        actionsArea.style.display = 'block';
        codeDisplay.innerText = "KOD: " + classCode;
        renameInput.value = "";
    } else {
        actionsArea.style.display = 'none';
    }
};

window.shareTeacherClassCode = () => {
    const classCode = document.getElementById('manage-class-select').value;
    if (!classCode) return;
    
    const text = `Sınıfıma Katıl!\\nUygulamayı indir ve Sınıf Kodunu girerek katıl:\\n\\nKOD: ${classCode}`;
    if (navigator.share) {
        navigator.share({ title: 'Sınıfıma Katıl', text: text })
            .catch(err => console.log('Paylaşım iptal edildi veya desteklenmiyor.', err));
    } else {
        navigator.clipboard.writeText(text).then(() => {
            alert("📋 Sınıf kodu ve mesaj panoya kopyalandı! Öğrencilerinize gönderebilirsiniz.");
        });
    }
};

window.renameTeacherClass = () => {
    const oldCode = document.getElementById('manage-class-select').value;
    const newName = document.getElementById('manage-class-rename-input').value.trim();
    if (!oldCode) return alert("❌ Lütfen önce sınıf seçin.");
    if (!newName) return alert("❌ Lütfen yeni sınıf adını girin.");
    
    if (socket) socket.emit("renameClass", { oldCode, newName });
    document.getElementById('manage-class-rename-input').value = "";
};

window.deleteTeacherClass = () => {
    const code = document.getElementById('manage-class-select').value;
    if (!code) return alert("❌ Lütfen önce sınıf seçin.");
    
    const deleteQuestions = confirm("⚠️ DİKKAT: Sınıfı silmek üzeresiniz.\\n\\nBu sınıfa göndermiş olduğunuz tüm soruları da KÖKTEN SİLMEK istiyor musunuz?\\n(İptal derseniz sadece sınıf silinir, sorular kütüphanenizde kalır)");
    
    if (confirm("🚨 Bu sınıf kalıcı olarak silinecek. Emin misiniz?")) {
        if (socket) socket.emit("deleteClass", { code, deleteQuestions });
        document.getElementById('manage-class-actions').style.display = 'none';
        document.getElementById('manage-class-select').value = "";
    }
};
"""

if "window.deleteTeacherClass" not in js:
    js += management_functions

# 3. Update classJoined listener
old_class_joined = """    socket.on("classJoined", (res) => {
        if (res.success) {
            CLIENT_STORE.setItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY, res.code);
            subscribeToClassPushNotifications(res.code, { forcePrompt: true });
            alert("✅ Sınıfa katıldın!"); 
            const teacherQPanel = document.getElementById('gelisim-teacher-questions-panel');
            if (teacherQPanel) teacherQPanel.style.display = 'block';
        } else {
            alert("❌ Geçersiz Sınıf Kodu!"); 
        }
    });"""

new_class_joined = """    socket.on("classJoined", (res) => {
        if (res.success) {
            CLIENT_STORE.setItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY, res.code);
            CLIENT_STORE.setItem('studentClassCode', res.code);
            CLIENT_STORE.setItem('studentClassName', res.name);
            subscribeToClassPushNotifications(res.code, { forcePrompt: true });
            alert("✅ Sınıfa başarıyla katıldın!"); 
            const teacherQPanel = document.getElementById('gelisim-teacher-questions-panel');
            if (teacherQPanel) teacherQPanel.style.display = 'block';
            
            // UI Güncellemesi
            const classInfoEl = document.getElementById('student-current-class-info');
            if (classInfoEl) classInfoEl.innerHTML = `Mevcut Sınıfınız: <b>${res.name}</b>`;
        } else {
            alert("❌ Geçersiz Sınıf Kodu!"); 
        }
    });"""

js = js.replace(old_class_joined, new_class_joined)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Updated app.js with class management frontend logic.")
