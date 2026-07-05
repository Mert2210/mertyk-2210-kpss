importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDkZI-LxCOaog4kyb4YSquEK6ZpLNH2pqs",
    authDomain: "kpss-genel-kultur-soru-havuzu.firebaseapp.com",
    projectId: "kpss-genel-kultur-soru-havuzu",
    storageBucket: "kpss-genel-kultur-soru-havuzu.firebasestorage.app",
    messagingSenderId: "435941343639",
    appId: "1:435941343639:web:3ce323e0f8386d796c04d2"
});

const messaging = firebase.messaging();
console.log("Service Worker Firebase başlatıldı");

// Uygulama kapalı/arka planda iken gelen data-only (bildirim alanı olmayan) mesajları işler.
// Bildirim alanı içeren FCM mesajları Firebase SDK tarafından otomatik gösterilir.
messaging.onBackgroundMessage((payload) => {
    console.log("Arka plan bildirimi alındı:", payload.notification || payload.data);
    try {
        const notificationPayload = payload.notification || payload.data || {};
        const title = String(notificationPayload.title || 'Gazililer');
        const body = String(notificationPayload.body || 'Yeni bir bildirim var.');
        const url = String(notificationPayload.click_action || payload.fcmOptions?.link || notificationPayload.link || '/');
        return self.registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: { url }
        });
    } catch (error) {
        console.error('[Service Worker] Arka plan bildirimi gösterilemedi:', error);
    }
});



self.OFFLINE_HTML = '<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Çevrimdışı</title></head><body><h3>Çevrimdışısınız</h3><p>Lütfen internet bağlantınızı kontrol edin.</p></body></html>';

const IMAGE_CACHE_NAME_PREFIX = 'soru-gorselleri-';
const IMAGE_CACHE_NAME = `${IMAGE_CACHE_NAME_PREFIX}v1`;
// Supabase Storage görsel URL'lerini önbelleğe al
const SUPABASE_STORAGE_PATTERN = /supabase\.co\/storage\/v1\/object\/public\//;

self.addEventListener('install', (e) => {
    console.log('[Service Worker] Kuruldu');
    self.skipWaiting();
});
self.addEventListener('activate', (e) => {
    // Eski resim önbelleklerini temizle
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k.startsWith(IMAGE_CACHE_NAME_PREFIX) && k !== IMAGE_CACHE_NAME)
                    .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    // Supabase Storage görsellerini önbellekle (Cache-First)
    if (SUPABASE_STORAGE_PATTERN.test(e.request.url)) {
        e.respondWith(
            caches.open(IMAGE_CACHE_NAME).then((cache) =>
                cache.match(e.request).then((cached) => {
                    if (cached) return cached;
                    return fetch(e.request).then((response) => {
                        if (response.ok) {
                            cache.put(e.request, response.clone());
                        }
                        return response;
                    });
                })
            )
        );
        return;
    }

    // Diğer istekler: Network-First (çevrimdışıysa offline HTML göster)
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

