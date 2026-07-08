import sys

html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# --- 1. Teacher Class Creation in screen-teacher ---
class_list_old = """                    <div id="instructor-my-classes-list" style="max-height:120px; overflow-y:auto; background:rgba(0,0,0,0.2); border-radius:8px; padding:6px; font-size:0.78rem; text-align:left; color:#fff;">
                        Sınıflar yükleniyor...
                    </div>"""
                    
class_list_new = """                    <div id="instructor-my-classes-list" style="max-height:120px; overflow-y:auto; background:rgba(0,0,0,0.2); border-radius:8px; padding:6px; font-size:0.78rem; text-align:left; color:#fff;">
                        Sınıflar yükleniyor...
                    </div>
                    <div style="display:flex; gap:6px; margin-top:10px;">
                        <input id="new-class-name-instructor" type="text" placeholder="Yeni sınıf adı (örn: 12A Fen)" style="margin:0; flex:2; background:rgba(255,255,255,0.9); color:#1e3c72; border-radius:8px;">
                        <button onclick="createNewNamedClassFromInstructor()" style="width:auto; padding:8px 10px; background:#f1c40f; border:none; color:#1e3c72; font-weight:bold; border-radius:8px; cursor:pointer;">➕ Sınıf</button>
                    </div>
                    <small id="generated-code-instructor" style="display:block; color:#f1c40f; font-weight:bold; margin-top:6px;"></small>"""

if class_list_old in html:
    html = html.replace(class_list_old, class_list_new)
    print("Added class creation input to screen-teacher.")


# --- 2. Redesign screen-gelisim ---
# Since replacing a large block can fail due to exact whitespace matching, I will use regular expressions.
import re

gelisim_pattern = r'<div id="screen-gelisim" class="screen">.*?(<div id="screen-friends" class="screen">)'
gelisim_new = """<div id="screen-gelisim" class="screen">
        <h2 style="color:#1e3c72; margin-top:0;">📊 Gelişim & Takip</h2>
        <button onclick="fetchMyStats()" class="blue" style="margin-bottom:15px; width:100%; padding:15px; font-size:1rem; border-radius:12px; box-shadow:0 4px 10px rgba(52,152,219,0.3);">📊 Gelişim Raporum (Karnem)</button>
        
        <div class="content-card" style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 12px; border:1px solid rgba(0,0,0,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.05);">
            <h4 style="margin: 0 0 10px 0; text-align: left; color:#1e3c72;">📌 İzleme Listelerim</h4>
            <div class="teacher-grid">
                <div class="teacher-tile" onclick="showLocalList('wrong')" id="btn-local-wrong" style="background:#ffeaa7; color:#d35400; border:none;">
                    <span class="teacher-tile-icon">❌</span>
                    <span class="teacher-tile-text">Yanlışlar (<span id="count-wrong">0</span>)</span>
                </div>
                <div class="teacher-tile" onclick="showLocalList('fav')" id="btn-local-fav" style="background:#fff200; color:#b7950b; border:none;">
                    <span class="teacher-tile-icon">⭐</span>
                    <span class="teacher-tile-text">Favoriler (<span id="count-fav">0</span>)</span>
                </div>
                <div class="teacher-tile" onclick="showLocalList('blank')" id="btn-local-blank" style="background:#ecf0f1; color:#7f8c8d; border:none;">
                    <span class="teacher-tile-icon">⬜</span>
                    <span class="teacher-tile-text">Boşlar (<span id="count-blank">0</span>)</span>
                </div>
                <div class="teacher-tile" onclick="showLocalList('report')" id="btn-local-report" style="background:#ffdddd; color:#c0392b; border:none;">
                    <span class="teacher-tile-icon">🚨</span>
                    <span class="teacher-tile-text">Hatalı (<span id="count-report">0</span>)</span>
                </div>
            </div>
            
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:5px;">
                <button id="admin-report-btn" onclick="fetchAdminReports()" class="outline" style="font-size:0.75rem; border-color:#000; color:#000; display:none;">👑 Tüm Hata Raporlarını Oku</button>
                <button id="admin-approve-btn" onclick="fetchPendingTeachers()" class="outline" style="font-size:0.75rem; border-color:#e67e22; color:#e67e22; display:none;">👨‍🏫 Öğretmen Onay Bekleyenler</button>
            </div>
        </div>

        <div id="gelisim-game-panel" class="student-only" style="display:none; margin-top:15px;">
            <div class="content-card" style="background:rgba(255,255,255,0.8); padding:15px; border-radius:12px; border:1px solid rgba(0,0,0,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.05);">
                <h4 style="margin:0 0 10px 0; text-align:left; color:#1e3c72;">🎮 Deneme & Yarışma</h4>
                <div style="display:flex; gap:8px;">
                    <button onclick="goToLobby('trial')" class="purple" style="flex:1; padding:12px;">📝 Hızlı Deneme</button>
                    <button onclick="goToLobby('room')" class="orange" style="flex:1; padding:12px;">🏠 Oda Kur / Katıl</button>
                </div>
            </div>
        </div>
    </div>\n\n    \\1"""

html = re.sub(gelisim_pattern, gelisim_new, html, flags=re.DOTALL)
print("Updated screen-gelisim")


# --- 3. Redesign Send Question to Class Form ---
teacher_send_pattern = r'<div id="teacher-send-body">.*?</div>\s*</div>\s*</div>\s*<div id="student-tabs-container"'
teacher_send_new = """<div id="teacher-send-body">
                    <div style="background:#fff; border-radius:12px; padding:12px;">
                        <label style="font-size:0.75rem; font-weight:bold; margin-bottom:5px; display:block; color:#1e3c72;">1. Soru gönderilecek sınıf:</label>
                        <select id="target-class-select" onchange="window.onTeacherDashClassChange(this.value)" style="margin-bottom:12px; font-weight:bold; color:#1e3c72; background:#f4f6f9; border:none;">
                            <option value="">--- Sınıf Seçin ---</option>
                        </select>

                        <div id="teacher-exam-multiselect-area" style="display:none; margin-bottom:12px; background:#f4f6f9; padding:10px; border-radius:8px;">
                            <label style="font-size:0.75rem; font-weight:bold; color:#1e3c72; display:block; margin-bottom:8px;">2. Sınav Kategorisi:</label>
                            <div style="display:flex; flex-wrap:wrap; gap:6px; font-size:0.75rem;">
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_a"> <span>KPSS A</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_lisans"> <span>Lisans</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_onlisans"> <span>Önlisans</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_ortaogretim"> <span>Ortaöğretim</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_egitim"> <span>Eğitim Bilimleri</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="yks_tyt"> <span>TYT</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="yks_ayt"> <span>AYT</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="lise_okul"> <span>Lise</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="ortaokul"> <span>LGS</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="ags"> <span>AGS</span></label>
                            </div>
                        </div>

                        <div style="background:#f9f9f9; padding:10px; border-radius:8px; border:1px dashed #ccc;">
                            <button onclick="window.openFolderSelector()" class="outline" style="width:100%; border-color:#3498db; color:#3498db; margin-bottom:10px; font-weight:bold;">📁 Kütüphanemden Seç</button>
                            <div style="text-align:center; color:#999; font-size:0.75rem; margin-bottom:10px;">veya yeni soru oluştur</div>
                            
                            <textarea id="new-q-text" placeholder="Soru metnini buraya yazın..." style="height:60px; background:#fff; border:1px solid #ddd;"></textarea>
                            
                            <div style="display:flex; gap:6px; margin-top:8px;">
                                <button onclick="document.getElementById('img-upload-camera').click()" class="blue" style="flex:1; padding:8px; font-size:0.8rem;">📷 Foto</button>
                                <button onclick="document.getElementById('img-upload-file-picker').click()" class="outline" style="flex:1; padding:8px; font-size:0.8rem;">🖼️ Galeri</button>
                            </div>
                            
                            <input type="file" id="img-upload-camera" accept="image/*" capture="environment" style="display:none;" onchange="processImageUpload(event, 'image')">
                            <input type="file" id="img-upload-file-picker" accept="image/*" style="display:none;" onchange="processImageUpload(event, 'image')">
                            <input type="file" id="img-upload-file" accept="image/*" style="display:none;" onchange="processImageUpload(event, 'image')">
                            <input type="file" id="solution-upload-camera" accept="image/*" capture="environment" style="display:none;" onchange="processImageUpload(event, 'solution')">
                            <input type="file" id="solution-upload-file" accept="image/*" style="display:none;" onchange="processImageUpload(event, 'solution')">
                            
                            <img id="img-preview" src="" style="width:100%; max-height:150px; object-fit:contain; display:none; margin-top:10px; border-radius:8px;">
                            
                            <div style="margin-top:10px; display:flex; gap:6px;">
                                <input type="text" id="new-q-ders" placeholder="Ders (Örn: Tarih)" style="flex:1; margin:0; font-size:0.8rem;">
                                <input type="text" id="new-q-deneme" placeholder="Konu" style="flex:1; margin:0; font-size:0.8rem;">
                            </div>
                            
                            <div style="margin-top:10px; text-align:left;">
                                <label style="font-size:0.75rem; font-weight:bold; color:#1e3c72;">Doğru Şık:</label>
                                <select id="new-q-correct" style="width:auto; display:inline-block; margin-left:10px; padding:4px;">
                                    <option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option><option value="4">E</option>
                                </select>
                            </div>

                            <button onclick="uploadQuestionToNamedClass()" class="green" style="width:100%; padding:12px; font-size:0.9rem; margin-top:15px; border-radius:8px;">🚀 Seçili Sınıfa Gönder</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="student-tabs-container\""""

html = re.sub(teacher_send_pattern, teacher_send_new, html, flags=re.DOTALL)
print("Updated Sınıfa Soru Gönder Form")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
