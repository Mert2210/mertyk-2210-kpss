import sys
import re

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

# Fix handleGuestLogin
js = re.sub(
    r"await updateProfile\(res\.user, \{ displayName: guestName \+ \"\|student\" \}\);\s*location\.reload\(\);",
    r"await updateProfile(res.user, { displayName: guestName + \"|student\" });",
    js
)

# Fix syncSocketUserContext role logic in onAuthStateChanged
old_auth_state = """        const customTokenClaims = await user.getIdTokenResult();
        const role = customTokenClaims.claims.role || "student";
        const isTeacher = (role === "teacher") || isLocalTeacher(user.email);
        const isAdmin = user.email === "mertyk@gmail.com";
        const realName = nameFromAuth.split('|')[0]; 
        
        document.getElementById('display-user').innerText = "Hoş Geldin, " + realName; 
        
        if (socket) {
            syncSocketUserContext(user, role, realName);"""

new_auth_state = """        const customTokenClaims = await user.getIdTokenResult();
        const role = customTokenClaims.claims.role || "student";
        const isTeacher = (role === "teacher") || isLocalTeacher(user.email);
        const isAdmin = user.email === "mertyk@gmail.com";
        const realName = nameFromAuth.split('|')[0]; 
        
        document.getElementById('display-user').innerText = "Hoş Geldin, " + realName; 
        
        if (socket) {
            syncSocketUserContext(user, isTeacher ? "teacher" : "student", realName);"""

js = js.replace(old_auth_state, new_auth_state)

# If it didn't match perfectly, fallback regex:
if old_auth_state not in js:
    js = re.sub(
        r"syncSocketUserContext\(user,\s*role,\s*realName\);",
        r"syncSocketUserContext(user, isTeacher ? 'teacher' : 'student', realName);",
        js
    )

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Fixed guest login reload and teacher role context.")
