/**
 * Sunucu Tarafı Görsel Optimizasyon Servisi
 *
 * Sharp.js kullanarak sunucuya gelen base64 görsel verilerini
 * Supabase'e yüklemeden önce sıkıştırır ve optimize eder.
 *
 * Bağımlılık: sharp (npm install sharp)
 *
 * Kullanım:
 *   const { optimizeImageBuffer } = require('./services/image-optimization');
 *   const result = await optimizeImageBuffer(buffer, { maxWidth: 1280, quality: 80 });
 */

const { recordCompression, recordError } = require('./optimization-metrics');

/** Desteklenen çıktı formatları */
const SUPPORTED_FORMATS = ['jpeg', 'png', 'webp'];

/**
 * Varsayılan optimizasyon ayarları.
 * Soru/çözüm görselleri için dengeli kalite/boyut oranı hedefler.
 */
const DEFAULT_OPTIONS = Object.freeze({
    maxWidth: 1024,
    quality: 75,
    format: 'jpeg',
    targetBytes: 300 * 1024
});

/**
 * Sharp.js paketini geç yükleme (lazy load) ile alır.
 * Paket yüklü değilse null döner; çağıran kod gracefully devam eder.
 * @returns {object|null}
 */
function getSharp() {
    try {
        return require('sharp');
    } catch {
        return null;
    }
}

/**
 * Verilen Buffer'ı Sharp.js ile sıkıştırır.
 *
 * - maxWidth kadar genişliği düşürür (en-boy oranını korur).
 * - targetBytes hedefine ulaşana dek kaliteyi kademeli olarak düşürür.
 * - sharp mevcut değilse orijinal buffer'ı olduğu gibi döner.
 *
 * @param {Buffer} inputBuffer - Ham görsel verisi
 * @param {object} [options]   - DEFAULT_OPTIONS alanlarını geçersiz kılar
 * @returns {Promise<{ buffer: Buffer, format: string, bytesBefore: number, bytesAfter: number, compressionRatio: number }>}
 */
async function optimizeImageBuffer(inputBuffer, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const bytesBefore = inputBuffer.length;
    const startTime = Date.now();

    const sharp = getSharp();
    if (!sharp) {
        // sharp yüklü değil; sıkıştırma atlanır
        return {
            buffer: inputBuffer,
            format: opts.format,
            bytesBefore,
            bytesAfter: bytesBefore,
            compressionRatio: 0
        };
    }

    const fmt = SUPPORTED_FORMATS.includes(opts.format) ? opts.format : 'jpeg';

    try {
        let pipeline = sharp(inputBuffer).rotate(); // EXIF yönlendirmesini uygula

        // Gerekirse boyutu küçült
        if (opts.maxWidth > 0) {
            pipeline = pipeline.resize({ width: opts.maxWidth, withoutEnlargement: true });
        }

        // İlk geçiş: belirtilen kaliteyle sıkıştır
        let quality = Math.min(100, Math.max(10, opts.quality));
        let outputBuffer = await pipeline.clone()[fmt]({ quality }).toBuffer();

        // Hedef boyut aşıldıysa kaliteyi kademeli düşür
        const targetBytes = opts.targetBytes || 0;
        if (targetBytes > 0 && outputBuffer.length > targetBytes) {
            for (let q = quality - 10; q >= 40 && outputBuffer.length > targetBytes; q -= 10) {
                outputBuffer = await pipeline.clone()[fmt]({ quality: q }).toBuffer();
            }
        }

        const bytesAfter = outputBuffer.length;
        const durationMs = Date.now() - startTime;
        const compressionRatio = bytesBefore > 0
            ? Math.round((1 - bytesAfter / bytesBefore) * 100)
            : 0;

        recordCompression(bytesBefore, bytesAfter, durationMs);

        return { buffer: outputBuffer, format: fmt, bytesBefore, bytesAfter, compressionRatio };
    } catch (err) {
        recordError();
        // Sıkıştırma başarısız; orijinal buffer'ı döndür
        return {
            buffer: inputBuffer,
            format: opts.format,
            bytesBefore,
            bytesAfter: bytesBefore,
            compressionRatio: 0
        };
    }
}

/**
 * Base64 data URL'ini alır, Buffer'a çevirir, sıkıştırır ve
 * yeni bir base64 data URL olarak döndürür.
 *
 * @param {string} dataUrl    - "data:image/...;base64,..." formatında string
 * @param {object} [options]  - optimizeImageBuffer() seçenekleri
 * @returns {Promise<string>} Sıkıştırılmış data URL (hata durumunda orijinal döner)
 */
async function optimizeImageDataUrl(dataUrl, options = {}) {
    if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return dataUrl;

    const inputBuffer = Buffer.from(match[2], 'base64');
    const result = await optimizeImageBuffer(inputBuffer, options);
    return `data:image/${result.format};base64,${result.buffer.toString('base64')}`;
}

module.exports = {
    optimizeImageBuffer,
    optimizeImageDataUrl,
    DEFAULT_OPTIONS,
    SUPPORTED_FORMATS
};
