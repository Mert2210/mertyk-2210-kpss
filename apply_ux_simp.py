import sys

# 1. Update app.js
app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

# Notification feedback in handleNotificationToggleChange
old_toggle = """window.handleNotificationToggleChange = async () => {
    const toggle = document.getElementById('profile-notification-toggle');
    const status = document.getElementById('profile-notification-status');
    const isEnabled = !!toggle?.checked;
    setNotificationsEnabled(isEnabled);
    if (isEnabled) {
        console.log("🔔 Bildirimler açıldı, debug başlıyor...");"""

new_toggle = """window.handleNotificationToggleChange = async () => {
    const toggle = document.getElementById('profile-notification-toggle');
    const status = document.getElementById('profile-notification-status');
    const isEnabled = !!toggle?.checked;
    setNotificationsEnabled(isEnabled);
    if (isEnabled) {
        window.showSoftFeedback("Bildirimler açılıyor...");
        console.log("🔔 Bildirimler açıldı, debug başlıyor...");"""
js = js.replace(old_toggle, new_toggle)

old_toggle_end = """        if (isGodModeUser()) await subscribeAdminPushNotifications();
    } else {
        await clearClassPushSubscription(CLIENT_STORE.getItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY) || getPreferredNotificationClassCode());"""

new_toggle_end = """        if (isGodModeUser()) await subscribeAdminPushNotifications();
        window.showSoftFeedback("✅ Bildirim sistemi başarıyla açıldı.");
    } else {
        await clearClassPushSubscription(CLIENT_STORE.getItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY) || getPreferredNotificationClassCode());"""
js = js.replace(old_toggle_end, new_toggle_end)

old_toggle_end2 = """        CLIENT_STORE.removeItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY);
    }
    updateNotificationToggleUI();
};"""

new_toggle_end2 = """        CLIENT_STORE.removeItem(NOTIFICATION_SUBSCRIPTION_CLASS_KEY);
        window.showSoftFeedback("❌ Bildirimler kapatıldı.");
    }
    updateNotificationToggleUI();
};"""
js = js.replace(old_toggle_end2, new_toggle_end2)

# Teacher Image Upload Feedback
old_teacher_upload = """        if (type === 'question') {
            uploadedImageBase64 = optimizedDataUrl;
            document.getElementById(previewId).src = uploadedImageBase64;
        } else {
            uploadedSolutionBase64 = optimizedDataUrl;
            document.getElementById(previewId).src = uploadedSolutionBase64;
        }"""
new_teacher_upload = """        if (type === 'question') {
            uploadedImageBase64 = optimizedDataUrl;
            document.getElementById(previewId).src = uploadedImageBase64;
            const btn = document.getElementById('teacher-file-btn');
            if (btn) { btn.innerHTML = "✅ Soru Görseli Seçildi"; btn.style.borderColor = "#2ecc71"; btn.style.color = "#2ecc71"; }
        } else {
            uploadedSolutionBase64 = optimizedDataUrl;
            document.getElementById(previewId).src = uploadedSolutionBase64;
        }"""
js = js.replace(old_teacher_upload, new_teacher_upload)

# Student Image Upload Feedback
old_std_upload = """        if(type === 'image') { 
            document.getElementById('std-img-preview').src = uploadedStudentImages[0];
            const cnt = document.getElementById('std-img-count');
            if(uploadedStudentImages.length > 1) {
                cnt.style.display = 'block';
                cnt.innerText = `+${uploadedStudentImages.length - 1} görsel daha eklendi`;
            } else { cnt.style.display = 'none'; }
        } else if (type === 'solution') {
            const preview = document.getElementById('std-solution-preview');
            if (preview) preview.src = uploadedStudentSolutionBase64;
        }"""
new_std_upload = """        if(type === 'image') { 
            document.getElementById('std-img-preview').src = uploadedStudentImages[0];
            const cnt = document.getElementById('std-img-count');
            if(uploadedStudentImages.length > 1) {
                cnt.style.display = 'block';
                cnt.innerText = `+${uploadedStudentImages.length - 1} görsel daha eklendi`;
            } else { cnt.style.display = 'none'; }
            const btn = document.getElementById('std-file-btn');
            if (btn) { btn.innerHTML = "✅ Görsel Eklendi"; btn.style.borderColor = "#2ecc71"; btn.style.color = "#2ecc71"; }
        } else if (type === 'solution') {
            const preview = document.getElementById('std-solution-preview');
            if (preview) preview.src = uploadedStudentSolutionBase64;
            const btn = document.getElementById('std-sol-file-btn');
            if (btn) { btn.innerHTML = "✅ Çözüm Eklendi"; btn.style.borderColor = "#2ecc71"; btn.style.color = "#2ecc71"; }
        }"""
js = js.replace(old_std_upload, new_std_upload)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)


# 2. Update index.html
html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Teacher buttons
old_teacher_btns = """                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <button onclick="document.getElementById('img-upload-camera').click()" class="blue" style="flex:1; padding:12px; font-size:0.9rem; border-radius:10px;">📷 Çek</button>
                                <button onclick="document.getElementById('img-upload-file-picker').click()" class="outline" style="flex:1; padding:12px; font-size:0.9rem; border-radius:10px;">🖼️ Seç</button>
                            </div>"""
new_teacher_btns = """                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <button onclick="document.getElementById('img-upload-camera').click()" class="blue" id="teacher-camera-btn" style="flex:1; padding:12px; font-size:0.9rem; border-radius:10px;">📷 Çek</button>
                                <button onclick="document.getElementById('img-upload-file-picker').click()" class="outline" id="teacher-file-btn" style="flex:1; padding:12px; font-size:0.9rem; border-radius:10px; transition:all 0.3s;">🖼️ Seç</button>
                            </div>"""
html = html.replace(old_teacher_btns, new_teacher_btns)

# Student buttons
old_std_btns = """            <div style="margin-bottom:10px; display:flex; gap:6px;">
                <button type="button" class="green" style="flex:1; font-size:0.85rem; padding:10px;" onclick="document.getElementById('std-img-upload-camera').click()">📷 Fotoğraf Çek</button>
                <button type="button" class="outline" style="flex:1; font-size:0.85rem; padding:10px; border-color:#27ae60; color:#27ae60;" onclick="document.getElementById('std-img-upload-file-picker').click()">🖼️ Galeriden Seç</button>
            </div>"""
new_std_btns = """            <div style="margin-bottom:10px; display:flex; gap:6px;">
                <button type="button" class="green" id="std-camera-btn" style="flex:1; font-size:0.85rem; padding:10px;" onclick="document.getElementById('std-img-upload-camera').click()">📷 Fotoğraf Çek</button>
                <button type="button" class="outline" id="std-file-btn" style="flex:1; font-size:0.85rem; padding:10px; border-color:#27ae60; color:#27ae60; transition:all 0.3s;" onclick="document.getElementById('std-img-upload-file-picker').click()">🖼️ Galeriden Seç</button>
            </div>"""
html = html.replace(old_std_btns, new_std_btns)

# Simplify Student Solution area
old_std_sol = """            <div style="background: #e8f4f8; padding: 12px; border-radius: 8px; margin-bottom:10px; border: 1px dashed #3498db;">
                <label style="font-size:0.75rem; font-weight:bold; color:#1e3c72; margin-bottom:5px; display:block;">📝 ÇÖZÜM EKLE (İsteğe Bağlı)</label>
                <div style="margin-bottom:10px; display:flex; gap:6px;">
                    <button type="button" class="blue" style="flex:1; font-size:0.85rem; padding:10px;" onclick="document.getElementById('std-solution-upload-camera').click()">📸 Çözüm Çek</button>
                    <button type="button" class="outline" style="flex:1; font-size:0.85rem; padding:10px; border-color:#3498db; color:#3498db;" onclick="document.getElementById('std-solution-upload-file-picker').click()">🖼️ Galeriden Seç</button>
                </div>
                <input type="file" id="std-solution-upload-camera" accept="image/*" capture="environment" multiple style="display:none;" onchange="processStudentImageUpload(event, 'solution')">
                <input type="file" id="std-solution-upload-file" accept="image/*" multiple style="display:none;" onchange="processStudentImageUpload(event, 'solution')">
                <input type="file" id="std-solution-upload-file-picker" accept="image/*" multiple style="display:none;" onchange="processStudentImageUpload(event, 'solution')">
                <img id="std-solution-preview" src="" style="width:100%; max-height:200px; object-fit:contain; display:none; margin-bottom:10px; border-radius:8px; border:2px solid #3498db;">
                <textarea id="std-q-sol-text" placeholder="Varsa yazılı çözüm notunuz..."></textarea>
                
                <label style="font-size:0.75rem; font-weight:bold; color:#1e3c72; margin-top:5px; display:block;">🎯 DOĞRU ŞIK HANGİSİ?</label>
                <select id="std-q-correct-idx" style="font-weight:bold; border-color:#27ae60;">
                    <option value="0">A Şıkkı</option><option value="1">B Şıkkı</option><option value="2">C Şıkkı</option><option value="3">D Şıkkı</option><option value="4">E Şıkkı</option>
                </select>
            </div>

            <div style="margin-bottom:10px;">
                <label style="font-size:0.75rem; font-weight:bold; color:#1e3c72; display:block; margin-bottom:5px;">⏳ Kaç Günde Tekrar Çözeyim?</label>
                <select id="std-q-reminder" style="font-weight:bold; border-color:#8e44ad; color:#8e44ad;">
                    <option value="7">7 gün</option>
                </select>
            </div>"""

new_std_sol = """            <details style="margin-bottom:10px; background: #e8f4f8; border-radius: 8px; border: 1px dashed #3498db;">
                <summary style="font-size:0.85rem; font-weight:bold; color:#1e3c72; padding:12px; cursor:pointer; list-style:none; outline:none;">➕ Çözüm / Not Ekle (İsteğe Bağlı)</summary>
                <div style="padding: 0 12px 12px 12px; margin-top:-5px;">
                    <div style="margin-bottom:10px; display:flex; gap:6px;">
                        <button type="button" class="blue" id="std-sol-camera-btn" style="flex:1; font-size:0.85rem; padding:10px;" onclick="document.getElementById('std-solution-upload-camera').click()">📸 Çözüm Çek</button>
                        <button type="button" class="outline" id="std-sol-file-btn" style="flex:1; font-size:0.85rem; padding:10px; border-color:#3498db; color:#3498db; transition:all 0.3s;" onclick="document.getElementById('std-solution-upload-file-picker').click()">🖼️ Galeriden Seç</button>
                    </div>
                    <input type="file" id="std-solution-upload-camera" accept="image/*" capture="environment" multiple style="display:none;" onchange="processStudentImageUpload(event, 'solution')">
                    <input type="file" id="std-solution-upload-file" accept="image/*" multiple style="display:none;" onchange="processStudentImageUpload(event, 'solution')">
                    <input type="file" id="std-solution-upload-file-picker" accept="image/*" multiple style="display:none;" onchange="processStudentImageUpload(event, 'solution')">
                    <img id="std-solution-preview" src="" style="width:100%; max-height:200px; object-fit:contain; display:none; margin-bottom:10px; border-radius:8px; border:2px solid #3498db;">
                    <textarea id="std-q-sol-text" placeholder="Varsa yazılı çözüm notunuz..."></textarea>
                    
                    <label style="font-size:0.75rem; font-weight:bold; color:#1e3c72; margin-top:5px; display:block;">🎯 DOĞRU ŞIK HANGİSİ?</label>
                    <select id="std-q-correct-idx" style="font-weight:bold; border-color:#27ae60;">
                        <option value="0">A Şıkkı</option><option value="1">B Şıkkı</option><option value="2">C Şıkkı</option><option value="3">D Şıkkı</option><option value="4">E Şıkkı</option>
                    </select>
                </div>
            </details>
            <input type="hidden" id="std-q-reminder" value="7">"""
html = html.replace(old_std_sol, new_std_sol)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Applied UX simplifications and notification toggle feedback.")
