/**
 * Oyun/Deneme Mekanikleri Modülü (Game Handler Module)
 *
 * Deneme sınavı, oda tabanlı quiz ve puanlama mekanizmalarına
 * ait yardımcı fonksiyonlar.
 *
 * Not: Temel oyun/deneme akışı public/app.js içindedir.
 * Bu modül, bağımsız test edilebilir saf fonksiyonları içerir.
 */

/**
 * Cevabın doğru olup olmadığını kontrol eder.
 * @param {number} selected  - Kullanıcının seçtiği şık indeksi (0-4)
 * @param {number} correct   - Doğru cevabın indeksi (0-4)
 * @returns {'correct'|'wrong'|'blank'}
 */
export function evalAnswer(selected, correct) {
    if (selected === null || selected === undefined || selected < 0) return 'blank';
    return Number(selected) === Number(correct) ? 'correct' : 'wrong';
}

/**
 * Zamana bağlı bonus puan hesaplar.
 * Hızlı cevaplara ekstra puan verilir.
 * @param {number} baseScore        - Temel puan
 * @param {number} elapsedSeconds   - Geçen süre (saniye)
 * @param {number} timeLimitSeconds - Toplam süre sınırı
 * @returns {number} Hesaplanan puan
 */
export function calcEarnedPoints(baseScore, elapsedSeconds, timeLimitSeconds) {
    const safeBase = Math.max(0, Number(baseScore) || 0);
    const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const safeLimit = Math.max(1, Number(timeLimitSeconds) || 1);
    const ratio = Math.min(1, safeElapsed / safeLimit);
    const bonus = Math.round(safeBase * (1 - ratio));
    return safeBase + bonus;
}

/**
 * KPSS net puanını hesaplar (4 yanlış 1 doğruyu götürür).
 * @param {number} correct
 * @param {number} wrong
 * @returns {number}
 */
export function calcKPSSNet(correct, wrong) {
    const c = Math.max(0, Number(correct) || 0);
    const w = Math.max(0, Number(wrong) || 0);
    return Math.max(0, c - w / 4);
}

/**
 * Deneme sonuçlarını özetler.
 * @param {Array<number|null>} answers  - Kullanıcı cevapları (null = boş)
 * @param {Array<{dogru: number}>} questions
 * @returns {{ correct: number, wrong: number, blank: number, net: number }}
 */
export function summarizeTrialResults(answers, questions) {
    if (!Array.isArray(answers) || !Array.isArray(questions)) {
        return { correct: 0, wrong: 0, blank: 0, net: 0 };
    }
    let correct = 0, wrong = 0, blank = 0;
    answers.forEach((ans, i) => {
        const result = evalAnswer(ans, questions[i]?.dogru);
        if (result === 'correct') correct++;
        else if (result === 'wrong') wrong++;
        else blank++;
    });
    return { correct, wrong, blank, net: calcKPSSNet(correct, wrong) };
}

/**
 * Shuffle (karıştırma) algoritması - Fisher-Yates.
 * @param {Array} arr
 * @returns {Array} Yeni karıştırılmış dizi
 */
export function shuffleArray(arr) {
    if (!Array.isArray(arr)) return [];
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
