import sys

html_path = "public/index.html"
with open(html_path, "r", encoding="utf-8", errors="replace") as f:
    html = f.read()

# Add search bar to library topics screen
old_header = """<div id="screen-library-topics" class="screen">
        <div class="library-screen-header">
            <h3 id="library-topics-title" style="margin:0;">📚 Ders</h3>
            <button type="button" class="outline ui-btn-compact" style="width:auto; padding:8px 10px;" onclick="window.closeLibraryTopicsScreen()">🔙 Geri</button>
        </div>
        <p class="library-screen-desc">Konu seçerek soruları listeleyebilirsin.</p>"""

new_header = """<div id="screen-library-topics" class="screen">
        <div class="library-screen-header">
            <h3 id="library-topics-title" style="margin:0;">📚 Ders</h3>
            <button type="button" class="outline ui-btn-compact" style="width:auto; padding:8px 10px;" onclick="window.closeLibraryTopicsScreen()">🔙 Geri</button>
        </div>
        <div style="margin-top:10px; margin-bottom:15px;">
            <input type="text" id="library-topics-search" class="ui-input" placeholder="🔍 Konu ara..." style="width:100%; border-radius:10px; padding:12px;" onkeyup="window.filterLibraryTopics(this.value)">
        </div>
        <p class="library-screen-desc" style="display:none;">Konu seçerek soruları listeleyebilirsin.</p>"""

html = html.replace(old_header, new_header)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
print("Added search bar to topics screen")

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8", errors="replace") as f:
    js = f.read()

# Add filterLibraryTopics function to app.js
filter_func = """
window.filterLibraryTopics = (query) => {
    const safeQuery = String(query || '').toLowerCase().trim();
    const listEl = document.getElementById('library-topics-list');
    if (!listEl) return;
    const buttons = listEl.querySelectorAll('button.derslerim-topic-btn');
    buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if (safeQuery === '' || text.includes(safeQuery)) {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    });
};
"""

js = js + "\n" + filter_func

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)
print("Added filter logic to app.js")
