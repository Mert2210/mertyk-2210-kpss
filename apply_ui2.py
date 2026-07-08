import sys

html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Teacher Panel Grid Redesign
teacher_old = """                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <button onclick="fetchTeacherReports()" class="outline" style="flex:1; font-size:0.75rem; border-color:#fff; color:#fff; padding:8px;">📊 Başarı İstihbaratı</button>
                        <button onclick="fetchClassMistakes()" class="outline" style="flex:1; font-size:0.75rem; border-color:#e74c3c; color:#e74c3c; background:rgba(255,255,255,0.9); padding:8px;">📉 Yanlış Analizi</button>
                    </div>

                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <button onclick="fetchTeacherHistory()" class="outline" style="flex:1; font-size:0.75rem; border-color:#f39c12; color:#f39c12; background:rgba(255,255,255,0.9); padding:8px;">🕒 Soru Gönderme Geçmişi</button>
                        <button onclick="fetchClassPerformanceSummary()" class="outline" style="flex:1; font-size:0.75rem; border-color:#8e44ad; color:#8e44ad; background:rgba(255,255,255,0.9); padding:8px;">📈 Sınıf Performans Özeti</button>
                    </div>"""

teacher_new = """                    <div class="teacher-grid">
                        <div class="teacher-tile" onclick="fetchTeacherReports()">
                            <span class="teacher-tile-icon">📊</span>
                            <span class="teacher-tile-text">Başarı İstihbaratı</span>
                        </div>
                        <div class="teacher-tile" onclick="fetchClassMistakes()">
                            <span class="teacher-tile-icon">📉</span>
                            <span class="teacher-tile-text">Yanlış Analizi</span>
                        </div>
                        <div class="teacher-tile" onclick="fetchTeacherHistory()">
                            <span class="teacher-tile-icon">🕒</span>
                            <span class="teacher-tile-text">Soru Geçmişi</span>
                        </div>
                        <div class="teacher-tile" onclick="fetchClassPerformanceSummary()">
                            <span class="teacher-tile-icon">📈</span>
                            <span class="teacher-tile-text">Sınıf Özeti</span>
                        </div>
                    </div>"""

if teacher_old in html:
    html = html.replace(teacher_old, teacher_new)
    print("Teacher grid updated.")
else:
    print("Teacher grid NOT found.")

# 2. Settings Panel Logout button at the very bottom
settings_old_logout = """            <button id="profile-save-btn" onclick="saveProfileSettings()" class="green" style="margin-top:20px; width:100%; padding:15px; font-size:1.1rem; border-radius:10px;">💾 Masamı ve Ayarlarımı Kaydet</button>
            <button onclick="openSecureLogoutScreen()" class="outline" style="margin-top:10px; width:100%; padding:12px; border-color:#c0392b; color:#c0392b;">🔐 Güvenli Çıkış Ekranı</button>"""

settings_new_logout = """            <button id="profile-save-btn" onclick="saveProfileSettings()" class="green" style="margin-top:20px; width:100%; padding:15px; font-size:1.1rem; border-radius:10px;">💾 Masamı ve Ayarlarımı Kaydet</button>"""

if settings_old_logout in html:
    html = html.replace(settings_old_logout, settings_new_logout)
    print("Old logout button removed.")
else:
    print("Old logout button NOT found.")

# We will put the logout button just before the end of screen-settings.
settings_end = "        </div>\n    </div>\n\n    <div id=\"derslerim-add-modal\""
settings_bottom_logout = """            <div style="margin-top:30px; border-top:1px solid #eee; padding-top:20px;">
                <button onclick="openSecureLogoutScreen()" class="outline red-border" style="width:100%; padding:12px; font-weight:bold;">🚪 Çıkış Yap</button>
            </div>
        </div>
    </div>

    <div id="derslerim-add-modal\""""

if settings_end in html:
    html = html.replace(settings_end, settings_bottom_logout)
    print("New bottom logout added.")
else:
    print("Settings end NOT found.")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
