import sys

# 1. Update app.js (remove annoying alert)
app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

old_alert = """        if (!options.silent) {
            alert("Bildirim sistemi başarıyla kuruldu.");
        }"""
new_alert = """        // if (!options.silent) alert("Bildirim sistemi başarıyla kuruldu.");"""
js = js.replace(old_alert, new_alert)

# ensure fetchClassQuestions gets the code correctly even if input is empty
old_fetch = """window.fetchClassQuestions = () => { 
    const code = document.getElementById('class-code-input').value.trim().toUpperCase(); 
    if(!code) return alert("Lütfen önce sınıf kodunu girin!"); 
    socket.emit("getClassQuestions", code); 
};"""
new_fetch = """window.fetchClassQuestions = () => { 
    const inputCode = document.getElementById('class-code-input')?.value.trim().toUpperCase();
    const storeCode = CLIENT_STORE.getItem('studentClassCode', '');
    const code = inputCode || storeCode;
    if(!code) return alert("Lütfen önce bir sınıf kodunu girin veya bir sınıfa katılın!"); 
    socket.emit("getClassQuestions", code); 
};"""
if "window.fetchClassQuestions" in js and old_fetch in js:
    js = js.replace(old_fetch, new_fetch)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)


# 2. Update index.js (fix teacherClassesData array vs object bug)
index_path = "index.js"
with open(index_path, "r", encoding="utf-8") as f:
    idx_js = f.read()

old_teacher_create = """        const teacherClasses = Object.keys(classes)
            .filter(code => classes[code].teacher === safeTeacherEmail)
            .map(code => ({ code, name: classes[code].name }));
        socket.emit("teacherClassesData", teacherClasses);"""
new_teacher_create = """        const myClasses = {};
        for (const c in classes) { if (classes[c].teacher === safeTeacherEmail) myClasses[c] = classes[c]; }
        socket.emit("teacherClassesData", myClasses);"""
idx_js = idx_js.replace(old_teacher_create, new_teacher_create)

old_teacher_get = """        const teacherClasses = Object.keys(classes)
            .filter(code => classes[code].teacher === targetEmail)
            .map(code => ({ code, name: classes[code].name }));
        socket.emit("teacherClassesData", teacherClasses);"""
new_teacher_get = """        const myClasses = {};
        for (const c in classes) { if (classes[c].teacher === targetEmail) myClasses[c] = classes[c]; }
        socket.emit("teacherClassesData", myClasses);"""
idx_js = idx_js.replace(old_teacher_get, new_teacher_get)

with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx_js)


# 3. Update index.html (Add Fetch Questions button)
html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

old_html = """                    <p id="student-current-class-info" style="font-size:0.85rem; color:#e67e22; margin-top:10px;"></p>
                    <div id="student-saved-materials-panel" style="margin-top:20px;">"""

new_html = """                    <p id="student-current-class-info" style="font-size:0.85rem; color:#e67e22; margin-top:10px;"></p>
                    <button onclick="window.fetchClassQuestions()" class="green" style="width:100%; margin-top:10px; padding:12px; font-size:0.9rem; border-radius:10px; box-shadow:0 4px 10px rgba(46, 204, 113, 0.3);">📥 Yeni Sınıf Gönderilerini Çek</button>
                    <div id="student-saved-materials-panel" style="margin-top:20px;">"""
if "📥 Yeni Sınıf Gönderilerini Çek" not in html:
    html = html.replace(old_html, new_html)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Applied fixes for teacherClassesData, alert removal, and fetch questions button.")
