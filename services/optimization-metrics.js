/**
 * Optimizasyon Metrikleri Servisi
 *
 * Sunucu tarafında gerçekleştirilen görsel sıkıştırma işlemlerine ait
 * istatistikleri toplar ve raporlar.
 */

const metrics = {
    totalProcessed: 0,
    totalBytesBefore: 0,
    totalBytesAfter: 0,
    totalDurationMs: 0,
    errors: 0
};

/**
 * Bir sıkıştırma işleminin sonuçlarını kaydeder.
 * @param {number} bytesBefore - Sıkıştırma öncesi bayt sayısı
 * @param {number} bytesAfter  - Sıkıştırma sonrası bayt sayısı
 * @param {number} durationMs  - Geçen süre (milisaniye)
 */
function recordCompression(bytesBefore, bytesAfter, durationMs) {
    metrics.totalProcessed++;
    metrics.totalBytesBefore += bytesBefore;
    metrics.totalBytesAfter += bytesAfter;
    metrics.totalDurationMs += durationMs;
}

/**
 * Bir hata oluştuğunda sayacı artırır.
 */
function recordError() {
    metrics.errors++;
}

/**
 * Anlık metrik özetini döndürür.
 * @returns {{ totalProcessed: number, totalBytesBefore: number, totalBytesAfter: number, averageCompressionRatio: number, averageDurationMs: number, errors: number }}
 */
function getMetricsSummary() {
    const ratio = metrics.totalBytesBefore > 0
        ? Math.round((1 - metrics.totalBytesAfter / metrics.totalBytesBefore) * 100)
        : 0;
    const avgDuration = metrics.totalProcessed > 0
        ? Math.round(metrics.totalDurationMs / metrics.totalProcessed)
        : 0;
    return {
        totalProcessed: metrics.totalProcessed,
        totalBytesBefore: metrics.totalBytesBefore,
        totalBytesAfter: metrics.totalBytesAfter,
        averageCompressionRatio: ratio,
        averageDurationMs: avgDuration,
        errors: metrics.errors
    };
}

/**
 * Metrikleri sıfırlar (test/bakım amaçlı).
 */
function resetMetrics() {
    metrics.totalProcessed = 0;
    metrics.totalBytesBefore = 0;
    metrics.totalBytesAfter = 0;
    metrics.totalDurationMs = 0;
    metrics.errors = 0;
}

module.exports = {
    recordCompression,
    recordError,
    getMetricsSummary,
    resetMetrics
};
