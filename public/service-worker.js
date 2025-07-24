const CACHE_NAME = 'totalprod-v7'; // Incrementamos la versión para incluir archivos EJS
const ASSETS_TO_CACHE = [
    '/',
    '/login',
    '/js/login.js',
    '/js/dashboard.js',

    '/css/login.css',
    '/css/dashboard_db.css',

    //Archivos JS
    '/js/modules/main/home.js',
    '/js/modules/main/nav.js',
    '/js/modules/main/perfil.js',
    '/js/modules/main/flotante.js',
    '/js/modules/main/notificaciones.js',

    '/js/modules/componentes/componentes.js',
    '/css/styles/home.css',
    '/css/styles/nav.css',
    '/css/styles/perfil.css',
    '/css/styles/flotante.css',
    '/css/styles/componentes.css',
    '/css/styles/estilos-base.css',
    // Archivos EJS
    '/views/componentes.ejs',
    '/views/dashboard.ejs',
    '/views/login.ejs',
    '/views/dashboard_otro.ejs',
    '/views/partials/footer.ejs',
    '/views/partials/header.ejs',
    // Imágenes
    '/img/Procesando.gif',
    '/img/logo-trans.webp',
    '/img/Logotipo-damabrava-trans.webp',
    '/img/cabecera-catalogo-trans.webp',
    '/img/logotipo-damabrava-1x1.png',
    '/img/fondo-catalogo-trans.webp',

    // Fuentes e iconos externos
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css',
    'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
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


messaging.onBackgroundMessage((payload) => {
    console.log('Mensaje recibido en background:', payload);
    // Usar data si existe, ya que notification ya no se envía
    const notificationTitle = payload.data?.title || 'Nueva notificación';
    const notificationOptions = {
        body: payload.data?.body || 'Tienes un nuevo mensaje',
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
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
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
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Lista de rutas/archivos a cachear con cache first
    const cacheFirstPaths = [
        '/',
        '/login',
        '/js/modules/main/home.js',
        '/js/modules/main/nav.js',
        '/js/modules/main/notificaciones.js',
        '/js/modules/main/flotante.js',
        '/js/modules/main/perfil.js'
    ];

    // Solo interceptar si la ruta está en la lista exacta
    if (cacheFirstPaths.includes(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(event.request)
                    .then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse.clone());
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Si la red falla, responde con caché si existe, si no, muestra /sin-red
                        return caches.match(event.request).then(resp => {
                            if (resp) return resp;
                            return caches.match('/sin-red');
                        });
                    });

                return cachedResponse || fetchPromise;
            })
        );
    }
    // Para cualquier otra ruta, NO interceptar (deja que el navegador maneje la petición)
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
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const data = event.data.payload || {};
        const notificationTitle = data.title || 'Nueva notificación';
        const notificationOptions = {
            body: data.body || 'Tienes un nuevo mensaje',
            icon: '/icons/icon-192x192.png',
            badge: '/badge.png',
            data: data,
            requireInteraction: true,
            silent: false
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});