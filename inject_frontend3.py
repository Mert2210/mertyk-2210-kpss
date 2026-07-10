import os

def insert_after(filepath, search_str, insert_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if insert_str in content: return
    if search_str in content:
        content = content.replace(search_str, search_str + "\n" + insert_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Injected into {filepath} after '{search_str.strip()}'")

def insert_before(filepath, search_str, insert_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if insert_str in content: return
    if search_str in content:
        content = content.replace(search_str, insert_str + "\n" + search_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Injected into {filepath} before '{search_str.strip()}'")

def append_to(filepath, append_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if append_str in content: return
    with open(filepath, 'a', encoding='utf-8') as f:
        f.write("\n" + append_str)
    print(f"Appended to {filepath}")

# 1. index.html changes
student_badge_html = '    <div id="student-class-badge-container" style="text-align: center; margin-bottom: 10px; display: none;"></div>'
insert_after('public/index.html', '<div id="student-view" style="display:none; padding:15px; width:100%;">', student_badge_html)

teacher_students_html = """
                        <div id="teacher-class-students" style="margin-top: 25px; text-align: left; background:#f9f9f9; padding:15px; border-radius:10px; border:1px solid #ddd;">
                            <h3 style="font-size: 0.95rem; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 5px; margin-top:0;">👥 Sınıftaki Öğrenciler (<span id="t-student-count" style="color:#e74c3c;">0</span>)</h3>
                            <ul id="t-student-list" style="list-style: none; padding: 0; margin: 10px 0; max-height: 150px; overflow-y: auto; font-size:0.9rem; color:#34495e;">
                                <li>Lütfen bekleyin...</li>
                            </ul>
                            <button onclick="window.refreshClassStudents()" class="outline" style="width:100%; padding:8px; font-size:0.8rem; margin-bottom:0;">🔄 Listeyi Yenile</button>
                        </div>
"""
insert_after('public/index.html', '<button onclick="window.deleteTeacherClass()" class="outline" style="width:100%; padding:12px; font-size:0.9rem; border-radius:10px; border-color:#e74c3c; color:#e74c3c; font-weight:bold;">🚨 Sınıfı Tamamen Sil</button>', teacher_students_html)

# 2. app.js / app.mjs changes
js_logic = """
// --- INJECTED TEACHER/STUDENT UI LOGIC ---
if (typeof window !== 'undefined') {
    window.refreshClassStudents = () => {
        const code = document.getElementById('manage-class-select')?.value;
        if (!code) return;
        if (typeof socket !== 'undefined' && socket) {
            socket.emit("getStudentsInClass", code);
            const listContainer = document.getElementById("t-student-list");
            if (listContainer) listContainer.innerHTML = "<li>Yükleniyor...</li>";
        }
    };

    if (typeof socket !== 'undefined' && socket) {
        socket.on("studentsInClassData", (students) => {
            const listContainer = document.getElementById("t-student-list");
            const countContainer = document.getElementById("t-student-count");
            if (!listContainer || !countContainer) return;
            countContainer.innerText = students.length;
            listContainer.innerHTML = students.length === 0 
                ? "<li>Şu an sınıfta aktif öğrenci yok.</li>"
                : students.map(s => `<li style="padding:5px 0; border-bottom:1px solid #eee;">👤 ${s}</li>`).join("");
        });
        
        socket.on("roomJoined", (roomCode) => {
            window.studentCurrentClass = roomCode;
            const badgeContainer = document.getElementById("student-class-badge-container");
            if (badgeContainer) {
                badgeContainer.innerHTML = `<div class="class-badge">🎓 Sınıf Kodunuz: ${roomCode}</div>`;
                badgeContainer.style.display = 'block';
            }
        });
    }
}
"""

append_to('public/app.js', js_logic)
append_to('public/app.mjs', js_logic)

# In app.js / app.mjs: trigger refreshClassStudents when class is selected
manage_class_change = "window.refreshClassStudents();"
insert_after('public/app.js', 'if (socket) socket.emit("getClassPerformanceSummary", val);', manage_class_change)
insert_after('public/app.mjs', 'if (socket) socket.emit("getClassPerformanceSummary", val);', manage_class_change)

