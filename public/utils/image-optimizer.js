/**
 * Görsel Optimizasyon Aracı (Image Optimizer Utility)
 *
 * Browser tabanlı canvas API kullanarak WebP/JPEG/PNG sıkıştırma ve
 * otomatik boyut optimizasyonu sağlar.
 *
 * Özellikler:
 *  - WebP dönüşümü (desteklenmiyorsa JPEG fallback, son çare PNG)
 *  - Çoklu deneme: kalite ve boyut kademeli düşürme
 *  - Hedef dosya boyutu kontrolü (targetBytes)
 *  - Maksimum genişlik sınırlaması (maxWidth)
 *  - Lazy image loading (IntersectionObserver)
 */

/** Soru/çözüm görselleri için varsayılan optimizasyon ayarları */
export const IMAGE_OPTIMIZER_DEFAULT_CONFIG = Object.freeze({
    maxWidth: 1280,
    minWidth: 720,
    /** Hedef dosya boyutu (byte). Ortalama ~220 KB → bulut kotasını korur. */
    targetBytes: 220 * 1024,
    initialQuality: 0.82,
    minQuality: 0.68,
    qualityStep: 0.04,
    scaleStep: 0.9,
    maxAttempts: 14,
});

/** Kaynakça görselleri için (genellikle metin ağırlıklı → daha küçük hedef) */
export const SOURCE_IMAGE_OPTIMIZER_CONFIG = Object.freeze({
    maxWidth: 1100,
    minWidth: 720,
    targetBytes: 170 * 1024,
    initialQuality: 0.82,
    minQuality: 0.68,
    qualityStep: 0.04,
    scaleStep: 0.9,
    maxAttempts: 14,
});

// ---------------------------------------------------------------------------
// Dahili yardımcı fonksiyonlar
// ---------------------------------------------------------------------------

/**
 * Base64 data URL'inin yaklaşık byte boyutunu hesaplar.
 * @param {string} dataUrl
 * @returns {number}
 */
function _estimateDataUrlBytes(dataUrl) {
    if (typeof dataUrl !== 'string') return 0;
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex < 0) return 0;
    const base64 = dataUrl.slice(commaIndex + 1);
    const paddingMatch = base64.match(/=*$/);
    const padding = paddingMatch ? paddingMatch[0].length : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/**
 * Canvas'ı belirtilen MIME türünde kodlar.
 * Tarayıcı WebP'yi desteklemiyorsa toDataURL farklı bir format döner;
 * bu durumu tespit edip null döndürür (JPEG/PNG fallback için).
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} quality
 * @returns {string|null}
 */
function _tryEncodeCanvas(canvas, mimeType, quality) {
    try {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        return dataUrl.startsWith(`data:${mimeType}`) ? dataUrl : null;
    } catch (_) {
        return null;
    }
}

/**
 * Bir src değerinden Image nesnesi yükler.
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function _loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// ---------------------------------------------------------------------------
// Dışa aktarılan API
// ---------------------------------------------------------------------------

/**
 * Base64 data URL görselini canvas üzerinden sıkıştırır.
 *
 * - Önce WebP, desteklenmiyorsa JPEG, son çare PNG dener.
 * - Hedef boyuta (targetBytes) ulaşana dek kalite ve genişliği kademeli düşürür.
 * - Görsel zaten hedef boyutun altındaysa ek sıkıştırma yapmaz.
 *
 * @param {string} dataUrl   - Base64 image data URL
 * @param {object} [options] - IMAGE_OPTIMIZER_DEFAULT_CONFIG alanlarını geçersiz kılar
 * @returns {Promise<string>} Sıkıştırılmış data URL (başarısız olursa orijinal döner)
 */
export async function compressImageDataUrl(dataUrl, options = {}) {
    if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
    if (!/^data:image\/(jpeg|png|gif|webp);base64,/.test(dataUrl)) return dataUrl;

    const config = { ...IMAGE_OPTIMIZER_DEFAULT_CONFIG, ...(options || {}) };

    // Zaten hedef boyutun altındaysa tekrar sıkıştırmaya gerek yok
    const currentBytes = _estimateDataUrlBytes(dataUrl);
    if (currentBytes > 0 && currentBytes <= config.targetBytes) return dataUrl;

    const image = await _loadImage(dataUrl);

    const baseWidth = Math.max(1, Math.round(Math.min(image.width, config.maxWidth)));
    let width = baseWidth;
    let height = Math.max(1, Math.round((image.height * width) / Math.max(1, image.width)));
    let quality = config.initialQuality;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl; // canvas desteklenmiyor, orijinali döndür

    const redraw = () => {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);
    };
    redraw();

    const FLOAT_EPS = 0.001;
    // Önce kayıplı formatları dene, son çare lossless PNG
    const mimeCandidates = ['image/webp', 'image/jpeg', 'image/png'];
    let bestDataUrl = null;
    let bestBytes = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
        let currentDataUrl = null;
        for (const mimeType of mimeCandidates) {
            const encoded = _tryEncodeCanvas(canvas, mimeType, quality);
            if (encoded) {
                currentDataUrl = encoded;
                break;
            }
        }
        if (!currentDataUrl) break;

        const bytes = _estimateDataUrlBytes(currentDataUrl);
        if (bytes > 0 && bytes < bestBytes) {
            bestBytes = bytes;
            bestDataUrl = currentDataUrl;
        }
        if (bytes > 0 && bytes <= config.targetBytes) break;

        if (quality > config.minQuality + FLOAT_EPS) {
            quality = Math.max(config.minQuality, quality - config.qualityStep);
            continue;
        }

        if (width <= config.minWidth) break;
        width = Math.max(config.minWidth, Math.round(width * config.scaleStep));
        height = Math.max(1, Math.round((image.height * width) / Math.max(1, image.width)));
        quality = config.initialQuality;
        redraw();
    }

    if (!bestDataUrl || !/^data:image\/(webp|jpeg|png)/.test(bestDataUrl)) {
        return dataUrl; // Sıkıştırma başarısız → orijinali döndür
    }

    return bestDataUrl;
}

/**
 * File nesnesini okur ve sıkıştırır.
 *
 * @param {File} file        - Görsel dosyası
 * @param {object} [options] - Optimizasyon ayarları
 * @returns {Promise<string>} Sıkıştırılmış data URL
 */
export async function compressImageFile(file, options = {}) {
    if (!file) return null;
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    if (!dataUrl) throw new Error('Görsel dosyası okunamadı.');
    return compressImageDataUrl(dataUrl, options);
}

/**
 * Sayfa üzerindeki `data-lazy-src` özelliğine sahip img öğelerine
 * IntersectionObserver tabanlı lazy loading uygular.
 *
 * Kullanım: `<img data-lazy-src="url" src="" alt="...">`
 *
 * @param {HTMLElement|Document} [root] - Gözlemlenecek kök element (varsayılan: document)
 * @returns {IntersectionObserver|null}
 */
export function initLazyImageLoading(root) {
    const container = root || document;
    if (typeof IntersectionObserver === 'undefined') {
        // Fallback: IntersectionObserver yoksa hemen yükle
        container.querySelectorAll('img[data-lazy-src]').forEach((img) => {
            img.src = img.dataset.lazySrc;
            img.removeAttribute('data-lazy-src');
        });
        return null;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                const lazySrc = img.dataset.lazySrc;
                if (lazySrc) {
                    img.src = lazySrc;
                    img.removeAttribute('data-lazy-src');
                }
                observer.unobserve(img);
            });
        },
        { rootMargin: '200px 0px', threshold: 0.01 }
    );

    container.querySelectorAll('img[data-lazy-src]').forEach((img) => observer.observe(img));
    return observer;
}
