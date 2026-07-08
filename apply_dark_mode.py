import sys
import re

html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8", errors="replace") as f:
    html = f.read()

# Replace hardcoded white backgrounds in Settings and Notifications
html = html.replace('background:#fff3f3; padding:10px; border-radius:8px; border:1px solid #f5c6cb;', 'padding:10px; border-radius:8px; border:1px solid rgba(255,0,0,0.2); class="content-card"')
html = html.replace('background:#fff;', '')
html = html.replace('background: #fff;', '')
html = html.replace('background-color:#fff;', '')
html = html.replace('background:white;', '')
html = html.replace('class="content-card" style=" padding:20px; border-radius:12px; text-align:left; border:1px solid #ddd;"', 'class="content-card" style="padding:20px; border-radius:12px; text-align:left; border:1px solid rgba(128,128,128,0.2);"')
html = html.replace('style="max-height: 250px; overflow-y:auto;  padding:8px; border-radius:8px; border:1px solid #ddd;"', 'class="content-card" style="max-height: 250px; overflow-y:auto; padding:8px; border-radius:8px; border:1px solid rgba(128,128,128,0.2);"')

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
print("Removed white backgrounds from index.html")
