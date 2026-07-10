import os

def insert_after(filepath, search_str, insert_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if insert_str in content: return
    if search_str in content:
        content = content.replace(search_str, search_str + "\n" + insert_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Injected into {filepath} after '{search_str.strip()}'")
    else:
        print(f"Failed to find {search_str} in {filepath}")

student_badge_html = '    <div id="student-class-badge-container" style="text-align: center; margin-bottom: 10px; display: none;"></div>'
insert_after('public/index.html', '<div id="screen-main" class="screen">', student_badge_html)
