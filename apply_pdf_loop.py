import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8", errors="replace") as f:
    js = f.read()

old_loop = """    list.forEach((q, i) => {
        const answer = (q.siklar && q.siklar[q.dogru]) ? q.siklar[q.dogru] : (q.dogru || 'Bilinmiyor');
        html += '<div class="q-container">';
        html += '<p><b>Soru ' + (i+1) + ':</b> ' + (q.soru ? q.soru : '') + '</p>';
        if (q.image) html += '<img src="' + q.image + '">';
        html += '<p style="color:green;"><b>Cevap:</b> ' + answer + '</p>';
        if (q.solutionText) html += '<p style="color:blue;"><b>Çözüm Notu:</b> ' + q.solutionText + '</p>';
        if (q.solutionImage) html += '<p style="color:blue;"><b>Çözüm Görseli:</b></p><img src="' + q.solutionImage + '">';
        html += '</div>';
    });"""

# Because of the encoding issues from earlier, let's use a simpler string replace approach focusing on key parts.
old_loop_pattern = "list.forEach((q, i) => {"

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
    }
    //"""

# Find the start of list.forEach
start_idx = js.find("list.forEach((q, i) => {")
if start_idx != -1:
    end_idx = js.find("});", start_idx) + 3
    js = js[:start_idx] + new_loop + js[end_idx:]

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)
print("PDF loop updated")
