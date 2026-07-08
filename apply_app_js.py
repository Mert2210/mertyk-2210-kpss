import sys

with open("public/app.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Append switchDashboardTab function at the end
tab_function = """

window.switchDashboardTab = function(tabName) {
    document.querySelectorAll('.modern-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.modern-tab-content').forEach(content => content.classList.remove('active'));
    
    document.getElementById('tab-btn-' + tabName).classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
};
"""
content += tab_function

# 2. Inject studentTabs visibility logic
search_str = 'if (studentArea) studentArea.style.display = isTeacher ? "none" : "block";'
replace_str = search_str + '\n        const studentTabs = document.getElementById("student-tabs-container");\n        if (studentTabs) studentTabs.style.display = isTeacher ? "none" : "block";'

content = content.replace(search_str, replace_str)

with open("public/app.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Modified app.js successfully!")
