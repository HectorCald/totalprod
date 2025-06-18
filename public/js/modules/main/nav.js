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
            detalle: 'Gestiona todos los pedidos.',
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
            detalle: 'Realiza conteos del almacen',
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
            detalle: 'Registra pagos en general.',
            onclick: 'onclick="mostrarPagos()"'
        },
        {
            clase: 'opcion-btn',
            vista: 'almacen-view',
            icono: 'fa-file-invoice',
            texto: 'Reportes',
            detalle: 'Genera todos los reportes.',
            onclick: 'onclick="mostrarReportes()"'
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
let tooltipInstance = null;

function initTooltips() {
    // Si ya existe una instancia, limpiarla
    if (tooltipInstance) {
        tooltipInstance.destroy();
    }

    // Crear nueva instancia
    tooltipInstance = new TooltipManager();
}

class TooltipManager {
    constructor() {
        this.tooltip = null;
        this.init();
    }

    init() {
        // Crear el elemento tooltip si no existe
        if (!document.querySelector('.tooltip-container')) {
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'tooltip-container';
            document.body.appendChild(this.tooltip);
        } else {
            this.tooltip = document.querySelector('.tooltip-container');
        }

        // Usar delegación de eventos para manejar elementos dinámicos
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Remover listeners anteriores si existen
        document.removeEventListener('mouseenter', this.handleMouseEnter, true);
        document.removeEventListener('mouseleave', this.handleMouseLeave, true);
        document.removeEventListener('mousemove', this.handleMouseMove, true);

        // Usar delegación de eventos para elementos dinámicos
        document.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
        document.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
        document.addEventListener('mousemove', this.handleMouseMove.bind(this), true);
    }

    handleMouseEnter(event) {
        const element = event.target.closest('.opcion[data-tooltip]');
        if (!element) return;

        const div = document.querySelector('.panel-lateral');
        // Solo mostrar tooltip si el panel está contraído
        if (div && div.style.width === "92px") {
            const tooltipText = element.getAttribute('data-tooltip');
            if (tooltipText) {
                this.showTooltip(element, tooltipText);
            }
        }
    }

    handleMouseLeave(event) {
        const element = event.target.closest('.opcion[data-tooltip]');
        if (element) {
            this.hideTooltip();
        }
    }

    handleMouseMove(event) {
        const element = event.target.closest('.opcion[data-tooltip]');
        if (element && this.tooltip.classList.contains('show')) {
            this.updateTooltipPosition(element);
        }
    }

    showTooltip(element, text) {
        this.tooltip.textContent = text;
        this.updateTooltipPosition(element);
        this.tooltip.classList.add('show');
    }

    hideTooltip() {
        this.tooltip.classList.remove('show');
    }

    updateTooltipPosition(element) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        // Posicionar tooltip a la derecha del elemento
        let left = rect.right + 5;
        let top = rect.top + (rect.height / 2);

        // Verificar si el tooltip se sale de la pantalla por la derecha
        if (left + tooltipRect.width > window.innerWidth) {
            left = rect.left - tooltipRect.width - 10;
        }

        // Verificar límites verticales
        if (top - (tooltipRect.height / 2) < 0) {
            top = tooltipRect.height / 2;
        } else if (top + (tooltipRect.height / 2) > window.innerHeight) {
            top = window.innerHeight - (tooltipRect.height / 2);
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    destroy() {
        // Remover event listeners
        document.removeEventListener('mouseenter', this.handleMouseEnter, true);
        document.removeEventListener('mouseleave', this.handleMouseLeave, true);
        document.removeEventListener('mousemove', this.handleMouseMove, true);

        // Remover tooltip del DOM
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
    }
}

function obtenerOpcionesMenu() {
    const rol = usuarioInfo.rol;
    let atajosUsuario = [];

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
function renderMenu() {
    const contenido = document.querySelector('.anuncio .contenido');
    const menuLateral = document.querySelector('.panel-lateral .contenido');
    const opcionesUsuario = obtenerOpcionesMenu();

    let opcionesHTML = '';

    if (usuarioInfo.rol === 'Administración') {
        // Agrupar por roles
        const pluginsKeys = Object.keys(pluginsMenu).slice(0, 2); // Obtiene las dos primeras claves
        const plugins = pluginsKeys.map(key => pluginsMenu[key]); // Obtiene los objetos de esas claves

        const grupos = {
            'Administración': atajosPorRol['Administración'],
            'Producción': atajosPorRol['Producción'],
            'Almacen': atajosPorRol['Almacen'],
            'Acopio': atajosPorRol['Acopio'],
            'Plugins': plugins
        };


        // Generar HTML para cada grupo - AGREGAR data-tooltip aquí también
        opcionesHTML = Object.entries(grupos).map(([titulo, opciones]) => {
            if (opciones && opciones.length > 0) {
                return `
                    <h2 class="normal">${titulo}</h2>
                    ${opciones.map(opcion => `
                        <div class="opcion" ${opcion.onclick} data-tooltip="${opcion.texto}">
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
            <div class="opcion" ${opcion.onclick} data-tooltip="${opcion.texto}">
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

    const menuL = `
        <div class="encabezado-lateral">
            <button class="btn" id="estatico" style="background: none;font-size: 16px; justify-content:flex-start; padding-left:10px; min-width:40px !important"><i class="fas fa-bars"></i><span>Menu</span></button>
            <span class="ocultar-menu">❮</span>
        </div>
        <div class="relleno">
            <div class="opcion opcion-activa" onclick="homeGr('home')" data-tooltip="Inicio">
                <i class="fas fa-home"></i>
                <div class="info">
                    <p class="texto">Inicio</p>
                    <p class="detalle">Pantalla de inicio</p>
                </div>
            </div>
            <div class="opcion" onclick="homeGr('perfil')" data-tooltip="Perfil">
                <i class="fas fa-user"></i>
                <div class="info">
                    <p class="texto">Perfil</p>
                    <p class="detalle">Gestiona tu perfil</p>
                </div>
            </div>
            <div class="opcion" onclick="homeGr('notificacion')" data-tooltip="Notificaciones">
                <i class="fas fa-bell"></i>
                <div class="info">
                    <p class="texto">Notificaciones</p>
                    <p class="detalle">Todas las notificaciones</p>
                </div>
            </div>
            ${opcionesHTML}
        </div>
    `;
    function homeGr(vista) {
        const home = document.querySelector('.home-view');
        const perfil = document.querySelector('.perfil-view');
        const notificacion = document.querySelector('.notificacion-view');

        if (vista === 'perfil') {
            cerrarAnuncioManual('anuncio');
            perfil.classList.remove('slide-out-flotante');
            home.classList.remove('slide-in-flotante');
            notificacion.classList.remove('slide-in-flotante');

            home.classList.add('slide-out-flotante');
            notificacion.classList.add('slide-out-flotante');
            setTimeout(() => {
                home.style.display = 'none';
                notificacion.style.display = 'none';
                perfil.style.display = 'flex';
                perfil.classList.remove('slide-out-flotante');
                perfil.classList.add('slide-in-flotante');
            }, 300);
        } else if (vista === 'home') {
            cerrarAnuncioManual('anuncio');
            home.classList.remove('slide-out-flotante');
            perfil.classList.remove('slide-in-flotante');
            notificacion.classList.remove('slide-in-flotante');

            perfil.classList.add('slide-out-flotante');
            notificacion.classList.add('slide-out-flotante');
            setTimeout(() => {
                perfil.style.display = 'none';
                notificacion.style.display = 'none';
                home.style.display = 'flex';
                home.classList.remove('slide-out-flotante');
                home.classList.add('slide-in-flotante');

                setTimeout(() => {
                    home.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
            }, 300);
        } else {
            cerrarAnuncioManual('anuncio');
            notificacion.classList.remove('slide-out-flotante');
            home.classList.remove('slide-in-flotante');
            perfil.classList.remove('slide-in-flotante');

            home.classList.add('slide-out-flotante');
            perfil.classList.add('slide-out-flotante');

            setTimeout(() => {
                home.style.display = 'none';
                perfil.style.display = 'none';
                notificacion.style.display = 'flex';
                notificacion.classList.remove('slide-out-flotante');
                notificacion.classList.add('slide-in-flotante');

                /* Quitar indicador inmediatamente
                const indicador = btnNotificacion.querySelector('.indicador');
                if (indicador) indicador.remove();
                */

                // Quitar animaciones después de 3 segundos
                setTimeout(() => {
                    const notificacionesNuevas = notificacion.querySelectorAll('.notificacion.nueva-notificacion');
                    notificacionesNuevas.forEach(element => {
                        element.classList.remove('nueva-notificacion');
                    });
                    localStorage.setItem('cantidad_notificaciones', historialNotificaciones.length.toString());
                }, 3000);
            }, 300);
        }
    }
    window.homeGr = homeGr;
    // Actualizar el DOM
    menuLateral.innerHTML = menuL;
    contenido.innerHTML = menuHTML;
    contenido.style.paddingBottom = '10px';

    // IMPORTANTE: Re-inicializar tooltips después de renderizar
    setTimeout(() => {
        initTooltips();
    }, 100);
}
function mostrarMenu() {
    mostrarAnuncio();
    const opciones = document.querySelectorAll('.opcion');
    opciones.forEach(opcion => {
        opcion.addEventListener('click', () => {
            opcion.add.classList('opcion-activa');
        });
    });
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
    renderMenu();
    const refreshButton = document.querySelector('.nav-container .refresh');
    const menu = document.querySelector('.menu');
    const achicar = document.querySelector('.ocultar-menu');
    const div = document.querySelector('.panel-lateral');
    const opciones = document.querySelectorAll('.opcion');
    const estatico = document.querySelector('#estatico');
    const encabezado = document.querySelector('.encabezado-lateral');
    let estatic = false;

    opciones.forEach(opcion => {
        opcion.addEventListener('click', () => {
            opciones.forEach(opcion => opcion.classList.remove('opcion-activa'));
            opcion.classList.add('opcion-activa');

            if (div.style.width !== '92px' && estatic === false) {
                achicarDiv();
            }
        });

    })

    refreshButton.addEventListener('click', () => {
        mostrarCarga();
        location.reload();
    });
    menu.addEventListener('click', () => {
        renderMenu();
        mostrarMenu();
    });
    achicarDiv();
    achicar.addEventListener('click', achicarDiv);
    estatico.addEventListener('click', achicarDiv);
    encabezado.addEventListener('dblclick', barraEstatica);
    setTimeout(() => {
        initTooltips();
    }, 100);

    function achicarDiv() {
        if (div.style.display !== 'none') {
            if (achicar.style.transform === 'rotate(180deg)') {
                div.style.width = "310px"; // Se fija el ancho a 100px
                pantallagrande();
            }
            else {
                div.style.width = "92px"; // Se fija el ancho a 100px
                pantallagrande();
                if (estatic === true) {
                    barraEstatica();
                }
            }
        }

    }
    function barraEstatica() {
        const anuncio = document.querySelector('.anuncio');
        const nav = document.querySelector('.nav-container');
        const views = document.querySelectorAll('.view');

        if (achicar.style.transform !== 'rotate(180deg)') {
            anuncio.style.paddingLeft = '310px';
            views.forEach(view => {
                view.style.paddingLeft = '335px';
            });
            nav.style.paddingLeft = '310px';
            achicar.style.transform = 'none';
            estatic = true;
        } else if (estatic === true) {
            anuncio.style.paddingLeft = '93px';
            views.forEach(view => {
                view.style.paddingLeft = '115px';
            });
            nav.style.paddingLeft = '115px';
            achicar.style.transform = 'rotate(180deg)';
            estatic = false;
        } else if (achicar.style.transform === 'rotate(180deg)') {
            achicarDiv();
            barraEstatica();
            estatic = true;
        }

    }
    window.barraEstatica = barraEstatica;
    window.achicarDiv = achicarDiv;
    function pantallagrande() {
        const miDiv = document.querySelector(".panel-lateral .relleno");

        if (miDiv.scrollHeight > miDiv.clientHeight || miDiv.scrollWidth > miDiv.clientWidth) {
            miDiv.style.paddingRight = "6px";
        } else {
            miDiv.style.paddingRight = "15px";
        }

        if (achicar.style.transform === 'rotate(180deg)') {
            achicar.style.transform = 'none';
        } else {
            achicar.style.transform = 'rotate(180deg)';
        }
    }
}