import sys
import re

html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update teacher-dash-card to standard content-card
old_teacher_send_header = """<div class="content-card teacher-dash-card" style="margin-top:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; cursor:pointer;" onclick="toggleSection('teacher-send-body')">
                    <h4 style="margin:0; color:#fff; font-size:0.95rem;">🚀 Sınıfa Soru Gönder</h4>
                    <span style="color:#f1c40f; font-size:0.75rem;">🔽</span>
                </div>
                <div id="teacher-send-body">
                    <div class="content-card" style="border-radius:12px; padding:12px;">"""

new_teacher_send_header = """<div class="content-card" style="margin-top:12px; background:var(--card-bg, #ffffff); border:1px solid rgba(0,0,0,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.03);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; cursor:pointer;" onclick="toggleSection('teacher-send-body')">
                    <h4 style="margin:0; color:var(--text-color, #1e3c72); font-size:1.05rem;">🚀 Sınıfa Soru Gönder</h4>
                    <span style="color:#3498db; font-size:0.8rem;">🔽</span>
                </div>
                <div id="teacher-send-body">
                    <div style="padding-top:10px; border-top:1px solid #eee;">"""

html = html.replace(old_teacher_send_header, new_teacher_send_header)

# 2. Add "Sınıf Yönetimi" section above Sınıfa Soru Gönder
old_create_class = """                <small id="generated-code" style="display:block; color:#f1c40f; font-weight:bold; margin-top:6px;"></small>
            </div>"""

new_class_management = """                <small id="generated-code" style="display:block; color:#f1c40f; font-weight:bold; margin-top:6px;"></small>
            </div>

            <div class="content-card" style="margin-top:12px; background:var(--card-bg, #ffffff); border:1px solid rgba(0,0,0,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.03);">
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; margin-bottom:0;" onclick="toggleSection('teacher-manage-body')">
                    <h4 style="margin:0; color:var(--text-color, #1e3c72); font-size:1.05rem;">⚙️ Sınıf Yönetimi</h4>
                    <span style="color:#3498db; font-size:0.8rem;">🔽</span>
                </div>
                <div id="teacher-manage-body" style="display:none; padding-top:15px; margin-top:10px; border-top:1px solid #eee;">
                    <select id="manage-class-select" onchange="window.onManageClassChange(this.value)" class="ui-input" style="margin-bottom:15px; font-weight:bold; width:100%; font-size:0.9rem;">
                        <option value="">🏫 --- Sınıf Seçin ---</option>
                    </select>
                    
                    <div id="manage-class-actions" style="display:none; text-align:center;">
                        <h2 id="manage-class-code-display" style="color:#e67e22; letter-spacing:2px; margin:0 0 10px 0;"></h2>
                        
                        <button onclick="window.shareTeacherClassCode()" class="blue" style="width:100%; margin-bottom:10px; padding:12px; font-size:0.9rem; border-radius:10px; font-weight:bold;">🔗 Sınıf Kodunu Paylaş</button>
                        
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <input type="text" id="manage-class-rename-input" placeholder="Yeni İsim..." class="ui-input" style="flex:2; margin:0;">
                            <button onclick="window.renameTeacherClass()" class="outline" style="flex:1; margin:0; padding:10px; font-size:0.85rem; border-color:#27ae60; color:#27ae60;">Kalem İsim</button>
                        </div>
                        
                        <button onclick="window.deleteTeacherClass()" class="outline" style="width:100%; padding:12px; font-size:0.9rem; border-radius:10px; border-color:#e74c3c; color:#e74c3c; font-weight:bold;">🗑️ Sınıfı Tamamen Sil</button>
                    </div>
                </div>
            </div>"""

html = html.replace(old_create_class, new_class_management)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("HTML structural updates complete for teacher panel.")
