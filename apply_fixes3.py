import sys
import re

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8", errors="replace") as f:
    js = f.read()

# Replace cloud badge logic
old_badge = """            const isLocalQuestion = q._source ? q._source === 'local' : titleIsLocal;
            const cloudBadge = !isLocalQuestion
                ? `<span class="cloud-badge" title="Bu soru buluta kaydetilmi\u015ftir, internet ba\u011flant\u0131s\u0131 gerektirir">\u2601\ufe0f Bulut</span>`
                : '';"""

# Actually, the encoding in the string might be tricky. Let's use regex to find it.
pattern = r"const isLocalQuestion = q\._source \? q\._source === 'local' : titleIsLocal;\s*const cloudBadge = !isLocalQuestion\s*\?\s*`<span class=\"cloud-badge\".*?</span>`\s*:\s*'';"

new_badge = """            const isLocalQuestion = q._source ? q._source === 'local' : titleIsLocal;
            const cloudBadge = !isLocalQuestion
                ? `<span class="cloud-badge" title="Bulut Kaydı" style="background:rgba(52, 152, 219, 0.15); color:#3498db; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">☁️ Bulut</span>`
                : `<span class="local-badge" title="Cihaz Kaydı" style="background:rgba(46, 204, 113, 0.15); color:#2ecc71; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">📱 Cihaz</span>`;"""

js = re.sub(pattern, new_badge, js, flags=re.DOTALL)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)
print("Updated badge logic")
