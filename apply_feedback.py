import sys

html_path = "public/app.js"
with open(html_path, "r", encoding="utf-8") as f:
    js = f.read()

# Modify uploadQuestion definition
old_def = "window.uploadQuestion = async () => {"
new_def = "window.uploadQuestion = async (isForClass = false) => {"
if old_def in js:
    js = js.replace(old_def, new_def)
    print("Updated uploadQuestion definition")

# Modify uploadQuestion alert
old_alert = "alert(`✅ Soru (ve varsa çözümü) kütüphanenize eklendi!`);"
new_alert = """    if (isForClass) {
        alert(`✅ Soru (ve varsa çözümü) ${window.myClassCode} sınıfına başarıyla gönderildi!`);
    } else {
        alert(`✅ Soru (ve varsa çözümü) kütüphanenize eklendi!`);
    }"""
if old_alert in js:
    js = js.replace(old_alert, new_alert)
    print("Updated uploadQuestion alert")

# Modify uploadQuestionToNamedClass
old_upload = "window.uploadQuestion();"
new_upload = "window.uploadQuestion(true);"
# Be careful to only replace it inside uploadQuestionToNamedClass
# I'll just use a regex
import re
js = re.sub(r'(window\.myClassCode = selectedClass; \s*)window\.uploadQuestion\(\);', r'\1window.uploadQuestion(true);', js)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(js)
