import sys

html_path = "public/app.js"
with open(html_path, "r", encoding="utf-8") as f:
    js = f.read()

# Append to onAuthStateChanged inside the "if (user) { ... }" block
# Let's just find "if (!isTeacher) {\n            promptNotificationsOnFirstLaunch();\n        }"
old_logic = """        if (!isTeacher) {
            promptNotificationsOnFirstLaunch();
        }"""
        
new_logic = """        if (!isTeacher) {
            promptNotificationsOnFirstLaunch();
            
            // Auto-onboarding for missing subjects
            setTimeout(() => {
                const savedSubjects = CLIENT_STORE.getItem("gazi_student_subjects");
                let hasSubjects = false;
                try {
                    hasSubjects = savedSubjects && JSON.parse(savedSubjects).length > 0;
                } catch(e) {}
                
                if (!hasSubjects) {
                    window.openSubjectSelectionPanel();
                    alert("👋 Uygulamaya hoş geldin! Kütüphaneni oluşturabilmemiz için lütfen önce sorumlu olduğun dersleri seç.");
                }
            }, 1000);
        }"""

if old_logic in js:
    js = js.replace(old_logic, new_logic)
    print("Added onboarding logic")
else:
    # Try another string to match
    print("Could not find the hook for onboarding")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(js)
