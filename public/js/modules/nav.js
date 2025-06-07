let usuarioInfo = '';

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
    }
};
const atajosPorRol = {
    'Producción': [
        {
            clase: 'opcion-btn',
            vista: 'formProduccion-view',
            icono: 'fa-clipboard-list',
            texto: 'Formulario',
            detalle: 'Registra una nueva producción.',
            onclick: 'onclick="mostrarFormularioProduccion();"'
        },
        {
            clase: 'opcion-btn',
            vista: 'cuentasProduccion-view',
            icono: 'fa-history',
            texto: 'Mis registros',
            detalle: 'Tus registros de producción.',
            onclick: 'onclick="mostrarMisRegistros();"'
        },
        {
            clase: 'opcion-btn',
            vista: 'cuentasProduccion-view',
            icono: 'fa-solid fa-book',
            texto: 'Reglas precios',
            detalle: 'Todas las reglas para precios.',
            onclick: 'onclick="mostrarReglas();"',
            soloAdmin: true
        },
        {
            clase: 'opcion-btn',
            vista: 'verificarRegistros-view',
            icono: 'fa-history',
            texto: 'Registros producción',
            detalle: 'Todos los registros de producción.',
            onclick: 'onclick="mostrarVerificacion()"',
            soloAdmin: true
        },
    ],
    'Acopio': [
        {
            clase: 'opcion-btn',
            vista: 'almAcopio-view',
            icono: 'fa-dolly',
            texto: 'Almacen acopio',
            detalle: 'Gestiona el almacen de acopio.',
            onclick: 'onclick="mostrarAlmacenAcopio();"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-arrow-down',
            texto: 'Ingresos',
            detalle: 'Ingresos al almacen de acopio.',
            onclick: 'onclick="mostrarIngresosAcopio()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAlmacen-view',
            icono: 'fa-arrow-up',
            texto: 'Salidas',
            detalle: 'Salidas del almacen acopio.',
            onclick: 'onclick="mostrarSalidasAcopio()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almAcopio-view',
            icono: 'fa-shopping-cart',
            texto: 'Nuevo Pedido',
            detalle: 'Realiza pedidos de materia prima.',
            onclick: 'onclick="mostrarHacerPedido()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAcopio-view',
            icono: 'fa-history',
            texto: 'Pedidos',
            detalle: 'Gestiona pedidos de materia prima.',
            onclick: 'onclick="mostrarPedidos();"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAlmacen-view',
            icono: 'fa-history',
            texto: 'Registros acopio',
            detalle: 'Todos los registros de acopio.',
            onclick: 'onclick="mostrarRegistrosAcopio();"'
        },
    ],
    'Almacen': [
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-dolly',
            texto: 'Almacen general',
            detalle: 'Gestiona el almacen general.',
            onclick: 'onclick="mostrarAlmacenGeneral()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-arrow-down',
            texto: 'Ingresos',
            detalle: 'Ingresos del almacen general.',
            onclick: 'onclick="mostrarIngresos()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAlmacen-view',
            icono: 'fa-arrow-up',
            texto: 'Salidas',
            detalle: 'Salidas del almacen general.',
            onclick: 'onclick="mostrarSalidas()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-clipboard-list',
            texto: 'Conteo fisico',
            detalle: 'Realiza conteos fisicos del almacen.',
            onclick: 'onclick="mostrarConteo()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'verificarRegistros-view',
            icono: 'fa-check-double',
            texto: 'Verificar',
            detalle: 'Verifica registros de producción.',
            onclick: 'onclick="mostrarVerificacion()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'regAlmacen-view',
            icono: 'fa-history',
            texto: 'Registros almacen',
            detalle: 'Todos los registros de almacen.',
            onclick: 'onclick="mostrarMovimientosAlmacen()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-history',
            texto: 'Registros conteo',
            detalle: 'Todos los registros de conteo.',
            onclick: 'onclick="registrosConteoAlmacen()"'
        }
    ],
    'Administración': [
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-users',
            texto: 'Personal',
            detalle: 'Gestiona todo el personal.',
            onclick: 'onclick="mostrarPersonal()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-user-circle',
            texto: 'Clientes',
            detalle: 'Gestiona todos los clientes.',
            onclick: 'onclick="mostrarClientes()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-truck',
            texto: 'Proovedores',
            detalle: 'Gestiona todos los proovedores.',
            onclick: 'onclick="mostrarProovedores()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-credit-card',
            texto: 'Pagos',
            detalle: 'Realiza y registra pagos en general.',
            onclick: 'onclick="mostrarPagos()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-file-invoice',
            texto: 'Reportes',
            detalle: 'Genera reportes de toda la empresa.',
            onclick: 'onclick="mostrarProovedores()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-file-pdf',
            texto: 'Catalogos',
            detalle: 'Genera catalagos segun el precio',
            onclick: 'onclick="mostrarDescargaCatalogo()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-cog',
            texto: 'Ajustes',
            detalle: 'Ajustes del sistema o/y aplicación',
            onclick: 'onclick="mostrarConfiguracionesSistema()"'
        },

    ]
};

function obtenerOpcionesMenu() {
    const rol = usuarioInfo.rol;
    let atajosUsuario = [];

    // Obtener plugins como string del localStorage
    const plugins = localStorage.getItem('plugins_activos') || '';

    // Primero agregamos las opciones del rol
    const atajosRol = atajosPorRol[rol];
    if (atajosRol) {
        atajosUsuario = atajosRol.filter(opcion => {
            return !opcion.soloAdmin || rol === 'Administración';
        });
    }

    // Agregar plugins si están activos
    Object.keys(pluginsMenu).forEach(plugin => {
        if (usuarioInfo.plugins.includes(plugin)) {
            atajosUsuario.push(pluginsMenu[plugin]);
        }
    });

    return atajosUsuario;
}


function mostrarMenu() {
    const contenido = document.querySelector('.anuncio .contenido');
    const opcionesUsuario = obtenerOpcionesMenu();
    let opcionesHTML = '';

    if (usuarioInfo.rol === 'Administración') {
        // Agrupar por roles
        const grupos = {
            'Administración': atajosPorRol['Administración'],
            'Producción': atajosPorRol['Producción'],
            'Almacen': atajosPorRol['Almacen'],
            'Acopio': atajosPorRol['Acopio'],
            // Agregar todos los plugins disponibles para administración
            'Plugins': Object.values(pluginsMenu)
        };

        // Generar HTML para cada grupo
        opcionesHTML = Object.entries(grupos).map(([titulo, opciones]) => {
            if (opciones && opciones.length > 0) {
                return `
                    <h2 class="normal">${titulo}</h2>
                    ${opciones.map(opcion => `
                        <div class="opcion" ${opcion.onclick}>
                            <i class="fas ${opcion.icono}"></i>
                            <div class="info">
                                <p class="texto">${opcion.texto}</p>
                                <p class="detalle">${opcion.detalle}</p>
                            </div>
                        </div>
                    `).join('')}
                `;
            }
            return '';
        }).join('');
    } else {
        // Para otros roles, mostrar solo sus opciones y plugins activados
        opcionesHTML = opcionesUsuario.map(opcion => `
            <div class="opcion" ${opcion.onclick}>
                <i class="fas ${opcion.icono}"></i>
                <div class="info">
                    <p class="texto">${opcion.texto}</p>
                    <p class="detalle">${opcion.detalle}</p>
                </div>
            </div>
        `).join('');
    }

    const menuHTML = `
        <div class="encabezado">
            <h1 class="titulo">Menú de ${usuarioInfo.rol}</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            ${opcionesHTML}
        </div>
    `;

    contenido.innerHTML = menuHTML;
    contenido.style.paddingBottom = '10px';
    mostrarAnuncio();
}
export async function crearNav(usuario) {

    usuarioInfo = usuario;
    // Solo ejecutar si estamos en el dashboard
    if (window.location.pathname === '/dashboard') {
        const view = document.querySelector('.nav');
        mostrarNav(view);
    }
}
function mostrarNav() {
    const view = document.querySelector('.nav');
    const nav = `
            <div class="nav-container">
                <button class="refresh"><i class='bx bx-refresh'></i></button>
                <button class="menu"><i class='bx bx-menu'></i></button>
                <div class="info">
                    <img src="./icons/icon.png" alt="Logo">
                    <h1 class="titulo">TotalProd</h1>
                </div>
            </div>
    `;
    view.innerHTML = nav;
    eventosNav();
}
function eventosNav() {
    const refreshButton = document.querySelector('.nav-container .refresh');
    const menu = document.querySelector('.nav-container .menu');

    refreshButton.addEventListener('click', () => {
        mostrarCarga();
        location.reload();
    });
    menu.addEventListener('click', () => {
        mostrarMenu();
    });
}