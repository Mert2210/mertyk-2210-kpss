import sys
import re

# Update index.html
html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

share_btn = """                <button onclick="window.shareApp()" class="outline" style="width:100%; padding:12px; margin-bottom:10px; font-weight:bold; color:#2980b9; border-color:#2980b9;">?? Uygulamay Payla</button>
                <button onclick="openSecureLogoutScreen()"""
                
html = html.replace('<button onclick="openSecureLogoutScreen()', share_btn)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

# Update app.js
app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

share_func = """
window.shareApp = async () => {
    const url = getShareableAppLink(window.location);
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Gazi KPSS Genel K\u00fclt\u00fcr Soru Havuzu',
                text: 'Yeni nesil e\u011fitim uygulamas\u0131na kat\u0131l, s\u0131n\u0131f kodunla sorular\u0131 \u00e7\u00f6z!',
                url: url
            });
        } catch(e) {
            console.log("Payla\u015f\u0131m iptal edildi veya desteklenmiyor.");
        }
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert("\ud83d\udd17 Link kopyaland\u0131! \u0130stedi\u011finiz ki\u015fiye g\u00f6nderebilirsiniz.");
        });
    }
};

window.logout = async () => {"""

js = js.replace("window.logout = async () => {", share_func)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Added shareApp logic")
