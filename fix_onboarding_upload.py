import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

# 1. Bypass Onboarding in Auth Listener
old_auth_check = """        const onboardingDone = CLIENT_STORE.getItem('gazi_onboarding_done', '');
        if(!isTeacher && !onboardingDone) {
            const hasSeenIntro = CLIENT_STORE.getItem('gazi_intro_seen', '');
            if(!hasSeenIntro) { 
                document.getElementById('intro-overlay').style.display = 'flex'; 
            } else { 
                window.openFirstRunOnboarding();
            }
        } else { 
            window.showScreen('screen-main'); 
        }"""

new_auth_check = """        CLIENT_STORE.setItem('gazi_onboarding_done', 'true');
        CLIENT_STORE.setItem('gazi_intro_seen', 'true');
        window.showScreen('screen-main');"""

js = js.replace(old_auth_check, new_auth_check)

# 2. Fix the missing new-q-sol-text in uploadQuestion
old_upload_var = """    const qDogru = parseInt(document.getElementById('new-q-correct').value) || 0; 
    const qSolText = document.getElementById('new-q-sol-text').value.trim();"""

new_upload_var = """    const qDogru = parseInt(document.getElementById('new-q-correct')?.value) || 0; 
    const solTextEl = document.getElementById('new-q-sol-text');
    const qSolText = solTextEl ? solTextEl.value.trim() : "";"""

js = js.replace(old_upload_var, new_upload_var)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Applied Onboarding Bypass and Upload Fix")
