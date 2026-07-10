import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

broken_html = """                        <button onclick="window.deleteTeacherClass()"

                        <div id="teacher-class-students" style="margin-top: 25px; text-align: left; background:#f9f9f9; padding:15px; border-radius:10px; border:1px solid #ddd;">
                            <h3 style="font-size: 0.95rem; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 5px; margin-top:0;">👥 Sınıftaki Öğrenciler (<span id="t-student-count" style="color:#e74c3c;">0</span>)</h3>
                            <ul id="t-student-list" style="list-style: none; padding: 0; margin: 10px 0; max-height: 150px; overflow-y: auto; font-size:0.9rem; color:#34495e;">
                                <li>Lütfen bekleyin...</li>
                            </ul>
                            <button onclick="window.refreshClassStudents()" class="outline" style="width:100%; padding:8px; font-size:0.8rem; margin-bottom:0;">🔄 Listeyi Yenile</button>
                        </div>
 class="outline" style="width:100%; padding:12px; font-size:0.9rem; border-radius:10px; border-color:#e74c3c; color:#e74c3c; font-weight:bold;">🚨 Sınıfı Tamamen Sil</button>"""

fixed_html = """                        <button onclick="window.deleteTeacherClass()" class="outline" style="width:100%; padding:12px; font-size:0.9rem; border-radius:10px; border-color:#e74c3c; color:#e74c3c; font-weight:bold;">🚨 Sınıfı Tamamen Sil</button>
                        
                        <div id="teacher-class-students" style="margin-top: 25px; text-align: left; background:#f9f9f9; padding:15px; border-radius:10px; border:1px solid #ddd;">
                            <h3 style="font-size: 0.95rem; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 5px; margin-top:0;">👥 Sınıftaki Öğrenciler (<span id="t-student-count" style="color:#e74c3c;">0</span>)</h3>
                            <ul id="t-student-list" style="list-style: none; padding: 0; margin: 10px 0; max-height: 150px; overflow-y: auto; font-size:0.9rem; color:#34495e;">
                                <li>Lütfen bekleyin...</li>
                            </ul>
                            <button onclick="window.refreshClassStudents()" class="outline" style="width:100%; padding:8px; font-size:0.8rem; margin-bottom:0;">🔄 Listeyi Yenile</button>
                        </div>"""

new_content = content.replace(broken_html, fixed_html)

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed HTML successfully" if broken_html in content else "Could not find broken HTML block")
