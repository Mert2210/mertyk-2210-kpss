import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

# We need to remove the hanging block:
#     const permission = Notification.permission;
#     switch (permission) {
#         case "granted":
#             status.textContent = "Bildirimler a\xe7\u0131k.";
#             return;
#         case "denied":
#             status.textContent = "Taray\u0131c\u0131 bildirimi engelliyor. Taray\u0131c\u0131 ayar\u0131ndan a\xe7abilirsiniz.";
#             return;
#         case "default":
#             status.textContent = "Bildirim izni bekleniyor. A\xe7mak i\xe7in anahtara dokunun.";
#             return;
#     }
# }

import re

# Match the bad block starting after the newly inserted updateNotificationToggleUI
pattern = r"\}\n    const permission = Notification\.permission;\n    switch \(permission\) \{\n        case \"granted\":\n[^\}]+return;\n        case \"denied\":\n[^\}]+return;\n        case \"default\":\n[^\}]+return;\n    \}\n\}"

js = re.sub(pattern, "}", js)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)
    
print("Fixed illegal return statement")
