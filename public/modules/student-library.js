/**
 * Öğrenci Kütüphanesi Modülü (Student Library Module)
 *
 * Öğrenci kütüphanesi verilerinin filtrelenmesi, sıralanması
 * ve görüntülenmesine ait yardımcı fonksiyonlar.
 *
 * Not: UI bağımlı kütüphane mantığı public/app.js içindedir.
 * Bu modül, bağımsız test edilebilir saf fonksiyonları içerir.
 */

/**
 * Soru nesnesinin geçerli olup olmadığını kontrol eder.
 * @param {object} q
 * @returns {boolean}
 */
export function isValidQuestion(q) {
    if (!q || typeof q !== 'object') return false;
    return !!(q.konu || q.soru || q.image || q.not);
}

/**
 * Soruları ders ve konuya göre filtreler.
 * @param {Array} questions
 * @param {{ subject?: string, topic?: string }} filter
 * @returns {Array}
 */
export function filterQuestions(questions, filter = {}) {
    if (!Array.isArray(questions)) return [];
    return questions.filter((q) => {
        if (filter.subject && q.ders !== filter.subject) return false;
        if (filter.topic && q.konu !== filter.topic) return false;
        return true;
    });
}

/**
 * Soruları nextReviewDate'e göre sıralar (yakın tarih önce).
 * @param {Array} questions
 * @returns {Array}
 */
export function sortByReviewDate(questions) {
    if (!Array.isArray(questions)) return [];
    return [...questions].sort((a, b) => {
        const aDate = Number(a.nextReviewDate) || 0;
        const bDate = Number(b.nextReviewDate) || 0;
        return aDate - bDate;
    });
}

/**
 * Bugün tekrar edilmesi gereken soruların sayısını döndürür.
 * @param {Array} questions
 * @returns {number}
 */
export function countDueQuestions(questions) {
    if (!Array.isArray(questions)) return 0;
    const now = Date.now();
    return questions.filter((q) => Number(q.nextReviewDate || 0) <= now).length;
}

/**
 * Soruları derse göre gruplar.
 * @param {Array} questions
 * @returns {Object} { [ders]: Question[] }
 */
export function groupBySubject(questions) {
    if (!Array.isArray(questions)) return {};
    return questions.reduce((acc, q) => {
        const key = String(q.ders || 'Genel');
        if (!acc[key]) acc[key] = [];
        acc[key].push(q);
        return acc;
    }, {});
}
