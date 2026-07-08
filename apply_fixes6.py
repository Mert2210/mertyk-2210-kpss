import sys

# 1. Update index.js (fix deleteClass, renameClass, and joinClass)
index_path = "index.js"
with open(index_path, "r", encoding="utf-8") as f:
    idx_js = f.read()

# Fix renameClass
old_rename = """              const myClasses = {};
              for (const c in classes) { if (classes[c].createdBy === currentUser(socket).name) myClasses[c] = classes[c]; }
              socket.emit("teacherClassesData", myClasses);"""
new_rename = """              const myClasses = {};
              for (const c in classes) { if (classes[c].teacher === currentUser(socket).email) myClasses[c] = classes[c]; }
              socket.emit("teacherClassesData", myClasses);"""
idx_js = idx_js.replace(old_rename, new_rename)

old_rename2 = """          if (classes[safeOldCode] && classes[safeOldCode].createdBy === currentUser(socket).name) {"""
new_rename2 = """          if (classes[safeOldCode] && classes[safeOldCode].teacher === currentUser(socket).email) {"""
idx_js = idx_js.replace(old_rename2, new_rename2)

# Fix deleteClass
old_delete = """          if (classes[safeCode] && classes[safeCode].createdBy === currentUser(socket).name) {"""
new_delete = """          if (classes[safeCode] && classes[safeCode].teacher === currentUser(socket).email) {"""
idx_js = idx_js.replace(old_delete, new_delete)

old_delete2 = """              const myClasses = {};
              for (const c in classes) { if (classes[c].createdBy === currentUser(socket).name) myClasses[c] = classes[c]; }
              socket.emit("teacherClassesData", myClasses);"""
new_delete2 = """              const myClasses = {};
              for (const c in classes) { if (classes[c].teacher === currentUser(socket).email) myClasses[c] = classes[c]; }
              socket.emit("teacherClassesData", myClasses);"""
idx_js = idx_js.replace(old_delete2, new_delete2)

# Fix joinClass (return className)
old_join = """        socket.emit("classJoined", { success: true, code: safeCode });"""
new_join = """        socket.emit("classJoined", { success: true, code: safeCode, className: classes[safeCode].name });"""
idx_js = idx_js.replace(old_join, new_join)

with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx_js)


# 2. Update app.js
app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    app_js = f.read()

# Fix IMAGE_OPTIMIZATION_CONFIG to make uploads faster (lower size)
old_opt = """const IMAGE_OPTIMIZATION_CONFIG = Object.freeze({
    maxWidth: 1280,
    minWidth: 720,
    // 1GB toplam bulut kota için soru/çözüm görsellerinde ortalama dosya boyutunu düşük tutar.
    targetBytes: 220 * 1024,"""
new_opt = """const IMAGE_OPTIMIZATION_CONFIG = Object.freeze({
    maxWidth: 900,
    minWidth: 600,
    // 1GB toplam bulut kota için soru/çözüm görsellerinde ortalama dosya boyutunu düşük tutar.
    targetBytes: 150 * 1024,"""
app_js = app_js.replace(old_opt, new_opt)

# Fix deleteTeacherClass confirm dialog bug (two confirms might block)
old_del_teacher = """window.deleteTeacherClass = () => {
    const code = document.getElementById('manage-class-select').value;
    if (!code) return alert("❌ Lütfen önce sınıf seçin.");
    
    const deleteQuestions = confirm("⚠️ DİKKAT: Sınıfı silmek üzeresiniz.\\n\\nBu sınıfa göndermiş olduğunuz tüm soruları da KÖKTEN SİLMEK istiyor musunuz?\\n(İptal derseniz sadece sınıf silinir, sorular kütüphanenizde kalır)");
    
    if (confirm("🚨 Bu sınıf kalıcı olarak silinecek. Emin misiniz?")) {
        if (socket) socket.emit("deleteClass", { code, deleteQuestions });
        document.getElementById('manage-class-actions').style.display = 'none';
        document.getElementById('manage-class-select').value = "";
    }
};"""
new_del_teacher = """window.deleteTeacherClass = () => {
    const code = document.getElementById('manage-class-select').value;
    if (!code) return alert("❌ Lütfen önce sınıf seçin.");
    
    const isSure = confirm("🚨 Bu sınıf kalıcı olarak silinecek. Emin misiniz?");
    if (isSure) {
        const deleteQuestions = confirm("⚠️ Bu sınıfa göndermiş olduğunuz tüm soruları da KÖKTEN SİLMEK istiyor musunuz?\\n(İptal derseniz sadece sınıf silinir, sorular kütüphanenizde kalır)");
        if (socket) socket.emit("deleteClass", { code, deleteQuestions });
        document.getElementById('manage-class-actions').style.display = 'none';
        document.getElementById('manage-class-select').value = "";
    }
};"""
app_js = app_js.replace(old_del_teacher, new_del_teacher)

# Add student list population in onManageClassChange
old_manage_change = """    if (classCode) {
        actionsArea.style.display = 'block';
        codeDisplay.innerText = "KOD: " + classCode;
        renameInput.value = "";
    } else {"""
new_manage_change = """    if (classCode) {
        actionsArea.style.display = 'block';
        codeDisplay.innerText = "KOD: " + classCode;
        renameInput.value = "";
        
        const cachedClasses = JSON.parse(CLIENT_STORE.getItem('gazi_teacher_classes')) || {};
        const cls = cachedClasses[classCode];
        const ul = document.getElementById('manage-class-students-ul');
        if (ul && cls) {
            if (cls.students && cls.students.length > 0) {
                ul.innerHTML = cls.students.map(s => `<li>${s.name}</li>`).join('');
            } else {
                ul.innerHTML = '<li>Henüz öğrenci yok.</li>';
            }
        }
    } else {"""
app_js = app_js.replace(old_manage_change, new_manage_change)

# Save className on joinClass
old_join_socket = """        CLIENT_STORE.setItem("gazi_class_code", res.code); 
        socket.emit("getFilters", window.myClassCode); 
        subscribeToClassPushNotifications(res.code, { forcePrompt: true });
        alert("✅ Sınıfa katıldın!"); """
new_join_socket = """        CLIENT_STORE.setItem("gazi_class_code", res.code); 
        if (res.className) CLIENT_STORE.setItem('studentClassName', res.className);
        socket.emit("getFilters", window.myClassCode); 
        subscribeToClassPushNotifications(res.code, { forcePrompt: true });
        
        const classInfoEl = document.getElementById('student-current-class-info');
        if (classInfoEl) classInfoEl.innerHTML = `Mevcut Sınıfınız: <b>${res.className || res.code}</b>`;
        
        alert("✅ Sınıfa katıldın!"); """
app_js = app_js.replace(old_join_socket, new_join_socket)

# Add Teacher Solution Image button feedback
old_teacher_img_fb = """        } else {
            uploadedSolutionBase64 = optimizedDataUrl;
            document.getElementById(previewId).src = uploadedSolutionBase64;
        }"""
new_teacher_img_fb = """        } else {
            uploadedSolutionBase64 = optimizedDataUrl;
            document.getElementById(previewId).src = uploadedSolutionBase64;
            const btn = document.getElementById('teacher-sol-file-btn');
            if (btn) { btn.innerHTML = "✅ Çözüm Yüklendi"; btn.style.borderColor = "#2ecc71"; btn.style.color = "#2ecc71"; }
        }"""
app_js = app_js.replace(old_teacher_img_fb, new_teacher_img_fb)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(app_js)


# 3. Update index.html
html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Make Student accordion more professional
old_accordion = """<details style="margin-bottom:10px; background: #e8f4f8; border-radius: 8px; border: 1px dashed #3498db;">
                <summary style="font-size:0.85rem; font-weight:bold; color:#1e3c72; padding:12px; cursor:pointer; list-style:none; outline:none;">➕ Çözüm / Not Ekle (İsteğe Bağlı)</summary>"""
new_accordion = """<details style="margin-bottom:10px; background: #fdfdfd; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <summary style="font-size:0.85rem; font-weight:600; color:#2c3e50; padding:12px 15px; cursor:pointer; list-style:none; outline:none; display:flex; justify-content:space-between; align-items:center;">
                    <span>📝 Çözüm veya Not Ekle (İsteğe Bağlı)</span>
                    <span style="color:#3498db; font-size:1.2rem; line-height:1;">+</span>
                </summary>"""
html = html.replace(old_accordion, new_accordion)

# Add students list to Teacher Manage panel
old_manage_panel = """                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <input type="text" id="manage-class-rename-input" placeholder="Yeni İsim..." class="ui-input" style="flex:2; margin:0;">
                            <button onclick="window.renameTeacherClass()" class="blue" style="flex:1; margin:0; padding:10px; border-radius:10px;">✏️ Adını Değiş</button>
                        </div>
                        
                        <button onclick="window.deleteTeacherClass()" class="outline" style="width:100%; padding:10px; font-size:0.85rem; border-color:#e74c3c; color:#e74c3c; border-radius:10px; font-weight:bold;">🗑️ Sınıfı Sil</button>
                    </div>
                </div>
            </div>"""

new_manage_panel = """                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <input type="text" id="manage-class-rename-input" placeholder="Yeni İsim..." class="ui-input" style="flex:2; margin:0;">
                            <button onclick="window.renameTeacherClass()" class="blue" style="flex:1; margin:0; padding:10px; border-radius:10px;">✏️ Adını Değiş</button>
                        </div>
                        
                        <button onclick="window.deleteTeacherClass()" class="outline" style="width:100%; margin-bottom:10px; padding:10px; font-size:0.85rem; border-color:#e74c3c; color:#e74c3c; border-radius:10px; font-weight:bold;">🗑️ Sınıfı Sil</button>

                        <div id="manage-class-students-list" style="margin-top:15px; text-align:left; font-size:0.85rem; border-top:1px dashed #ccc; padding-top:15px;">
                            <strong style="color:#1e3c72;">🎓 Sınıftaki Öğrenciler:</strong>
                            <ul id="manage-class-students-ul" style="padding-left:20px; color:#4b5563; margin-top:8px; line-height:1.6;">
                            </ul>
                        </div>
                    </div>
                </div>
            </div>"""
if "manage-class-students-list" not in html:
    html = html.replace(old_manage_panel, new_manage_panel)

# Add Solution upload to Teacher Panel
old_teacher_form = """                            <img id="img-preview" src="" style="width:100%; max-height:200px; object-fit:contain; display:none; margin-bottom:10px; border-radius:8px;">
                            
                            <div style="display:flex; gap:10px; margin-bottom:15px;">"""
new_teacher_form = """                            <img id="img-preview" src="" style="width:100%; max-height:200px; object-fit:contain; display:none; margin-bottom:10px; border-radius:8px;">
                            
                            <details style="margin-bottom:15px; background: #fdfdfd; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 2px 5px rgba(0,0,0,0.05); text-align:left;">
                                <summary style="font-size:0.85rem; font-weight:600; color:#2c3e50; padding:12px 15px; cursor:pointer; list-style:none; outline:none; display:flex; justify-content:space-between; align-items:center;">
                                    <span>📝 Çözüm Ekle (İsteğe Bağlı)</span>
                                    <span style="color:#3498db; font-size:1.2rem; line-height:1;">+</span>
                                </summary>
                                <div style="padding: 0 12px 12px 12px; margin-top:-5px;">
                                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                                        <button onclick="document.getElementById('solution-upload-camera').click()" class="blue" style="flex:1; padding:10px; font-size:0.85rem; border-radius:10px;">📸 Çözüm Çek</button>
                                        <button onclick="document.getElementById('solution-upload-file-picker').click()" class="outline" id="teacher-sol-file-btn" style="flex:1; padding:10px; font-size:0.85rem; border-radius:10px; transition:all 0.3s;">🖼️ Galeriden Seç</button>
                                    </div>
                                    <img id="img-preview-solution" src="" style="width:100%; max-height:200px; object-fit:contain; display:none; margin-bottom:10px; border-radius:8px; border: 2px solid #3498db;">
                                    <textarea id="new-q-sol-text" placeholder="Varsa yazılı çözüm notunuz..." class="ui-input" style="height:50px; resize:none; font-size:0.85rem; margin:0;"></textarea>
                                </div>
                            </details>
                            
                            <div style="display:flex; gap:10px; margin-bottom:15px;">"""
if "img-preview-solution" not in html:
    html = html.replace(old_teacher_form, new_teacher_form)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Applied fixes for teacher panel, image upload timeouts, and UX improvements.")
