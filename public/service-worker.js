const CACHE_NAME = 'TotalProd v1.0.6'; // Incrementamos la versión para incluir archivos EJS
const ASSETS_TO_CACHE = [
    '/css/login.css',
    '/js/login.js',
    '/js/dashboard.js',
    //Archivos CSS
    '/css/dashboard_db.css',
    '/css/styles/componentes/botones.css',
    '/css/styles/componentes/otros.css',
    '/css/styles/componentes/anuncio.css',
    '/css/styles/componentes/carrito.css',
    '/css/styles/componentes/calendario.css',
    '/css/styles/componentes/barra-progreso.css',
    '/css/styles/componentes/filtro-opciones.css',
    '/css/styles/componentes/registro-item.css',
    '/css/styles/componentes/pull-to-refresh.css',
    '/css/styles/componentes/btn-flotante.css',
    '/css/styles/componentes/ajustes.css',
    '/css/styles/componentes/actualizacion.css',
    '/css/styles/componentes/screen-progreso.css',
    '/css/styles/componentes/tablas.css',
    '/css/styles/componentes/skeletos.css',
    '/css/styles/componentes/panel-lateral.css',
    '/css/styles/componentes/fuente.css',
    '/css/styles/componentes/carga.css',
    '/css/styles/componentes/notificacion.css',
    //Archivos JS
    '/js/modules/main/home.js',
    '/js/modules/main/nav.js',
    '/js/modules/main/perfil.js',
    '/js/modules/main/flotante.js',
    '/js/modules/main/notificaciones.js',
    '/js/modules/acopio/almacen-acopio.js',
    '/js/modules/acopio/hacer-pedido.js',
    '/js/modules/acopio/ingresos-acopio.js',
    '/js/modules/acopio/registros-acopio.js',
    '/js/modules/acopio/registros-pedidos-acopio.js',
    '/js/modules/acopio/salidas-acopio.js',
    '/js/modules/admin/clientes.js',
    '/js/modules/admin/configuraciones-sistema.js',
    '/js/modules/admin/descargas.js',
    '/js/modules/admin/pagos.js',
    '/js/modules/admin/personal.js',
    '/js/modules/admin/proovedores.js',
    '/js/modules/admin/reportes.js',
    '/js/modules/almacen/almacen-general.js',
    '/js/modules/almacen/ingresos-almacen.js',
    '/js/modules/almacen/salidas-almacen.js',
    '/js/modules/almacen/registros-almacen.js',
    '/js/modules/almacen/registros-conteos.js',
    '/js/modules/almacen/verificar-registros.js',
    '/js/modules/componentes/componentes.js',
    '/js/modules/plugins/calculadora-mp.js',
    '/js/modules/plugins/tareas-acopio.js',
    '/js/modules/produccion/formulario-produccion.js',
    '/js/modules/produccion/registros-produccion.js',
    '/js/modules/produccion/reglas.js',
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


    const urlPath = new URL(event.request.url).pathname;

    if (
        event.request.method === 'GET' &&
        urlPath.startsWith('/obtener-')
    ) return;


    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request)
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        // CLONAR INMEDIATAMENTE
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Si la red falla, no hace nada aquí
                });

            if (cachedResponse) {
                return cachedResponse;
            } else {
                // Para otros assets, simplemente falla (no responde con HTML)
                return fetchPromise;
            }
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