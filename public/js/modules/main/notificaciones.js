let usuarioInfo = [];
let historialNotificaciones = [];
let cantidadAnterior = parseInt(localStorage.getItem('cantidad_notificaciones') || '0');
let notificacionesNuevasIds = new Set(JSON.parse(localStorage.getItem('notificaciones_nuevas') || '[]'));
let fcmToken = null;
let messaging = null;
let getToken = null;
let onMessage = null;
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(() => {
            // console.log('Service Worker registrado desde el inicio');
        })
        .catch(error => {
            console.error('Error al registrar Service Worker desde el inicio:', error);
        });
}

// Inicializar Firebase Messaging
async function inicializarFirebaseMessaging() {
    try {
        // Importar Firebase dinámicamente
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
        const { getMessaging, getToken: getTokenFn, onMessage: onMessageFn } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js');

        // Asignar las funciones al scope global del módulo
        getToken = getTokenFn;
        onMessage = onMessageFn;

        const firebaseConfig = {
            apiKey: "AIzaSyCbfR1fpCDIsE8R_9RAN9lG0H9bsk2WQeQ",
            authDomain: "damabravaapp.firebaseapp.com",
            projectId: "damabravaapp",
            storageBucket: "damabravaapp.firebasestorage.app",
            messagingSenderId: "36776613676",
            appId: "1:36776613676:web:f031d9435399a75a9afe89",
            measurementId: "G-NX0Z9ZPC5R"
        };

        const app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);

        // Manejar mensajes en primer plano
        onMessage(messaging, (payload) => {
            // console.log('[FRONT] onMessage payload:', payload);
            // Reenviar el payload al Service Worker para mostrar la notificación push
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    payload: payload.data || {}
                });
            }
            // Actualizar el historial de notificaciones
            actualizarHistorialNotificaciones();
        });

        // Registrar service worker y obtener token
        await registrarServiceWorker();
        await obtenerFCMToken();

        // console.log('Firebase Messaging inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar Firebase Messaging:', error);
    }
}

// Registrar Service Worker
async function registrarServiceWorker() {
    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        await navigator.serviceWorker.ready;
        // console.log('Service Worker registrado para notificaciones');
        return registration;
    } catch (error) {
        console.error('Error al registrar Service Worker:', error);
        throw error;
    }
}

// Obtener token FCM
async function obtenerFCMToken() {
    try {
        if (!getToken || !messaging) {
            // console.log('Firebase Messaging no está inicializado, esperando...');
            // Reintentar después de 2 segundos
            setTimeout(obtenerFCMToken, 2000);
            return;
        }

        const registration = await navigator.serviceWorker.ready;
        fcmToken = await getToken(messaging, {
            vapidKey: 'BPeyAQuzecxcE6GsmdeYnTVwi1x4ULPDkaMOv_CQ0Mryu0jW0A8PD-n7kcjvBNis14-HEAncrq1LYcqY6vwFgTU',
            serviceWorkerRegistration: registration
        });

        if (fcmToken) {
            // console.log('Token FCM obtenido:', fcmToken.substring(0, 50) + '...');
            await registrarTokenEnServidor(fcmToken);
        } else {
            // console.log('No se pudo obtener el token FCM, reintentando en 5 segundos...');
            // Reintentar después de 5 segundos
            setTimeout(obtenerFCMToken, 5000);
        }
    } catch (error) {
        console.error('Error al obtener token FCM:', error);
        // Reintentar después de 10 segundos en caso de error
        setTimeout(obtenerFCMToken, 10000);
    }
}

// Registrar token en el servidor
async function registrarTokenEnServidor(token) {
    try {
        const response = await fetch('/register-fcm-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: token })
        });

        const result = await response.json();
        if (result.success) {
            // console.log('Token FCM registrado en el servidor');
        } else {
            console.error('Error al registrar token:', result.error);
        }
    } catch (error) {
        console.error('Error al enviar token al servidor:', error);
    }
}

// Mostrar notificación local
function mostrarNotificacionLocal(titulo, mensaje) {
    if (Notification.permission === 'granted') {
        const notificacion = new Notification(titulo, {
            body: mensaje,
            icon: '/icons/icon.png',
            badge: '/badge.png',
            silent: false,
            requireInteraction: true
        });

        // Manejar clic en la notificación
        notificacion.onclick = () => {
            window.focus();
            notificacion.close();
            // Aquí puedes agregar lógica para abrir una sección específica
        };
    }
}

// Solicitar permisos de notificación
async function solicitarPermisosNotificacion() {
    try {
        const permission = await Notification.requestPermission();
        // console.log('Permiso de notificación:', permission);
        
        if (permission === 'granted') {
            await inicializarFirebaseMessaging();
        } else {
            // console.log('Permiso de notificación denegado');
        }
        
        return permission;
    } catch (error) {
        console.error('Error al solicitar permisos:', error);
        return 'denied';
    }
}

async function obtenerMisNotificaciones() {
    try {
        const response = await fetch('/obtener-mis-notificaciones');
        const data = await response.json();

        if (data.success) {
            // Filtrar notificaciones
            historialNotificaciones = data.notificaciones.filter(notif => {
                const emailActual = usuarioInfo.email;
                const rolActual = usuarioInfo.rol;

                return notif.destino === emailActual || notif.destino === rolActual || notif.destino === 'Almacen';
            });

            // Si la cantidad es diferente, mostrar indicador
            if (historialNotificaciones.length !== cantidadAnterior) {
                const btnNotificacion = document.querySelector('.flotante .notificacion');
                if (!btnNotificacion.querySelector('.indicador')) {
                    const indicador = document.createElement('span');
                    indicador.className = 'indicador';
                    btnNotificacion.appendChild(indicador);
                }

                // Marcar solo las nuevas por ID
                const nuevasIds = historialNotificaciones
                    .slice(0, historialNotificaciones.length - cantidadAnterior)
                    .map(n => n.id);
                notificacionesNuevasIds = new Set([...notificacionesNuevasIds, ...nuevasIds]);
                
                localStorage.setItem('notificaciones_nuevas', JSON.stringify([...notificacionesNuevasIds]));
            }

            // Actualizar cantidad
            localStorage.setItem('cantidad_notificaciones', historialNotificaciones.length.toString());
            cantidadAnterior = historialNotificaciones.length;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Actualizar historial de notificaciones
async function actualizarHistorialNotificaciones() {
    await obtenerMisNotificaciones();
    const view = document.querySelector('.notificacion-view');
    if (view) {
        mostrarNotificaciones(view);
    }
}

export async function crearNotificaciones(user) {
    usuarioInfo = user;
    const view = document.querySelector('.notificacion-view');

    // Inicializar notificaciones push si no están inicializadas
    if (!messaging) {
        // console.log('Inicializando Firebase Messaging...');
        await solicitarPermisosNotificacion();
        
        // Esperar un poco para que Firebase se inicialice completamente
        if (!messaging) {
            // console.log('Firebase Messaging no se pudo inicializar, continuando sin notificaciones push');
        }
    }

    await obtenerMisNotificaciones();
    mostrarNotificaciones(view);

    // Configurar actualización automática cada 30 segundos
    setInterval(actualizarHistorialNotificaciones, 30000);
}

function obtenerIcono(suceso) {
    const iconos = {
        'Edición': 'edit',
        'Creación': 'plus-circle',
        'Eliminación': 'trash',
        'Verificación': 'check-circle',
        'Error': 'error-circle',
        'Información': 'info-circle'
    };
    return iconos[suceso] || 'bell';
}

function formatearFecha(fechaCompleta) {
    // Convertir el formato "DD/MM/YYYY, HH:mm:ss" a Date
    const [fecha, hora] = fechaCompleta.split(',');
    const [dia, mes, anio] = fecha.split('/');
    const fechaCorrecta = new Date(anio, mes - 1, dia); // mes - 1 porque en JS los meses van de 0-11

    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    // Formatear solo la hora
    const horaFormateada = fechaCompleta.split(',')[1].trim().substring(0, 5);

    // Comparar fechas
    if (fechaCorrecta.toDateString() === hoy.toDateString()) {
        return {
            grupo: 'Hoy',
            hora: horaFormateada
        };
    } else if (fechaCorrecta.toDateString() === ayer.toDateString()) {
        return {
            grupo: 'Ayer',
            hora: horaFormateada
        };
    } else {
        return {
            grupo: fechaCorrecta.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            }),
            hora: horaFormateada
        };
    }
}

function mostrarNotificaciones(view) {
    // Agrupar notificaciones por fecha
    const notificacionesAgrupadas = {};
    
    // Agrupar por fecha
    historialNotificaciones.forEach(notif => {
        const { grupo, hora } = formatearFecha(notif.fecha);
        
        if (!notificacionesAgrupadas[grupo]) {
            notificacionesAgrupadas[grupo] = [];
        }
        
        notificacionesAgrupadas[grupo].push({
            ...notif,
            hora
        });
    });

    // Generar HTML para cada grupo
    const gruposHTML = Object.entries(notificacionesAgrupadas)
        .map(([grupo, notificaciones]) => `
            <div class="grupo-notificaciones" style="display:flex;flex-direction: column; gap:5px;">
                <p class="normal" style="margin-bottom:10px">${grupo}</p>
                ${notificaciones.map(notif => `
                    <div class="notificacion ${notificacionesNuevasIds.has(notif.id) ? 'nueva-notificacion' : ''}">
                        <i class='bx bx-${obtenerIcono(notif.suceso)}'></i>
                        <div class="notificacion-info">
                            <div class="cabeza">
                                <p class="suceso ${notif.suceso}">${notif.suceso}</p>
                                <p class="fecha">${notif.hora}</p>
                            </div>
                            <p class="detalle">${notif.detalle}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');

    view.innerHTML = `
        <h1 class="titulo"><i class='bx bx-bell'></i> Notificaciones</h1>
        <div class="notificaciones">
            ${historialNotificaciones.length > 0 ? gruposHTML : `
                <div class="notificacion">
                    <i class='bx bx-bell-off'></i>
                    <div class="notificacion-info">
                        <div class="cabeza">
                            <p class="suceso">Sin notificaciones</p>
                            <p class="fecha">${new Date().toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit'
                            })}</p>
                        </div>
                        <p class="detalle">No hay notificaciones disponibles</p>
                    </div>
                </div>
            `}
        </div>
    `;
}

export async function borrarFCMToken(email) {
    try {
        if (!messaging || !getToken) return;
        const registration = await navigator.serviceWorker.ready;
        const currentToken = await getToken(messaging, {
            vapidKey: 'BPeyAQuzecxcE6GsmdeYnTVwi1x4ULPDkaMOv_CQ0Mryu0jW0A8PD-n7kcjvBNis14-HEAncrq1LYcqY6vwFgTU',
            serviceWorkerRegistration: registration
        });
        if (currentToken && email) {
            // Elimina en el servidor por email
            await fetch('/eliminar-fcm-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            // Elimina localmente
            await messaging.deleteToken(currentToken);
            localStorage.removeItem('fcm_token');
        }
    } catch (error) {
        console.error('Error al borrar el token FCM:', error);
    }
}
