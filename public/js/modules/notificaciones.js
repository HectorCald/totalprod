let usuarioInfo = [];
let historialNotificaciones = [];
let cantidadAnterior = parseInt(localStorage.getItem('cantidad_notificaciones') || '0');
let notificacionesNuevasIds = new Set(JSON.parse(localStorage.getItem('notificaciones_nuevas') || '[]'));

async function obtenerMisNotificaciones() {
    try {
        const response = await fetch('/obtener-mis-notificaciones');
        const data = await response.json();

        if (data.success) {
            // Filtrar notificaciones
            historialNotificaciones = data.notificaciones.filter(notif => {
                const emailActual = usuarioInfo.email;
                const rolActual = usuarioInfo.rol;

                if (rolActual === 'Administración') return true;
                return notif.destino === emailActual || notif.destino === rolActual;
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




export async function crearNotificaciones(user) {
    usuarioInfo = user;
    const view = document.querySelector('.notificacion-view');

    await obtenerMisNotificaciones();
    mostrarNotificaciones(view);
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
            <div class="grupo-notificaciones" style="display:flex;flex-direction: column; gap:8px;">
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
