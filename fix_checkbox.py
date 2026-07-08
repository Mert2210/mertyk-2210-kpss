import sys

css_path = "public/style.css"
with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

old_css = """.library-modal-switch input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
}"""

new_css = """.library-modal-switch input {
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    position: absolute !important;
    appearance: none !important;
    -webkit-appearance: none !important;
}"""

css = css.replace(old_css, new_css)

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)

print("Fixed checkbox visibility bug")
