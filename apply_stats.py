import sys
import re

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8", errors="replace") as f:
    js = f.read()

# 1. Update myStatsData
old_stats = """        document.getElementById('stats-summary').innerHTML = `
            <div style="background:#27ae60; padding:15px; border-radius:10px;">
                <div style="font-size:2rem; font-weight:bold;">%${successRate}</div>
                <div style="font-size:0.8rem;">Başarı Oranı</div>
            </div>
            <div style="background:#2980b9; padding:15px; border-radius:10px;">
                <div style="font-size:2rem; font-weight:bold;">${totalExams}</div>
                <div style="font-size:0.8rem;">Çözülen Deneme</div>
            </div>
            <div style="background:#e67e22; padding:10px; border-radius:10px; grid-column: span 2;">
                <div style="font-size:1.1rem; font-weight:bold;">Toplam: ${tCorrect} Doğru | ${tWrong} Yanlış</div>
            </div>`;"""

# We can find this block dynamically
pattern_stats = r"document\.getElementById\('stats-summary'\)\.innerHTML\s*=\s*`.*?<\/div>`;"

new_stats = """        const correctDeg = totalQs > 0 ? (tCorrect / totalQs) * 360 : 0;
        const wrongDeg = totalQs > 0 ? (tWrong / totalQs) * 360 : 0;
        
        document.getElementById('stats-summary').innerHTML = `
            <div style="background:#27ae60; padding:15px; border-radius:10px;">
                <div style="font-size:2rem; font-weight:bold;">%${successRate}</div>
                <div style="font-size:0.8rem;">Başarı Oranı</div>
            </div>
            <div style="background:#2980b9; padding:15px; border-radius:10px;">
                <div style="font-size:2rem; font-weight:bold;">${totalExams}</div>
                <div style="font-size:0.8rem;">Çözülen Deneme</div>
            </div>
            <div class="content-card" style="grid-column: span 2; padding:20px; display:flex; align-items:center; gap:20px; border:1px solid rgba(128,128,128,0.2); border-radius:12px;">
                <div style="width:80px; height:80px; border-radius:50%; background: conic-gradient(#2ecc71 0deg ${correctDeg}deg, #e74c3c ${correctDeg}deg ${correctDeg + wrongDeg}deg, #95a5a6 ${correctDeg + wrongDeg}deg 360deg); flex-shrink:0; box-shadow:inset 0 0 10px rgba(0,0,0,0.1);"></div>
                <div style="text-align:left;">
                    <div style="font-weight:bold; font-size:1.1rem; color:#2c3e50; margin-bottom:5px;">Genel Dağılım</div>
                    <div style="font-size:0.85rem; color:#2ecc71; margin-bottom:2px;">🟢 Doğru: <b>${tCorrect}</b></div>
                    <div style="font-size:0.85rem; color:#e74c3c; margin-bottom:2px;">🔴 Yanlış: <b>${tWrong}</b></div>
                    <div style="font-size:0.85rem; color:#95a5a6;">⚪ Boş: <b>${tBlank}</b></div>
                </div>
            </div>`;"""

js = re.sub(pattern_stats, new_stats, js, flags=re.DOTALL)

# 2. Update teacherReportsData
# Find the teacher reports section
old_teacher_html = """        let html = `<h4 style="color:#27ae60; margin-top:0;">✅ Çözenler</h4>`;
        if(reports.length === 0) html += "<p style='font-size:0.85rem;'>Henüz çözen öğrenci yok.</p>";
        else html += reports.map(r => `<div class="list-item" style="border-left:4px solid #27ae60;"><b>${escapeHtml(r.name)}</b> <span style="float:right; color:#27ae60; font-weight:bold;">${escapeHtml(r.score)} Puan</span></div>`).join('');
        
        html += `<h4 style="color:#c0392b; margin-top:20px;">❌ Çözmeyenler</h4>`;
        if(notSolved.length === 0) html += "<p style='font-size:0.85rem;'>Sınıf listesi boş veya tüm sınıf görevini tamamlamış!</p>";
        else html += notSolved.map(name => `<div class="list-item" style="border-left:4px solid #c0392b; color:#666;">${escapeHtml(name)}</div>`).join('');"""

new_teacher_html = """        let html = `<h4 style="color:#27ae60; margin-top:0;">✅ Çözenler</h4>`;
        if(reports.length === 0) {
            html += "<p style='font-size:0.85rem;'>Henüz çözen öğrenci yok.</p>";
        } else {
            html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px; margin-bottom:20px;">';
            html += reports.map(r => `
                <div class="content-card" style="padding:15px; border-radius:12px; border-top:4px solid #27ae60; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                    <div style="font-size:1.5rem; font-weight:bold; color:#27ae60; margin-bottom:5px;">${escapeHtml(r.score)}</div>
                    <div style="font-size:0.85rem; font-weight:bold; color:#2c3e50;">${escapeHtml(r.name)}</div>
                    <div style="font-size:0.75rem; color:#7f8c8d; margin-top:4px;">Puan</div>
                </div>
            `).join('');
            html += '</div>';
        }
        
        html += `<h4 style="color:#c0392b; margin-top:20px;">❌ Çözmeyenler</h4>`;
        if(notSolved.length === 0) {
            html += "<p style='font-size:0.85rem;'>Sınıf listesi boş veya tüm sınıf görevini tamamlamış!</p>";
        } else {
            html += '<div style="display:flex; flex-wrap:wrap; gap:8px;">';
            html += notSolved.map(name => `<div style="background:rgba(231, 76, 60, 0.1); color:#c0392b; padding:8px 12px; border-radius:8px; font-size:0.85rem; font-weight:bold;">${escapeHtml(name)}</div>`).join('');
            html += '</div>';
        }"""

# Using regex to replace the teacher html
pattern_teacher = r"let html = `<h4 style=\"color:#27ae60; margin-top:0;\">.*?\.join\(''\);"
js = re.sub(pattern_teacher, new_teacher_html, js, flags=re.DOTALL)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)
print("Updated stats and teacher panels")
