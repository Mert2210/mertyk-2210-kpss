import re
with open("public/app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    # check for smart quotes
    if "‘" in l or "’" in l or "“" in l or "”" in l:
        print(f"Smart quote at line {i+1}: {l.strip()}")
    # check for zero width space
    if "\u200b" in l:
        print(f"Zero width space at line {i+1}")

