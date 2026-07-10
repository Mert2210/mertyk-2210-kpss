import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

import re

# Fix initial load
js = re.sub(
    r"if\s*\(classInfoEl\)\s*classInfoEl\.innerHTML\s*=\s*`Mevcut Sınıfınız:\s*<b>\$\{savedClassName\}<\/b>`;",
    r"if (classInfoEl) classInfoEl.innerHTML = `🎓 ${savedClassName}`;",
    js
)
# Note: since the file has encoding issues with Turkish chars on read/write in some envs, 
# it's better to match with a more forgiving regex if needed, or exact string from the file.
js = re.sub(
    r"if\s*\(classInfoEl\)\s*classInfoEl\.innerHTML\s*=\s*`[^`]*<b>\$\{savedClassName\}<\/b>`;",
    r"if (classInfoEl) classInfoEl.innerHTML = `🎓 ${savedClassName}`;",
    js
)

# Fix join class
js = re.sub(
    r"if\s*\(classInfoEl\)\s*classInfoEl\.innerHTML\s*=\s*`Mevcut Sınıfınız:\s*<b>\$\{res\.className \|\| res\.code\}<\/b>`;",
    r"if (classInfoEl) classInfoEl.innerHTML = `🎓 ${res.className || res.code}`;",
    js
)
js = re.sub(
    r"if\s*\(classInfoEl\)\s*classInfoEl\.innerHTML\s*=\s*`[^`]*<b>\$\{res\.className \|\| res\.code\}<\/b>`;",
    r"if (classInfoEl) classInfoEl.innerHTML = `🎓 ${res.className || res.code}`;",
    js
)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Fixed class info text display.")
