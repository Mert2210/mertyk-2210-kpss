/**
 * Öğretmen Paneli Modülü (Teacher Panel Module)
 *
 * Öğretmen paneline ait soru yönetimi ve sınıf istatistiklerine
 * yönelik yardımcı fonksiyonlar.
 *
 * Not: Temel öğretmen akışı public/app.js içindedir.
 * Bu modül, bağımsız test edilebilir saf fonksiyonları içerir.
 */

/**
 * Soru nesnesini yükleme için doğrular.
 * @param {{ ders?: string, konu?: string, image?: string, soru?: string }} q
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateTeacherQuestion(q) {
    if (!q || typeof q !== 'object') {
        return { valid: false, reason: 'Soru nesnesi geçersiz.' };
    }
    if (!q.ders || String(q.ders).trim() === '') {
        return { valid: false, reason: 'Ders alanı boş bırakılamaz.' };
    }
    if (!q.konu || String(q.konu).trim() === '') {
        return { valid: false, reason: 'Konu alanı boş bırakılamaz.' };
    }
    if (!q.image && !q.soru) {
        return { valid: false, reason: 'En az bir görsel veya soru metni gereklidir.' };
    }
    return { valid: true };
}

/**
 * Sınıf istatistiklerini (doğru/yanlış/boş/puan) hesaplar.
 * @param {Array<{ correct: number, wrong: number, blank: number, score: number }>} history
 * @returns {{ totalExams: number, totalCorrect: number, totalWrong: number, totalBlank: number, avgScore: number, successRate: number }}
 */
export function calcClassStats(history) {
    if (!Array.isArray(history) || history.length === 0) {
        return { totalExams: 0, totalCorrect: 0, totalWrong: 0, totalBlank: 0, avgScore: 0, successRate: 0 };
    }
    let totalCorrect = 0, totalWrong = 0, totalBlank = 0, totalScore = 0;
    history.forEach((r) => {
        totalCorrect += Number(r.correct) || 0;
        totalWrong += Number(r.wrong) || 0;
        totalBlank += Number(r.blank) || 0;
        totalScore += Number(r.score) || 0;
    });
    const totalQs = totalCorrect + totalWrong + totalBlank;
    return {
        totalExams: history.length,
        totalCorrect,
        totalWrong,
        totalBlank,
        avgScore: history.length > 0 ? Math.round(totalScore / history.length) : 0,
        successRate: totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0,
    };
}

/**
 * Sınıf kodunun geçerli formatta olup olmadığını kontrol eder.
 * @param {string} code
 * @returns {boolean}
 */
export function isValidClassCode(code) {
    if (typeof code !== 'string') return false;
    const trimmed = code.trim();
    return trimmed.length >= 3 && trimmed.length <= 20;
}
