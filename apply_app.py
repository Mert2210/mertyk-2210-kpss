import sys

html_path = "public/app.js"
with open(html_path, "r", encoding="utf-8", errors="replace") as f:
    js = f.read()

old_code = "document.getElementById('generated-code').innerText ="
new_code = "const gc = document.getElementById('generated-code'); if (gc) gc.innerText ="
js = js.replace(old_code, new_code)

old_refresh = "window.refreshTeacherClasses();"
new_refresh = """window.refreshTeacherClasses();
        const gci = document.getElementById('generated-code-instructor');
        if (gci) gci.innerText = "Sınıf Kodunuz: " + res.classCode;"""
js = js.replace(old_refresh, new_refresh)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(js)
