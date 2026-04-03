self.addEventListener('install', (e) => {
    console.log('[Service Worker] Kuruldu');
});
self.addEventListener('fetch', (e) => {
    // Şimdilik sadece online çalışacak temel bir köprü
    e.respondWith(fetch(e.request).catch(() => console.log("Çevrimdışısınız.")));
});
