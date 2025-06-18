let personal = [];
async function obtenerPersonal() {
    try {
        const response = await fetch('/obtener-personal');
        const data = await response.json();

        if (data.success) {
            personal = data.personal.sort((a, b) => {
                const nombreA = a.nombre.toLowerCase();
                const nombreB = b.nombre.toLowerCase();
                return nombreA.localeCompare(nombreB);
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener personal',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener personal:', error);
        mostrarNotificacion({
            message: 'Error al obtener personal',
            type: 'error',
            duration: 3500
        });
        return false;
    } finally {
        ocultarCarga();
    }
}


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
export async function mostrarPersonal() {
    renderInitialHTML();
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    const [personalObtenido] = await Promise.all([
        obtenerPersonal()
    ]);

    updateHTMLWithData();
}
function renderInitialHTML() {
    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Personal</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="entrada">
                <i class='bx bx-search'></i>
                <div class="input">
                    <p class="detalle">Buscar</p>
                    <input type="text" class="buscar-proovedor" placeholder="">
                </div>
            </div>
            <div class="productos-container">
                ${Array(10).fill().map(() => `
                    <div class="skeleton-producto">
                        <div class="skeleton-header">
                            <div class="skeleton skeleton-img"></div>
                            <div class="skeleton-content">
                                <div class="skeleton skeleton-line"></div>
                                <div class="skeleton skeleton-line"></div>
                                <div class="skeleton skeleton-line"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="no-encontrado" style="display: none; text-align: center; color: #555; font-size: 1.1rem;padding:20px">
                <i class='bx bx-id-card' style="font-size: 50px;opacity:0.5"></i>
                <p style="text-align: center; color: #555;">¡Ups!, No se encontraron proovedores segun tu busqueda o filtrado.</p>
            </div>
        </div>
    `;
    contenido.innerHTML = initialHTML;
}
function updateHTMLWithData() {
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = personal.map(persona => `
        <div class="registro-item" data-id="${persona.id}">
            <div class="header">
                <i class='bx bx-id-card'></i>
                <div class="info-header">
                    <span class="id">${persona.id}<span class="${persona.rol === 'Sin rol' ? 'pendiente' : 'rol'} ">${persona.rol ? persona.rol : 'Sin rol'}</span></span>
                    <span class="nombre"><strong>${persona.nombre}</strong></span>
                    <span class="fecha">${persona.email}<span class="punto-referencia">${persona.estado === 'Activo' ? `<i class="ri-checkbox-blank-circle-fill" style="color:var(--success) !important; font-size:10px; max-width:10px; height:10px; background: none; justify-content:flex-start"></i>` : `<i class="ri-checkbox-blank-circle-fill" style="color:red !important;font-size:10px; max-width:10px; height:10px; background: none; justify-content:flex-start"></i>`}</span></span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
    eventosPersonal();
}


function eventosPersonal() {
    const inputBusqueda = document.querySelector('.buscar-proovedor');
    const items = document.querySelectorAll('.registro-item');
    const contenedor = document.querySelector('.anuncio .relleno');
    contenedor.addEventListener('scroll', () => {
        const yaExiste = contenedor.querySelector('.scroll-top');

        if (contenedor.scrollTop > 100) {
            if (!yaExiste) {
                const boton = document.createElement('button');
                boton.className = 'scroll-top';
                boton.innerHTML = '<i class="fas fa-arrow-up"></i>';
                boton.onclick = () => scrollToTop('.anuncio .relleno');
                contenedor.appendChild(boton);
            }
        } else {
            // Si vuelve arriba, ocultamos el botón si existe
            if (yaExiste) {
                yaExiste.remove();
            }
        }
    });


    items.forEach(item => {
        item.addEventListener('click', function () {
            const proovedorId = this.dataset.id;
            window.info(proovedorId);
        });
    });

    inputBusqueda.addEventListener('input', (e) => {
        aplicarFiltros();
    });
    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });
    function aplicarFiltros() {
        const busqueda = normalizarTexto(inputBusqueda.value);
        const items = document.querySelectorAll('.registro-item');
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Animación de ocultar todos
        items.forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(-20px)';
            item.style.transition = 'all 0.3s ease';
        });

        setTimeout(() => {
            let hayResultados = false;

            items.forEach(item => {
                const proovedor = personal.find(c => c.id === item.dataset.id);
                const coincide = proovedor && (
                    normalizarTexto(proovedor.nombre).includes(busqueda) ||
                    normalizarTexto(proovedor.telefono).includes(busqueda) ||
                    normalizarTexto(proovedor.direccion).includes(busqueda) ||
                    normalizarTexto(proovedor.zona).includes(busqueda)
                );

                item.style.display = coincide ? 'flex' : 'none';
                if (coincide) hayResultados = true;
            });

            // Animación escalonada para los resultados
            document.querySelectorAll('.registro-item[style*="display: flex"]').forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });

            // Control del mensaje "no encontrado"
            mensajeNoEncontrado.style.display = hayResultados ? 'none' : 'block';
        }, 300);
    }
    function normalizarTexto(texto) {
        return (texto || '').toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[-_\s]+/g, '');
    }


    window.info = function (userId) {
        const usuario = personal.find(u => u.id === userId);
        if (!usuario) return;

        const contenido = document.querySelector('.anuncio-second .contenido');
        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Información de usuario</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <div class="foto-perfil">
                    <div class="preview-container">
                        <img src="${usuario.foto}" alt="Foto de perfil" class="foto-perfil-img" onerror="this.src='./icons/icon.png'">
                    </div>
                </div>
                <p class="normal">Información del usuario</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${usuario.id}</span>
                    <span class="nombre"><strong><i class='bx bx-user'></i> Nombre: </strong>${usuario.nombre}</span>
                    <span class="nombre"><strong><i class='bx bx-phone'></i> Teléfono: </strong>${usuario.telefono || 'No registrado'}</span>
                    <span class="nombre"><strong><i class='bx bx-envelope'></i> Email: </strong>${usuario.email}</span>
                </div>
    
                <p class="normal">Configuraciones de usuario</p>
                    <div class="entrada">
                        <i class='bx bx-toggle-left'></i>
                        <div class="input">
                            <p class="detalle">Estado</p>
                            <select class="estado-usuario">
                                <option value="Activo" ${usuario.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                                <option value="Inactivo" ${usuario.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                                <option value="Pendiente" ${usuario.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            </select>
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-user-circle'></i>
                        <div class="input">
                            <p class="detalle">Rol</p>
                            <select class="rol-usuario">
                                <option value="Sin rol" ${usuario.rol === 'Sin rol' ? 'selected' : ''}>Sin rol</option> 
                                <option value="Administración" ${usuario.rol === 'Administración' ? 'selected' : ''}>Administración</option>
                                <option value="Almacen" ${usuario.rol === 'Almacen' ? 'selected' : ''}>Almacén</option>
                                <option value="Acopio" ${usuario.rol === 'Acopio' ? 'selected' : ''}>Acopio</option>
                                <option value="Producción" ${usuario.rol === 'Producción' ? 'selected' : ''}>Producción</option>
                            </select>
                        </div>
                    </div>
                    ${usuario.rol != 'Administración' ? `
                <p class="normal">Permisos concedidos</p>
                <div class="permisos-container">
                    <div class="campo-horizontal">
                        <label class="eliminacion">
                            <input type="checkbox" value="eliminacion" ${usuario.permisos?.includes('eliminacion') ? 'checked' : ''}>
                            <span>Eliminación</span>
                        </label>
                        <label class="edicion">
                            <input type="checkbox" value="edicion" ${usuario.permisos?.includes('edicion') ? 'checked' : ''}>
                            <span>Edición</span>
                        </label>
                    </div>
                    <div class="campo-horizontal">
                        <label class="anulacion">
                            <input type="checkbox" value="anulacion" ${usuario.permisos?.includes('anulacion') ? 'checked' : ''}>
                            <span>Anulación</span>
                        </label>
                        <label class="creacion">
                            <input type="checkbox" value="creacion" ${usuario.permisos?.includes('creacion') ? 'checked' : ''}>
                            <span>Creación</span>
                        </label>
                    </div>
                </div>
                <p class="normal">Plugins habilitados</p>
                <div class="plugins-container">
                    ${Object.entries(pluginsMenu).map(([key, plugin]) => `
                        <label class="plugin">
                            <input type="checkbox" value="${key}" ${usuario.plugins?.includes(key) ? 'checked' : ''}>
                            <span>${plugin.texto}</span>
                        </label>
                    `).join('')}
                </div> ` : ''}
            </div>
            <div class="anuncio-botones">
                <button class="btn-guardar btn green" data-id="${usuario.id}">
                    <i class='bx bx-save'></i> Guardar cambios
                </button>
            </div>
        `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '80px';
        mostrarAnuncioSecond();

        // Eventos
        const btnGuardar = contenido.querySelector('.btn-guardar');

        btnGuardar.addEventListener('click', async () => {
            const estado = contenido.querySelector('.estado-usuario').value;
            const rol = contenido.querySelector('.rol-usuario').value;
            const pluginsSeleccionados = Array.from(contenido.querySelectorAll('.plugins-container input:checked'))
                .map(cb => cb.value)
                .join(',');
            const permisosSeleccionados = Array.from(contenido.querySelectorAll('.permisos-container input:checked'))
                .map(cb => cb.value)
                .join(',');

            try {
                const signal = await mostrarProgreso('.pro-user');
                const response = await fetch(`/actualizar-usuario-admin/${usuario.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        estado,
                        rol,
                        plugins: pluginsSeleccionados,
                        permisos: permisosSeleccionados
                    })
                });

                if (response.ok) {
                    await obtenerPersonal();
                    info(userId);
                    updateHTMLWithData();
                    mostrarNotificacion({
                        message: 'Usuario actualizado correctamente',
                        type: 'success',
                        duration: 3000
                    });
                    registrarNotificacion(
                        'Administración',
                        'Edición',
                        usuarioInfo.nombre + ' realizo cambios en el perfil de: ' + usuario.nombre + ' que es parte del personal de la empresa')
                } else {
                    throw new Error('Error al actualizar el usuario');
                }
            } catch (error) {
                if (error.message === 'cancelled') {
                    console.log('Operación cancelada por el usuario');
                    return;
                }
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al procesar la operación',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarProgreso('.pro-user');
            }
        });
    };

    aplicarFiltros();
}

