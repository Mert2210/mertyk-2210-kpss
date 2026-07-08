import sys

css_path = "public/style.css"
with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

# Add auth-form to dark theme
target = "body.full-dark-theme .content-card,"
replacement = "body.full-dark-theme .content-card,\nbody.full-dark-theme .auth-form,"
css = css.replace(target, replacement)

target2 = "body.soft-dark-theme .content-card,"
replacement2 = "body.soft-dark-theme .content-card,\nbody.soft-dark-theme .auth-form,"
css = css.replace(target2, replacement2)

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)
print("Updated style.css for auth-form in dark mode")
