import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

init_code = """
        const savedClassName = CLIENT_STORE.getItem('studentClassName', '');
        const savedClassCode = CLIENT_STORE.getItem('studentClassCode', '');
        if (savedClassName && savedClassCode) {
            const classInfoEl = document.getElementById('student-current-class-info');
            if (classInfoEl) classInfoEl.innerHTML = `Mevcut Sınıfınız: <b>${savedClassName}</b>`;
        }
"""

# Insert this inside the auto-onboarding or intro check block for students
old_block = """        if (!isTeacher) {
            promptNotificationsOnFirstLaunch();"""

new_block = """        if (!isTeacher) {
            promptNotificationsOnFirstLaunch();
            
            const savedClassName = CLIENT_STORE.getItem('studentClassName', '');
            if (savedClassName) {
                const classInfoEl = document.getElementById('student-current-class-info');
                if (classInfoEl) classInfoEl.innerHTML = `Mevcut Sınıfınız: <b>${savedClassName}</b>`;
            }"""

js = js.replace(old_block, new_block)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Added initialization for student class info UI.")
