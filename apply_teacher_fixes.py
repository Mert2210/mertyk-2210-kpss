import re
import os

def modify_file(filepath, modifications):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    for search, replace in modifications:
        if search in content:
            content = content.replace(search, replace)
        else:
            print(f"WARNING: Could not find '{search}' in {filepath}")

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully modified {filepath}")
    else:
        print(f"No changes made to {filepath}")

index_js_mods = [
    ('classes[c].createdBy === currentUser(socket).name', 'classes[c].teacher === currentUser(socket).email'),
    ('classes[safeOldCode].createdBy === currentUser(socket).name', 'classes[safeOldCode].teacher === currentUser(socket).email'),
    ('classes[safeCode].createdBy === currentUser(socket).name', 'classes[safeCode].teacher === currentUser(socket).email'),
]

index_js_add_socket = """
    socket.on("deleteClass", ({ code, deleteQuestions }) => {
"""
index_js_add_socket_replacement = """
    socket.on("getStudentsInClass", (classCode) => {
        if (!ensureTeacher(socket)) return;
        const safeCode = sanitizeString(classCode, 20).toUpperCase();
        const students = [];
        for (const sid in activeUsers) {
            const u = activeUsers[sid];
            if (u && u.role === "student" && u.classCode === safeCode) {
                students.push(u.name || "İsimsiz Öğrenci");
            }
        }
        socket.emit("studentsInClassData", students);
    });

    socket.on("deleteClass", ({ code, deleteQuestions }) => {
"""
index_js_mods.append((index_js_add_socket, index_js_add_socket_replacement))

modify_file('index.js', index_js_mods)

style_css_additions = """
/* Akordeon Tasarımı */
.collapsible {
    background-color: #2c3e50;
    color: white;
    cursor: pointer;
    padding: 18px;
    width: 100%;
    border: none;
    text-align: left;
    outline: none;
    font-size: 15px;
    border-radius: 8px;
    margin-bottom: 5px;
    transition: background-color 0.3s ease, border-radius 0.3s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.collapsible:hover {
    background-color: #34495e;
}

.collapsible:after {
    content: '\\25BC'; /* Down arrow */
    font-size: 13px;
    color: white;
    transition: transform 0.3s ease;
}

.collapsible.active {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    background-color: #34495e;
}

.collapsible.active:after {
    transform: rotate(180deg);
}

.collapsible-content {
    padding: 0 18px;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    background-color: #f1f2f6;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    margin-bottom: 10px;
}

.collapsible-content.show {
    padding: 15px 18px;
    max-height: 2000px; /* arbitrary max-height for animation */
}

/* Sınıf Rozeti */
.class-badge {
    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
    color: white;
    padding: 8px 15px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: bold;
    display: inline-block;
    margin-bottom: 15px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

/* Çözüm Alanı */
.solution-textarea {
    width: 100%;
    border: 2px solid #bdc3c7;
    border-radius: 8px;
    padding: 10px;
    margin-top: 10px;
    font-family: inherit;
    resize: vertical;
    transition: border-color 0.3s;
}

.solution-textarea:focus {
    border-color: #3498db;
    outline: none;
}
"""

with open('public/style.css', 'a', encoding='utf-8') as f:
    f.write(style_css_additions)
print("Updated style.css")

app_js_mods = [
    ('placeholder="Soru metnini girin (İsteğe bağlı, görsel de ekleyebilirsiniz)"></textarea>',
     'placeholder="Soru metnini girin (İsteğe bağlı, görsel de ekleyebilirsiniz)"></textarea>\\n                <textarea id="question-solution" class="solution-textarea" rows="2" placeholder="Soru çözümü veya açıklaması ekle (İsteğe bağlı)"></textarea>'),
    
    ('const soru = document.getElementById(\\\'question-text\\\')?.value.trim() || "";',
     'const soru = document.getElementById(\\\'question-text\\\')?.value.trim() || "";\\n    const cozum = document.getElementById(\\\'question-solution\\\')?.value.trim() || "";'),
    ('soru, image: imageData', 'soru, cozum, image: imageData'),
    
    ('document.getElementById(\\\'question-text\\\').value = "";',
     'document.getElementById(\\\'question-text\\\').value = "";\\n    if (document.getElementById(\\\'question-solution\\\')) document.getElementById(\\\'question-solution\\\').value = "";'),
]

for filename in ['public/app.js', 'public/app.mjs']:
    modify_file(filename, app_js_mods)
