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

messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'Yeni Bildirim';
    const body = (payload.notification && payload.notification.body) || '';
    self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png'
    });
});
