import sys
import re

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

old_func = """function updateNotificationToggleUI() {
    const toggle = document.getElementById('profile-notification-toggle');
    const status = document.getElementById('profile-notification-status');
    const enabled = areNotificationsEnabled();
    if (toggle) toggle.checked = enabled;
    if (!status) return;
    if (!enabled) {
        status.textContent = "Bildirimler kapalı.";
        return;
    }
    if (typeof Notification === "undefined") {
        status.textContent = "Bu cihazda bildirim desteği yok.";
        return;
    }
    const permission = Notification.permission;
    switch (permission) {
        case "granted":
            status.textContent = "Bildirimler açık.";
            return;
        case "denied":
            status.textContent = "Tarayıcı bildirimi engelliyor. Tarayıcı ayarından açabilirsiniz.";
            return;
        case "default":
            status.textContent = "Bildirim izni bekleniyor. Açmak için anahtara dokunun.";
            return;
    }
}"""

new_func = """function updateNotificationToggleUI() {
    const toggle = document.getElementById('profile-notification-toggle');
    const status = document.getElementById('profile-notification-status');
    const enabled = areNotificationsEnabled();
    const permission = typeof Notification !== "undefined" ? Notification.permission : "default";
    
    if (toggle) {
        toggle.checked = enabled && permission !== "denied";
        if (permission === "denied") {
            toggle.checked = false;
        }
    }
    if (!status) return;
    
    if (typeof Notification === "undefined") {
        status.textContent = "Bu cihazda bildirim desteği yok.";
        return;
    }
    
    if (permission === "denied") {
        status.textContent = "Tarayıcı bildirimleri engelliyor (Cihaz ayarlarından izin verin).";
        status.style.color = "#e74c3c";
        return;
    }
    
    if (!enabled) {
        status.textContent = "Bildirimler kapalı.";
        status.style.color = "#7f8c8d";
        return;
    }
    
    if (permission === "granted") {
        status.textContent = "Bildirimler açık ve sisteme bağlı.";
        status.style.color = "#27ae60";
    } else {
        status.textContent = "Bildirim izni bekleniyor. Açmak için anahtara dokunun.";
        status.style.color = "#f39c12";
    }
}"""

# Using regex to replace the function since we have encoding quirks in the terminal read
pattern = r"function updateNotificationToggleUI\(\)\s*\{[^\}]+\}[^\}]+\}"
js = re.sub(pattern, new_func, js)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)
    
print("Updated notification toggle UI logic")
