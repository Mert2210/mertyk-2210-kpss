import sys
import re

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8", errors="replace") as f:
    js = f.read()

# Add badge to renderTrialQuestionList
pattern_trial = r"(<h4 class=\"trial-list-title\">.*?</h4>)"
new_trial_h4 = r"""\1
                ${q?._source === 'local' 
                    ? `<span class="local-badge" title="Cihaz Kaydı" style="background:rgba(46, 204, 113, 0.15); color:#2ecc71; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold; display:inline-block; margin-bottom:8px;">📱 Cihaz</span>` 
                    : `<span class="cloud-badge" title="Bulut Kaydı" style="background:rgba(52, 152, 219, 0.15); color:#3498db; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold; display:inline-block; margin-bottom:8px;">☁️ Bulut</span>`}"""

# Since renderTrialQuestionList is around line 4131, we need to match carefully.
# We can use str.replace for the exact HTML string if possible, or regex.
# Let's replace the <article class="trial-list-card"> block inside renderTrialQuestionList.

old_block = """        return `
            <article class="trial-list-card">
                <h4 class="trial-list-title">${i + 1}. ${escapeHtml(questionText)}</h4>"""

new_block = """        return `
            <article class="trial-list-card">
                ${q?._source === 'local' 
                    ? `<span class="local-badge" title="Cihaz Kaydı" style="background:rgba(46, 204, 113, 0.15); color:#2ecc71; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold; display:inline-block; margin-bottom:8px; width:fit-content;">📱 Cihaz</span>` 
                    : `<span class="cloud-badge" title="Bulut Kaydı" style="background:rgba(52, 152, 219, 0.15); color:#3498db; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold; display:inline-block; margin-bottom:8px; width:fit-content;">☁️ Bulut</span>`}
                <h4 class="trial-list-title">${i + 1}. ${escapeHtml(questionText)}</h4>"""

js = js.replace(old_block, new_block)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)
print("Updated trial list badge logic")
