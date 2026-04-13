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

self.addEventListener('push', (event) => {
    let payload = {};
    if (event.data) {
        try {
            payload = event.data.json();
        } catch (error) {
            payload = { notification: { body: event.data.text() } };
        }
    }
    const notificationPayload = payload.notification || payload.data || {};
    const title = String(notificationPayload.title || 'Gazililer');
    const body = String(notificationPayload.body || 'Yeni bir bildirim var.');
    const url = String(notificationPayload.click_action || payload.fcmOptions?.link || notificationPayload.link || '/');
    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: { url }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = String(event.notification?.data?.url || '/');
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            const normalizedTarget = new URL(targetUrl, self.location.origin).href;
            for (const client of windowClients) {
                if (client.url === normalizedTarget && 'focus' in client) return client.focus();
            }
            for (const client of windowClients) {
                if ('navigate' in client && 'focus' in client) return client.navigate(normalizedTarget).then(() => client.focus());
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
            return undefined;
        })
    );
});
