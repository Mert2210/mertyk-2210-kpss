import sys
import re

with open("index.js", "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# Helper function string to insert
auth_helper = """
// --- SECURITY AUTHENTICATION MIDDLEWARE ---
function isAuthorizedForStudent(socket, studentName) {
    if (!socket.data || !socket.data.user) return false;
    const u = socket.data.user;
    if (u.isAdmin) return true;
    if (u.role === "teacher" && u.isVerified) return true; // Teachers can view
    return String(u.name).trim() === String(studentName).trim();
}

function isAuthorizedForTeacherClass(socket, classCode) {
    if (!socket.data || !socket.data.user) return false;
    const u = socket.data.user;
    if (u.isAdmin) return true;
    if (u.role === "teacher" && u.isVerified) return true; // Assuming any verified teacher can access for now
    return false;
}
"""

# Insert auth helper at the top before io.on
js = js.replace("io.on(\"connection\", (socket) => {", auth_helper + "\nio.on(\"connection\", (socket) => {")

# Protect getStudentLibrary
pattern = r'(socket\.on\("getStudentLibrary", async \(\{ studentName, onlyReviews \}\) => \{)'
replacement = r'\1\n        if (!isAuthorizedForStudent(socket, studentName)) return socket.emit("error", "Yetkisiz erisim (getStudentLibrary).");'
js = re.sub(pattern, replacement, js)

# Protect deleteStudentQuestion
pattern = r'(socket\.on\("deleteStudentQuestion", async \(\{ questionId, studentName \}\) => \{)'
replacement = r'\1\n        if (!isAuthorizedForStudent(socket, studentName)) return socket.emit("error", "Yetkisiz erisim (deleteStudentQuestion).");'
js = re.sub(pattern, replacement, js)

# Protect addStudentQuestion
pattern = r'(socket\.on\("addStudentQuestion", async \(q\) => \{)'
replacement = r'\1\n        if (!q || !isAuthorizedForStudent(socket, q.studentName)) return socket.emit("error", "Yetkisiz erisim (addStudentQuestion).");'
js = re.sub(pattern, replacement, js)

# Protect getMyStats
pattern = r'(socket\.on\("getMyStats", async \(studentName\) => \{)'
replacement = r'\1\n        if (!isAuthorizedForStudent(socket, studentName)) return socket.emit("error", "Yetkisiz erisim (getMyStats).");'
js = re.sub(pattern, replacement, js)

# Protect saveStudentResult
pattern = r'(socket\.on\("saveStudentResult", async \(data\) => \{)'
replacement = r'\1\n        if (!data || !isAuthorizedForStudent(socket, data.studentName)) return socket.emit("error", "Yetkisiz erisim (saveStudentResult).");'
js = re.sub(pattern, replacement, js)

# Protect deleteTeacherQuestion
pattern = r'(socket\.on\("deleteTeacherQuestion", async \(\{ classCode, questionId, questionText \}\) => \{)'
replacement = r'\1\n        if (!isAuthorizedForTeacherClass(socket, classCode)) return socket.emit("error", "Yetkisiz erisim (deleteTeacherQuestion).");'
js = re.sub(pattern, replacement, js)

# Protect getTeacherLibrary
pattern = r'(socket\.on\("getTeacherLibrary", async \(classCode\) => \{)'
replacement = r'\1\n        if (!isAuthorizedForTeacherClass(socket, classCode)) return socket.emit("error", "Yetkisiz erisim (getTeacherLibrary).");'
js = re.sub(pattern, replacement, js)


with open("index.js", "w", encoding="utf-8") as f:
    f.write(js)
print("Auth checks applied to index.js")
