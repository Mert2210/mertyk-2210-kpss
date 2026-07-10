import sys
import re

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

# 1. Add Loading UI to fetchStudentLibrary
old_fetch = """window.fetchStudentLibrary = (source = 'cloud', onlyReviews = false) => {
    if (!window.pendingLibraryFilter) window.libraryViewingTopicPath = null;
    if(source === 'cloud') {"""

new_fetch = """window.fetchStudentLibrary = (source = 'cloud', onlyReviews = false) => {
    window.showSoftFeedback("Sorular yükleniyor...", "info", 1500);
    if (!window.pendingLibraryFilter) window.libraryViewingTopicPath = null;
    if(source === 'cloud') {"""

js = js.replace(old_fetch, new_fetch)

# 2. Make "Masamı ve Ayarlarımı Kaydet" optional (Auto-populate library if empty)
old_render = """    const savedSubjects = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    const selectedSubjects = getSavedLibraryCourseNames(savedSubjects);
    if (selectedSubjects.length === 0) {
        listEl.innerHTML = '<p class="derslerim-empty-text">Henüz kütüphanede ders bulunmuyor.</p>';
        return;
    }"""

new_render = """    const savedSubjects = CLIENT_STORE.getJSON('gazi_subjects_v2', []) || [];
    let selectedSubjects = getSavedLibraryCourseNames(savedSubjects);
    if (selectedSubjects.length === 0) {
        const activeExam = getCurrentExamType();
        const baseSubjects = getCurriculumSubjectsByExamType(activeExam);
        const customSubjects = getCustomCurriculumSubjectsByExamType(activeExam);
        selectedSubjects = uniqueSubjects([...baseSubjects, ...customSubjects]);
    }
    if (selectedSubjects.length === 0) {
        listEl.innerHTML = '<p class="derslerim-empty-text">Henüz kütüphanede ders bulunmuyor.</p>';
        return;
    }"""

js = js.replace(old_render, new_render)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Applied UX fixes for unresponsiveness and optional desk saving.")
