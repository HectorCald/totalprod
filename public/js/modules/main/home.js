let registrosProduccion = [];
let registrosMovimientos = [];
let movimientosAcopio = [];
const REGISTROS_STORE = 'registros_verificacion';
const DB_NAME = 'damabrava_db';

const APP_VERSION = '2.0.0';
const UPDATE_DETAILS = {
    version: APP_VERSION,
    title: 'Nueva Actualización Disponible',
    changes: [
        'Mejoras en el rendimiento general',
        'Nuevas características añadidas',
        'Corrección de errores conocidos',
        'Actualización de la interfaz de usuario'
    ]
};

async function initDB() {
    return new Promise((resolve, reject) => {
        // Primero intentar obtener la versión actual de la base de datos
        const request = indexedDB.open(DB_NAME);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const currentVersion = db.version;
            db.close();
            
            // Abrir la base de datos con la versión actual + 1
            const upgradeRequest = indexedDB.open(DB_NAME, currentVersion + 1);
            
            upgradeRequest.onerror = () => reject(upgradeRequest.error);
            upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);
        };
    });
}
async function obtenerRegistrosLocal() {
    try {
        const db = await initDB();
        const tx = db.transaction(REGISTROS_STORE, 'readonly');
        const store = tx.objectStore(REGISTROS_STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const registros = request.result.map(item => item.data);
                resolve(registros);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error obteniendo registros del caché:', error);
        return [];
    }
}
function obtenerAtajosGuardados() {
    const atajosGuardados = localStorage.getItem(`atajos_${usuarioInfo.rol}`);
    return atajosGuardados ? JSON.parse(atajosGuardados) : null;
}
async function obtenerUsuario() {
    try {
        ocultarCarga();
        const response = await fetch('/obtener-usuario-actual');
        const data = await response.json();

        if (data.success) {
            const nombreCompleto = data.usuario.nombre.split(' ');
            usuarioInfo = {
                id: data.usuario.id,
                nombre: nombreCompleto[0] || '',
                apellido: nombreCompleto[1] || '',
                telefono: data.usuario.telefono,
                email: data.usuario.email,
                rol: data.usuario.rol,
                estado: data.usuario.estado,
                plugins: data.usuario.plugins,
                permisos: data.usuario.permisos,
            };

            // Procesar la foto
            if (!data.usuario.foto || data.usuario.foto === './icons/icon.png') {
                usuarioInfo.foto = './icons/icon.png';
            } else if (data.usuario.foto.startsWith('data:image')) {
                usuarioInfo.foto = data.usuario.foto;
            } else {
                try {
                    const imgResponse = await fetch(data.usuario.foto);
                    if (!imgResponse.ok) throw new Error('Error al cargar la imagen');
                    const blob = await imgResponse.blob();
                    usuarioInfo.foto = URL.createObjectURL(blob);
                } catch (error) {
                    console.error('Error al cargar imagen:', error);
                    usuarioInfo.foto = './icons/icon.png';
                }
            }

            // Guardar en localStorage después de obtener del servidor
            localStorage.setItem('damabrava_usuario', JSON.stringify(usuarioInfo));
            return true;
        } else {
            // Si falla el servidor, intentar recuperar del localStorage
            const usuarioGuardado = localStorage.getItem('damabrava_usuario');
            if (usuarioGuardado) {
                usuarioInfo = JSON.parse(usuarioGuardado);
                return true;
            }

            mostrarNotificacion({
                message: 'Error al obtener datos del usuario',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        mostrarNotificacion({
            message: 'Error al obtener datos del usuario',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}

async function obtenerMisRegistros() {
    try {
        const registros = await obtenerRegistrosLocal();

        if (registros.length === 0) {
            return false;
        }

        if (usuarioInfo.rol === 'Producción') {
            registrosProduccion = registros
                .filter(registro => registro.user === usuarioInfo.email)
                .sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA;
                });
        } else if (usuarioInfo.rol === 'Administración') {
            registrosProduccion = registros
                .sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA;
                });
        }

        return true;
    } catch (error) {
        console.error('Error al obtener registros:', error);
        mostrarNotificacion({
            message: 'Error al obtener registros de producción',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerMovimientosAlmacen() {
    try {
        const response = await fetch('/obtener-movimientos-almacen');
        const data = await response.json();

        if (data.success) {
            // Store movements in global variable and sort by date (most recent first)
            registrosMovimientos = data.movimientos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Orden descendente por número de ID
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener movimientos de almacén',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        mostrarNotificacion({
            message: 'Error al obtener movimientos de almacén',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerMovimientosAcopio() {
    try {
        const response = await fetch('/obtener-movimientos-acopio');
        const data = await response.json();

        if (data.success) {
            movimientosAcopio = data.movimientos.map(movimiento => {
                return {
                    id: movimiento.id,
                    fecha: movimiento.fecha,
                    tipo: movimiento.tipo,
                    idProducto: movimiento.idProducto,
                    producto: movimiento.producto,
                    peso: movimiento.peso,
                    operario: movimiento.operario,
                    nombreMovimiento: movimiento.nombreMovimiento,
                    caracteristicas: movimiento.caracteristicas,
                    observaciones: movimiento.observaciones
                };
            }).sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener movimientos',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        mostrarNotificacion({
            message: 'Error al obtener movimientos',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
const atajosPorRol = {
    'Producción': [
        {
            clase: 'opcion-btn',
            vista: 'formProduccion-view',
            icono: 'fa-clipboard-list',
            texto: 'Formulario',
            detalle: 'Registro de producción',
            onclick: 'onclick="mostrarFormularioProduccion();"'
        },
        {
            clase: 'opcion-btn',
            vista: 'cuentasProduccion-view',
            icono: 'fa-history',
            texto: 'Mis registros',
            detalle: 'Registros de producción',
            onclick: 'onclick="mostrarMisRegistros();"'
        },
        {
            clase: 'opcion-btn',
            vista: 'cuentasProduccion-view',
            icono: 'fa-chart-bar',
            texto: 'Estadisticas',
            detalle: 'Estadisticas registradas',
            onclick: 'onclick="mostrarMisEstadisticas();"'
        },
    ],
    'Acopio': [
        {
            clase: 'opcion-btn',
            vista: 'almAcopio-view',
            icono: 'fa-dolly',
            texto: 'Almacen Ac.',
            detalle: 'Gestiona acopio',
            onclick: 'onclick="mostrarAlmacenAcopio();"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-arrow-down',
            texto: 'Ingresos Ac.',
            detalle: 'Ingresos a acopio',
            onclick: 'onclick="mostrarIngresosAcopio()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAlmacen-view',
            icono: 'fa-arrow-up',
            texto: 'Salidas Ac.',
            detalle: 'Salidas de acopio',
            onclick: 'onclick="mostrarSalidasAcopio()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almAcopio-view',
            icono: 'fa-shopping-cart',
            texto: 'Nuevo Pedido',
            detalle: 'Hacer nuevo pedido',
            onclick: 'onclick="mostrarHacerPedido()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAcopio-view',
            icono: 'fa-history',
            texto: 'Pedidos',
            detalle: 'Gestiona los pedidos',
            onclick: 'onclick="mostrarPedidos();"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAlmacen-view',
            icono: 'fa-history',
            texto: 'Registros Ac.',
            detalle: 'Registros de acopio',
            onclick: 'onclick="mostrarRegistrosAcopio();"'
        },
    ],
    'Almacen': [
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-dolly',
            texto: 'Almacen',
            detalle: 'Gestiona el almacen.',
            onclick: 'onclick="mostrarAlmacenGeneral()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-arrow-down',
            texto: 'Ingresos',
            detalle: 'Ingresos del almacen.',
            onclick: 'onclick="mostrarIngresos()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAlmacen-view',
            icono: 'fa-arrow-up',
            texto: 'Salidas',
            detalle: 'Salidas del almacen.',
            onclick: 'onclick="mostrarSalidas()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-clipboard-list',
            texto: 'Conteo fisico',
            detalle: 'Realiza conteos.',
            onclick: 'onclick="mostrarConteo()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'verificarRegistros-view',
            icono: 'fa-check-double',
            texto: 'Verificar',
            detalle: 'Verifica registros.',
            onclick: 'onclick="mostrarVerificacion()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAlmacen-view',
            icono: 'fa-history',
            texto: 'Registros A.',
            detalle: 'Registros de almacen.',
            onclick: 'onclick="mostrarMovimientosAlmacen()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-history',
            texto: 'Registros C.',
            detalle: 'Registros de conteos.',
            onclick: 'onclick="registrosConteoAlmacen()"'
        }
    ],
    'Administración': [
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-user-circle',
            texto: 'Clientes',
            detalle: 'Gestiona tus clientes',
            onclick: 'onclick="mostrarClientes()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-truck',
            texto: 'Proovedores',
            detalle: 'Gestiona tus proovedores',
            onclick: 'onclick="mostrarProovedores()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-users',
            texto: 'Personal',
            detalle: 'Gestiona tus empleados',
            onclick: 'onclick="mostrarPersonal()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-credit-card',
            texto: 'Pagos',
            detalle: 'Realiza y registra pagos.',
            onclick: 'onclick="mostrarPagos()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-file-invoice',
            texto: 'Reportes',
            detalle: 'Genera reportes.',
            onclick: 'onclick="mostrarReportes()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-file-pdf',
            texto: 'Catalogos',
            detalle: 'Genera catalagos',
            onclick: 'onclick="mostrarDescargaCatalogo()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-cog',
            texto: 'Ajustes',
            detalle: 'Ajustes del sistema',
            onclick: 'onclick="mostrarConfiguracionesSistema()"'
        },

    ]
};
const pluginsMenu = {
    'calcularmp': {
        clase: 'opcion-btn',
        vista: 'calculadora-view',
        icono: 'fa-calculator',
        texto: 'Materia Prima',
        detalle: 'Calculadora de materia prima',
        onclick: 'onclick="mostrarCalcularMp();"'
    },
    'tareasAc': {
        clase: 'opcion-btn',
        vista: 'regAcopio-view',
        icono: 'fa-tasks',
        texto: 'Tareas Acopio',
        detalle: 'Gestiona el tiempo en tareas.',
        onclick: 'onclick="mostrarTareas();"'
    },
    'formProduccion': {
        clase: 'opcion-btn',
        vista: 'formProduccion-view',
        icono: 'fa-clipboard-list',
        texto: 'Formulario Producción',
        detalle: 'Registra una nueva producción.',
        onclick: 'onclick="mostrarFormularioProduccion();"'
    },
    'misRegistrosProd': {
        clase: 'opcion-btn',
        vista: 'cuentasProduccion-view',
        icono: 'fa-history',
        texto: 'Mis registros producción',
        detalle: 'Tus registros de producción.',
        onclick: 'onclick="mostrarMisRegistros();"'
    },
    'reglasPrecios': {
        clase: 'opcion-btn',
        vista: 'cuentasProduccion-view',
        icono: 'fa-solid fa-book',
        texto: 'Reglas precios',
        detalle: 'Todas las reglas para precios.',
        onclick: 'onclick="mostrarReglas();"'
    },
    'verificarRegistros': {
        clase: 'opcion-btn',
        vista: 'verificarRegistros-view',
        icono: 'fa-history',
        texto: 'Verificar registros',
        detalle: 'Todos los registros de producción.',
        onclick: 'onclick="mostrarVerificacion()"'
    },
    'almAcopio': {
        clase: 'opcion-btn',
        vista: 'almAcopio-view',
        icono: 'fa-dolly',
        texto: 'Almacen acopio',
        detalle: 'Gestiona el almacen de acopio.',
        onclick: 'onclick="mostrarAlmacenAcopio();"'
    },
    'ingresosAcopio': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-arrow-down',
        texto: 'Ingresos acopio',
        detalle: 'Ingresos al almacen de acopio.',
        onclick: 'onclick="mostrarIngresosAcopio()"'
    },
    'salidasAcopio': {
        clase: 'opcion-btn',
        vista: 'regAlmacen-view',
        icono: 'fa-arrow-up',
        texto: 'Salidas acopio',
        detalle: 'Salidas del almacen acopio.',
        onclick: 'onclick="mostrarSalidasAcopio()"'
    },
    'nuevoPedido': {
        clase: 'opcion-btn',
        vista: 'almAcopio-view',
        icono: 'fa-shopping-cart',
        texto: 'Nuevo Pedido',
        detalle: 'Realiza pedidos de materia prima.',
        onclick: 'onclick="mostrarHacerPedido()"'
    },
    'pedidos': {
        clase: 'opcion-btn',
        vista: 'regAcopio-view',
        icono: 'fa-history',
        texto: 'Pedidos',
        detalle: 'Gestiona todos los pedidos.',
        onclick: 'onclick="mostrarPedidos();"'
    },
    'registrosAcopio': {
        clase: 'opcion-btn',
        vista: 'regAlmacen-view',
        icono: 'fa-history',
        texto: 'Registros acopio',
        detalle: 'Todos los registros de acopio.',
        onclick: 'onclick="mostrarRegistrosAcopio();"'
    },
    'almacenGeneral': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-dolly',
        texto: 'Almacen general',
        detalle: 'Gestiona el almacen general.',
        onclick: 'onclick="mostrarAlmacenGeneral()"'
    },
    'ingresosAlmacen': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-arrow-down',
        texto: 'Ingresos almacén',
        detalle: 'Ingresos del almacen general.',
        onclick: 'onclick="mostrarIngresos()"'
    },
    'salidasAlmacen': {
        clase: 'opcion-btn',
        vista: 'regAlmacen-view',
        icono: 'fa-arrow-up',
        texto: 'Salidas almacén',
        detalle: 'Salidas del almacen general.',
        onclick: 'onclick="mostrarSalidas()"'
    },
    'conteoFisico': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-clipboard-list',
        texto: 'Conteo fisico',
        detalle: 'Realiza conteos del almacen',
        onclick: 'onclick="mostrarConteo()"'
    },
    'verificarAlmacen': {
        clase: 'opcion-btn',
        vista: 'verificarRegistros-view',
        icono: 'fa-check-double',
        texto: 'Verificar almacén',
        detalle: 'Verifica registros de producción.',
        onclick: 'onclick="mostrarVerificacion()"'
    },
    'registrosAlmacen': {
        clase: 'opcion-btn',
        vista: 'regAlmacen-view',
        icono: 'fa-history',
        texto: 'Registros almacen',
        detalle: 'Todos los registros de almacen.',
        onclick: 'onclick="mostrarMovimientosAlmacen()"'
    },
    'registrosConteo': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-history',
        texto: 'Registros conteo',
        detalle: 'Todos los registros de conteo.',
        onclick: 'onclick="registrosConteoAlmacen()"'
    },
    'personal': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-users',
        texto: 'Personal',
        detalle: 'Gestiona todo el personal.',
        onclick: 'onclick="mostrarPersonal()"'
    },
    'clientes': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-user-circle',
        texto: 'Clientes',
        detalle: 'Gestiona todos los clientes.',
        onclick: 'onclick="mostrarClientes()"'
    },
    'proovedores': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-truck',
        texto: 'Proovedores',
        detalle: 'Gestiona todos los proovedores.',
        onclick: 'onclick="mostrarProovedores()"'
    },
    'pagos': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-credit-card',
        texto: 'Pagos',
        detalle: 'Registra pagos en general.',
        onclick: 'onclick="mostrarPagos()"'
    },
    'reportes': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-file-invoice',
        texto: 'Reportes',
        detalle: 'Genera todos los reportes.',
        onclick: 'onclick="mostrarReportes()"'
    },
    'catalogos': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-file-pdf',
        texto: 'Catalogos',
        detalle: 'Genera catalagos segun el precio',
        onclick: 'onclick="mostrarDescargaCatalogo()"'
    },
    'ajustes': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-cog',
        texto: 'Ajustes',
        detalle: 'Ajustes del sistema o/y aplicación',
        onclick: 'onclick="mostrarConfiguracionesSistema()"'
    }
};

function esPantallaGrande() {
    return window.innerWidth >= 1024; // Ajusta este valor según tus necesidades
}
function getMaxAtatjos() {
    return esPantallaGrande() ? 5: 3;
}
function obtenerFunciones() {
    const rol = usuarioInfo.rol;
    const atajosGuardados = obtenerAtajosGuardados();
    const maxAtatjos = getMaxAtatjos();

    if (atajosGuardados) {
        if (rol === 'Administración') {
            // Para administración, buscar en todos los roles y plugins
            return atajosGuardados.map(id => {
                // Primero buscar en los roles
                for (const rolOpciones of Object.values(atajosPorRol)) {
                    const atajo = rolOpciones.find(a => a.texto === id);
                    if (atajo) return atajo;
                }
                // Luego buscar en los plugins
                const plugin = Object.values(pluginsMenu).find(p => p.texto === id);
                if (plugin) return plugin;

                return null;
            }).filter(Boolean);
        } else {
            // Para otros roles, buscar en su rol específico y sus plugins activos
            let atajosDisponibles = [...(atajosPorRol[rol] || [])];

            // Agregar plugins si están activos para este usuario
            if (usuarioInfo.plugins) {
                Object.keys(pluginsMenu).forEach(plugin => {
                    if (usuarioInfo.plugins.includes(plugin)) {
                        atajosDisponibles.push(pluginsMenu[plugin]);
                    }
                });
            }

            return atajosGuardados.map(id =>
                atajosDisponibles.find(atajo => atajo.texto === id)
            ).filter(Boolean);
        }
    }

    // Si no hay atajos guardados, usar los primeros según el tamaño de pantalla
    let atajosDisponibles = [...(atajosPorRol[rol] || [])];

    // Agregar plugins disponibles para el usuario
    if (rol === 'Administración') {
        // Para administración, agregar todos los plugins
        atajosDisponibles = [...atajosDisponibles, ...Object.values(pluginsMenu)];
    } else if (usuarioInfo.plugins) {
        // Para otros roles, solo agregar sus plugins activos
        Object.keys(pluginsMenu).forEach(plugin => {
            if (usuarioInfo.plugins.includes(plugin)) {
                atajosDisponibles.push(pluginsMenu[plugin]);
            }
        });
    }

    return atajosDisponibles.slice(0, maxAtatjos); // CAMBIO AQUÍ: usar maxAtatjos en lugar de 3
}

function editarAtajos() {
    const contenido = document.querySelector('.anuncio .contenido');
    const rol = usuarioInfo.rol;
    const maxAtatjos = getMaxAtatjos();
    const atajosActuales = obtenerAtajosGuardados() ||
        atajosPorRol[rol].slice(0, maxAtatjos).map(a => a.texto); // CAMBIO AQUÍ

    let atajosHTML = '';

    if (rol === 'Administración') {
        const pluginsKeys = Object.keys(pluginsMenu).slice(0, 2); // Obtiene las dos primeras claves
        const plugins = pluginsKeys.map(key => pluginsMenu[key]);
        // Agrupar por roles y plugins
        const grupos = {
            'Administración': atajosPorRol['Administración'],
            'Producción': atajosPorRol['Producción'],
            'Almacen': atajosPorRol['Almacen'],
            'Acopio': atajosPorRol['Acopio'],
            'Plugins': Object.values(plugins)
        };

        // Generar HTML por grupos
        atajosHTML = Object.entries(grupos).map(([titulo, opciones]) => `
            <div class="grupo-atajos">
                <h2 class="normal">${titulo}</h2>
                <div class="atajos-lista">
                    ${opciones.map(atajo => `
                        <div class="atajo-item">
                            <input type="checkbox" 
                                   value="${atajo.texto}" 
                                   ${atajosActuales.includes(atajo.texto) ? 'checked' : ''}
                                   onchange="actualizarSeleccion(this)">
                            <i class="fas ${atajo.icono}"></i>
                            <span>${atajo.texto}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } else {
        // Para otros roles, mostrar sus opciones y plugins activos
        const atajosDisponibles = [...(atajosPorRol[rol] || [])];

        // Agregar plugins si están activos
        if (usuarioInfo.plugins) {
            Object.keys(pluginsMenu).forEach(plugin => {
                if (usuarioInfo.plugins.includes(plugin)) {
                    atajosDisponibles.push(pluginsMenu[plugin]);
                }
            });
        }

        atajosHTML = `
            <div class="atajos-lista">
                ${atajosDisponibles.map(atajo => `
                    <div class="atajo-item">
                        <input type="checkbox" 
                               value="${atajo.texto}" 
                               ${atajosActuales.includes(atajo.texto) ? 'checked' : ''}
                               onchange="actualizarSeleccion(this)">
                        <i class="fas ${atajo.icono}"></i>
                        <span>${atajo.texto}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    const html = `
        <div class="encabezado">
            <h1 class="titulo">Editar atajos</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')">
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>
        <div class="relleno">
            <p class="normal">Selecciona ${maxAtatjos} atajos para mostrar en inicio</p>
            ${atajosHTML}
            <div class="busqueda">
                <div class="acciones-grande" style="min-width:100%">
                    <button class="btn-guardar btn blue" onclick="guardarAtajos()" style="min-width:100%;"><i class="fas fa-save" style="color:white !important"></i> Guardar cambios</button>
                </div>
            </div>
        </div>
        <div class="anuncio-botones">
            <button class="btn-guardar btn blue" onclick="guardarAtajos()">
                <i class="fas fa-save"></i> Guardar cambios
            </button>
        </div>
    `;

    contenido.innerHTML = html;
    contenido.style.paddingBottom = '70px';
    mostrarAnuncio();
    contenido.style.maxWidth = '450px';
}



window.editarAtajos = editarAtajos;
window.actualizarSeleccion = function (checkbox) {
    const checkboxes = document.querySelectorAll('.atajos-lista input[type="checkbox"]');
    const seleccionados = [...checkboxes].filter(cb => cb.checked);
    const maxAtatjos = getMaxAtatjos();

    if (seleccionados.length > maxAtatjos) {
        checkbox.checked = false;
        mostrarNotificacion({
            message: `Solo puedes seleccionar ${maxAtatjos} atajos`,
            type: 'warning',
            duration: 3000
        });
    }
};
window.guardarAtajos = function () {
    const checkboxes = document.querySelectorAll('.atajos-lista input[type="checkbox"]:checked');
    const seleccionados = [...checkboxes].map(cb => cb.value);
    const maxAtatjos = getMaxAtatjos();

    if (seleccionados.length !== maxAtatjos) {
        mostrarNotificacion({
            message: `Debes seleccionar exactamente ${maxAtatjos} atajos`,
            type: 'warning',
            duration: 3000
        });
        return;
    }

    localStorage.setItem(`atajos_${usuarioInfo.rol}`, JSON.stringify(seleccionados));
    cerrarAnuncioManual('anuncio');
    mostrarHome(document.querySelector('.home-view'));

    mostrarNotificacion({
        message: 'Atajos actualizados correctamente',
        type: 'success',
        duration: 3000
    });
};
window.addEventListener('resize', () => {
    // Recargar atajos si cambió el tamaño de pantalla
    const view = document.querySelector('.home-view');
    if (view && view.style.display !== 'none') {
        mostrarHome(view);
    }
});

function checkForUpdates() {
    const currentVersion = localStorage.getItem('app_version');
    
    if (!currentVersion || currentVersion !== APP_VERSION) {
        showUpdateModal();
    }
}

function showUpdateModal() {
    const modalHTML = `
        <div class="update-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${UPDATE_DETAILS.title}</h2>
                    <p>Versión ${UPDATE_DETAILS.version}</p>
                </div>
                <div class="modal-body">
                    <div class="update-details">
                        <h3>Cambios en esta versión:</h3>
                        <ul>
                            ${UPDATE_DETAILS.changes.map(change => `<li>${change}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-update">
                        <span class="spinner"></span>
                        Actualizar Ahora
                    </button>
                </div>
                <div class="logo-of">
                    <h1>TP</h1>
                    <div class="info-logo">
                        <p class="nombre-logo">TotalProd</p>
                        <p class="slogan-logo">Gestiona mejor, produce mas.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.querySelector('.update-modal');
    const btnUpdate = modal.querySelector('.btn-update');
    
    btnUpdate.addEventListener('click', async () => {
        btnUpdate.classList.add('updating');
        btnUpdate.disabled = true;

        try {
            // Eliminar completamente las bases de datos
            await new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase('damabrava_db');
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });

            await new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase('damabrava_db_img');
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });

            // Simular proceso de actualización
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Guardar nueva versión
            localStorage.setItem('app_version', APP_VERSION);

            // Recargar la aplicación
            window.location.href = '/';
        } catch (error) {
            console.error('Error durante la actualización:', error);
            btnUpdate.classList.remove('updating');
            btnUpdate.disabled = false;
            mostrarNotificacion({
                message: 'Error durante la actualización',
                type: 'error',
                duration: 3000
            });
        }
    });

    requestAnimationFrame(() => modal.classList.add('active'));
}

export async function crearHome() {
    const view = document.querySelector('.home-view');
    view.style.opacity = '0';

    // Verificar actualizaciones
    checkForUpdates();

    await obtenerUsuario();
    crearNav(usuarioInfo);
    crearPerfil(usuarioInfo);
    actualizarPermisos(usuarioInfo);
    crearNotificaciones(usuarioInfo);

    const promesas = [
        usuarioInfo.rol === 'Producción' ? obtenerMisRegistros() : null,
        usuarioInfo.rol === 'Almacen' ? obtenerMovimientosAlmacen() : null,
        usuarioInfo.rol === 'Acopio' ? obtenerMovimientosAcopio() : null,
        usuarioInfo.rol === 'Administración' ? Promise.all([
            obtenerMisRegistros(),
            obtenerMovimientosAlmacen(),
            obtenerMovimientosAcopio()
        ]) : null
    ].filter(Boolean); // Filtramos los null

    Promise.all(promesas).then(() => {
        mostrarHome(view);
        requestAnimationFrame(() => {
            view.style.opacity = '1';
        });
    });
}
export function mostrarHome(view) {
    const funcionesUsuario = obtenerFunciones();
    const diasAMostrar = getDiasGrafico();
    const funcionesHTML = `
        <div class="funciones-rol">
            ${funcionesUsuario.map(funcion => `
                <div class="funcion" ${funcion.onclick}>
                    <i class='fas ${funcion.icono}'></i>
                    <p class="nombre">${funcion.texto}</p>
                    <p class="detalle">${funcion.detalle}</p>
                </div>
            `).join('')}
        </div>
    `;


    // Determinar qué registros mostrar según el rol
    let registrosFiltrados = [];
    let tipoRegistro = '';

    switch (usuarioInfo.rol) {
        case 'Producción':
            registrosFiltrados = registrosProduccion;
            tipoRegistro = 'producción';
            break;
        case 'Almacen':
            registrosFiltrados = registrosMovimientos;
            tipoRegistro = 'almacén';
            break;
        case 'Acopio':
            registrosFiltrados = movimientosAcopio;
            tipoRegistro = 'almacén';
            break;
        case 'Administración':
            registrosFiltrados = [];
            tipoRegistro = 'todos';
            break;
    }

    // Calcular los destacados según el rol
    let destacados = {};
    if (usuarioInfo.rol === 'Producción') {
        const totalRegistros = registrosFiltrados.length;
        const verificados = registrosFiltrados.filter(registro => registro.fecha_verificacion).length;
        destacados = {
            total: totalRegistros,
            verificados: verificados,
            noVerificados: totalRegistros - verificados
        };
    } else if (usuarioInfo.rol === 'Almacen') {
        const entradas = registrosFiltrados.filter(registro => registro.tipo === 'Ingreso').length;
        const salidas = registrosFiltrados.filter(registro => registro.tipo === 'Salida').length;
        destacados = {
            total: registrosFiltrados.length,
            entradas: entradas,
            salidas: salidas
        };
    }
    else if (usuarioInfo.rol === 'Acopio') {
        const entradas = registrosFiltrados.filter(registro =>
            registro.tipo === 'Ingreso bruto' || registro.tipo === 'Ingreso prima'
        ).length;

        const salidas = registrosFiltrados.filter(registro =>
            registro.tipo === 'Salida bruto' || registro.tipo === 'Salida prima'
        ).length;

        destacados = {
            total: registrosFiltrados.length,
            entradas: entradas,
            salidas: salidas
        };
    } else if (usuarioInfo.rol === 'Administración') {
        destacados = {
            totalProduccion: registrosProduccion.length,
            totalAlmacen: registrosMovimientos.length,
            totalAcopio: movimientosAcopio.length
        };
    }


    const home = `
        <h1 class="titulo"><i class='bx bx-home'></i> Inicio</h1>
        <div class="seccion1">
            <h2 class="normal" style="display:flex; align-items:center">Tus atajos<button class="btn-editar-atajos" onclick="editarAtajos()">
                <i class='bx bx-edit'></i>
            </button></h2>
            <div class="funciones-rol">
                ${funcionesHTML}
            </div>
        </div>
        <div class="seccion3">
            <h2 class="normal">Tus destacados</h2>
            <div class="destacados">
                ${usuarioInfo.rol === 'Producción' ? `
                    <div class="destacado">
                        <p class="cantidad blue">${destacados.total}</p>
                        <p class="tipo">Registros</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad green">${destacados.verificados}</p>
                        <p class="tipo">Verificados</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad yellow">${destacados.noVerificados}</p>
                        <p class="tipo">No verificados</p>
                    </div>
                ` : usuarioInfo.rol === 'Administración' ? `
                    <div class="destacado">
                        <p class="cantidad blue">${destacados.totalProduccion}</p>
                        <p class="tipo">Registros Producción</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad green">${destacados.totalAlmacen}</p>
                        <p class="tipo">Registros Almacén</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad yellow">${destacados.totalAcopio}</p>
                        <p class="tipo">Registros Acopio</p>
                    </div>
                ` : `
                    <div class="destacado">
                        <p class="cantidad blue">${destacados.total}</p>
                        <p class="tipo">Registros</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad green">${destacados.entradas}</p>
                        <p class="tipo">Ingresos</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad yellow">${destacados.salidas}</p>
                        <p class="tipo">Salidas</p>
                    </div>
                `}
            </div>
        </div>
        <div class="seccion2">
            <h2 class="normal nota">Actividad de los últimos ${diasAMostrar} días</h2>
            <canvas id="graficoVelas"></canvas>
        </div>
    `;

    view.innerHTML = home;
    const nota = document.querySelector('.nota');
    if (usuarioInfo.rol === 'Producción') {
        crearGraficoVelas();
    } else if (usuarioInfo.rol === 'Almacen') {
        crearGraficoAlmacen();
    } else if (usuarioInfo.rol === 'Acopio') {
        crearGraficoAcopio();
    } else if (usuarioInfo.rol === 'Administración') {
        crearGraficoVelas();
    }
    const screenStart = document.querySelector('.pro-start')
    screenStart.classList.remove('slide-in-flotante')
    screenStart.classList.add('slide-out-flotante');
    const funciones = document.querySelectorAll('.funcion');
    const opciones = document.querySelectorAll('.opcion');

    funciones.forEach(funcion => {
        funcion.addEventListener('click', () => {
            // 1. Quitar clase activa de todas las opciones
            opciones.forEach(op => op.classList.remove('opcion-activa'));

            // 2. Obtener el icono de la función
            const iconoFuncion = funcion.querySelector('i');
            const clasesIconoFuncion = Array.from(iconoFuncion.classList); // ['fas', 'fa-home']

            // 3. Buscar opción con el mismo ícono
            opciones.forEach(opcion => {
                const iconoOpcion = opcion.querySelector('i');
                const clasesIconoOpcion = Array.from(iconoOpcion.classList);

                // 4. Verificamos si ambas tienen la misma clase de ícono (ej: 'fa-home')
                const coincide = clasesIconoFuncion.some(clase =>
                    clase.startsWith('fa-') && clasesIconoOpcion.includes(clase)
                );

                if (coincide) {
                    opcion.classList.add('opcion-activa');
                }
            });
        });
    });
}
function getDiasGrafico() {
    const width = window.innerWidth;
    if (width >= 1920) return 30;      // Pantalla muy grande: 30 días
    if (width >= 1440) return 21;      // Pantalla grande: 21 días  
    if (width >= 1024) return 14;      // Pantalla mediana: 14 días
    return 7;                          // Pantalla pequeña: 7 días
}
function crearGraficoVelas() {
    if (!registrosProduccion || registrosProduccion.length === 0) {
        console.warn('No hay registros de producción para mostrar en el gráfico');
        return;
    }

    const diasAMostrar = getDiasGrafico();
    
    // Procesar datos para los últimos N días
    const ultimosDias = Array(diasAMostrar).fill().map((_, i) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        return fecha.toLocaleDateString('es-ES'); // Formato DD/MM/YYYY
    }).reverse();

    // Contar registros por día
    const datosPorDia = ultimosDias.map(fecha => {
        const registrosDia = registrosProduccion.filter(registro => {
            if (!registro.fecha) {
                console.warn('Registro sin fecha:', registro);
                return false;
            }
            return registro.fecha === fecha;
        });

        return registrosDia.length;
    });

    // Determinar colores según comparación con día anterior
    const colores = datosPorDia.map((cantidad, index) => {
        if (index === 0) return 'rgba(54, 162, 235, 0.5)'; // Azul para el primer día

        const cantidadAyer = datosPorDia[index - 1];
        if (cantidad > cantidadAyer) {
            return 'rgba(40, 167, 69, 0.5)'; // Verde si hay más registros
        } else if (cantidad < cantidadAyer) {
            return 'rgba(220, 53, 69, 0.5)'; // Rojo si hay menos registros
        } else {
            return 'rgba(255, 193, 7, 0.5)'; // Amarillo si es igual
        }
    });

    const canvas = document.getElementById('graficoVelas');
    if (!canvas) {
        console.error('No se encontró el elemento canvas con ID "graficoVelas"');
        return;
    }

    try {
        const ctx = canvas.getContext('2d');

        // Configuración de estilos modernos
        const estilos = {
            fuente: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            colorTexto: 'gray',
            colorFondo: 'none',
            colorGrid: 'rgba(0, 0, 0, 0.03)',
            colores: {
                aumento: '#4CAF50',
                disminucion: '#F44336',
                igual: '#FFC107',
                neutro: '#2196F3'
            }
        };

        // Reemplazar colores básicos con la paleta moderna
        const coloresModernos = colores.map(color => {
            if (color.includes('40, 167, 69')) return estilos.colores.aumento;
            if (color.includes('220, 53, 69')) return estilos.colores.disminucion;
            if (color.includes('255, 193, 7')) return estilos.colores.igual;
            return estilos.colores.neutro;
        });

        // Configurar labels según número de días
        let labels;
        if (diasAMostrar <= 7) {
            // Mostrar DD/MM para 7 días o menos
            labels = ultimosDias.map(fecha => fecha.split('/')[0] + '/' + fecha.split('/')[1]);
        } else if (diasAMostrar <= 14) {
            // Mostrar cada 2 días para 14 días
            labels = ultimosDias.map((fecha, index) => {
                return index % 2 === 0 ? fecha.split('/')[0] + '/' + fecha.split('/')[1] : '';
            });
        } else {
            // Mostrar cada 3 días para más de 14 días
            labels = ultimosDias.map((fecha, index) => {
                return index % 3 === 0 ? fecha.split('/')[0] + '/' + fecha.split('/')[1] : '';
            });
        }

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '',
                    data: datosPorDia,
                    backgroundColor: coloresModernos,
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: {
                        topLeft: 6,
                        topRight: 6,
                        bottomLeft: 0,
                        bottomRight: 0
                    },
                    barThickness: diasAMostrar > 14 ? 8 : diasAMostrar > 7 ? 15 : 20,
                    maxBarThickness: diasAMostrar > 14 ? 12 : diasAMostrar > 7 ? 20 : 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        right: 15,
                        bottom: 10,
                        left: 15
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#ffffff',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#e0e0e0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        bodyFont: {
                            family: estilos.fuente,
                            size: 13
                        },
                        titleFont: {
                            family: estilos.fuente,
                            size: 14,
                            weight: 'bold'
                        },
                        callbacks: {
                            label: function (context) {
                                return `${context.raw} registros`;
                            },
                            title: function (context) {
                                const fechaCompleta = ultimosDias[context[0].dataIndex];
                                return `Día ${fechaCompleta}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: estilos.colorGrid,
                            drawBorder: false,
                            drawTicks: false
                        },
                        ticks: {
                            color: estilos.colorTexto,
                            font: {
                                family: estilos.fuente,
                                size: 12
                            },
                            padding: 8
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: estilos.colorTexto,
                            font: {
                                family: estilos.fuente,
                                size: diasAMostrar > 14 ? 10 : 12
                            },
                            maxRotation: diasAMostrar > 14 ? 45 : 0
                        }
                    }
                }
            }
        });

        canvas.style.background = estilos.colorFondo;
        canvas.style.borderRadius = '12px';
        canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
    } catch (error) {
        console.error('Error al crear el gráfico:', error);
    }
}
function crearGraficoAlmacen() {
    if (!registrosMovimientos || registrosMovimientos.length === 0) {
        console.warn('No hay registros de movimientos para mostrar en el gráfico');
        return;
    }

    const diasAMostrar = getDiasGrafico();

    // Procesar datos para los últimos N días
    const ultimosDias = Array(diasAMostrar).fill().map((_, i) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        return fecha.toLocaleDateString('es-ES');
    }).reverse();

    // Sumar totales por día y contar movimientos
    const datosPorDia = ultimosDias.map(fecha => {
        const registrosDia = registrosMovimientos.filter(registro => {
            if (!registro.fecha_hora) {
                return false;
            }
            const registroFecha = registro.fecha_hora.split(',')[0].trim();
            return registroFecha === fecha;
        });

        const totalDia = registrosDia.reduce((sum, registro) => {
            return sum + (parseFloat(registro.total) || 0);
        }, 0);

        return totalDia;
    });

    // Determinar colores según comparación con día anterior
    const colores = datosPorDia.map((total, index) => {
        if (index === 0) return '#2196F3';
        const totalAyer = datosPorDia[index - 1];
        if (total > totalAyer) {
            return '#4CAF50';
        } else if (total < totalAyer) {
            return '#F44336';
        } else {
            return '#FFC107';
        }
    });

    const canvas = document.getElementById('graficoVelas');
    if (!canvas) {
        return;
    }

    try {
        const ctx = canvas.getContext('2d');

        // Configurar labels según número de días
        let labels;
        if (diasAMostrar <= 7) {
            labels = ultimosDias.map(fecha => fecha.split('/')[0] + '/' + fecha.split('/')[1]);
        } else if (diasAMostrar <= 14) {
            labels = ultimosDias.map((fecha, index) => {
                return index % 2 === 0 ? fecha.split('/')[0] + '/' + fecha.split('/')[1] : '';
            });
        } else {
            labels = ultimosDias.map((fecha, index) => {
                return index % 3 === 0 ? fecha.split('/')[0] + '/' + fecha.split('/')[1] : '';
            });
        }

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total movimientos $',
                    data: datosPorDia,
                    backgroundColor: colores,
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: {
                        topLeft: 6,
                        topRight: 6,
                        bottomLeft: 0,
                        bottomRight: 0
                    },
                    barThickness: diasAMostrar > 14 ? 8 : diasAMostrar > 7 ? 15 : 20,
                    maxBarThickness: diasAMostrar > 14 ? 12 : diasAMostrar > 7 ? 20 : 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        right: 15,
                        bottom: 10,
                        left: 15
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#ffffff',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#e0e0e0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        bodyFont: {
                            family: "'Inter', -apple-system, sans-serif",
                            size: 13
                        },
                        titleFont: {
                            family: "'Inter', -apple-system, sans-serif",
                            size: 14,
                            weight: 'bold'
                        },
                        callbacks: {
                            label: function (context) {
                                return `Total: $${context.raw.toFixed(2)}`;
                            },
                            title: function (context) {
                                const fechaCompleta = ultimosDias[context[0].dataIndex];
                                return `Día ${fechaCompleta}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.03)',
                            drawBorder: false,
                            drawTicks: false
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                family: "'Inter', -apple-system, sans-serif",
                                size: 12
                            },
                            padding: 8,
                            callback: function (value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                family: "'Inter', -apple-system, sans-serif",
                                size: diasAMostrar > 14 ? 10 : 12
                            },
                            maxRotation: diasAMostrar > 14 ? 45 : 0
                        }
                    }
                }
            }
        });

        canvas.style.background = 'none';
        canvas.style.borderRadius = '12px';
        canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';

    } catch (error) {
        console.error('Error al crear el gráfico de almacén:', error);
    }
}
function crearGraficoAcopio() {
    if (!movimientosAcopio || movimientosAcopio.length === 0) {
        console.warn('No hay registros de movimientos de acopio para mostrar en el gráfico');
        return;
    }

    const diasAMostrar = getDiasGrafico();

    const ultimosDias = Array(diasAMostrar).fill().map((_, i) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        return fecha.toLocaleDateString('es-ES');
    }).reverse();

    // Process data for each day
    const datos = ultimosDias.map(fecha => {
        const movimientosDia = movimientosAcopio.filter(mov => {
            const movFecha = mov.fecha.split(',')[0].trim();
            return movFecha === fecha;
        });

        const ingresoBruto = movimientosDia
            .filter(mov => mov.tipo === 'Ingreso bruto')
            .reduce((sum, mov) => sum + (parseFloat(mov.peso) || 0), 0);

        const ingresoPrima = movimientosDia
            .filter(mov => mov.tipo === 'Ingreso prima')
            .reduce((sum, mov) => sum + (parseFloat(mov.peso) || 0), 0);

        const salidaBruto = movimientosDia
            .filter(mov => mov.tipo === 'Salida bruto')
            .reduce((sum, mov) => sum + (parseFloat(mov.peso) || 0), 0);

        const salidaPrima = movimientosDia
            .filter(mov => mov.tipo === 'Salida prima')
            .reduce((sum, mov) => sum + (parseFloat(mov.peso) || 0), 0);

        return {
            ingresoBruto,
            ingresoPrima,
            salidaBruto,
            salidaPrima
        };
    });

    const canvas = document.getElementById('graficoVelas');
    if (!canvas) return;

    try {
        const ctx = canvas.getContext('2d');

        // Configurar labels según número de días
        let labels;
        if (diasAMostrar <= 7) {
            labels = ultimosDias.map(fecha => fecha.split('/')[0] + '/' + fecha.split('/')[1]);
        } else if (diasAMostrar <= 14) {
            labels = ultimosDias.map((fecha, index) => {
                return index % 2 === 0 ? fecha.split('/')[0] + '/' + fecha.split('/')[1] : '';
            });
        } else {
            labels = ultimosDias.map((fecha, index) => {
                return index % 3 === 0 ? fecha.split('/')[0] + '/' + fecha.split('/')[1] : '';
            });
        }

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ingresos Bruto',
                        data: datos.map(d => d.ingresoBruto),
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: diasAMostrar > 14 ? 2 : 3
                    },
                    {
                        label: 'Ingresos Prima',
                        data: datos.map(d => d.ingresoPrima),
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: diasAMostrar > 14 ? 2 : 3
                    },
                    {
                        label: 'Salidas Bruto',
                        data: datos.map(d => d.salidaBruto),
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: diasAMostrar > 14 ? 2 : 3
                    },
                    {
                        label: 'Salidas Prima',
                        data: datos.map(d => d.salidaPrima),
                        borderColor: '#FFC107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: diasAMostrar > 14 ? 2 : 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            font: {
                                family: "'Inter', sans-serif",
                                size: diasAMostrar > 14 ? 10 : 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#fff',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#e0e0e0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        bodyFont: {
                            family: "'Inter', sans-serif"
                        },
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.raw.toFixed(2)} Kg`;
                            },
                            title: function (context) {
                                const fechaCompleta = ultimosDias[context[0].dataIndex];
                                return `Día ${fechaCompleta}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.03)'
                        },
                        ticks: {
                            callback: value => `${value} Kg`,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif",
                                size: diasAMostrar > 14 ? 10 : 12
                            },
                            maxRotation: diasAMostrar > 14 ? 45 : 0
                        }
                    }
                }
            }
        });

        canvas.style.background = 'none';
        canvas.style.borderRadius = '12px';
        canvas.style.padding = '20px';
    } catch (error) {
        console.error('Error al crear el gráfico de acopio:', error);
    }
}

