import sys
import re

html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8", errors="ignore") as f:
    html = f.read()

# Fix encoding issues in the button text
html = html.replace("Uygulamay Payla", "Uygulamayı Paylaş")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Fixed index.html encoding")
