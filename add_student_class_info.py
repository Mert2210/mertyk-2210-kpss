import sys

html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

old_class_input = """                    <div style="display:flex; gap:8px;">
                        <input type="text" id="class-code-input" placeholder="Sınıf Kodu Gir" style="margin:0; flex:2;">
                        <button onclick="joinClass()" class="blue" style="margin:0; flex:1; font-size:0.9rem;">Katıl</button>
                    </div>
                    <div id="student-saved-materials-panel" style="margin-top:20px;">"""

new_class_input = """                    <div style="display:flex; gap:8px;">
                        <input type="text" id="class-code-input" placeholder="Sınıf Kodu Gir" style="margin:0; flex:2;">
                        <button onclick="joinClass()" class="blue" style="margin:0; flex:1; font-size:0.9rem;">Katıl</button>
                    </div>
                    <p id="student-current-class-info" style="font-size:0.85rem; color:#e67e22; margin-top:10px;"></p>
                    <div id="student-saved-materials-panel" style="margin-top:20px;">"""

html = html.replace(old_class_input, new_class_input)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Updated index.html with student class info paragraph.")
