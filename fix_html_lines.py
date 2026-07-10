import os

with open('public/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if '<button onclick="window.deleteTeacherClass()"' in line and 'class=' not in line:
        skip = True
        # Insert the correct button and the div below it
        new_lines.append('                        <button onclick="window.deleteTeacherClass()" class="outline" style="width:100%; padding:12px; font-size:0.9rem; border-radius:10px; border-color:#e74c3c; color:#e74c3c; font-weight:bold;">🚨 Sınıfı Tamamen Sil</button>\n')
        new_lines.append('                        <div id="teacher-class-students" style="margin-top: 25px; text-align: left; background:#f9f9f9; padding:15px; border-radius:10px; border:1px solid #ddd;">\n')
        new_lines.append('                            <h3 style="font-size: 0.95rem; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 5px; margin-top:0;">👥 Sınıftaki Öğrenciler (<span id="t-student-count" style="color:#e74c3c;">0</span>)</h3>\n')
        new_lines.append('                            <ul id="t-student-list" style="list-style: none; padding: 0; margin: 10px 0; max-height: 150px; overflow-y: auto; font-size:0.9rem; color:#34495e;">\n')
        new_lines.append('                                <li>Lütfen bekleyin...</li>\n')
        new_lines.append('                            </ul>\n')
        new_lines.append('                            <button onclick="window.refreshClassStudents()" class="outline" style="width:100%; padding:8px; font-size:0.8rem; margin-bottom:0;">🔄 Listeyi Yenile</button>\n')
        new_lines.append('                        </div>\n')
        continue
    if skip:
        # Stop skipping when we hit the end of the broken button tag
        if 'Sınıfı Tamamen Sil</button>' in line:
            skip = False
        continue
        
    new_lines.append(line)

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed HTML lines.")
