import re

with open("public/index.html", "r", encoding="utf-8") as f:
    html = f.read()

start_marker = '<div id="main-quick-actions" class="main-quick-actions" style="display:none;">'
end_marker = '</section>'

start_idx = html.find(start_marker)
# Find the next </section> after start_idx
end_idx = html.find(end_marker, start_idx) + len(end_marker)

if start_idx != -1 and end_idx != -1:
    new_html = """
        <!-- MODERN UI TABS -->
        <div id="student-tabs-container" style="display:none;">
            <div class="modern-tabs">
                <button id="tab-btn-library" class="modern-tab-btn active" onclick="window.switchDashboardTab('library')">📚 Çalışma Odam</button>
                <button id="tab-btn-class" class="modern-tab-btn" onclick="window.switchDashboardTab('class')">🏫 Sınıfım</button>
            </div>

            <!-- TAB 1: LIBRARY -->
            <div id="tab-library" class="modern-tab-content active">
                <div id="student-library-panel" class="ui-card">
                    <h4 style="margin:0 0 15px 0; color:#e67e22; text-align:left;">📚 Derslerim</h4>
                    <div id="library-content-wrapper">
                        <button onclick="window.openLibraryLessonsScreen()" class="outline" style="width:100%; font-size:0.85rem; border-color:#e67e22; color:#e67e22; padding:10px;">
                            📚 Kütüphaneyi Aç 
                            <small style="display:block; font-size:0.72rem; color:#f39c12; margin-top:3px;">Hatırlatılacak: <span id="review-btn-count">0</span></small>
                        </button>
                    </div>
                </div>

                <section id="main-saved-library-panel" class="ui-card" style="display:none; text-align:left;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="margin:0;">📚 Kayıtlı Kütüphanem</h4>
                        <button onclick="window.openLibraryLessonsScreen()" style="width:auto; padding:4px 8px; font-size:0.75rem;" class="outline">Aç</button>
                    </div>
                    <p style="font-size:0.75rem; color:#666; margin-top:0;">Seçtiğiniz dersler burada görünür.</p>
                    <div id="main-saved-library-course-list"></div>
                </section>

                <div class="accordion" id="acc-settings">
                    <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
                        ⚙️ Ayarlar & Sınav Seçimi
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    <div class="accordion-body">
                        <div id="main-quick-actions" style="margin-top:10px;">
                            <button type="button" id="exam-selection-btn" class="outline" onclick="window.openExamSelectionPanel()">🎯 Sınav Seçimi</button>
                            <button type="button" class="outline" onclick="window.openSubjectSelectionPanel()">📚 Derslerimi Seç</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: CLASS -->
            <div id="tab-class" class="modern-tab-content">
                <div id="student-class-area" class="ui-card" style="text-align:left;">
                    <h4 style="margin:0 0 15px 0; color:#1e3c72;">🏫 Sınıf Bağlantısı</h4>
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="class-code-input" placeholder="Sınıf Kodu Gir" style="margin:0; flex:2;">
                        <button onclick="joinClass()" class="blue" style="margin:0; flex:1; font-size:0.9rem;">Katıl</button>
                    </div>
                    <div id="student-saved-materials-panel" style="margin-top:20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px;">
                            <strong style="color:#1e3c72; font-size:0.85rem;">📥 Öğretmen Gönderileri</strong>
                            <button type="button" class="outline" style="width:auto; padding:4px 8px; font-size:0.72rem;" onclick="window.saveLatestTeacherClassMaterials()">Yenile</button>
                        </div>
                        <div id="student-saved-materials-list" style="font-size:0.78rem; color:#4b5563; background:#f9f9f9; padding:10px; border-radius:8px;">Henüz kayıtlı gönderi yok.</div>
                    </div>
                </div>
            </div>
        </div>
"""
    updated_html = html[:start_idx] + new_html + html[end_idx:]
    with open("public/index.html", "w", encoding="utf-8") as f:
        f.write(updated_html)
    print("Replaced successfully!")
else:
    print("Could not find markers")
