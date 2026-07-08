import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

old_logic = """    if (permission === "denied") {
        status.textContent = "Tarayc bildirimleri engelliyor (Cihaz ayarlarndan izin verin).";
        status.style.color = "#e74c3c";
        return;
    }
    
    if (!enabled) {
        status.textContent = "Bildirimler kapal.";
        status.style.color = "#4b5563";
    } else {
        status.textContent = "Bildirim izni bekleniyor. Amak iin anahtara dokunun.";
        status.style.color = "#f39c12";
    }"""

# Actually, let's just use Python string replacement without the weird encoding characters by replacing a simpler block.
# We will read it again and just insert the display properties.

with open(app_path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# Replace the text content setting part
js = js.replace('status.textContent = "Tarayıcı bildirimleri engelliyor (Cihaz ayarlarından izin verin).";\n        status.style.color = "#e74c3c";\n        return;', 'status.textContent = "Tarayıcı bildirimleri engelliyor (Cihaz ayarlarından izin verin).";\n        status.style.color = "#e74c3c";\n        status.style.display = "block";\n        return;')

js = js.replace('status.textContent = "Bu cihazda bildirim desteği yok.";\n        return;', 'status.textContent = "Bu cihazda bildirim desteği yok.";\n        status.style.display = "block";\n        return;')

# If not denied and supported, we just hide the status!
js = js.replace('if (!enabled) {\n        status.textContent = "Bildirimler kapalı.";\n        status.style.color = "#4b5563";\n    } else {\n        status.textContent = "Bildirim izni bekleniyor. Açmak için anahtara dokunun.";\n        status.style.color = "#f39c12";\n    }', 'status.style.display = "none";')

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Fixed display logic in app.js")
