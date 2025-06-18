importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCbfR1fpCDIsE8R_9RAN9lG0H9bsk2WQeQ",
    authDomain: "damabravaapp.firebaseapp.com",
    projectId: "damabravaapp",
    storageBucket: "damabravaapp.firebasestorage.app",
    messagingSenderId: "36776613676",
    appId: "1:36776613676:web:f031d9435399a75a9afe89",
    measurementId: "G-NX0Z9ZPC5R"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Manejar mensajes en background
messaging.onBackgroundMessage((payload) => {
    console.log('Mensaje recibido en background:', payload);
    
    const notificationTitle = payload.notification?.title || 'Nueva notificación';
    const notificationOptions = {
        body: payload.notification?.body || 'Tienes un nuevo mensaje',
        icon: '/icon.png',
        badge: '/badge.png',
        data: payload.data || {},
        requireInteraction: true,
        silent: false
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
    console.log('Notificación clickeada:', event);
    
    event.notification.close();
    
    // Abrir la aplicación cuando se hace clic en la notificación
    event.waitUntil(
        clients.openWindow('/')
    );
});

// Manejar instalación del service worker
self.addEventListener('install', (event) => {
    console.log('Service Worker instalado');
    self.skipWaiting();
});

// Manejar activación del service worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activado');
    event.waitUntil(self.clients.claim());
});