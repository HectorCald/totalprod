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
    contenido.style.maxWidth='100%'


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
    }else if(anuncioSecond && anuncioSecond.classList.contains('mostrar')){
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

    } else if(anuncioTercer && anuncioTercer.classList.contains('mostrar')){
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


export function mostrarCarga() {
    const cargaDiv = document.querySelector('.carga');
    cargaDiv.style.display = 'flex';
}
export function ocultarCarga() {
    const cargaDiv = document.querySelector('.carga');
    cargaDiv.style.display = 'none';
}


export function crearNotificacion({ message, type = 'info', duration = 3000 }) {
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
