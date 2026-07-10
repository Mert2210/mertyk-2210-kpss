import re

with open('index.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace myClasses logic
pattern = r"const myClasses = \{\};\s*for \(const c in classes\) \{ if \((.*?)\) myClasses\[c\] = classes\[c\]; \}\s*socket.emit\(\"teacherClassesData\", myClasses\);"
replacement = r"""const myClassesArray = [];
        for (const c in classes) { if (\1) myClassesArray.push({ code: c, ...classes[c] }); }
        socket.emit("teacherClassesData", myClassesArray);"""

new_content = re.sub(pattern, replacement, content)

with open('index.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Updated index.js to send array instead of object.")
