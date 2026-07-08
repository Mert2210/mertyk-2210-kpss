import sys

index_path = "index.js"
with open(index_path, "r", encoding="utf-8") as f:
    js = f.read()

# 1. Update joinClass to send push notification
old_join = """    socket.on("joinClass", ({ code, studentName }) => {
        if (typeof code !== 'string' || typeof studentName !== 'string') return socket.emit("classJoined", { success: false });
        const safeCode = sanitizeString(code, 20).toUpperCase();
        const safeName = sanitizeString(studentName, 100);
        if (!safeCode || !safeName) return socket.emit("classJoined", { success: false });
        const classes = readClasses();
        if (classes[safeCode]) {
            if (!classes[safeCode].students.find(s => s.name === safeName)) {
                classes[safeCode].students.push({ name: safeName, joinedAt: new Date().toLocaleString('tr-TR') });
                writeClasses(classes);
            }
            socket.emit("classJoined", { success: true, name: classes[safeCode].name });
        } else {
            socket.emit("classJoined", { success: false });
        }
    });"""

new_join = """    socket.on("joinClass", ({ code, studentName }) => {
        if (typeof code !== 'string' || typeof studentName !== 'string') return socket.emit("classJoined", { success: false });
        const safeCode = sanitizeString(code, 20).toUpperCase();
        const safeName = sanitizeString(studentName, 100);
        if (!safeCode || !safeName) return socket.emit("classJoined", { success: false });
        const classes = readClasses();
        if (classes[safeCode]) {
            if (!classes[safeCode].students.find(s => s.name === safeName)) {
                classes[safeCode].students.push({ name: safeName, joinedAt: new Date().toLocaleString('tr-TR') });
                writeClasses(classes);
                sendPushNotification("teacher_" + safeCode, "Yeni Öğrenci Katıldı!", `${safeName} adlı öğrenci sınıfınıza katıldı.`);
            }
            socket.emit("classJoined", { success: true, name: classes[safeCode].name, code: safeCode });
        } else {
            socket.emit("classJoined", { success: false });
        }
    });"""

js = js.replace(old_join, new_join)

# 2. Add renameClass and deleteClass
rename_delete_logic = """
    socket.on("renameClass", ({ oldCode, newName }) => {
        if (!ensureTeacher(socket)) return;
        const classes = readClasses();
        const safeOldCode = sanitizeString(oldCode, 20).toUpperCase();
        const safeNewName = sanitizeString(newName, 50);
        if (classes[safeOldCode] && classes[safeOldCode].createdBy === currentUser(socket).name) {
            classes[safeOldCode].name = safeNewName;
            writeClasses(classes);
            socket.emit("successMsg", "Sınıf adı başarıyla güncellendi.");
            const myClasses = {};
            for (const c in classes) { if (classes[c].createdBy === currentUser(socket).name) myClasses[c] = classes[c]; }
            socket.emit("teacherClassesData", myClasses);
        }
    });

    socket.on("deleteClass", ({ code, deleteQuestions }) => {
        if (!ensureTeacher(socket)) return;
        const classes = readClasses();
        const safeCode = sanitizeString(code, 20).toUpperCase();
        if (classes[safeCode] && classes[safeCode].createdBy === currentUser(socket).name) {
            delete classes[safeCode];
            writeClasses(classes);
            
            if (deleteQuestions && db) {
                db.collection('gazi_questions').where('classCode', '==', safeCode).get().then(snapshot => {
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    batch.commit();
                }).catch(err => console.error("Soruları silerken hata:", err));
            }

            socket.emit("successMsg", "Sınıf kalıcı olarak silindi.");
            const myClasses = {};
            for (const c in classes) { if (classes[c].createdBy === currentUser(socket).name) myClasses[c] = classes[c]; }
            socket.emit("teacherClassesData", myClasses);
        }
    });
"""

if "renameClass" not in js:
    # insert before createClass
    js = js.replace('socket.on("createClass"', rename_delete_logic + '\n    socket.on("createClass"')

with open(index_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Updated index.js with class management and push notifications.")
