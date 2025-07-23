let paginaProtegida = false;
export function activarProteccionNavegacion() {
    paginaProtegida = true;
    // Reemplazar el estado actual para bloquear el retroceso
    history.replaceState({ protegida: true, nivel: 0 }, '', window.location.href);

    // Agregar una entrada adicional al historial para crear una "barrera"
    history.pushState({ protegida: true, nivel: 0 }, '', window.location.href);
}
export function desactivarProteccionNavegacion() {
    paginaProtegida = false;
}
const estadoAnuncios = {
    anuncioVisible: false,
    anuncioSecondVisible: false,
    anuncioTercerVisible: false,
    nivelActual: 0,
    bloqueado: false,
    // Nuevo: contador de entradas de historial
    entradasHistorial: 0
};
function obtenerEstadoRealDOM() {
    return {
        normal: document.querySelector('.anuncio')?.classList.contains('mostrar') || false,
        second: document.querySelector('.anuncio-second')?.classList.contains('mostrar') || false,
        tercer: document.querySelector('.anuncio-tercer')?.classList.contains('mostrar') || false
    };
}
function calcularNivelReal(estadoDOM) {
    if (estadoDOM.tercer) return 3;
    if (estadoDOM.second) return 2;
    if (estadoDOM.normal) return 1;
    return 0;
}
function actualizarEstadoInterno() {
    const estadoDOM = obtenerEstadoRealDOM();
    estadoAnuncios.anuncioVisible = estadoDOM.normal;
    estadoAnuncios.anuncioSecondVisible = estadoDOM.second;
    estadoAnuncios.anuncioTercerVisible = estadoDOM.tercer;
    estadoAnuncios.nivelActual = calcularNivelReal(estadoDOM);
}
function ocultarAnuncioFisico() {
    const anuncio = document.querySelector('.anuncio');
    const btni = document.querySelector('.btn-flotante-salidas');
    const btns = document.querySelector('.btn-flotante-ingresos');
    const btnp = document.querySelector('.btn-flotante-pedidos');

    if (btni) btni.style.display = 'none';
    if (btns) btns.style.display = 'none';
    if (btnp) btnp.style.display = 'none';

    if (anuncio) {
        anuncio.classList.remove('mostrar');
    }
}
function ocultarAnuncioSecondFisico() {
    const anuncio = document.querySelector('.anuncio-second');
    if (anuncio) {
        anuncio.classList.remove('mostrar');
        pantallagrande('ocultar');
    }
}
function ocultarAnuncioTercerFisico() {
    const anuncio = document.querySelector('.anuncio-tercer');
    if (anuncio) {
        anuncio.classList.remove('mostrar');
    }
}
export function cerrarAnuncioManual(tipo) {
    if (estadoAnuncios.bloqueado) return;
    estadoAnuncios.bloqueado = true;

    try {
        const estadoDOM = obtenerEstadoRealDOM();
        const nivelActual = calcularNivelReal(estadoDOM);
        let nivelDestino = 0;

        switch (tipo) {
            case 'anuncioTercer':
                if (estadoDOM.tercer) {
                    ocultarAnuncioTercerFisico();
                    nivelDestino = estadoDOM.second ? 2 : (estadoDOM.normal ? 1 : 0);
                }
                break;

            case 'anuncioSecond':
                // Cerrar anuncios superiores primero
                if (estadoDOM.tercer) {
                    ocultarAnuncioTercerFisico();
                }
                if (estadoDOM.second) {
                    ocultarAnuncioSecondFisico();
                    nivelDestino = estadoDOM.normal ? 1 : 0;
                }
                break;

            case 'anuncio':
                ocultarAnuncioTercerFisico();
                ocultarAnuncioSecondFisico();
                ocultarAnuncioFisico();
                nivelDestino = 0;
                break;
        }

        actualizarEstadoInterno();

        // NUEVO: Limpiar entradas de historial fantasma
        const entradasAEliminar = nivelActual - nivelDestino;
        if (entradasAEliminar > 0) {
            // Retroceder en el historial para eliminar las entradas fantasma
            for (let i = 0; i < entradasAEliminar; i++) {
                history.back();
            }
            // Actualizar el contador
            estadoAnuncios.entradasHistorial = Math.max(0, estadoAnuncios.entradasHistorial - entradasAEliminar);
        }

        // Actualizar el estado actual
        if (paginaProtegida) {
            history.replaceState({
                protegida: true,
                nivel: nivelDestino
            }, '', window.location.href);
        } else {
            history.replaceState({
                nivel: nivelDestino
            }, '', window.location.href);
        }

    } finally {
        setTimeout(() => {
            estadoAnuncios.bloqueado = false;
        }, 150); // Aumentar el tiempo para dar margen al history.back()
    }
}
export async function mostrarAnuncio() {
    const anuncio = document.querySelector('.anuncio');
    const anuncioSecond = document.querySelector('.anuncio-second');
    const contenido = document.querySelector('.anuncio .contenido');
    contenido.style.maxWidth = '100%'


    const botonCarrito = document.querySelector('.btn-flotante-salidas')
    const botonCarrito2 = document.querySelector('.btn-flotante-ingresos')
    const botonCarrito3 = document.querySelector('.btn-flotante-pedidos')
    if (botonCarrito) {
        botonCarrito.style.display = 'none'
    } else if (botonCarrito2) {
        botonCarrito2.style.display = 'none'
    } else if (botonCarrito3) {
        botonCarrito3.style.display = 'none'
    }


    if (anuncio && !anuncio.classList.contains('mostrar')) {
        anuncio.classList.add('mostrar');
        contenido.style.maxWidth = '100%';
        actualizarEstadoInterno();

        // Agregar al historial
        if (paginaProtegida) {
            history.pushState({
                protegida: true,
                nivel: 1,
                tipo: 'anuncio'
            }, '', window.location.href);
        } else {
            history.pushState({
                nivel: 1,
                tipo: 'anuncio'
            }, '', window.location.href);
        }
        estadoAnuncios.entradasHistorial++;
    } else if (anuncioSecond && anuncioSecond.classList.contains('mostrar')) {
        cerrarAnuncioManual('anuncioSecond');
    }
}
export async function mostrarAnuncioSecond() {
    const anuncio = document.querySelector('.anuncio-second');
    const anuncioTercer = document.querySelector('.anuncio-tercer');

    if (anuncio && !anuncio.classList.contains('mostrar')) {
        anuncio.classList.add('mostrar');
        pantallagrande('mostrar');
        actualizarEstadoInterno();

        if (paginaProtegida) {
            history.pushState({
                protegida: true,
                nivel: 2,
                tipo: 'anuncioSecond'
            }, '', window.location.href);
        } else {
            history.pushState({
                nivel: 2,
                tipo: 'anuncioSecond'
            }, '', window.location.href);
        }

        // Actualizar contador de entradas
        estadoAnuncios.entradasHistorial++;

    } else if (anuncioTercer && anuncioTercer.classList.contains('mostrar')) {
        cerrarAnuncioManual('anuncioTercer');
    }

    configuracionesEntrada();
}
export async function mostrarAnuncioTercer() {
    const anuncio = document.querySelector('.anuncio-tercer');

    if (anuncio && !anuncio.classList.contains('mostrar')) {
        anuncio.classList.add('mostrar');
        actualizarEstadoInterno();

        if (paginaProtegida) {
            history.pushState({
                protegida: true,
                nivel: 3,
                tipo: 'anuncioTercer'
            }, '', window.location.href);
        } else {
            history.pushState({
                nivel: 3,
                tipo: 'anuncioTercer'
            }, '', window.location.href);
        }

        // Actualizar contador de entradas
        estadoAnuncios.entradasHistorial++;
    }
    configuracionesEntrada();
}
function pantallagrande(proceso) {
    const principal = document.querySelector('.anuncio .contenido');
    const pEncabezado = document.querySelector('.anuncio .contenido .encabezado');
    const nav = document.querySelector('.nav-container');
    const views = document.querySelectorAll('.view');

    const esPantallaGrande = window.innerWidth > 768;
    if (esPantallaGrande) {
        if (proceso === 'ocultar') {
            principal.style.paddingRight = '0px';
            pEncabezado.style.paddingRight = '15px';
            views.forEach(view => {
                view.style.paddingRight = '15px';
            });
            nav.style.paddingRight = '15px';
        } else {
            principal.style.paddingRight = '450px';
            pEncabezado.style.paddingRight = '450px';
            views.forEach(view => {
                view.style.paddingRight = '450px';
            });
            nav.style.paddingRight = '450px';
        }
    }
}
window.addEventListener('popstate', (event) => {
    if (estadoAnuncios.bloqueado) return;

    const state = event.state;

    // Si es una página protegida y no tiene el flag de protección, bloquear
    if (paginaProtegida && (!state || !state.protegida)) {
        // Restaurar el estado protegido
        history.pushState({
            protegida: true,
            nivel: estadoAnuncios.nivelActual
        }, '', window.location.href);
        return;
    }

    const nivelDestino = state?.nivel || 0;
    const estadoDOM = obtenerEstadoRealDOM();
    const nivelActualDOM = calcularNivelReal(estadoDOM);

    // Solo cerrar si necesitamos ir a un nivel menor
    if (nivelActualDOM > nivelDestino) {
        cerrarAnunciosPorNivel(nivelDestino);
        // Actualizar contador de entradas
        estadoAnuncios.entradasHistorial = Math.max(0, nivelDestino);
    }
});
function cerrarAnunciosPorNivel(nivelObjetivo) {
    const estadoDOM = obtenerEstadoRealDOM();

    if (estadoDOM.tercer && nivelObjetivo < 3) {
        ocultarAnuncioTercerFisico();
    }
    if (estadoDOM.second && nivelObjetivo < 2) {
        ocultarAnuncioSecondFisico();
    }
    if (estadoDOM.normal && nivelObjetivo < 1) {
        ocultarAnuncioFisico();
    }

    actualizarEstadoInterno();
}
export async function ocultarAnuncio() {
    cerrarAnuncioManual('anuncio');
}
export async function ocultarAnuncioSecond() {
    cerrarAnuncioManual('anuncioSecond');
}
export async function ocultarAnuncioTercer() {
    cerrarAnuncioManual('anuncioTercer');
}
export function resetearEstadoAnuncios() {
    cerrarAnunciosPorNivel(0);
    estadoAnuncios.bloqueado = false;
    estadoAnuncios.entradasHistorial = 0; // Resetear contador

    if (paginaProtegida) {
        history.replaceState({
            protegida: true,
            nivel: 0
        }, '', window.location.href);
    } else {
        history.replaceState({ nivel: 0 }, '', window.location.href);
    }
}
export function inicializarDashboard() {
    activarProteccionNavegacion();
    resetearEstadoAnuncios();
}
export function limpiarProteccionNavegacion() {
    desactivarProteccionNavegacion();
    resetearEstadoAnuncios();
}


export function crearNotificacion(options = {}) {
    // Validar y establecer valores por defecto
    const { message, type = 'info', duration = 3000 } = options || {};
    // Si no hay mensaje real, no mostrar nada
    if (!message) return;

    let container = document.querySelector('.notification-container');

    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    notification.innerHTML = `
        <i class='bx bx-${type === 'success' ? 'check' : type === 'error' ? 'x-circle' : type === 'warning' ? 'error' : 'info-circle'}'></i>
        <span>${message}</span>
        <button class="close-btn"><i class='bx bx-x'></i></button>
    `;

    container.appendChild(notification);

    // Forzar un reflow para asegurar que la animación funcione
    notification.offsetHeight;

    // Mostrar la notificación
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    // Manejador del botón de cierre
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        closeNotification(notification);
    });

    // Auto-cerrar después del tiempo especificado
    if (duration) {
        setTimeout(() => {
            closeNotification(notification);
        }, duration);
    }

    return notification;
}
function closeNotification(notification) {
    notification.classList.remove('show');
    notification.classList.add('hide');

    // Esperar a que termine la animación antes de remover
    notification.addEventListener('transitionend', () => {
        notification.remove();
        const container = document.querySelector('.notification-container');
        if (container && container.children.length === 0) {
            container.remove();
        }
    }, { once: true });
}
export function mostrarNotificacion(options) {
    return crearNotificacion(options);
}


export function configuracionesEntrada() {
    const inputs = document.querySelectorAll('.entrada .input input, .entrada .input select');

    inputs.forEach(input => {
        const label = input.previousElementSibling;

        // Verificar el estado inicial
        if (input.value.trim() !== '') {
            label.style.transform = 'translateY(-75%) scale(0.85)';
            label.style.color = 'var(--cuarto-color)';
            label.style.fontWeight = '600';
            label.style.zIndex = '5';
        }

        input.addEventListener('focus', () => {
            label.style.transform = 'translateY(-75%) scale(0.85)';
            label.style.color = 'var(--cuarto-color)';
            label.style.fontWeight = '600';
            label.style.zIndex = '5';
        });

        input.addEventListener('blur', () => {
            if (!input.value.trim()) {
                label.style.transform = 'translateY(-50%)';
                label.style.color = 'gray';
                label.style.fontWeight = '400';
            }
        });

        // Para los select, también manejar el evento de cambio
        if (input.tagName.toLowerCase() === 'select') {
            input.addEventListener('change', () => {
                if (input.value.trim()) {
                    label.style.transform = 'translateY(-75%) scale(0.85)';
                    label.style.color = 'var(--cuarto-color)';
                    label.style.fontWeight = '600';
                    label.style.zIndex = '5';
                } else {
                    label.style.transform = 'translateY(-50%)';
                    label.style.color = 'gray';
                    label.style.fontWeight = '400';
                }
            });
        }
    });

    // Limpiar input de email
    const clearInputButton = document.querySelector('.clear-input');
    if (clearInputButton) {
        clearInputButton.addEventListener('click', (e) => {
            e.preventDefault();
            const emailInput = document.querySelector('.email');
            const label = emailInput.previousElementSibling;
            emailInput.value = '';

            // Forzar la actualización del label
            label.style.top = '50%';
            label.style.fontSize = 'var(--text-subtitulo)';
            label.style.color = 'gray';
            label.style.fontWeight = '400';

            // Disparar evento blur manualmente
            const blurEvent = new Event('blur');
            emailInput.dispatchEvent(blurEvent);

            // Disparar evento focus manualmente
            emailInput.focus();
            const focusEvent = new Event('focus');
            emailInput.dispatchEvent(focusEvent);
        });
    }

    // Mostrar/ocultar contraseña para el formulario de inicio de sesión
    document.querySelectorAll('.toggle-password').forEach(toggleButton => {
        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            const passwordInput = toggleButton.parentElement.querySelector('input[type="password"], input[type="text"]');
            const icon = toggleButton.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

}
export function exportarArchivos(rExp, registrosAExportar) {
    function calcularTiempoTranscurrido(horaInicio, horaFin) {
        try {
            const [horasInicio, minutosInicio] = horaInicio.split(':').map(Number);
            const [horasFin, minutosFin] = horaFin.split(':').map(Number);

            let diferenciaMinutos = (horasFin * 60 + minutosFin) - (horasInicio * 60 + minutosInicio);

            if (diferenciaMinutos < 0) {
                // Si el tiempo es negativo, asumimos que cruza la medianoche
                diferenciaMinutos += 24 * 60;
            }

            const horas = Math.floor(diferenciaMinutos / 60);
            const minutos = diferenciaMinutos % 60;

            return `${horas}h ${minutos}m`;
        } catch (error) {
            console.error('Error al calcular tiempo:', error);
            return 'Error en cálculo';
        }
    }
    const registrosVisibles = Array.from(document.querySelectorAll('.registro-item'))
        .filter(item => item.style.display !== 'none')
        .map(item => {
            const registro = registrosAExportar.find(r => r.id === item.dataset.id);
            if (rExp === 'produccion') {
                return {
                    'ID': registro.id,
                    'Fecha': registro.fecha,
                    'Producto': registro.producto,
                    'Lote': registro.lote,
                    'Gramos': registro.gramos,
                    'Proceso': registro.proceso,
                    'Microondas': registro.microondas,
                    'Envases Terminados': registro.envases_terminados,
                    'Fecha Vencimiento': registro.fecha_vencimiento,
                    'Nombre': registro.nombre,
                    'Cantidad Real': registro.c_real || 'Pendiente',
                    'Fecha Verificación': registro.fecha_verificacion || 'Pendiente',
                    'Observaciones': registro.observaciones || 'Sin observaciones',
                };
            } else if (rExp === 'almacen') {
                const registrosVisibles = Array.from(document.querySelectorAll('.registro-item'))
                    .filter(item => item.style.display !== 'none')
                    .map(item => registrosAExportar.find(r => r.id === item.dataset.id));

                // Procesar cada registro visible individualmente
                registrosVisibles.forEach(registro => {
                    const productos = registro.productos.split(';');
                    const cantidades = registro.cantidades.split(';');
                    const preciosUnitarios = registro.precios_unitarios.split(';');

                    const subtitulos = [
                        { 'Productos': 'Producto', 'Cantidad': 'Cantidad', 'Precio Unitario': 'Precio Unitario', 'Subtotal': 'Subtotal' }
                    ];

                    const datosExportar = productos.map((producto, index) => ({
                        'Productos': producto.trim(),
                        'Cantidad': cantidades[index] ? cantidades[index].trim() : 'N/A',
                        'Precio Unitario': preciosUnitarios[index] ? preciosUnitarios[index].trim() : 'N/A',
                        'Subtotal': parseFloat(cantidades[index] || 0) * parseFloat(preciosUnitarios[index] || 0),
                    }));

                    const fecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
                    const nombreArchivo = `Registro_${registro.id}_${fecha}.xlsx`;

                    const worksheet = XLSX.utils.json_to_sheet([...subtitulos, ...datosExportar], { header: ['Productos', 'Cantidad', 'Precio Unitario', 'Subtotal'] });

                    const maxLengths = {};
                    [...subtitulos, ...datosExportar].forEach(row => {
                        Object.keys(row).forEach(key => {
                            const valueLength = row[key].toString().length;
                            if (!maxLengths[key] || valueLength > maxLengths[key]) {
                                maxLengths[key] = valueLength;
                            }
                        });
                    });

                    worksheet['!cols'] = Object.keys(maxLengths).map(key => ({ wch: maxLengths[key] + 2 }));

                    const range = XLSX.utils.decode_range(worksheet['!ref']);
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const address = XLSX.utils.encode_cell({ c: C, r: 2 });
                        if (!worksheet[address]) continue;
                        worksheet[address].s = {
                            fill: { fgColor: { rgb: "D9D9D9" } },
                            font: { color: { rgb: "000000" }, bold: true }
                        };
                    }

                    XLSX.utils.sheet_add_aoa(worksheet, [
                        [`${registro.fecha_hora}`, `ID: ${registro.id}`, `Cliente/Proovedor:`, `${registro.cliente_proovedor}`, `${registro.nombre_movimiento}`]
                    ], { origin: 'A1' });

                    const headerRow = [
                        `${registro.fecha_hora}`,
                        `ID: ${registro.id}`,
                        `Operario: ${registro.operario}`,
                        `Cliente/Proveedor:`,
                        `${registro.nombre_movimiento}`
                    ];

                    headerRow.forEach((value, index) => {
                        const length = value.length;
                        if (!worksheet['!cols'][index] || worksheet['!cols'][index].wch < length) {
                            worksheet['!cols'][index] = { wch: length };
                        }
                    });

                    XLSX.utils.sheet_add_aoa(worksheet, [
                        [`Obs: ${registro.observaciones || 'Ninguna'}`, ``, `Total: ${registro.total}`, `Descuento: ${registro.descuento}`, `Aumento: ${registro.aumento}`]
                    ], { origin: `A${productos.length + 4}` });

                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro');
                    XLSX.writeFile(workbook, nombreArchivo);
                });

                mostrarNotificacion({
                    message: `Se descargaron ${registrosVisibles.length} registros en archivos separados`,
                    type: 'success',
                    duration: 3000
                });
            } else if (rExp === 'conteo') {
                // Obtener registros visibles
                const registrosVisibles = Array.from(document.querySelectorAll('.registro-item'))
                    .filter(item => item.style.display !== 'none')
                    .map(item => registrosAExportar.find(r => r.id === item.dataset.id));

                // Procesar cada registro visible
                for (const registro of registrosVisibles) {
                    const productos = registro.productos.split(';');
                    const sistema = registro.sistema.split(';');
                    const fisico = registro.fisico.split(';');
                    const diferencias = sistema.map((s, i) => parseInt(fisico[i] || 0) - parseInt(s || 0));

                    const subtitulos = [
                        { 'Productos': 'Producto', 'Sistema': 'Sistema', 'Físico': 'Físico', 'Diferencia': 'Diferencia' }
                    ];

                    const datosExportar = productos.map((producto, index) => ({
                        'Productos': producto.trim(),
                        'Sistema': sistema[index] ? sistema[index].trim() : '0',
                        'Físico': fisico[index] ? fisico[index].trim() : '0',
                        'Diferencia': diferencias[index]
                    }));

                    const fecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
                    const nombreArchivo = `Conteo_${registro.id}_${fecha}.xlsx`;

                    const worksheet = XLSX.utils.json_to_sheet([...subtitulos, ...datosExportar],
                        { header: ['Productos', 'Sistema', 'Físico', 'Diferencia'] });

                    // Ajustar anchos de columna
                    const maxLengths = {};
                    [...subtitulos, ...datosExportar].forEach(row => {
                        Object.keys(row).forEach(key => {
                            const valueLength = row[key].toString().length;
                            if (!maxLengths[key] || valueLength > maxLengths[key]) {
                                maxLengths[key] = valueLength;
                            }
                        });
                    });

                    worksheet['!cols'] = Object.keys(maxLengths).map(key => ({ wch: maxLengths[key] + 2 }));

                    // Dar formato al encabezado
                    const range = XLSX.utils.decode_range(worksheet['!ref']);
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const address = XLSX.utils.encode_cell({ c: C, r: 0 });
                        if (!worksheet[address]) continue;
                        worksheet[address].s = {
                            fill: { fgColor: { rgb: "D9D9D9" } },
                            font: { color: { rgb: "000000" }, bold: true }
                        };
                    }

                    // Agregar información del conteo en la parte superior
                    XLSX.utils.sheet_add_aoa(worksheet, [
                        [`Fecha: ${registro.fecha}`, `ID: ${registro.id}`, `Nombre: ${registro.nombre || 'Sin nombre'}`]
                    ], { origin: 'A1' });

                    // Agregar observaciones al final
                    XLSX.utils.sheet_add_aoa(worksheet, [
                        [`Observaciones: ${registro.observaciones || 'Ninguna'}`]
                    ], { origin: `A${datosExportar.length + 4}` });

                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Conteo');
                    XLSX.writeFile(workbook, nombreArchivo);
                }

                mostrarNotificacion({
                    message: `Se descargaron ${registrosVisibles.length} registros en archivos separados`,
                    type: 'success',
                    duration: 3000
                });
                return;
            } else if (rExp === 'pedidos-acopio') {
                return {
                    'ID': registro.id,
                    'Fecha': registro.fecha,
                    'Producto': registro.producto,
                    'Cantidad Pedida': registro.cantidadPedida,
                    'Observaciones del pedido': registro.observacionesPedido || 'Sin observaciones',
                    'Estado del pedido': registro.estado || 'Sin estado',
                    'Cantidad entregada(KG)': registro.cantidadEntregadaKg || 'No se entregó',
                    'Proovedor': registro.proovedor || 'No se compro',
                    'Precio': registro.precio || 'No se compro',
                    'Observaciones de compra': registro.observacionesCompras || 'No se compro',
                    'Cantidad entregada': registro.cantidadEntregadaUnd || 'No se compro',
                    'Transportes/Otros': registro.transporteOtros || 'No se compro',
                    'Estado de compra': registro.estadoCompra || 'No se compro',
                    'Fecha de ingreso': registro.fechaIngreso || 'No ingreso',
                    'Cantidad de ingreso': registro.cantidadIngresada || 'No ingreso',
                    'Observaciones de ingreso': registro.observacionesIngresado || 'No ingreso',
                };
            } else if (rExp === 'acopio') {
                return {
                    'ID': registro.id,
                    'Fecha': registro.fecha,
                    'Producto': registro.producto,
                    'Tipo': registro.tipo,
                    'Peso': registro.peso,
                    'Operador': registro.operario,
                    'Caracteristicas': registro.caracteristicas,
                    'Observaciones': registro.observaciones || 'Sin observaciones',
                };
            } else if (rExp === 'pagos') {
                return {
                    'ID': registro.id,
                    'Fecha': registro.fecha,
                    'Nombre del pago': registro.nombre_pago,
                    'Beneficiario': registro.beneficiario,
                    'Pagado por': registro.pagado_por,
                    'Justuficativos': registro.justificativos,
                    'Subtotal': registro.subtotal,
                    'Descuento': registro.descuento || '0',
                    'Aumento': registro.aumento || '0',
                    'Total': registro.total,
                    'Observaciones': registro.observaciones || 'Sin observaciones',
                    'Estado': registro.estado || 'Pendiente',
                    'Tipo': registro.tipo,
                };
            } else if (rExp === 'calcularmp') {
                return {
                    'ID': registro.id,
                    'Fecha': registro.fecha,
                    'Operador': registro.nombre,
                    'Responsable': registro.responsable,
                    'Materia prima': registro.materia_prima,
                    'Gramaje': registro.gramaje,
                    'Peso inicial': registro.peso_inicial,
                    'Peso final': registro.peso_final || 'Pendiente',
                    'Cantidad producida': registro.ctd_producida,
                    'Peso merma': registro.peso_merma || 'No registrado',
                    'Observaciones': registro.observaciones || 'Sin observaciones',
                };
            } else if (rExp === 'tareas') {
                return {
                    'ID': registro.id || '',
                    'Fecha': registro.fecha || '',
                    'Producto': registro.producto || '',
                    'Hora inicio': registro.hora_inicio || '',
                    'Hora final': registro.hora_fin || 'Pendiente',
                    'Tiempo transcurrido': registro.hora_inicio && registro.hora_fin ?
                        calcularTiempoTranscurrido(registro.hora_inicio, registro.hora_fin) :
                        'Pendiente',
                    'Procedimientos': registro.procedimientos || 'Pendiente',
                    'Operador': registro.operador || '',
                    'Observaciones': registro.observaciones || 'Sin observaciones',
                };
            }
        });
    if (registrosVisibles.length === 0) {
        mostrarNotificacion({
            message: 'No hay registros visibles para exportar',
            type: 'warning',
            duration: 3500
        });
        return;
    }
    // Generar nombre del archivo con la fecha actual
    const fecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
    const nombreArchivo = `Registros_${fecha}.xlsx`;


    // Verificar que haya datos para procesar
    if (!registrosVisibles[0]) {
        mostrarNotificacion({
            message: 'No hay datos válidos para exportar',
            type: 'warning',
            duration: 3500
        });
        return;
    }


    // Crear y descargar el archivo Excel
    const worksheet = XLSX.utils.json_to_sheet(registrosVisibles);

    // Ajustar el ancho de las columnas
    const wscols = Object.keys(registrosVisibles[0] || {}).map(() => ({ wch: 15 }));
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');
    XLSX.writeFile(workbook, nombreArchivo);

    mostrarNotificacion({
        message: 'Descarga exitosa de los registros',
        type: 'success',
        duration: 3000
    });
}
export function exportarArchivosPDF(rExp, registrosAExportar) {
    // Obtener registros visibles
    const registrosVisibles = Array.from(document.querySelectorAll('.registro-item'))
        .filter(item => item.style.display !== 'none')
        .map(item => registrosAExportar.find(r => r.id === item.dataset.id));

    if (registrosVisibles.length === 0) {
        mostrarNotificacion({
            message: 'No hay registros visibles para exportar',
            type: 'warning',
            duration: 3500
        });
        return;
    }

    if (rExp === 'almacen') {
        // Procesar cada registro visible individualmente
        registrosVisibles.forEach(async (registro) => {
            try {
                // Crear nuevo documento PDF con tamaño carta
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ format: 'letter', unit: 'mm' });

                // Configurar fuente y tamaños
                doc.setFont('helvetica');
                doc.setFontSize(13);

                // Título principal
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.text(registro.nombre_movimiento, 105, 18, { align: 'center' });

                // Información del registro
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');

                const fechaHora = registro.fecha_hora.split(',');
                const fecha = fechaHora[0]?.trim() || '';

                // Cargar logo y marca de agua
                const logoUrl = '/img/img-png/damabrava-1x1.png';
                const watermarkUrl = '/img/logotipo-damabrava-1x1.png';
                let logoDataUrl = null;
                let watermarkDataUrl = null;
                try {
                    const logoResp = await fetch(logoUrl);
                    const logoBlob = await logoResp.blob();
                    logoDataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(logoBlob);
                    });
                    // Marca de agua
                    const watermarkResp = await fetch(watermarkUrl);
                    const watermarkBlob = await watermarkResp.blob();
                    watermarkDataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(watermarkBlob);
                    });
                } catch (e) {
                    logoDataUrl = null;
                    watermarkDataUrl = null;
                }

                // Cabecera con logo
                if (logoDataUrl) {
                    doc.addImage(logoDataUrl, 'PNG', 20, 5, 20, 20);
                }

                // Información básica y resumen financiero en la misma fila
                const infoBasica = [
                    ['ID', registro.id],
                    ['Fecha', fecha],
                    ['Operario', registro.operario],
                    ['Cliente', registro.cliente_proovedor.split('(')[0].trim()]
                ];
                const resumenFinanciero = [
                    ['Subtotal', `Bs. ${(parseFloat(registro.subtotal) || 0).toFixed(2)}`],
                    ['Descuento', `Bs. ${(parseFloat(registro.descuento) || 0).toFixed(2)}`],
                    ['Aumento', `Bs. ${(parseFloat(registro.aumento) || 0).toFixed(2)}`],
                    ['Total', `Bs. ${(parseFloat(registro.total) || 0).toFixed(2)}`]
                ];
                let yPosition = 25;
                if (doc.autoTable) {
                    const MAX_HEIGHT = 5; // en mm, ajusta a tu gusto
                    // Cabecera infoBasica
                    doc.autoTable({
                        head: [['Concepto', 'Valor']],
                        body: infoBasica,
                        startY: yPosition,
                        theme: 'grid',
                        headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center' },
                        styles: { font: 'helvetica', fontSize: 8, cellPadding: 1, minCellHeight: 0, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
                        margin: { left: 20, right: 120 },
                        tableWidth: 80,
                        cellPadding: 0,
                        didParseCell: function (data) {
                            if (data.cell.height > MAX_HEIGHT) {
                                data.cell.height = MAX_HEIGHT;
                            }
                        }
                    });
                    // Cabecera resumenFinanciero
                    doc.autoTable({
                        head: [['Concepto', 'Valor']],
                        body: resumenFinanciero,
                        startY: yPosition,
                        theme: 'grid',
                        headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center' },
                        styles: { font: 'helvetica', fontSize: 8, cellPadding: 1, minCellHeight: 0, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
                        margin: { left: 110, right: 20 },
                        tableWidth: 70,
                        cellPadding: 0,
                        didParseCell: function (data) {
                            if (data.cell.height > MAX_HEIGHT) {
                                data.cell.height = MAX_HEIGHT;
                            }
                        }
                    });
                    yPosition = 0;
                } else {
                    // Manual: lado a lado
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Campo', 20, yPosition);
                    doc.text('Valor', 60, yPosition);
                    doc.text('Concepto', 110, yPosition);
                    doc.text('Valor', 150, yPosition);
                    doc.setFont('helvetica', 'normal');
                    let yInfo = yPosition + 8;
                    let yFin = yPosition + 8;
                    infoBasica.forEach((row, i) => {
                        doc.text(row[0], 20, yInfo);
                        doc.text(row[1], 60, yInfo);
                        yInfo += 8;
                    });
                    resumenFinanciero.forEach((row, i) => {
                        doc.text(row[0], 110, yFin);
                        doc.text(row[1], 150, yFin);
                        yFin += 8;
                    });
                    yPosition = Math.max(yInfo, yFin) + 10;
                }

                yPosition += 2;

                // Encabezados de la tabla
                const tableHeaders = ['ID', 'PRODUCTO', 'CANTIDAD', 'P. UNITARIO', 'SUBTOTAL'];
                const productos = registro.productos.split(';');
                const cantidades = registro.cantidades.split(';');
                const preciosUnitarios = registro.precios_unitarios.split(';');
                const ids = registro.idProductos ? registro.idProductos.split(';') : productos.map((_, i) => (i + 1).toString());

                // Preparar datos de la tabla
                const tableData = productos.map((producto, index) => {
                    const cantidad = cantidades[index]?.trim() || 'N/A';
                    const precioUnitario = preciosUnitarios[index]?.trim() || '0';
                    const subtotal = parseFloat(cantidad) * parseFloat(precioUnitario);
                    return [
                        ids[index] || '',
                        producto.trim(),
                        cantidad,
                        `Bs. ${(parseFloat(precioUnitario) || 0).toFixed(2)}`,
                        `Bs. ${subtotal.toFixed(2)}`
                    ];
                });

                let drawWatermark = null;
                if (watermarkDataUrl) {
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    let imgSize = Math.min(pageWidth, pageHeight) * 0.55;
                    imgSize = imgSize * 2; // duplicar tamaño
                    imgSize = imgSize * 0.8; // reducir 20%
                    const x = (pageWidth - imgSize) / 2;
                    const y = (pageHeight - imgSize) / 2;
                    drawWatermark = function (data) {
                        doc.saveGraphicsState && doc.saveGraphicsState();
                        if (doc.setGState) {
                            doc.setGState(new doc.GState({ opacity: 0.10 }));
                        } else if (doc.setAlpha) {
                            doc.setAlpha(0.10);
                        }
                        doc.addImage(watermarkDataUrl, 'PNG', x, y, imgSize, imgSize);
                        if (doc.restoreGraphicsState) doc.restoreGraphicsState();
                        if (doc.setAlpha) doc.setAlpha(1);
                    };
                }

                if (doc.autoTable) {
                    doc.autoTable({
                        head: [tableHeaders],
                        body: tableData,
                        theme: 'grid',
                        headStyles: { font: 'helvetica', fontSize: 8, fillColor: [80, 80, 80], textColor: 255, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' },
                        styles: { font: 'helvetica', fontSize: 8, cellPadding: 1, minCellHeight: 0, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
                        margin: { left: 20, right: 20 },
                        columnStyles: {
                            0: { cellWidth: 15 },
                            2: { cellWidth: 18, halign: 'center' }, // CANTIDAD centrado
                            3: { cellWidth: 22 },
                            4: { cellWidth: 22 },
                        },
                        ...(drawWatermark ? { didDrawPage: drawWatermark } : {})
                    });
                    yPosition = doc.lastAutoTable.finalY || (yPosition + 40);
                } else {
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    let x = 20;
                    tableHeaders.forEach((header, i) => {
                        doc.text(header, x, yPosition + 10);
                        x += 35;
                    });
                    doc.setFont('helvetica', 'normal');
                    yPosition += 18;
                    tableData.forEach(row => {
                        let x = 20;
                        row.forEach(cell => {
                            doc.text(cell.toString(), x, yPosition);
                            x += 35;
                        });
                        yPosition += 8;
                    });
                }
                yPosition += 10;

                // Pie de página
                const pageHeight = doc.internal.pageSize.height;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.text('TotalProd App', 105, pageHeight - 20, { align: 'center' });

                // Generar nombre del archivo
                const fechaPDF = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
                let nombreArchivo = '';
                if (registro.tipo === 'Salida') {
                    // Buscar el número de entrega después de 'Nº'
                    let numeroEntrega = '';
                    const match = registro.nombre_movimiento.match(/Nº\s*(\d+)/i);
                    if (match) {
                        numeroEntrega = match[1];
                    } else {
                        numeroEntrega = '';
                    }
                    // Primer nombre del cliente
                    let primerNombreCliente = registro.cliente_proovedor.split('(')[0].trim().split(' ')[0];
                    nombreArchivo = `NT-${numeroEntrega}(${primerNombreCliente}).pdf`;
                } else if (registro.tipo === 'Ingreso') {
                    // Primer nombre del cliente
                    let primerNombreCliente = registro.cliente_proovedor.split('(')[0].trim().split(' ')[0];
                    nombreArchivo = `NI-${registro.id}(${primerNombreCliente}).pdf`;
                } else {
                    nombreArchivo = `NT-${registro.id}.pdf`;
                }
                // Descargar el PDF
                doc.save(nombreArchivo);

            } catch (error) {
                console.error('Error generando PDF:', error);
                mostrarNotificacion({
                    message: `Error al generar PDF para registro ${registro.id}`,
                    type: 'error',
                    duration: 3500
                });
            }
        });

        mostrarNotificacion({
            message: `Se descargaron ${registrosVisibles.length} registros en archivos PDF separados`,
            type: 'success',
            duration: 3000
        });
    } else {
        mostrarNotificacion({
            message: 'Exportación PDF solo disponible para registros de almacén',
            type: 'warning',
            duration: 3500
        });
    }
}
export function scrollToTop(view) {
    const view2 = document.querySelector(view);
    if (view2 && view2.scrollTo) {
        view2.scrollTo({
            top: 0,
            behavior: 'smooth' // Esto hace que el scroll sea suave
        });
    } else {
        console.warn('El parámetro "view" no es un contenedor válido.');
    }
}
const permisos = {
    creacion: false,
    eliminacion: false,
    edicion: false,
    anulacion: false
};
export function actualizarPermisos(recuperar) {
    const usuario = recuperar;
    if (!usuario) return;

    permisos.creacion = usuario.rol === 'Administración' || usuario.permisos?.includes('creacion');
    permisos.eliminacion = usuario.rol === 'Administración' || usuario.permisos?.includes('eliminacion');
    permisos.edicion = usuario.rol === 'Administración' || usuario.permisos?.includes('edicion');
    permisos.anulacion = usuario.rol === 'Administración' || usuario.permisos?.includes('anulacion');
}
export function tienePermiso(tipo) {
    return permisos[tipo] || false;
}



export async function registrarNotificacion(destino, suceso, detalle) {
    try {
        const response = await fetch('/registrar-notificacion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                destino,
                suceso,
                detalle
            })
        });

        const data = await response.json();

        if (data.success) {
            return true;
        } else {
            throw new Error(data.error || 'Error al registrar la notificación');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion({
            message: 'Error al registrar la notificación',
            type: 'error',
            duration: 3000
        });
        return false;
    }
}
export let usuarioInfo = {
    id: '',
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    foto: '',
    rol: '',
    estado: '',
    plugins: '',
    permisos: ''
};



let controladorCancelacion = null;
let contadorInterval = null;

export function mostrarCarga(tipo) {
    const cargaDiv = document.querySelector(tipo);
    cargaDiv.classList.remove('slide-out-flotante');
    cargaDiv.classList.add('slide-in-flotante');
    cargaDiv.style.display = 'flex';
}
export function ocultarCarga(tipo) {
    const cargaDiv = document.querySelector(tipo);
    cargaDiv.classList.remove('slide-in-flotante');
    cargaDiv.classList.add('slide-out-flotante');
}


export async function initDB(STORE, DB) {
    const ALL_STORES = [
        'prductos_alm',
        'pedidos_acopio',
        'precios_alm',
        'etiquetas_almacen',
        'etiquetas_acopio',
        'clientes',
        'proveedores',
        'nombres_usuarios',
        'ordenes_produccion',
        'registros_acopio',
        'tareas_acopio',
        'registros_tareas_acopio',
        'tareas_acopio',
        'etiquetas_web',
        'precios_alm',
        'precios_web',
        'pagos',
        'personal',
        'productos_acopio',
        'registros_almacen',
        'registros-conteo',
        'productos_form',
        'mis_registros_produccion',
        'registros_produccion',
        'nombres_produccion',
        'reglas_produccion_base',
        'reglas_produccion',
    ];
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB, 1); // Siempre usa versión 1

        request.onerror = () => reject(request.error);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            ALL_STORES.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id' });
                }
            });
        };
    });
}
export async function obtenerLocal(STORE, DB) {
    try {
        const db = await initDB(STORE, DB);
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const items = request.result.map(item => item.data);
                resolve(items);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error obtener desde el cache', error);
        return [];
    }
}


export function normalizarTexto(texto) {
    return (texto || '').toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[-_\s]+/g, '');
}

export function scrollToCenter(boton, contenedorPadre) {
    const scrollLeft = boton.offsetLeft - (contenedorPadre.offsetWidth / 2) + (boton.offsetWidth / 2);
    contenedorPadre.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
    });
}