let pagosGlobal = [];

async function obtenerPagos() {
    try {
        const response = await fetch('/obtener-pagos');
        const data = await response.json();

        if (data.success) {
            // Ordenar pagos de más reciente a más antiguo por ID
            pagosGlobal = data.pagos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Orden descendente
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener pagos',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        mostrarNotificacion({
            message: 'Error al obtener pagos',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function cargarPagosParciales(pagoId) {
    try {
        const signal = await mostrarProgreso('.pro-obtner')
        const response = await fetch(`/obtener-pagos-parciales/${pagoId}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        if (error.message === 'cancelled') {
            console.log('Operación cancelada por el usuario');
            return null;
        }
        return null;
    } finally {
        ocultarProgreso('.pro-obtner')
    }
}


function renderInitialHTML() {
    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Pagos</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno pagos">
            <div class="busqueda">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="buscar-registro-verificacion" placeholder="">
                    </div>
                    <button class="btn-calendario"><i class='bx bx-calendar'></i></button>
                </div>
                <div class="acciones-grande">
                    <button class="exportar-excel btn orange"><i class='bx bx-download'></i> <span>Descargar</span></button>
                    <button class="nuevo-pago-generico btn especial"><i class='bx bx-dollar-circle'></i> <span>Nuevo pago</span></button>
                </div>
            </div>
            
            <div class="filtros-opciones estado">
                <button class="btn-filtro activado">Todos</button>
                <button class="btn-filtro">Pagados</button>
                <button class="btn-filtro">Pendientes</button>
                <button class="btn-filtro">Anulados</button>
                <select class="tipo">
                    <option value="todos" selected>Todos</option>
                    <option value="genericos">Genericos</option>
                    <option value="produccion">Producción</option>
                    <option value="almacen">Almacen</option>
                    <option value="Acopio">Acopio</option>
                </select>
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
                <i class='bx bx-file-blank' style="font-size: 50px;opacity:0.5"></i>
                <p style="text-align: center; color: #555;">¡Ups!, No se encontraron registros segun tu busqueda o filtrado.</p>
            </div>
        </div>
        <div class="anuncio-botones">
            <button class="exportar-excel btn orange"><i class='bx bx-download'></i> Descargar registros</button>
            <button class="nuevo-pago-generico btn especial"><i class='bx bx-dollar-circle'></i> Nuevo pago</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '80px';
}
export async function mostrarPagos() {
    renderInitialHTML();
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    const [pagos] = await Promise.all([
        obtenerPagos()
    ]);

    updateHTMLWithData();
}
function updateHTMLWithData() {
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = pagosGlobal.map(registro => `
        <div class="registro-item" data-id="${registro.id}">
            <div class="header">
                <i class='bx bx-file'></i>
                <div class="info-header">
                    <span class="id">${registro.id}<span class="valor ${registro.estado === 'Pendiente' ? 'pendiente' : registro.estado === 'Pagado' ? 'pagado' : 'anulado'}">${registro.estado}</span></span>
                    <span class="nombre"><strong>${registro.nombre_pago} (${registro.beneficiario})</strong></span>
                    <span class="fecha">${registro.fecha}<span class="neutro">Bs. ${registro.total}</span></span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
    eventosPagos();
}


function eventosPagos() {
    const btnExcel = document.querySelectorAll('.exportar-excel');
    const registrosAExportar = pagosGlobal;
    const btnNuevoPago = document.querySelectorAll('.nuevo-pago-generico');

    const botonesNombre = document.querySelectorAll('.etiquetas-filter .btn-filtro');
    const botonesEstado = document.querySelectorAll('.filtros-opciones.estado .btn-filtro');
    const selectTipo = document.querySelector('.pagos .tipo');


    const items = document.querySelectorAll('.registro-item');
    const inputBusqueda = document.querySelector('.buscar-registro-verificacion');
    const botonCalendario = document.querySelector('.btn-calendario');

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


    let filtroFechaInstance = null;
    let filtroNombreActual = 'Todos';
    let filtroEstadoActual = 'Todos';
    let filtroTipoActual = 'Todos'; // Nuevo

    // Nuevo

    // Agregar listener para el select de tipo
    selectTipo.addEventListener('change', function () {
        filtroTipoActual = this.value;
        aplicarFiltros();
    });
    selectTipo.addEventListener('focus', function () {
        scrollToCenter(this, this.parentElement);
    });


    function normalizarTexto(texto) {
        return texto.toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .replace(/[-_\s]+/g, ''); // Eliminar guiones, guiones bajos y espacios
    }
    function scrollToCenter(boton, contenedorPadre) {
        const scrollLeft = boton.offsetLeft - (contenedorPadre.offsetWidth / 2) + (boton.offsetWidth / 2);
        contenedorPadre.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    }
    function aplicarFiltros() {
        const fechasSeleccionadas = filtroFechaInstance?.selectedDates || [];
        const busqueda = normalizarTexto(inputBusqueda.value);
        const items = document.querySelectorAll('.registro-item');
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Primero, filtrar todos los registros
        const registrosFiltrados = Array.from(items).map(registro => {
            const registroData = pagosGlobal.find(r => r.id === registro.dataset.id);
            if (!registroData) return { elemento: registro, mostrar: false };

            let mostrar = true;

            // Filtro por tipo
            if (filtroTipoActual !== 'todos') {
                switch (filtroTipoActual) {
                    case 'genericos':
                        mostrar = registroData.tipo === 'generico';
                        break;
                    case 'produccion':
                        mostrar = registroData.tipo === 'produccion';
                        break;
                    case 'almacen':
                        mostrar = registroData.tipo === 'almacen';
                        break;
                    case 'Acopio':
                        mostrar = registroData.tipo === 'Acopio';
                        break;
                }
            }

            // Filtro por estado
            if (mostrar && filtroEstadoActual && filtroEstadoActual !== 'Todos') {
                if (filtroEstadoActual === 'Pendientes') {
                    mostrar = registroData.estado === 'Pendiente';
                } else if (filtroEstadoActual === 'Pagados') {
                    mostrar = registroData.estado === 'Pagado';
                } else if (filtroEstadoActual === 'Anulados') {
                    mostrar = registroData.estado === 'Anulado';
                }
            }

            // Filtro por nombre (mantener existente)
            if (mostrar && filtroNombreActual && filtroNombreActual !== 'Todos') {
                mostrar = registroData.nombre === filtroNombreActual;
            }

            // Filtro por fecha (mantener existente)
            if (mostrar && fechasSeleccionadas.length === 2) {
                const [dia, mes, anio] = registroData.fecha.split('/');
                const fechaRegistro = new Date(anio, mes - 1, dia);
                const fechaInicio = fechasSeleccionadas[0];
                const fechaFin = fechasSeleccionadas[1];

                fechaRegistro.setHours(0, 0, 0, 0);
                fechaInicio.setHours(0, 0, 0, 0);
                fechaFin.setHours(23, 59, 59, 999);

                mostrar = fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin;
            }

            // Filtro por búsqueda (mantener existente)
            if (mostrar && busqueda) {
                const textoRegistro = [
                    registroData.id,
                    registroData.nombre_pago,
                    registroData.beneficiario,
                    registroData.fecha,
                    registroData.justificativos,
                    registroData.tipo
                ].filter(Boolean).join(' ').toLowerCase();

                mostrar = normalizarTexto(textoRegistro).includes(busqueda);
            }

            return { elemento: registro, mostrar };
        });

        // Resto del código de animación (mantener existente)
        const registrosVisibles = registrosFiltrados.filter(r => r.mostrar).length;

        items.forEach(registro => {
            registro.style.opacity = '0';
            registro.style.transform = 'translateY(-20px)';
        });

        setTimeout(() => {
            items.forEach(registro => {
                registro.style.display = 'none';
            });

            registrosFiltrados.forEach(({ elemento, mostrar }, index) => {
                if (mostrar) {
                    elemento.style.display = 'flex';
                    elemento.style.opacity = '0';
                    elemento.style.transform = 'translateY(20px)';

                    setTimeout(() => {
                        elemento.style.opacity = '1';
                        elemento.style.transform = 'translateY(0)';
                    }, 20);
                }
            });

            if (mensajeNoEncontrado) {
                mensajeNoEncontrado.style.display = registrosVisibles === 0 ? 'block' : 'none';
            }
        }, 100);
    }

    botonesNombre.forEach(boton => {
        if (boton.classList.contains('activado')) {
            filtroNombreActual = boton.textContent.trim();
            aplicarFiltros();
        }
        boton.addEventListener('click', () => {
            botonesNombre.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            filtroNombreActual = boton.textContent.trim();
            scrollToCenter(boton, boton.parentElement);
            aplicarFiltros();
        });
    });
    botonesEstado.forEach(boton => {
        if (boton.classList.contains('activado')) {
            filtroEstadoActual = boton.textContent.trim();
            aplicarFiltros();
        }
        boton.addEventListener('click', () => {
            botonesEstado.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            filtroEstadoActual = boton.textContent.trim();
            scrollToCenter(boton, boton.parentElement);
            aplicarFiltros();
        });
    });

    botonCalendario.addEventListener('click', async () => {
        if (!filtroFechaInstance) {
            filtroFechaInstance = flatpickr(botonCalendario, {
                mode: "range",
                dateFormat: "d/m/Y",
                locale: "es",
                rangeSeparator: " hasta ",
                onChange: function (selectedDates) {
                    if (selectedDates.length === 2) {
                        aplicarFiltros();
                        botonCalendario.classList.add('con-fecha');
                    } else if (selectedDates.length <= 1) {
                        botonCalendario.classList.remove('con-fecha');
                    }
                },
                onClose: function (selectedDates) {
                    if (selectedDates.length <= 1) {
                        aplicarFiltros();
                        botonCalendario.classList.remove('con-fecha');
                    }
                }
            });
        }
        filtroFechaInstance.open();
    });
    inputBusqueda.addEventListener('input', () => {
        aplicarFiltros();
    });
    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });


    items.forEach(item => {
        item.addEventListener('click', function () {
            const registroId = this.dataset.id;
            window.info(registroId);
        });
    });

    window.info = function (pagoId) {
        const pago = pagosGlobal.find(p => p.id === pagoId);
        if (!pago) return;

        const contenido = document.querySelector('.anuncio-second .contenido');
        let registrationHTML;

        if (pago.tipo === 'generico' || pago.tipo === 'Acopio') {
            // Template para pagos genéricos
            registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Información</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="relleno verificar-registro">
                    <p class="normal">Información del pago</p>
                    <div class="campo-vertical">
                        <span class="nombre"><strong><i class='bx bx-id-card'></i> Comprobante: </strong>${pago.id}</span>
                        <span class="nombre"><strong><i class='bx bx-id-card'></i> Nombre: </strong>${pago.nombre_pago}</span>
                        <span class="nombre"><strong><i class='bx bx-user'></i> Beneficiario: </strong>${pago.beneficiario}</span>
                        <span class="nombre"><strong><i class='bx bx-envelope'></i> Email: </strong>${pago.id_beneficiario}</span>
                        <span class="fecha"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${pago.fecha}</span>
                    </div>
    
                    <p class="normal">Detalles del pago</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-detail'></i> Concepto: </strong></span>
                        <span class="valor">${pago.justificativos}</span>
                        <hr style="margin: 10px 0; opacity: 0.2;">
                        <span class="valor"><strong><i class='bx bx-dollar'></i> Monto Base: </strong>Bs. ${pago.subtotal}</span>
                        <span class="valor"><strong><i class='bx bx-minus-circle'></i> Descuento: </strong>Bs. ${pago.descuento}</span>
                        <span class="valor"><strong><i class='bx bx-plus-circle'></i> Aumento: </strong>Bs. ${pago.aumento}</span>
                        <span class="valor"><strong><i class='bx bx-dollar-circle'></i> Total: </strong>Bs. ${pago.total}</span>
                        ${pago.observaciones ? `<span class="valor"><strong><i class='bx bx-comment-detail'></i> Observaciones: </strong></span>
                           <span style="padding-left:20px;width: 100%;">${pago.observaciones}</span>` : ''}
                    </div>
    
                    <p class="normal">Información administrativa</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-user-check'></i> Registrado por: </strong>${pago.pagado_por}</span>
                        <span class="estado"><strong><i class='bx bx-check-circle'></i> Estado: </strong>${pago.estado}</span>
                    </div>
                </div>
                    <div class="anuncio-botones">
                        ${pago.estado !== 'Anulado' ? ` <button class="btn-anular btn yellow"><i class='bx bx-x-circle'></i> Anular</button>` : ''}
                        ${pago.estado === 'Pendiente' ? ` <button class="btn-pagar btn green"><i class='bx bx-dollar'></i> Pagar</button>` : ` <button class="btn-pagar btn blue"><i class='bx bx-show'></i> Ver pagos</button>`}
                    </div>
            `;
        } else {
            // Procesar justificativos para pagos normales (existente)
            const justificativosFormateados = pago.justificativos.split(';').map(j => {
                const [producto, valores] = j.split('(');
                const [envasado, etiquetado, sellado, cernido] = valores.replace(')', '').split(',');

                return {
                    producto,
                    envasado: parseFloat(envasado),
                    etiquetado: parseFloat(etiquetado),
                    sellado: parseFloat(sellado),
                    cernido: parseFloat(cernido),
                    total: parseFloat(envasado) + parseFloat(etiquetado) + parseFloat(sellado) + parseFloat(cernido)
                };
            });

            const totales = justificativosFormateados.reduce((acc, j) => {
                acc.envasado += j.envasado;
                acc.etiquetado += j.etiquetado;
                acc.sellado += j.sellado;
                acc.cernido += j.cernido;
                return acc;
            }, { envasado: 0, etiquetado: 0, sellado: 0, cernido: 0 });

            // Template para pagos normales (mantener el existente)
            registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Información</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno verificar-registro">
                <p class="normal">Información del pago</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Comprobante: </strong>${pago.id}</span>
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Nombre: </strong>${pago.nombre_pago}</span>
                    <span class="nombre"><strong><i class='bx bx-user'></i> Beneficiario: </strong>${pago.beneficiario}</span>
                    <span class="nombre"><strong><i class='bx bx-envelope'></i> Email: </strong>${pago.id_beneficiario}</span>
                    <span class="fecha"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${pago.fecha}</span>
                </div>

                <p class="normal">Detalles del pago</p>
                <div class="campo-vertical">
                    <span class="valor"><strong><i class='bx bx-package'></i> Total Envasado: </strong>Bs. ${totales.envasado.toFixed(2)}</span>
                    <span class="valor"><strong><i class='bx bx-tag'></i> Total Etiquetado: </strong>Bs. ${totales.etiquetado.toFixed(2)}</span>
                    <span class="valor"><strong><i class='bx bx-purchase-tag'></i> Total Sellado: </strong>Bs. ${totales.sellado.toFixed(2)}</span>
                    <span class="valor"><strong><i class='bx bx-filter'></i> Total Cernido: </strong>Bs. ${totales.cernido.toFixed(2)}</span>
                    <hr style="margin: 10px 0; opacity: 0.2;">
                    <span class="valor"><strong><i class='bx bx-dollar'></i> Subtotal: </strong>Bs. ${pago.subtotal}</span>
                    <span class="valor"><strong><i class='bx bx-minus-circle'></i> Descuento: </strong>Bs. ${pago.descuento}</span>
                    <span class="valor"><strong><i class='bx bx-plus-circle'></i> Aumento: </strong>Bs. ${pago.aumento}</span>
                    <span class="valor"><strong><i class='bx bx-dollar-circle'></i> Total: </strong>Bs. ${pago.total}</span>
                    ${pago.observaciones ? `<span class="valor"><strong><i class='bx bx-comment-detail'></i> Observaciones: </strong></span>
                        <span style="padding-left:20px;width: 100%;">${pago.observaciones}</span>
                        ` : ''}
                    
                </div>

                <p class="normal">Detalle de justificativos</p>
                <div class="tabla-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Envasado</th>
                                <th>Etiquetado</th>
                                <th>Sellado</th>
                                <th>Cernido</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${justificativosFormateados.map(j => `
                                <tr>
                                    <td>${j.producto}</td>
                                    <td>Bs. ${j.envasado.toFixed(2)}</td>
                                    <td>Bs. ${j.etiquetado.toFixed(2)}</td>
                                    <td>Bs. ${j.sellado.toFixed(2)}</td>
                                    <td>Bs. ${j.cernido.toFixed(2)}</td>
                                    <td><strong>Bs. ${j.total.toFixed(2)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <p class="normal">Información administrativa</p>
                <div class="campo-vertical">
                    <span class="valor"><strong><i class='bx bx-user-check'></i> Registrado por: </strong>${pago.pagado_por}</span>
                </div>
            </div>
            <div class="anuncio-botones">
                ${pago.estado !== 'Anulado' ? ` <button class="btn-anular btn yellow"><i class='bx bx-x-circle'></i> Anular</button>` : ''}
                ${pago.estado === 'Pendiente' ? ` <button class="btn-pagar btn green"><i class='bx bx-dollar'></i> Pagar</button>` : ` <button class="btn-pagar btn blue"><i class='bx bx-show'></i> Ver pagos</button>`}
            </div>
        `;
        }

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '80px';
        mostrarAnuncioSecond();

        const pagarBtn = contenido.querySelector('.btn-pagar');
        const btnAnular = contenido.querySelector('.btn-anular');

        pagarBtn.addEventListener('click', () => realizarPago(pago));
        btnAnular.addEventListener('click', () => anular(pago));

        function anular(pago) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Anular pago</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno verificar-registro">
                    <p class="normal">Información del pago</p>
                    <div class="campo-vertical">
                        <span class="nombre"><strong><i class='bx bx-id-card'></i> Comprobante: </strong>${pago.id}</span>
                        <span class="nombre"><strong><i class='bx bx-user'></i> Beneficiario: </strong>${pago.beneficiario}</span>
                        <span class="valor"><strong><i class='bx bx-dollar-circle'></i> Total: </strong>Bs. ${pago.total}</span>
                    </div>
        
                    <p class="normal">Motivo de la anulación</p>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Motivo</p>
                            <input class="motivo" type="text" autocomplete="off" placeholder=" " required>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button class="btn-anular-pago btn red"><i class='bx bx-x-circle'></i> Anular pago</button>
                </div>
            `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            const btnAnularPago = contenido.querySelector('.btn-anular-pago');
            btnAnularPago.addEventListener('click', confirmarAnulacion);

            async function confirmarAnulacion() {
                const motivo = document.querySelector('.motivo').value.trim();

                if (!motivo) {
                    mostrarNotificacion({
                        message: 'Debe ingresar el motivo de la anulación',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    const signal = await mostrarProgreso('.pro-anulado');
                    const response = await fetch(`/anular-pago/${pago.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ motivo })
                    });

                    const data = await response.json();

                    if (data.success) {
                        await obtenerPagos();
                        ocultarProgreso('.pro-anulado');
                        info(pagoId);
                        updateHTMLWithData();
                        mostrarNotificacion({
                            message: 'Pago anulado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Información',
                            usuarioInfo.nombre + ' anulo el registro de pago con el nombre de: ' + pago.nombre_pago + ' con el id: ' + pago.id + ' por el motivo de: ' + motivo)
                    } else {
                        throw new Error(data.error || 'Error al anular el pago');
                    }
                } catch (error) {
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al anular el pago',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-anulado');
                }
            }
        }
        function realizarPago(pago) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            function redondearDecimalPersonalizado(valor) {
                const decimal = valor - Math.floor(valor);
                if (decimal < 0.5) {
                    return Math.floor(valor).toFixed(2);
                } else {
                    return Math.ceil(valor).toFixed(2);
                }
            }
            // Primero cargar los pagos parciales
            cargarPagosParciales(pago.id).then(datosPagos => {
                if (!datosPagos) return;
                const { pagosParciales, totalPagado, saldoPendiente } = datosPagos;
                const saldoPendienteOf = redondearDecimalPersonalizado(saldoPendiente);

                const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Realizar pago</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div class="relleno verificar-registro">
                <p class="normal">Información del pago</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Comprobante: </strong>${pago.id}</span>
                    <span class="nombre"><strong><i class='bx bx-user'></i> Beneficiario: </strong>${pago.beneficiario}</span>
                    <span class="valor"><strong><i class='bx bx-dollar-circle'></i> Total a pagar: </strong>Bs. ${pago.total}</span>
                    <span class="valor"><strong><i class='bx bx-dollar-circle'></i> Total pagado: </strong>Bs. ${totalPagado.toFixed(2)}</span>
                    <span class="valor"><strong><i class='bx bx-dollar-circle'></i> Saldo pendiente: </strong>Bs. ${saldoPendienteOf}</span>
                </div>

                ${saldoPendienteOf > 0 && pago.estado !== 'Anulado' ? `
                    <p class="normal">Detalles del pago</p>
                    <div class="entrada">
                        <i class='bx bx-dollar'></i>
                        <div class="input">
                            <p class="detalle">Cantidad a pagar</p>
                            <input class="cantidad_pago" type="number" step="0.01" min="0.01" max="${saldoPendiente}" autocomplete="off" placeholder=" " required>
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones</p>
                            <input class="observaciones" type="text" autocomplete="off" placeholder=" " required>
                        </div>
                    </div>
                ` : ''}

                <p class="normal">Historial de pagos</p>
                <div class="tabla-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Monto</th>
                                <th>Pagado por</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pagosParciales.map(p => `
                                <tr>
                                    <td>${p.fecha}</td>
                                    <td>Bs. ${parseFloat(p.cantidad_pagada).toFixed(2)}</td>
                                    <td>${p.pagado_por}</td>
                                    <td>${p.observaciones}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ${saldoPendienteOf > 0 && pago.estado !== 'Anulado' ? `
                <div class="anuncio-botones">
                    <button class="btn-realizar-pago btn green">
                        <i class='bx bx-check-circle'></i> Realizar pago
                    </button>
                </div>
            ` : ''}
                `;

                contenido.innerHTML = registrationHTML;
                contenido.style.paddingBottom = '10px';
                if (pago.estado !== 'Anulado' && saldoPendiente !== 0) {
                    contenido.style.paddingBottom = '80px';
                }
                mostrarAnuncioTercer();

                // Solo agregar el evento si hay saldo pendiente
                if (saldoPendienteOf > 0) {
                    const btnRealizarPago = contenido.querySelector('.btn-realizar-pago');
                    btnRealizarPago.addEventListener('click', async () => {
                        const cantidad = parseFloat(document.querySelector('.cantidad_pago').value);
                        const observaciones = document.querySelector('.observaciones').value.trim();

                        if (!cantidad || cantidad <= 0 || cantidad > saldoPendienteOf) {
                            console.error('Cantidad inválida:', cantidad, 'Saldo pendiente:', saldoPendienteOf);
                            mostrarNotificacion({
                                message: 'Ingrese una cantidad válida',
                                type: 'warning',
                                duration: 3500
                            });
                            return;
                        }

                        if (!observaciones) {
                            mostrarNotificacion({
                                message: 'Ingrese las observaciones del pago',
                                type: 'warning',
                                duration: 3500
                            });
                            return;
                        }

                        try {
                            const signal = await mostrarProgreso('.pro-pago');
                            const response = await fetch('/registrar-pago-parcial', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    pago_id: pago.id,
                                    pagado_por: usuarioInfo.nombre,
                                    beneficiario: pago.beneficiario,
                                    cantidad_pagada: cantidad,
                                    observaciones
                                })
                            });

                            const data = await response.json();

                            if (data.success) {
                                await obtenerPagos();
                                updateHTMLWithData();
                                info(pagoId);
                                cargarPagosParciales(pagoId);
                                ocultarProgreso('.pro-pago');
                                mostrarNotificacion({
                                    message: 'Pago registrado correctamente',
                                    type: 'success',
                                    duration: 3000
                                });
                                registrarNotificacion(
                                    'Administración',
                                    'Información',
                                    usuarioInfo.nombre + ' realizo el pago de: ' + cantidad + ' a ' + pago.beneficiario)
                            } else {
                                throw new Error(data.error);
                            }
                        } catch (error) {
                            if (error.message === 'cancelled') {
                                console.log('Operación cancelada por el usuario');
                                return;
                            }
                            console.error('Error:', error);
                            mostrarNotificacion({
                                message: error.message || 'Error al realizar el pago',
                                type: 'error',
                                duration: 3500
                            });
                        } finally {
                            ocultarProgreso('.pro-pago');
                        }
                    });
                }
            });
        }
    };
    btnNuevoPago.forEach(btn => {
        btn.addEventListener('click', nuevoPagoGenerico);
    })
    btnExcel.forEach(btn => {
        btn.addEventListener('click', () => exportarArchivos('pagos', registrosAExportar));
    })

    function nuevoPagoGenerico() {
        const contenido = document.querySelector('.anuncio-second .contenido');
        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Nuevo Pago Genérico</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
                <form id="formNuevoPago" class="relleno">
                    <p class="normal">Información General</p>
                    <div class="entrada">
                        <i class='bx bx-purchase-tag'></i>
                        <div class="input">
                            <p class="detalle">Nombre del Pago</p>
                            <input type="text" name="nombre_pago" required>
                        </div>
                    </div>
    
                    <div class="entrada">
                        <i class='bx bx-user'></i>
                        <div class="input">
                            <p class="detalle">Beneficiario</p>
                            <input type="text" name="beneficiario" required placeholder=" ">
                        </div>
                    </div>
    
                    <div class="entrada">
                        <i class='bx bx-envelope'></i>
                        <div class="input">
                            <p class="detalle">ID Beneficiario (Email)</p>
                            <input type="email" name="id_beneficiario" required placeholder=" ">
                        </div>
                    </div>
    
                    <div class="entrada">
                        <i class='bx bx-user-check'></i>
                        <div class="input">
                            <p class="detalle">Registrado por</p>
                            <input type="text" name="pagado_por" value="${usuarioInfo.nombre}+' '+${usuarioInfo.apellido}" readonly>
                        </div>
                    </div>
    
                    <p class="normal">Detalles del Pago</p>
                    <div class="entrada">
                        <i class='bx bx-detail'></i>
                        <div class="input">
                            <p class="detalle">Concepto del Pago</p>
                            <input type="text" name="justificativos" required>
                        </div>
                    </div>
    
                    <div class="entrada">
                        <i class='bx bx-dollar'></i>
                        <div class="input">
                            <p class="detalle">Monto Base</p>
                            <input type="number" name="subtotal" step="0.01" required placeholder=" " onchange="calcularTotal()">
                        </div>
                    </div>
    
                    <div class="entrada">
                        <i class='bx bx-minus-circle'></i>
                        <div class="input">
                            <p class="detalle">Descuento</p>
                            <input type="number" name="descuento" step="0.01" value="0" placeholder=" " onchange="calcularTotal()">
                        </div>
                    </div>
    
                    <div class="entrada">
                        <i class='bx bx-plus-circle'></i>
                        <div class="input">
                            <p class="detalle">Aumento</p>
                            <input type="number" name="aumento" step="0.01" value="0" placeholder=" " onchange="calcularTotal()">
                        </div>
                    </div>
    
                    <div class="entrada">
                        <i class='bx bx-dollar-circle'></i>
                        <div class="input">
                            <p class="detalle">Total a Pagar</p>
                            <input type="number" name="total" step="0.01" value="0" readonly>
                        </div>
                    </div>
    
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones </p>
                            <input type="text" name="observaciones" >
                        </div>
                    </div>
                </form>
            <div class="anuncio-botones">
                <button class="btn-guardar btn green">
                    <i class='bx bx-save'></i> Guardar Pago
                </button>
            </div>
        `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '80px';
        mostrarAnuncioSecond();

        // Función para calcular el total
        window.calcularTotal = function () {
            const subtotal = parseFloat(document.querySelector('input[name="subtotal"]').value) || 0;
            const descuento = parseFloat(document.querySelector('input[name="descuento"]').value) || 0;
            const aumento = parseFloat(document.querySelector('input[name="aumento"]').value) || 0;
            const total = subtotal - descuento + aumento;
            document.querySelector('input[name="total"]').value = total.toFixed(2);
        };

        // Evento para guardar el pago
        const btnGuardar = contenido.querySelector('.btn-guardar');
        btnGuardar.addEventListener('click', async () => {
            try {
                const signal = await mostrarProgreso('.pro-pago');
                const formData = new FormData(document.getElementById('formNuevoPago'));
                const data = Object.fromEntries(formData.entries());

                // Validaciones básicas
                if (!data.nombre_pago || !data.beneficiario || !data.id_beneficiario || !data.justificativos || !data.subtotal) {
                    throw new Error('Por favor complete todos los campos requeridos');
                }

                const response = await fetch('/registrar-pago', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...data,
                        subtotal: parseFloat(data.subtotal),
                        descuento: parseFloat(data.descuento),
                        aumento: parseFloat(data.aumento),
                        total: parseFloat(data.total),
                        tipo: 'generico' // Identificador para pagos genéricos
                    })
                });

                const result = await response.json();

                if (result.success) {
                    await obtenerPagos();
                    ocultarProgreso('.pro-pago');
                    info(result.id);
                    mostrarNotificacion({
                        message: 'Pago registrado correctamente',
                        type: 'success',
                        duration: 3000
                    });
                    registrarNotificacion(
                        'Administración',
                        'Información',
                        usuarioInfo.nombre + ' registro un nuevo pago pendiente generico')
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                if (error.message === 'cancelled') {
                    console.log('Operación cancelada por el usuario');
                    return;
                }
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al registrar el pago',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarProgreso('.pro-pago');
            }
        });
    }

    aplicarFiltros();
}

