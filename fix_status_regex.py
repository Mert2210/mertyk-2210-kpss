import sys
import re

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

# Replace the block
js = re.sub(
    r'if \(!enabled\) \{\s*status\.textContent = "Bildirimler kapalı\.";\s*status\.style\.color = "#4b5563";\s*\} else \{\s*status\.textContent = "Bildirim izni bekleniyor\. Açmak için anahtara dokunun\.";\s*status\.style\.color = "#f39c12";\s*\}',
    'status.style.display = "none";',
    js
)

# And also the non-unicode version just in case
js = re.sub(
    r'if \(!enabled\) \{\s*status\.textContent = "Bildirimler kapal\.";\s*status\.style\.color = "#4b5563";\s*\} else \{\s*status\.textContent = "Bildirim izni bekleniyor\. Amak iin anahtara dokunun\.";\s*status\.style\.color = "#f39c12";\s*\}',
    'status.style.display = "none";',
    js
)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Fixed display logic")
