/**
 * Kullanıcı Arayüzü Yardımcı Araçları (UI Utilities Module)
 *
 * Debounce/throttle, skeleton loader, sayfa geçişleri ve
 * erişilebilirlik yardımcılarını içerir.
 */

/**
 * Fonksiyonu belirtilen gecikmeyle geciktiren debounce.
 * Örn: input olaylarını throttle etmek için.
 * @param {Function} fn
 * @param {number} delayMs
 * @returns {Function}
 */
export function debounce(fn, delayMs) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delayMs);
    };
}

/**
 * Fonksiyonu belirli aralıklarla en fazla bir kere çağıran throttle.
 * Örn: scroll veya resize olaylarını sınırlamak için.
 * @param {Function} fn
 * @param {number} intervalMs
 * @returns {Function}
 */
export function throttle(fn, intervalMs) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= intervalMs) {
            lastCall = now;
            return fn.apply(this, args);
        }
    };
}

/**
 * Bir kart/liste öğesi için skeleton loader HTML'i oluşturur.
 * Veri yüklenirken yer tutucu göstermek için kullanılır.
 * @param {number} [count=3] - Gösterilecek skeleton kart sayısı
 * @returns {string} HTML string
 */
export function buildSkeletonLoaderHTML(count = 3) {
    const card = `
        <div class="skeleton-card" aria-hidden="true">
            <div class="skeleton-line skeleton-line--title"></div>
            <div class="skeleton-line skeleton-line--body"></div>
            <div class="skeleton-line skeleton-line--body skeleton-line--short"></div>
            <div class="skeleton-image"></div>
        </div>`;
    return Array.from({ length: count }, () => card).join('');
}

/**
 * Bir HTML elementine skeleton loader gösterir.
 * @param {HTMLElement} container
 * @param {number} [count=3]
 */
export function showSkeletonLoader(container, count = 3) {
    if (!container) return;
    container.innerHTML = buildSkeletonLoaderHTML(count);
}

/**
 * Uzun listeler için sanal kaydırma yardımcısı.
 * Yalnızca görünür öğeleri render eder.
 *
 * @param {HTMLElement} container - Kaydırma kapsayıcısı
 * @param {Array} items           - Tüm veri öğeleri
 * @param {Function} renderItem   - (item, index) => HTMLString
 * @param {number} [itemHeight=80]- Tahmini öğe yüksekliği (px)
 */
export function renderVirtualList(container, items, renderItem, itemHeight = 80) {
    if (!container || !Array.isArray(items)) return;

    const totalHeight = items.length * itemHeight;
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight || window.innerHeight;

    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const endIdx = Math.min(items.length - 1, Math.ceil((scrollTop + viewportHeight) / itemHeight) + 2);

    const visibleHTML = items
        .slice(startIdx, endIdx + 1)
        .map((item, i) => renderItem(item, startIdx + i))
        .join('');

    container.innerHTML = `
        <div style="height:${startIdx * itemHeight}px;" aria-hidden="true"></div>
        ${visibleHTML}
        <div style="height:${(items.length - endIdx - 1) * itemHeight}px;" aria-hidden="true"></div>`;
}

/**
 * Sayfada yumuşak geçiş animasyonu uygular.
 * @param {HTMLElement} el - Animasyon uygulanacak element
 * @param {string} [className='fade-in'] - CSS sınıfı
 */
export function applyFadeIn(el, className = 'fade-in') {
    if (!el) return;
    el.classList.remove(className);
    // Reflow tetikle
    void el.offsetWidth;
    el.classList.add(className);
}

/**
 * Klavye navigasyonu için odaklanabilir öğeleri döndürür.
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
export function getFocusableElements(container) {
    return Array.from(
        (container || document).querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
    );
}
