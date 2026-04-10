self.OFFLINE_HTML = '<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Çevrimdışı</title></head><body><h3>Çevrimdışısınız</h3><p>Lütfen internet bağlantınızı kontrol edin.</p></body></html>';

self.addEventListener('install', (e) => {
    console.log('[Service Worker] Kuruldu');
    self.skipWaiting();
});
self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request).catch(() => {
            if (e.request.mode === 'navigate') {
                return new Response(
                    self.OFFLINE_HTML,
                    { headers: { 'Content-Type': 'text/html; charset=UTF-8' }, status: 200 }
                );
            }
            return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
});
