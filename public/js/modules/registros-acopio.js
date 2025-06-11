let movimientosAcopio = [];
let usuarioInfo;

function recuperarUsuarioLocal() {
    const usuarioGuardado = localStorage.getItem('damabrava_usuario');
    if (usuarioGuardado) {
        return JSON.parse(usuarioGuardado);
    }
    return null;
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


export async function mostrarRegistrosAcopio() {
    usuarioInfo = recuperarUsuarioLocal();
    renderInitialHTML();
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    const [obtnerRegistros] = await Promise.all([
        obtenerMovimientosAcopio(),
    ]);

    updateHTMLWithData();
    eventosRegistrosAcopio();
}
function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Registros almacen</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="busqueda">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="buscar-registro-almacen" placeholder="">
                    </div>
                    <button class="btn-calendario"><i class='bx bx-calendar'></i></button>
                </div>

                <div class="acciones-grande">
                    <button class="exportar-excel btn orange" style="margin-bottom:10px"><i class='bx bx-download'></i> <span>Descargar registros</span></button>
                </div>
            </div>
            
            <div class="filtros-opciones tipo">
                <button class="btn-filtro activado">Todos</button>
                <button class="btn-filtro">Ingresos</button>
                <button class="btn-filtro">Salidas</button>
                <button class="btn-filtro">Bruto</button>
                <button class="btn-filtro">Prima</button>
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
            <button class="exportar-excel btn orange" style="margin-bottom:10px"><i class='bx bx-download'></i> Descargar registros</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '80px';
}
function updateHTMLWithData() {

    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = movimientosAcopio.map(registro => `
        <div class="registro-item" data-id="${registro.id}">
            <div class="header">
                <i class='bx bx-file'></i>
                <div class="info-header">
                    <span class="id">${registro.id}<span class="valor ${registro.tipo}">${registro.tipo}</span></span>
                    <span class="nombre"><strong>${registro.nombreMovimiento}</strong></span>
                    <span class="fecha">${registro.fecha}</span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
}


function eventosRegistrosAcopio() {
    const btnExcel = document.querySelectorAll('.exportar-excel');
    const registrosAExportar = movimientosAcopio;

    const botonesTipo = document.querySelectorAll('.filtros-opciones.tipo .btn-filtro');

    const items = document.querySelectorAll('.registro-item');

    const inputBusqueda = document.querySelector('.buscar-registro-almacen');
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

    let filtroNombreActual = 'todos';
    let filtroMateriaActual = null;
    let filtroFechaInstance = null;

    items.forEach(item => {
        item.addEventListener('click', function () {
            const registroId = this.dataset.id;
            window.info(registroId);
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
    botonesTipo.forEach(boton => {
        boton.addEventListener('click', async () => {
            const tipoFiltro = boton.textContent.trim().toLowerCase();

            // Manejar botones de tipo de movimiento (todos, ingresos, salidas)
            if (['todos', 'ingresos', 'salidas'].includes(tipoFiltro)) {
                botonesTipo.forEach(b => {
                    if (['todos', 'ingresos', 'salidas'].includes(b.textContent.trim().toLowerCase())) {
                        b.classList.remove('activado');
                    }
                });
                boton.classList.add('activado');
                filtroNombreActual = tipoFiltro === 'todos' ? 'todos' :
                    tipoFiltro === 'ingresos' ? 'ingreso' : 'salida';
            }
            // Manejar botones de tipo de materia (bruto, prima)
            else if (['bruto', 'prima'].includes(tipoFiltro)) {
                if (boton.classList.contains('activado')) {
                    boton.classList.remove('activado');
                    filtroMateriaActual = null;
                } else {
                    // Desactivar el otro botón de materia si está activo
                    botonesTipo.forEach(b => {
                        if (['bruto', 'prima'].includes(b.textContent.trim().toLowerCase())) {
                            b.classList.remove('activado');
                        }
                    });
                    boton.classList.add('activado');
                    filtroMateriaActual = tipoFiltro;
                }
            }

            aplicarFiltros();
            await scrollToCenter(boton, boton.parentElement);
        });
    });


    function normalizarTexto(texto) {
        return texto.toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .replace(/[-_\s]+/g, ''); // Eliminar guiones, guiones bajos y espacios
    }
    function aplicarFiltros() {
        const filtroTipo = filtroNombreActual;
        const filtroMateria = filtroMateriaActual;
        const fechasSeleccionadas = filtroFechaInstance?.selectedDates || [];
        const busqueda = normalizarTexto(inputBusqueda.value);
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        const registrosFiltrados = Array.from(items).map(registro => {
            const registroData = movimientosAcopio.find(r => r.id === registro.dataset.id);
            if (!registroData) return { elemento: registro, mostrar: false };

            let mostrar = true;

            // Aplicar filtro de tipo de movimiento
            if (filtroTipo !== 'todos') {
                const tipoCompleto = registroData.tipo.toLowerCase();
                const [tipoMovimiento] = tipoCompleto.split(' ');
                mostrar = tipoMovimiento === filtroTipo;
            }

            // Aplicar filtro de tipo de materia
            if (mostrar && filtroMateria) {
                const tipoCompleto = registroData.tipo.toLowerCase();
                const [, tipoMateria] = tipoCompleto.split(' ');
                mostrar = tipoMateria === filtroMateria;
            }

            // Filtro de fechas
            if (mostrar && fechasSeleccionadas.length === 2) {
                const [fechaPart] = registroData.fecha.split(','); // Dividir por coma primero
                const [dia, mes, anio] = fechaPart.trim().split('/'); // Quitar espacios y dividir
                const fechaRegistro = new Date(anio, mes - 1, dia);
                const fechaInicio = fechasSeleccionadas[0];
                const fechaFin = fechasSeleccionadas[1];
                mostrar = fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin;
            }

            // Filtro de búsqueda
            if (mostrar && busqueda) {
                const textoRegistro = [
                    registroData.id,
                    registroData.nombreMovimiento,
                    registroData.tipo,
                    registroData.fecha,
                    registroData.producto,
                    registroData.observaciones
                ].filter(Boolean).join(' ').toLowerCase();
                mostrar = normalizarTexto(textoRegistro).includes(busqueda);
            }

            return { elemento: registro, mostrar };
        });

        const registrosVisibles = registrosFiltrados.filter(r => r.mostrar).length;

        // Ocultar todos con una transición suave
        items.forEach(registro => {
            registro.style.opacity = '0';
            registro.style.transform = 'translateY(-20px)';
        });

        // Esperar a que termine la animación de ocultamiento
        setTimeout(() => {
            items.forEach(registro => {
                registro.style.display = 'none';
            });

            // Mostrar los filtrados con animación escalonada
            registrosFiltrados.forEach(({ elemento, mostrar }, index) => {
                if (mostrar) {
                    elemento.style.display = 'flex';
                    elemento.style.opacity = '0';
                    elemento.style.transform = 'translateY(20px)';

                    setTimeout(() => {
                        elemento.style.opacity = '1';
                        elemento.style.transform = 'translateY(0)';
                    }, 20); // Efecto cascada suave
                }
            });

            // Actualizar mensaje de no encontrado
            if (mensajeNoEncontrado) {
                mensajeNoEncontrado.style.display = registrosVisibles === 0 ? 'block' : 'none';
            }
        }, 200);
    }
    function scrollToCenter(boton, contenedorPadre) {
        const scrollLeft = boton.offsetLeft - (contenedorPadre.offsetWidth / 2) + (boton.offsetWidth / 2);
        contenedorPadre.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    }
    inputBusqueda.addEventListener('input', (e) => {
        aplicarFiltros();
    });
    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });


    window.info = function (registroId) {
        const registro = movimientosAcopio.find(r => r.id === registroId);
        if (!registro) return;

        // Separar fecha y hora
        const [fecha, hora] = registro.fecha.split(',').map(item => item.trim());

        // Preparar la sección de características
        const caracteristicasHTML = registro.caracteristicas && registro.caracteristicas.trim() ? `
            <p class="normal"><i class='bx bx-chevron-right'></i>Características del producto</p>
            <div class="campo-vertical">
                ${registro.caracteristicas.split(';').map(caracteristica => {
            const [nombre, valor] = caracteristica.split(':').map(item => item.trim());
            return `<span class="valor"><strong><i class='bx bx-check-circle'></i> ${nombre}: </strong>${valor}</span>`;
        }).join('')}
            </div>
        ` : '';

        // Check if it's the last ingreso record
        const esIngreso = registro.tipo.toLowerCase().startsWith('ingreso');
        const esUltimoIngreso = esIngreso ?
            movimientosAcopio
                .filter(r => r.tipo.toLowerCase().startsWith('ingreso') &&
                    r.idProducto === registro.idProducto &&
                    r.tipo === registro.tipo)
                .sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA;
                })[0]?.id === registro.id
            : false;

        const esSalida = registro.tipo.toLowerCase().startsWith('salida');

        const contenido = document.querySelector('.anuncio-second .contenido');
        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Información del registro</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno verificar-registro">
                <p class="normal">Información básica</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Nombre: </strong>${registro.nombreMovimiento}</span>
                    <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${fecha}</span>
                    <span class="valor"><strong><i class='bx bx-time'></i> Hora: </strong>${hora}</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Tipo: </strong>${registro.tipo}</span>
                </div>
    
                <p class="normal">Detalles del producto</p>
                <div class="campo-vertical">
                    <span class="valor"><strong><i class='bx bx-barcode'></i> ID Producto: </strong>${registro.idProducto}</span>
                    <span class="valor"><strong><i class='bx bx-box'></i> Producto: </strong>${registro.producto}</span>
                    <span class="valor"><strong><i class='bx bx-weight'></i> Peso: </strong>${registro.peso} Kg.</span>
                </div>
    
                <p class="normal">Detalles del movimiento</p>
                <div class="campo-vertical">
                    <span class="valor"><strong><i class='bx bx-user'></i> Operario: </strong>${registro.operario}</span>
                    <span class="valor"><strong><i class='bx bx-notepad'></i> Nombre del movimiento: </strong>${registro.nombreMovimiento}</span>
                </div>
    
                ${caracteristicasHTML}
    
                <p class="normal">Observaciones</p>
                <div class="campo-vertical">
                    <span class="valor"><strong><i class='bx bx-comment-detail'></i> Observaciones: </strong>${registro.observaciones || 'Ninguna'}</span>
                </div>
            </div>
            <div class="anuncio-botones">
                ${tienePermiso('eliminacion') && registro.tipo === 'Anulado' ? `<button class="btn-eliminar btn red" data-id="${registro.id}"><i class="bx bx-trash"></i>Eliminar</button>` : ''}
                ${((esSalida || esUltimoIngreso) && tienePermiso('anulacion')) ?
                `<button class="btn-anular btn yellow" data-id="${registro.id}"><i class="bx bx-x-circle"></i>Anular</button>`
                : ''}
            </div>
        `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '10px';
        if (tienePermiso('anulacion') && (esSalida || esUltimoIngreso)) {
            contenido.style.paddingBottom = '80px';
        }
        if (tienePermiso('eliminacion') && registro.tipo === 'Anulado') {
            contenido.style.paddingBottom = '80px';
        }

        mostrarAnuncioSecond();

        if (tienePermiso('anulacion') && (esSalida || esUltimoIngreso)) {
            const btnAnular = contenido.querySelector('.btn-anular');
            btnAnular.addEventListener('click', () => anular(registro));
        }
        if (tienePermiso('eliminacion') && registro.tipo === 'Anulado') {
            const btnEliminar = contenido.querySelector('.btn-eliminar');
            btnEliminar.addEventListener('click', () => eliminar(registro));
        }

        async function eliminar(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const [fecha, hora] = registro.fecha.split(',').map(item => item.trim());

            const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Eliminar registro</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <p class="normal">Información del registro</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Nombre: </strong>${registro.nombreMovimiento}</span>
                    <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${fecha}</span>
                    <span class="valor"><strong><i class='bx bx-time'></i> Hora: </strong>${hora}</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Tipo: </strong>${registro.tipo}</span>
                </div>
                <div class="campo-vertical">
                    <span class="valor"><strong><i class='bx bx-box'></i> Producto: </strong>${registro.producto}</span>
                    <span class="valor"><strong><i class='bx bx-weight'></i> Peso: </strong>${registro.peso} Kg.</span>
                </div>

                <p class="normal">Motivo de la eliminación</p>
                <div class="entrada">
                    <i class='bx bx-comment-detail'></i>
                    <div class="input">
                        <p class="detalle">Motivo</p>
                        <input class="motivo-eliminacion" type="text" autocomplete="off" placeholder=" " required>
                    </div>
                </div>
                <div class="info-sistema">
                    <i class='bx bx-info-circle'></i>
                    <div class="detalle-info">
                        <p>Vas a eliminar un registro del sistema. Esta acción no se puede deshacer y podría afectar a otros registros relacionados ademas de que no se te regresara ningun peso o lote de este registro. Asegúrate de que deseas continuar.</p>
                    </div>
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-confirmar-eliminar btn red"><i class='bx bx-trash'></i> Confirmar eliminación</button>
            </div>
        `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            // Agregar evento al botón de confirmar eliminación
            const btnConfirmarEliminar = contenido.querySelector('.btn-confirmar-eliminar');
            btnConfirmarEliminar.addEventListener('click', async () => {
                const motivo = document.querySelector('.motivo-eliminacion').value.trim();

                if (!motivo) {
                    mostrarNotificacion({
                        message: 'Debe ingresar el motivo de la eliminación',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga();
                    const response = await fetch(`/eliminar-movimiento-acopio/${registro.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ motivo })
                    });

                    const data = await response.json();

                    if (data.success) {
                        ocultarCarga();
                        mostrarNotificacion({
                            message: 'Registro eliminado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Eliminación',
                            usuarioInfo.nombre + ' elimino el registro con el nombre de: ' + registro.nombreMovimiento + ' y el id: ' + registro.id + ' por el motivo de: ' + motivo)

                        cerrarAnuncioManual('anuncioTercer');
                        cerrarAnuncioManual('anuncioSecond');
                        await mostrarRegistrosAcopio();
                    } else {
                        throw new Error(data.error);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: 'Error al eliminar el registro',
                        type: 'error',
                        duration: 3000
                    });
                } finally {
                    ocultarCarga();
                }
            });
        }
        async function anular(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const [fecha, hora] = registro.fecha.split(',').map(item => item.trim());

            const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">Anular registro</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Información del registro</p>
            <div class="campo-vertical">
                <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                <span class="nombre"><strong><i class='bx bx-id-card'></i> Nombre: </strong>${registro.nombreMovimiento}</span>
                <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${fecha}</span>
                <span class="valor"><strong><i class='bx bx-time'></i> Hora: </strong>${hora}</span>
                <span class="valor"><strong><i class='bx bx-package'></i> Tipo: </strong>${registro.tipo}</span>
            </div>
            <div class="campo-vertical">
                <span class="valor"><strong><i class='bx bx-box'></i> Producto: </strong>${registro.producto}</span>
                <span class="valor"><strong><i class='bx bx-weight'></i> Peso: </strong>${registro.peso} Kg.</span>
            </div>

            <p class="normal">Motivo de la anulación</p>
            <div class="entrada">
                <i class='bx bx-comment-detail'></i>
                <div class="input">
                    <p class="detalle">Motivo</p>
                    <input class="motivo-anulacion" type="text" autocomplete="off" placeholder=" " required>
                </div>
            </div>
            <div class="info-sistema">
                <i class='bx bx-info-circle'></i>
                <div class="detalle-info">
                    <p>Estás por anular un registro del sistema. Esta acción mantendrá el registro pero lo marcará como anulado, además te devolverá el peso en caso de (Salida) y quitará el lote en caso de (Ingreso).</p>
                </div>
            </div>

        </div>
        <div class="anuncio-botones">
            <button class="btn-confirmar-anular btn red"><i class='bx bx-x-circle'></i> Confirmar anulación</button>
        </div>
    `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            const btnConfirmarAnular = contenido.querySelector('.btn-confirmar-anular');
            btnConfirmarAnular.addEventListener('click', async () => {
                const motivo = document.querySelector('.motivo-anulacion').value.trim();

                if (!motivo) {
                    mostrarNotificacion({
                        message: 'Debe ingresar el motivo de la anulación',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga();
                    const response = await fetch(`/anular-movimiento-acopio/${registro.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ motivo })
                    });

                    const data = await response.json();

                    if (data.success) {
                        ocultarCarga();
                        mostrarNotificacion({
                            message: 'Registro anulado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Información',
                            usuarioInfo.nombre + ' anulo el registro con el nombre de: ' + nombreMovimiento + ' y el id: ' + registro.id + ' por el motivo de: ' + motivo)


                        cerrarAnuncioManual('anuncioTercer');
                        cerrarAnuncioManual('anuncioSecond');
                        await mostrarRegistrosAcopio();
                    } else {
                        throw new Error(data.error);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al anular el registro',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            });
        }
    }

    btnExcel.forEach(btn => {
        btn.addEventListener('click', () => exportarArchivos('acopio', registrosAExportar));
    })
    aplicarFiltros();
}
