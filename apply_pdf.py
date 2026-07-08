import sys
import re

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8", errors="replace") as f:
    js = f.read()

old_style = """html += '<style>body { font-family: sans-serif; padding: 20px; } .q-container { border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 20px; page-break-inside: avoid; } img { max-width: 100%; max-height: 400px; margin-top: 10px; display: block; border-radius: 8px; }</style>';"""
new_style = """html += '<style>body { font-family: sans-serif; margin: 0; padding: 10mm; background: #fdfdfd; } .page { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10mm; height: 277mm; width: 190mm; page-break-after: always; box-sizing: border-box; } .q-container { border: 2px solid #bdc3c7; border-radius: 12px; padding: 12px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; background: #fff; } .q-header { font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #2c3e50; border-bottom: 1px solid #ecf0f1; padding-bottom: 6px; } .q-img { max-width: 100%; max-height: 150px; object-fit: contain; margin-bottom: 8px; border-radius: 6px; } .q-meta { font-size: 12px; margin-top: auto; padding-top: 8px; border-top: 1px dashed #ecf0f1; } @media print { body { padding: 0; margin: 0; } .page { margin: 0; padding: 0; width: 100%; height: 100vh; } }</style>';"""

new_loop = """    for (let i = 0; i < list.length; i += 4) {
        html += '<div class="page">';
        for (let j = 0; j < 4; j++) {
            const index = i + j;
            if (index < list.length) {
                const q = list[index];
                const answer = (q.siklar && q.siklar[q.dogru]) ? q.siklar[q.dogru] : (q.dogru || 'Bilinmiyor');
                html += '<div class="q-container">';
                html += '<div class="q-header">Soru ' + (index+1) + '</div>';
                if (q.soru) html += '<p style="font-size:13px; margin:0 0 8px 0; color:#34495e;">' + q.soru + '</p>';
                if (q.image) html += '<img class="q-img" src="' + q.image + '">';
                html += '<div class="q-meta">';
                html += '<div style="color:#27ae60; font-weight:bold; margin-bottom:4px;">Cevap: ' + answer + '</div>';
                if (q.solutionText) html += '<div style="color:#2980b9; font-size:11px;">Not: ' + q.solutionText + '</div>';
                if (q.solutionImage) html += '<img class="q-img" style="max-height:80px; margin-top:4px;" src="' + q.solutionImage + '">';
                html += '</div>';
                html += '</div>';
            } else {
                html += '<div class="q-container" style="border:none; background:transparent;"></div>'; 
            }
        }
        html += '</div>';
    }"""

js = js.replace(old_style, new_style)
js = re.sub(r"list\.forEach\(\(q, i\) => \{.*?\html \+= '<\/div>';\s*\}\);", new_loop, js, flags=re.DOTALL)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)
print("PDF logic updated.")
