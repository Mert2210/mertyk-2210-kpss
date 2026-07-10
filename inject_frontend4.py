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
    else:
        print(f"Failed to find {search_str} in {filepath}")

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
# Use a more stable search string
search_btn = 'onclick="window.deleteTeacherClass()"'
insert_after('public/index.html', search_btn, teacher_students_html)

