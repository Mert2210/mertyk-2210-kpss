export function normalizeTopicFilterMode(mode) {
    return mode === 'all' ? 'all' : 'saved';
}

export function getAllowedTopicsForMode(allTopics = [], savedTopicsSet = null, mode = 'saved') {
    const safeTopics = Array.isArray(allTopics) ? allTopics : [];
    if (normalizeTopicFilterMode(mode) === 'all') return safeTopics;
    return safeTopics.filter((topic) => savedTopicsSet && savedTopicsSet.has(topic));
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
