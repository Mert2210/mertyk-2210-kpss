/**
 * Görsel İşleme Modülü (Image Handler Module)
 *
 * Görsel yükleme, önizleme ve Supabase Storage yönetimine ait
 * yardımcı fonksiyonları içerir.
 *
 * Temel görsel sıkıştırma mantığı için:
 *   public/utils/image-optimizer.js
 */

export {
    compressImageDataUrl,
    compressImageFile,
    IMAGE_OPTIMIZER_DEFAULT_CONFIG,
    SOURCE_IMAGE_OPTIMIZER_CONFIG,
    initLazyImageLoading,
} from '../utils/image-optimizer.js';

/**
 * Güvenli resim src değeri döndürür.
 * Geçersiz/tehlikeli src değerlerini boş string ile değiştirir.
 * @param {string} src
 * @returns {string}
 */
export function safeImageSrc(src) {
    if (typeof src !== 'string') return '';
    if (/^data:image\/(jpeg|png|gif|webp);base64,/.test(src)) return src;
    if (/^https?:\/\//.test(src)) return src;
    return '';
}

/**
 * Data URL'inden dosya uzantısını çıkarır.
 * @param {string} dataUrl
 * @returns {string} 'webp' | 'jpg' | 'png' | 'gif'
 */
export function getImageExtensionFromDataUrl(dataUrl) {
    const match = /^data:image\/(jpeg|png|gif|webp);base64,/.exec(dataUrl || '');
    if (!match) return 'jpg';
    if (match[1] === 'jpeg') return 'jpg';
    return match[1];
}

/**
 * Base64 data URL'ini Blob nesnesine dönüştürür.
 * @param {string} dataUrl
 * @returns {Blob}
 */
export function base64ToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}
