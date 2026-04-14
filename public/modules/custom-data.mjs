function uniqueStrings(list = []) {
    return Array.from(new Set(
        (Array.isArray(list) ? list : [])
            .map((value) => String(value || '').trim())
            .filter(Boolean)
    ));
}

function asObject(value) {
    return value && typeof value === 'object' ? value : {};
}

function normalizeExamType(value) {
    return String(value || '').trim();
}

export function resolveCurrentExamType(profileExamTypeValue, storedExamTypeValue, defaultExamType) {
    const selected = normalizeExamType(profileExamTypeValue);
    if (selected) return selected;
    const stored = normalizeExamType(storedExamTypeValue);
    if (stored) return stored;
    return normalizeExamType(defaultExamType);
}

export function getCustomCurriculumGroupsByExamType(customCurriculumMap, examType) {
    const groups = asObject(customCurriculumMap)?.[examType];
    return asObject(groups);
}

export function getCustomCurriculumSubjectsByExamType(customCurriculumMap, examType) {
    return uniqueStrings(
        Object.values(getCustomCurriculumGroupsByExamType(customCurriculumMap, examType))
            .flatMap((groupSubjects) => Object.keys(asObject(groupSubjects)))
    );
}

export function getCustomCurriculumTopicsByExamTypeAndSubject(customCurriculumMap, examType, subject) {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject) return [];
    return uniqueStrings(
        Object.values(getCustomCurriculumGroupsByExamType(customCurriculumMap, examType))
            .flatMap((groupSubjects) => {
                const list = asObject(groupSubjects)?.[safeSubject];
                return Array.isArray(list) ? list : [];
            })
    );
}

export function getCustomTopicsBySubject(customTopicMap, subject) {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject) return [];
    const list = asObject(customTopicMap)?.[safeSubject];
    return Array.isArray(list) ? list : [];
}

export function addCustomTopicsForSubject(customTopicMap, subject, topics = []) {
    const safeSubject = String(subject || '').trim();
    if (!safeSubject) return asObject(customTopicMap);
    const nextMap = { ...asObject(customTopicMap) };
    const existing = Array.isArray(nextMap[safeSubject]) ? nextMap[safeSubject] : [];
    nextMap[safeSubject] = uniqueStrings([...existing, ...(Array.isArray(topics) ? topics : [])]);
    return nextMap;
}

export function mergeSubjectsForExamType(examType, {
    curriculumSubjects = [],
    defaultSubjects = [],
    customSubjects = [],
    savedSubjects = []
} = {}) {
    const safeExamType = normalizeExamType(examType);
    const safeCurriculumSubjects = uniqueStrings(curriculumSubjects);
    const safeDefaultSubjects = uniqueStrings(defaultSubjects);
    const safeCustomSubjects = uniqueStrings(customSubjects);
    const safeSavedSubjects = uniqueStrings(savedSubjects);
    if (safeExamType === 'kpss_a') {
        return uniqueStrings([...safeCurriculumSubjects, ...safeCustomSubjects]);
    }
    return uniqueStrings([
        ...(safeCurriculumSubjects.length > 0 ? safeCurriculumSubjects : safeDefaultSubjects),
        ...safeCustomSubjects,
        ...safeSavedSubjects
    ]);
}
