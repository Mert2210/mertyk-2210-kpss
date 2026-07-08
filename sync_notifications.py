import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

# 1. Update the UI toggle logic to disable the checkbox if denied
old_ui_func = """function updateNotificationToggleUI() {
    const toggle = document.getElementById('profile-notification-toggle');
    const status = document.getElementById('profile-notification-status');
    const enabled = areNotificationsEnabled();
    const permission = typeof Notification !== "undefined" ? Notification.permission : "default";
    
    if (toggle) {
        toggle.checked = enabled && permission !== "denied";
        if (permission === "denied") {
            toggle.checked = false;
        }
    }"""

new_ui_func = """function updateNotificationToggleUI() {
    const toggle = document.getElementById('profile-notification-toggle');
    const status = document.getElementById('profile-notification-status');
    const enabled = areNotificationsEnabled();
    const permission = typeof Notification !== "undefined" ? Notification.permission : "default";
    
    if (toggle) {
        toggle.checked = enabled && permission !== "denied";
        if (permission === "denied") {
            toggle.checked = false;
            toggle.disabled = true; // Telefon ayarlarindan kapatildiysa butonu dondur
            toggle.style.opacity = '0.5';
        } else {
            toggle.disabled = false;
            toggle.style.opacity = '1';
        }
    }"""

js = js.replace(old_ui_func, new_ui_func)

# 2. Add visibilitychange event listener to auto-sync when returning to the app
if "document.addEventListener('visibilitychange'" not in js:
    js += """

// Uygulamaya geri donuldugunde bildirim izinlerini telefonla senkronize et
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        updateNotificationToggleUI();
    }
});
"""

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Applied sync logic to app.js")
