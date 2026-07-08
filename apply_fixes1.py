import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8", errors="replace") as f:
    js = f.read()

# 1. Onboarding Fix
old_onboard = """                const savedSubjects = CLIENT_STORE.getItem("gazi_student_subjects");
                let hasSubjects = false;
                try {
                    hasSubjects = savedSubjects && JSON.parse(savedSubjects).length > 0;
                } catch(e) {}
                
                if (!hasSubjects) {"""
                
new_onboard = """                const isDone = CLIENT_STORE.getItem("gazi_onboarding_done") === 'true';
                if (!isDone) {"""
                
if old_onboard in js:
    js = js.replace(old_onboard, new_onboard)
    print("Fixed onboarding loop")

# 2. Teacher Auth Alert Fix
old_auth = """        // Ignore teacher privilege warnings silently
        if (safeMsg.includes("öğretmen yetkisi gerekir")) {
            return;
        }"""
        
new_auth = """        // Ignore teacher privilege warnings silently
        if (safeMsg.toLowerCase().includes("yetki") || safeMsg.toLowerCase().includes("yetkisi")) {
            return;
        }"""
        
if old_auth in js:
    js = js.replace(old_auth, new_auth)
    print("Fixed teacher auth alert")

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)
