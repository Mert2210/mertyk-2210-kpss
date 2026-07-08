import sys

html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Fix transparent backgrounds for PWA prompts
ios_prompt_old = '<div id="ios-pwa-prompt" style="display:none; position:fixed; bottom:20px; left:50%; transform:translateX(-50%); width:90%; max-width:400px;  padding:20px; border-radius:15px; box-shadow:0 15px 40px rgba(0,0,0,0.4); z-index:99999; border:3px solid #3498db; text-align:center;">'
ios_prompt_new = '<div id="ios-pwa-prompt" style="display:none; position:fixed; bottom:20px; left:50%; transform:translateX(-50%); width:90%; max-width:400px;  padding:20px; border-radius:15px; box-shadow:0 15px 40px rgba(0,0,0,0.4); z-index:99999; border:3px solid #3498db; text-align:center; background:var(--card-bg, #ffffff);">'

html = html.replace(ios_prompt_old, ios_prompt_new)

android_prompt_old = '<div id="android-pwa-prompt" style="display:none; position:fixed; bottom:20px; left:50%; transform:translateX(-50%); width:90%; max-width:400px;  padding:20px; border-radius:15px; box-shadow:0 15px 40px rgba(0,0,0,0.4); z-index:99999; border:3px solid #27ae60; text-align:center;">'
android_prompt_new = '<div id="android-pwa-prompt" style="display:none; position:fixed; bottom:20px; left:50%; transform:translateX(-50%); width:90%; max-width:400px;  padding:20px; border-radius:15px; box-shadow:0 15px 40px rgba(0,0,0,0.4); z-index:99999; border:3px solid #27ae60; text-align:center; background:var(--card-bg, #ffffff);">'

html = html.replace(android_prompt_old, android_prompt_new)

# 2. Simplify Notifications toggle
toggle_old = """                <div style="margin-top:12px; padding:12px; border:1px solid #d7e3f3; border-radius:10px; background:#f8fbff;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <strong style="color:#1e3c72;">🔔 Bildirimler</strong>
                        <label class="library-modal-switch" aria-label="Bildirimleri aç veya kapat">
                            <input id="profile-notification-toggle" type="checkbox" onchange="window.handleNotificationToggleChange()">
                            <span class="library-modal-slider"></span>
                        </label>
                    </div>
                    <small id="profile-notification-status" style="display:block; margin-top:8px; color:#4b5563;">Bildirimler açık.</small>
                </div>"""

toggle_new = """                <div style="margin-top:12px; padding:12px 5px; border-bottom:1px solid rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <strong style="color:var(--text-color, #1e3c72); font-size:1.1rem;">🔔 Bildirimler</strong>
                        <label class="library-modal-switch" aria-label="Bildirimleri aç veya kapat">
                            <input id="profile-notification-toggle" type="checkbox" onchange="window.handleNotificationToggleChange()">
                            <span class="library-modal-slider"></span>
                        </label>
                    </div>
                    <small id="profile-notification-status" style="display:none; margin-top:5px; color:#e74c3c;"></small>
                </div>"""

html = html.replace(toggle_old, toggle_new)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Applied UI fixes")
