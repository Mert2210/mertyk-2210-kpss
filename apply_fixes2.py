import sys
import re

html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8", errors="replace") as f:
    html = f.read()

# Fix Gelisim cards
html = html.replace(
    'style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 12px; border:1px solid rgba(0,0,0,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.05);"',
    'style="padding: 15px; border-radius: 12px; box-shadow:0 4px 15px rgba(0,0,0,0.05);"'
)
html = html.replace(
    'style="background:rgba(255,255,255,0.8); padding:15px; border-radius:12px; border:1px solid rgba(0,0,0,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.05);"',
    'style="padding:15px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.05);"'
)

# Fix Teacher Send Question Form
# Make it even simpler and dark mode compatible
teacher_send_old = r'<div id="teacher-send-body">.*?<div id="student-tabs-container"'
teacher_send_new = """<div id="teacher-send-body">
                    <div class="content-card" style="border-radius:12px; padding:12px;">
                        <select id="target-class-select" onchange="window.onTeacherDashClassChange(this.value)" class="ui-input" style="margin-bottom:12px; font-weight:bold; width:100%; font-size:0.9rem;">
                            <option value="">🏫 --- Sınıf Seçin ---</option>
                        </select>

                        <div id="teacher-exam-multiselect-area" class="content-card" style="display:none; margin-bottom:12px; padding:10px; border-radius:8px; box-shadow:none; border:1px solid rgba(128,128,128,0.2);">
                            <div style="display:flex; flex-wrap:wrap; gap:6px; font-size:0.8rem; justify-content:center;">
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_a"> <span>KPSS A</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_lisans"> <span>Lisans</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_onlisans"> <span>Önlisans</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_ortaogretim"> <span>Ortaöğretim</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="kpss_egitim"> <span>Eğitim</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="yks_tyt"> <span>TYT</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="yks_ayt"> <span>AYT</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="lise_okul"> <span>Lise</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="ortaokul"> <span>LGS</span></label>
                                <label class="pill-checkbox"><input type="checkbox" class="teacher-exam-filter" value="ags"> <span>AGS</span></label>
                            </div>
                        </div>

                        <div class="content-card" style="padding:15px; border-radius:12px; border:2px dashed rgba(52, 152, 219, 0.4); box-shadow:none; text-align:center;">
                            <textarea id="new-q-text" placeholder="📝 Kendi sorunuzu yazın veya fotoğraf ekleyin..." class="ui-input" style="height:60px; margin-bottom:10px; resize:none;"></textarea>
                            
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <button onclick="document.getElementById('img-upload-camera').click()" class="blue" style="flex:1; padding:12px; font-size:0.9rem; border-radius:10px;">📷 Çek</button>
                                <button onclick="document.getElementById('img-upload-file-picker').click()" class="outline" style="flex:1; padding:12px; font-size:0.9rem; border-radius:10px;">🖼️ Seç</button>
                            </div>
                            
                            <button onclick="window.openFolderSelector()" class="outline" style="width:100%; border-color:#9b59b6; color:#9b59b6; margin-bottom:10px; font-weight:bold; border-radius:10px; padding:10px;">📁 Kütüphaneden Soruyu Seç</button>
                            
                            <input type="file" id="img-upload-camera" accept="image/*" capture="environment" style="display:none;" onchange="processImageUpload(event, 'image')">
                            <input type="file" id="img-upload-file-picker" accept="image/*" style="display:none;" onchange="processImageUpload(event, 'image')">
                            <input type="file" id="img-upload-file" accept="image/*" style="display:none;" onchange="processImageUpload(event, 'image')">
                            <input type="file" id="solution-upload-camera" accept="image/*" capture="environment" style="display:none;" onchange="processImageUpload(event, 'solution')">
                            <input type="file" id="solution-upload-file" accept="image/*" style="display:none;" onchange="processImageUpload(event, 'solution')">
                            
                            <img id="img-preview" src="" style="width:100%; max-height:200px; object-fit:contain; display:none; margin-bottom:10px; border-radius:8px;">
                            
                            <div style="display:flex; gap:10px; margin-bottom:15px;">
                                <input type="text" id="new-q-ders" placeholder="Ders" class="ui-input" style="flex:1; margin:0;">
                                <input type="text" id="new-q-deneme" placeholder="Konu" class="ui-input" style="flex:1; margin:0;">
                            </div>
                            
                            <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:15px;">
                                <span style="font-weight:bold; font-size:0.85rem;">Doğru Şık:</span>
                                <select id="new-q-correct" class="ui-input" style="width:auto; padding:6px; margin:0;">
                                    <option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option><option value="4">E</option>
                                </select>
                            </div>

                            <button onclick="uploadQuestionToNamedClass()" class="green" style="width:100%; padding:14px; font-size:1rem; border-radius:12px; box-shadow:0 4px 10px rgba(46, 204, 113, 0.3);">🚀 Sınıfa Gönder</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="student-tabs-container\""""

html = re.sub(teacher_send_old, teacher_send_new, html, flags=re.DOTALL)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
print("Applied UI fixes for Dark Mode and Teacher Send form")
