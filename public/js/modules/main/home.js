const APP_VERSION = '2.0.3';
const UPDATE_DETAILS = {
    version: APP_VERSION,
    title: 'Nueva Actualización Disponible',
    changes: [
        'Corrección de errores conocidos',
        'Nuevo manejo de ingresos a almacen',
        'Nuevas características añadidas',
        'Mejoras en el rendimiento general',
    ]
};

function obtenerAtajosGuardados() {
    const atajosGuardados = localStorage.getItem(`atajos_${usuarioInfo.rol}`);
    return atajosGuardados ? JSON.parse(atajosGuardados) : null;
}
async function obtenerUsuario() {
    try {
        if(localStorage.getItem('damabrava_usuario')){
            usuarioInfo = JSON.parse(localStorage.getItem('damabrava_usuario'));
        }
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
            console.log(usuarioInfo)

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
            icono: 'fa-globe',
            texto: 'Pagina Web',
            detalle: 'Pagina Web de la empresa',
            onclick: 'onclick="mostrarPaginaWeb()"'
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
    'paginaWeb': {
        clase: 'opcion-btn',
        vista: 'almacen-view',
        icono: 'fa-globe',
        texto: 'Pagina Web',
        detalle: 'Pagina Web de la empresa',
        onclick: 'onclick="mostrarPaginaWeb()"'
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

    obtenerUsuario();
    
    crearNav(usuarioInfo);
    crearPerfil(usuarioInfo);
    actualizarPermisos(usuarioInfo);
    crearNotificaciones(usuarioInfo);
    

    mostrarHome(view);
    requestAnimationFrame(() => {
        view.style.opacity = '1';
    });
}
export function mostrarHome(view) {
    const funcionesUsuario = obtenerFunciones();
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
    `;

    view.innerHTML = home;
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