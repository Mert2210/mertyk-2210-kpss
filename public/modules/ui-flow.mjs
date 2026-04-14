export function normalizeTopicFilterMode(mode) {
    return mode === 'all' ? 'all' : 'saved';
}

export function getAllowedTopicsForMode(allTopics = [], savedTopicsSet = null, mode = 'saved') {
    const safeTopics = Array.isArray(allTopics) ? allTopics : [];
    if (normalizeTopicFilterMode(mode) === 'all') return safeTopics;
    return safeTopics.filter((topic) => savedTopicsSet && savedTopicsSet.has(topic));
}

export function getAllowedTopicsForModalContext(allTopics = [], savedTopicsSet = null, mode = 'saved', modalMode = 'select') {
    const safeTopics = Array.isArray(allTopics) ? allTopics : [];
    const safeModalMode = modalMode === 'view' ? 'view' : 'select';
    if (safeModalMode !== 'view') {
        return {
            topics: safeTopics,
            effectiveMode: 'all',
            usedFallback: false
        };
    }
    const normalizedMode = normalizeTopicFilterMode(mode);
    const filteredTopics = getAllowedTopicsForMode(safeTopics, savedTopicsSet, normalizedMode);
    if (normalizedMode === 'saved' && filteredTopics.length === 0 && safeTopics.length > 0) {
        return {
            topics: safeTopics,
            effectiveMode: 'all',
            usedFallback: true
        };
    }
    return {
        topics: filteredTopics,
        effectiveMode: normalizedMode,
        usedFallback: false
    };
}

export function isStorageRetryLimitExceededError(error) {
    const code = String(error?.code || '').trim().toLowerCase();
    const message = String(error?.message || '').trim().toLowerCase();
    return code === 'storage/retry-limit-exceeded'
        || message.includes('max retry time for operation exceeded');
}

export function buildDerslerimTopicNavigation(subject, topic) {
    const safeSubject = String(subject || '').trim();
    const safeTopic = String(topic || '').trim();
    if (!safeSubject || !safeTopic) return null;
    const path = { subject: safeSubject, topic: safeTopic };
    return {
        libraryViewingTopicPath: path,
        pendingLibraryFilter: path
    };
}

export function canStartLibraryTest(questions) {
    return Array.isArray(questions) && questions.length > 0;
}

export function evaluateStdAnswer(selectedIdx, correctIdx) {
    const safeSelected = Number.isInteger(selectedIdx) ? selectedIdx : -1;
    const safeCorrect = Number.isInteger(correctIdx) ? correctIdx : -1;
    return {
        isCorrect: safeSelected === safeCorrect,
        showSolution: true,
        selectedIndex: safeSelected,
        correctIndex: safeCorrect
    };
}

export function filterCourseNamesByQuery(courseNames = [], query = '') {
    const safeNames = Array.isArray(courseNames) ? courseNames : [];
    const normalizedQuery = String(query || '').trim().toLocaleLowerCase('tr');
    if (!normalizedQuery) return safeNames;
    return safeNames.filter((name) => String(name || '').toLocaleLowerCase('tr').includes(normalizedQuery));
}

export function getNextExpandedCourse(currentExpandedCourse = '', clickedCourse = '') {
    const current = String(currentExpandedCourse || '').trim();
    const clicked = String(clickedCourse || '').trim();
    if (!clicked) return current;
    return current === clicked ? '' : clicked;
}

export function buildSelectedCourseLabel(subjectName = '') {
    const safeSubject = String(subjectName || '').trim();
    return safeSubject
        ? `Seçili Ders: ${safeSubject}`
        : 'Seçili Ders: Henüz seçilmedi';
}

export const DEFAULT_REMINDER_INTERVALS = Object.freeze([1 / 24, 3 / 24, 12 / 24, 1, 3, 7, 15, 30]);

export function formatReminderOptionLabel(daysValue, comparisonEpsilon = 0.001) {
    const safeValue = Number(daysValue);
    if (!Number.isFinite(safeValue) || safeValue <= 0) return '';
    if (safeValue < 1) {
        const hours = safeValue * 24;
        const roundedHours = Math.round(hours);
        if (roundedHours > 0 && Math.abs(hours - roundedHours) <= comparisonEpsilon) {
            return `${roundedHours} saat`;
        }
    }
    const text = Number.isInteger(safeValue) ? String(safeValue) : String(safeValue).replace('.', ',');
    return `${text} gün`;
}

export function mergeSavedSubjectsWithDrafts(savedSubjects = [], drafts = []) {
    const savedList = Array.isArray(savedSubjects) ? savedSubjects : [];
    const draftList = Array.isArray(drafts) ? drafts : [];
    const merged = new Map();

    savedList.forEach((row) => {
        const name = String(row?.name || '').trim();
        if (!name) return;
        merged.set(name, {
            name,
            topics: String(row?.topics || '').trim(),
            selected: row?.selected !== false
        });
    });

    draftList.forEach((row) => {
        const name = String(row?.name || '').trim();
        if (!name) return;
        merged.set(name, {
            name,
            topics: String(row?.topics || '').trim(),
            selected: !!row?.selected
        });
    });

    return Array.from(merged.values());
}

export function buildTopicListFromSources(curriculumTopics = [], userTopics = [], savedTopicsText = '', customTopics = []) {
    const safeCurriculum = Array.isArray(curriculumTopics) ? curriculumTopics : [];
    const safeUserTopics = Array.isArray(userTopics) ? userTopics : [];
    const safeCustomTopics = Array.isArray(customTopics) ? customTopics : [];
    const parsedSavedTopics = String(savedTopicsText || '')
        .split(',')
        .map((topic) => topic.trim())
        .filter(Boolean);
    return Array.from(new Set([
        ...safeCurriculum.map((topic) => String(topic || '').trim()).filter(Boolean),
        ...safeUserTopics.map((topic) => String(topic || '').trim()).filter(Boolean),
        ...parsedSavedTopics,
        ...safeCustomTopics.map((topic) => String(topic || '').trim()).filter(Boolean)
    ])).sort((a, b) => a.localeCompare(b, 'tr'));
}

export function buildSemesterSections(courseNames = []) {
    const safeNames = Array.from(new Set((Array.isArray(courseNames) ? courseNames : [])
        .map((name) => String(name || '').trim())
        .filter(Boolean)));
    if (safeNames.length === 0) return [];
    const splitIndex = Math.ceil(safeNames.length / 2);
    const first = safeNames.slice(0, splitIndex);
    const second = safeNames.slice(splitIndex);
    return [
        { title: '1. Dönem', courses: first },
        { title: '2. Dönem', courses: second }
    ].filter((section) => section.courses.length > 0);
}

export function getSavedLibraryCourseNames(savedSubjects = []) {
    const safeList = Array.isArray(savedSubjects) ? savedSubjects : [];
    const selectedCourses = safeList
        .filter((row) => {
            const hasName = String(row?.name || '').trim() !== '';
            return hasName && (row?.selected || row?.checked);
        })
        .map((row) => String(row.name || '').trim());
    return Array.from(new Set(selectedCourses));
}

export function buildDueReminderCountsBySubject(questions = [], now = Date.now()) {
    const safeQuestions = Array.isArray(questions) ? questions : [];
    const out = {};
    safeQuestions.forEach((question) => {
        const subject = String(question?.ders || '').trim();
        const nextReviewDate = Number(question?.nextReviewDate);
        if (!subject || !Number.isFinite(nextReviewDate) || nextReviewDate > now) return;
        out[subject] = (out[subject] || 0) + 1;
    });
    return out;
}
