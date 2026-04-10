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
                    '<!doctype html><html><body><h3>Çevrimdışısınız</h3><p>Lütfen internet bağlantınızı kontrol edin.</p></body></html>',
                    { headers: { 'Content-Type': 'text/html; charset=UTF-8' }, status: 200 }
                );
            }
            return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
});
