export function buildRelativeResourceUrl(resourcePath = '') {
    const normalized = String(resourcePath || '')
        .trim()
        .replace(/^\.?\/*/, '');
    return normalized ? `./${normalized}` : './';
}

export function shouldRegisterServiceWorker(protocol = '') {
    return protocol === 'https:' || protocol === 'http:';
}

export function getShareableAppLink(locationLike, fallbackUrl = 'https://gazililer.com.tr') {
    const origin = String(locationLike?.origin || '').trim();
    if (!origin || origin === 'null') return fallbackUrl;
    if (origin.startsWith('file:') || origin.startsWith('capacitor:') || origin.startsWith('ionic:')) {
        return fallbackUrl;
    }
    return origin;
}
