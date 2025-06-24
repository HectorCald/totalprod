const CACHE_NAME = 'totalprod-v2'; // Incrementamos la versión
const ASSETS_TO_CACHE = [
    '/css/login.css',
    '/js/login.js',
    '/img',
    '/js/dashboard.js',
    '/css/dashboard.css',
    '/css/styles/componentes',
    '/js/modules/main/home.js',
    '/css/styles/home.css',
    '/js/modules/main/nav.js',
    '/css/styles/nav.css',
    '/js/modules/main/perfil.js',
    '/css/styles/perfil.css',
    '/css/styles/flotante.css',
    '/js/modules/main/flotante.js',
    '/js/modules/componentes/componentes.js',
    '/css/styles/componentes.css',
    '/css/styles/estilos-base.css',
];
const syncQueue = new Map();

// --- INICIO: Lógica de notificaciones push Firebase ---
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
        icon: '/icons/icon.png',
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
    event.waitUntil(
        clients.openWindow('/')
    );
});
// --- FIN: Lógica de notificaciones push Firebase ---

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return Promise.all(
                    ASSETS_TO_CACHE.map(url => {
                        return fetch(url)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Failed to cache: ${url}`);
                                }
                                return cache.put(url, response);
                            })
                            .catch(error => {
                                console.error('Error caching:', error);
                            });
                    })
                );
            })
            .then(() => {
                console.log('Caché completado correctamente');
                return self.skipWaiting();
            })
    );
});
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            caches.keys()
                .then(cacheNames => {
                    return Promise.all(
                        cacheNames
                            .filter(cacheName => cacheName !== CACHE_NAME)
                            .map(cacheName => {
                                console.log('Eliminando caché antiguo:', cacheName);
                                return caches.delete(cacheName);
                            })
                    );
                }),
            self.clients.claim()
        ])
    );
});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    const isAssetToCache = ASSETS_TO_CACHE.some(asset => 
        url.pathname.endsWith(asset) || (asset === '/' && url.pathname === '/')
    );

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse && isAssetToCache) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(error => {
                                console.error('Error caching response:', error);
                            });

                        return response;
                    })
                    .catch(() => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                    });
            })
    );
});
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(
            Promise.all(
                Array.from(syncQueue.entries()).map(([url, request]) => {
                    return fetch(request)
                        .then(response => {
                            if (response.ok) {
                                syncQueue.delete(url);
                            }
                            return response;
                        })
                        .catch(error => {
                            console.error('Error en sincronización:', error);
                        });
                })
            )
        );
    }
});
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});