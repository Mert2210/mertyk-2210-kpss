import os

def replace_in_file(filepath, search_str, replace_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if search_str in content:
        content = content.replace(search_str, replace_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Replaced in {filepath}")
    else:
        print(f"Failed to find search_str in {filepath}")

bad_func = """window.toggleSection = (id) => { 
    const el = document.getElementById(id); 
    if (el) el.classList.toggle('hidden-panel'); 
};"""

good_func = """window.toggleSection = (id) => { 
    const el = document.getElementById(id); 
    if (el) {
        if (el.style.display === 'none') {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    }
};"""

replace_in_file('public/app.js', bad_func, good_func)
replace_in_file('public/app.mjs', bad_func, good_func)
