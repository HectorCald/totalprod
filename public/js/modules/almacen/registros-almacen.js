let registrosAlmacen = [];
let proovedores = [];
let clientes = [];


const DB_NAME = 'damabrava_db';
const REGISTROS_ALM_DB = 'registros_almacen';
const PROVEEDOR_DB = 'proveedores';
const CLIENTE_DB = 'clientes';


async function obtenerProovedores() {
    try {
        const proovedoresCache = await obtenerLocal(PROVEEDOR_DB, DB_NAME);

        if (proovedoresCache.length > 0) {
            proovedores = proovedoresCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            console.log('actulizando desde el cache')
        }

        const response = await fetch('/obtener-proovedores');
        const data = await response.json();

        if (data.success) {
            // Store proovedores in global variable
            proovedores = data.proovedores.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Descending order
            });

            if (JSON.stringify(proovedoresCache) !== JSON.stringify(proovedores)) {
                console.log('Diferencias encontradas, actualizando UI');
                renderInitialHTML();
                updateHTMLWithData();

                (async () => {
                    try {
                        const db = await initDB(PROVEEDOR_DB, DB_NAME);
                        const tx = db.transaction(PROVEEDOR_DB, 'readwrite');
                        const store = tx.objectStore(PROVEEDOR_DB);

                        // Limpiar todos los registros existentes
                        await store.clear();

                        // Guardar los nuevos registros
                        for (const item of proovedores) {
                            await store.put({
                                id: item.id,
                                data: item,
                                timestamp: Date.now()
                            });
                        }

                        console.log('Caché actualizado correctamente');
                    } catch (error) {
                        console.error('Error actualizando el caché:', error);
                    }
                })();
            }
            else {
                console.log('no son diferentes')
            }
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error al obtener proovedores:', error);
        return false;
    }
}
async function obtenerClientes() {
    try {

        const clientesCache = await obtenerLocal(CLIENTE_DB, DB_NAME);

        if (clientesCache.length > 0) {
            clientes = clientesCache.sort((a, b) => {
                const nombreA = a.nombre.toLowerCase();
                const nombreB = b.nombre.toLowerCase();
                return nombreA.localeCompare(nombreB);
            });
            console.log('actulizando desde el cache')
        }


        const response = await fetch('/obtener-clientes');
        const data = await response.json();

        if (data.success) {
            clientes = data.clientes.sort((a, b) => {
                const nombreA = a.nombre.toLowerCase();
                const nombreB = b.nombre.toLowerCase();
                return nombreA.localeCompare(nombreB);
            });

            if (JSON.stringify(clientesCache) !== JSON.stringify(clientes)) {
                console.log('Diferencias encontradas, actualizando UI');
                renderInitialHTML();
                updateHTMLWithData();

                (async () => {
                    try {
                        const db = await initDB(CLIENTE_DB, DB_NAME);
                        const tx = db.transaction(CLIENTE_DB, 'readwrite');
                        const store = tx.objectStore(CLIENTE_DB);

                        // Limpiar todos los registros existentes
                        await store.clear();

                        // Guardar los nuevos registros
                        for (const item of clientes) {
                            await store.put({
                                id: item.id,
                                data: item,
                                timestamp: Date.now()
                            });
                        }

                        console.log('Caché actualizado correctamente');
                    } catch (error) {
                        console.error('Error actualizando el caché:', error);
                    }
                })();
            }
            else {
                console.log('no son diferentes')
            }

            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return false;
    }
}
async function obtenerRegistrosAlmacen() {
    try {
        const registrosCacheAlmacen = await obtenerLocal(REGISTROS_ALM_DB, DB_NAME);

        // Si hay registros en caché, actualizar la UI inmediatamente
        if (registrosCacheAlmacen.length > 0) {
            registrosAlmacen = registrosCacheAlmacen.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            renderInitialHTML();
            updateHTMLWithData();
        }

        const response = await fetch('/obtener-movimientos-almacen');
        const data = await response.json();

        if (data.success) {
            // Filtrar registros por el email del usuario actual y ordenar de más reciente a más antiguo
            registrosAlmacen = data.movimientos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Orden descendente por número de ID
            });

            // Verificar si hay diferencias entre el caché y los nuevos datos
            if (JSON.stringify(registrosCacheAlmacen) !== JSON.stringify(registrosAlmacen)) {
                console.log('Diferencias encontradas, actualizando UI');
                renderInitialHTML();
                updateHTMLWithData();

                (async () => {
                    try {
                        const db = await initDB(REGISTROS_ALM_DB, DB_NAME);
                        const tx = db.transaction(REGISTROS_ALM_DB, 'readwrite');
                        const store = tx.objectStore(REGISTROS_ALM_DB);

                        // Limpiar todos los registros existentes
                        await store.clear();

                        // Guardar los nuevos registros
                        for (const registro of registrosAlmacen) {
                            await store.put({
                                id: registro.id,
                                data: registro,
                                timestamp: Date.now()
                            });
                        }

                        console.log('Caché actualizado correctamente');
                    } catch (error) {
                        console.error('Error actualizando el caché:', error);
                    }

                })();
            }



            return true;
        } else {
            throw new Error(data.error || 'Error al obtener los productos');
        }
    } catch (error) {
        console.error('Error al obtener registros:', error);
        mostrarNotificacion({
            message: 'Error al obtener registros',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}


export async function mostrarMovimientosAlmacen() {
    renderInitialHTML();
    mostrarAnuncio();
    const [obtnerRegistros, clientes, proovedores] = await Promise.all([
        obtenerProovedores(),
        obtenerClientes(),
        await obtenerRegistrosAlmacen(),
    ]);
}
function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Registros almacen</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <div class="busqueda">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="search" placeholder="">
                    </div>
                    <button class="btn-calendario"><i class='bx bx-calendar'></i></button>
                </div>
                <div class="acciones-grande">
                    <button class="exportar-excel btn orange"><i class='bx bxs-file'></i> <span>Descargar Excel</span></button>
                    <button class="exportar-pdf btn red"><i class='bx bxs-file-pdf'></i> <span>Descargar PDF</span></button>
                </div>
            </div>
            
            <div class="filtros-opciones tipo">
                <button class="btn-filtro activado">Todos</button>
                <button class="btn-filtro">Ingresos</button>
                <button class="btn-filtro">Salidas</button>
                <button class="btn-filtro">Anulados</button>
                <select class="proovedor-cliente" style="width:100%">
                    <option value="Todos" class="defecto">Todos</option>
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
            <button class="exportar-excel btn orange"><i class='bx bxs-file'></i> Descargar Excel</button>
            <button class="exportar-pdf btn red"><i class='bx bxs-file-pdf'></i> Descargar PDF</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '70px';
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);
}
function updateHTMLWithData() {
    const productosContainer = document.querySelector('.productos-container');
    // Mostrar solo los primeros 200 registros
    const registrosLimitados = registrosAlmacen.slice(0, 200);
    const productosHTML = registrosLimitados.map(registro => `
        <div class="registro-item" data-id="${registro.id}">
            <div class="header">
                <i class='bx bx-file'></i>
                <div class="info-header">
                    <span class="id-flotante"><span>${registro.id}</span><span class="flotante-item ${registro.tipo === 'Ingreso' ? 'green' : registro.tipo === 'Salida' ? 'red' : 'orange'}">${registro.tipo}</span></span>
                    <span class="detalle"><strong>${registro.nombre_movimiento}</strong></span>
                    <span class="pie">${registro.fecha_hora} <span class="neutro">Bs. ${registro.total}</span></span>
                </div>
            </div>
        </div>
    `).join('');
    // Botones para cargar más si hay más de 250
    const showMoreButton = registrosAlmacen.length > 250 ? `
        <div class="show-more-container" style="text-align: center; display: flex; gap: 5px; justify-content: center;align-items:center;width:100%;min-height:70px;height:100%">
            <button class="btn show-more" style="background-color: var(--primary-color); color: white; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;width:100%;height:100%">
                <i class='bx bx-show' style="min-width:20px"></i> Mostrar +50
            </button>
            <button class="btn show-all" style="background-color: var(--primary-color); color: white; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;width:100%;height:100%">
                <i class='bx bx-list-ul'style="min-width:20px"></i> Mostrar todos
            </button>
        </div>
    ` : '';
    productosContainer.innerHTML = productosHTML + showMoreButton;
    eventosRegistrosAlmacen();
    // Enlazar eventos a los nuevos botones
    const showMoreBtn = document.querySelector('.show-more');
    const showAllBtn = document.querySelector('.show-all');
    if (showMoreBtn) showMoreBtn.addEventListener('click', cargarMasRegistrosAlmacen);
    if (showAllBtn) showAllBtn.addEventListener('click', cargarTodosLosRegistrosAlmacen);
}


function cargarMasRegistrosAlmacen() {
    const productosContainer = document.querySelector('.productos-container');
    const currentItems = document.querySelectorAll('.registro-item').length;
    const nextBatch = registrosAlmacen.slice(currentItems, currentItems + 50);
    if (nextBatch.length > 0) {
        const newItemsHTML = nextBatch.map(registro => `
            <div class="registro-item" data-id="${registro.id}">
                <div class="header">
                    <i class='bx bx-file'></i>
                    <div class="info-header">
                        <span class="id-flotante"><span>${registro.id}</span><span class="flotante-item ${registro.tipo === 'Ingreso' ? 'green' : registro.tipo === 'Salida' ? 'red' : 'orange'}">${registro.tipo}</span></span>
                        <span class="detalle"><strong>${registro.nombre_movimiento}</strong></span>
                        <span class="pie">${registro.fecha_hora} <span class="neutro">Bs. ${registro.total}</span></span>
                    </div>
                </div>
            </div>
        `).join('');
        // Quitar el show more container
        const showMoreContainer = document.querySelector('.show-more-container');
        if (showMoreContainer) showMoreContainer.remove();
        // Agregar nuevos items
        productosContainer.insertAdjacentHTML('beforeend', newItemsHTML);
        // Agregar show more de nuevo si quedan más
        if (currentItems + nextBatch.length < registrosAlmacen.length) {
            productosContainer.insertAdjacentHTML('beforeend', `
                <div class="show-more-container" style="text-align: center; display: flex; gap: 5px; justify-content: center;align-items:center;width:100%;min-height:70px;height:100%">
                    <button class="btn show-more" style="background-color: var(--primary-color); color: white; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;width:100%;height:100%">
                        <i class='bx bx-show' style="min-width:20px"></i> Mostrar +50
                    </button>
                    <button class="btn show-all" style="background-color: var(--primary-color); color: white; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;width:100%;height:100%">
                        <i class='bx bx-list-ul'style="min-width:20px"></i> Mostrar todos
                    </button>
                </div>
            `);
            // Reenlazar eventos
            const showMoreBtn = document.querySelector('.show-more');
            const showAllBtn = document.querySelector('.show-all');
            if (showMoreBtn) showMoreBtn.addEventListener('click', cargarMasRegistrosAlmacen);
            if (showAllBtn) showAllBtn.addEventListener('click', cargarTodosLosRegistrosAlmacen);
        }
        // Reenlazar eventos a los nuevos items
        eventosRegistrosAlmacen();
    }
}
function cargarTodosLosRegistrosAlmacen() {
    const productosContainer = document.querySelector('.productos-container');
    const currentItems = document.querySelectorAll('.registro-item').length;
    const remainingRecords = registrosAlmacen.slice(currentItems);
    if (remainingRecords.length > 0) {
        const newItemsHTML = remainingRecords.map(registro => `
            <div class="registro-item" data-id="${registro.id}">
                <div class="header">
                    <i class='bx bx-file'></i>
                    <div class="info-header">
                        <span class="id-flotante"><span>${registro.id}</span><span class="flotante-item ${registro.tipo === 'Ingreso' ? 'green' : registro.tipo === 'Salida' ? 'red' : 'orange'}">${registro.tipo}</span></span>
                        <span class="detalle"><strong>${registro.nombre_movimiento}</strong></span>
                        <span class="pie">${registro.fecha_hora} <span class="neutro">Bs. ${registro.total}</span></span>
                    </div>
                </div>
            </div>
        `).join('');
        // Quitar el show more container
        const showMoreContainer = document.querySelector('.show-more-container');
        if (showMoreContainer) showMoreContainer.remove();
        // Agregar todos los items restantes
        productosContainer.insertAdjacentHTML('beforeend', newItemsHTML);
        eventosRegistrosAlmacen();
    }
}
function eventosRegistrosAlmacen() {
    const btnExcel = document.querySelectorAll('.exportar-excel');
    const btnPDF = document.querySelectorAll('.exportar-pdf');
    const registrosAExportar = registrosAlmacen;

    const botonesTipo = document.querySelectorAll('.filtros-opciones.tipo .btn-filtro');

    const items = document.querySelectorAll('.registro-item');

    const inputBusqueda = document.querySelector('.search');
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


    let filtroNombreActual = 'Todos';
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
        if (boton.classList.contains('activado')) {
            filtroNombreActual = boton.textContent.trim();
        }
        boton.addEventListener('click', async () => {
            botonesTipo.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');

            const tipoFiltro = boton.textContent.trim().toLowerCase();

            if (tipoFiltro === 'ingresos') {
                filtroNombreActual = 'ingreso';
            }
            else if (tipoFiltro === 'salidas') {
                filtroNombreActual = 'salida';
            }
            else if (tipoFiltro === 'todos') {
                filtroNombreActual = 'todos';
            } else if (tipoFiltro === 'anulados') {
                filtroNombreActual = 'anulado';
            }

            aplicarFiltros();
            actualizarSelectProovedorCliente(filtroNombreActual);
            await scrollToCenter(boton, boton.parentElement);
        });
    });

    function aplicarFiltros() {
        const filtroTipo = filtroNombreActual;
        const fechasSeleccionadas = filtroFechaInstance?.selectedDates || [];
        const busqueda = normalizarTexto(inputBusqueda.value);
        const proveedorClienteSeleccionado = normalizarTexto(document.querySelector('.proovedor-cliente').value);
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Primero, filtrar todos los registros
        const registrosFiltrados = Array.from(items).map(registro => {
            const registroData = registrosAlmacen.find(r => r.id === registro.dataset.id);
            if (!registroData) return { elemento: registro, mostrar: false };

            let mostrar = true;

            // Filtro por tipo (Ingresos/Salidas)
            if (filtroTipo !== 'todos') {
                const tipoRegistro = normalizarTexto(registroData.tipo);
                if (filtroTipo === 'ingreso') {
                    mostrar = (tipoRegistro === 'ingreso');
                } else if (filtroTipo === 'salida') {
                    mostrar = (tipoRegistro === 'salida');
                }
                else if (filtroTipo === 'anulado') {
                    mostrar = (tipoRegistro === 'anulado');
                }
            }

            // Filtro por proveedor/cliente
            if (mostrar && proveedorClienteSeleccionado !== 'todos') {
                const nombreCompleto = normalizarTexto(registroData.cliente_proovedor.split('(')[0]);
                mostrar = nombreCompleto.includes(proveedorClienteSeleccionado);
            }

            // Filtro de fechas
            if (mostrar && fechasSeleccionadas.length === 2) {
                const [fechaPart] = registroData.fecha_hora.split(','); // Dividir por coma primero
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
                    registroData.nombre_movimiento,
                    registroData.tipo,
                    registroData.fecha_hora,
                    registroData.cliente_proovedor,
                    registroData.estado
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
    inputBusqueda.addEventListener('input', (e) => {
        aplicarFiltros();
    });
    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });

    document.querySelector('.proovedor-cliente').addEventListener('change', aplicarFiltros);
    function actualizarSelectProovedorCliente(tipoFiltro) {
        const select = document.querySelector('.proovedor-cliente');
        select.innerHTML = '<option value="Todos" class="defecto">Todos</option>';

        if (tipoFiltro === 'ingreso') {
            proovedores.forEach(proovedor => {
                select.innerHTML += `
                <option value="${proovedor.nombre}">${proovedor.nombre}</option>
            `;
            });
            const defectoOption = select.querySelector('.defecto');
            if (defectoOption) {
                defectoOption.textContent = 'Proveedores';
            }
            filtroNombreActual = 'ingreso';
        }
        else if (tipoFiltro === 'salida') {
            clientes.forEach(cliente => {
                select.innerHTML += `
                <option value="${cliente.nombre}">${cliente.nombre}</option>
            `;
            });
            const defectoOption = select.querySelector('.defecto');
            if (defectoOption) {
                defectoOption.textContent = 'Clientes';
            }
            filtroNombreActual = 'salida';
        }
        else if (tipoFiltro === 'Todos') {
            filtroNombreActual = 'Todos';
        }
    }

    window.info = function (registroId) {
        const registro = registrosAlmacen.find(r => r.id === registroId);
        if (!registro) return; // Changed from registrosProduccion

        // Buscar el nombre real del cliente o proveedor
        let nombreEntidad = registro.cliente_proovedor;
        const cliente = clientes.find(c => String(c.id) === String(registro.cliente_proovedor));
        if (cliente) {
            nombreEntidad = cliente.nombre;
        } else{
            nombreEntidad = registro.cliente_proovedor;
        }


        const contenido = document.querySelector('.anuncio-second .contenido');
        const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">Información</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Detalles del movimiento</p>
            <div class="campo-vertical">
                <span class="nombre"><strong><i class='bx bx-id-card'></i> Nombre: </strong>${registro.nombre_movimiento}</span>
                <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha_hora.split(',')[0]}</span>
                <span class="valor"><strong><i class='bx bx-time'></i> Hora: </strong>${registro.fecha_hora.split(',')[1]}</span>
                <span class="valor"><strong><i class='bx bx-user'></i> Cliente/Proveedor: </strong>${nombreEntidad}</span>
                <span class="valor"><strong><i class='bx bx-user-circle'></i> Responsable: </strong>${registro.operario}</span>
            </div>

            <p class="normal">Productos y cantidades</p>
            <div class="campo-vertical">
                ${registro.productos.split(';').map((producto, index) => {
            const cantidad = registro.cantidades.split(';')[index] || 'N/A';
            return `
                        <span class="producto"><strong><i class='bx bx-box'></i> ${producto.trim()}</strong>${cantidad.trim()} Und.</span>
                    `;
        }).join('')}
            </div>
            <p class="normal">Detalles financieros</p>
            <div class="campo-vertical">
                <span class="valor"><strong><i class='bx bx-dollar-circle'></i> Subtotal: </strong>Bs. ${registro.subtotal}</span>
                <span class="valor"><strong><i class='bx bx-tag'></i> Descuento: </strong>Bs. ${registro.descuento}</span>
                <span class="valor"><strong><i class='bx bx-trending-up'></i> Aumento: </strong>Bs. ${registro.aumento}</span>
                <span class="valor total"><strong><i class='bx bx-money'></i> Total: </strong>Bs. ${registro.total}</span>
            </div>

            <p class="normal">Observaciones</p>
            <div class="campo-vertical">
                 <span class="valor"><strong><i class='bx bx-comment-detail'></i> Observaciones: </strong>${registro.observaciones || 'Ninguna'}</span>
            </div>
        </div>
        <div class="anuncio-botones">
            ${tienePermiso('anulacion') && registro.tipo != 'Anulado' ? `<button class="btn-anular btn yellow" data-id="${registro.id}"><i class='bx bx-x-circle'></i>Anular</button>` : ''}
            ${tienePermiso('eliminacion') && registro.tipo === 'Anulado' ? `<button class="btn-eliminar btn red" data-id="${registro.id}"><i class="bx bx-trash"></i>Eliminar</button>` : ''}
            <button class="btn-copia btn blue" data-id="${registro.id}"><i class='bx bx-copy'></i>Copiar</button>
            ${registro.tipo === 'Ingreso' ? `<button class="btn-anexar-produccion btn green" data-id="${registro.id}"><i class='bx bx-box'></i>Anexar</button>` : ''}
        </div>
    `;
        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '70px';
        mostrarAnuncioSecond();


        if (tienePermiso('anulacion') && registro.tipo != 'Anulado') {
            const btnAnular = contenido.querySelector('.btn-anular');
            btnAnular.addEventListener('click', () => anular(registro));
        }
        if (tienePermiso('eliminacion') && registro.tipo === 'Anulado') {
            const btnEliminar = contenido.querySelector('.btn-eliminar');
            btnEliminar.addEventListener('click', () => eliminar(registro));
        }
        if (registro.tipo === 'Ingreso') {
            const btnAnexar = contenido.querySelector('.btn-anexar-produccion');
            btnAnexar.addEventListener('click', () => anexar(registro));
        }

        const btnCopia = contenido.querySelector('.btn-copia');

        btnCopia.addEventListener('click', () => copia(registro));


        function eliminar(registro) { // Changed 
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Eliminar registro</h1>
               <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <p class="normal">Información básica</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Nombre: </strong>${registro.nombre_movimiento}</span>
                    <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha_hora.split(',')[0]}</span>
                    <span class="valor"><strong><i class='bx bx-time'></i> Hora: </strong>${registro.fecha_hora.split(',')[1]}</span>
                </div>
                <p class="normal">Motivo de la eliminación</p>
                <div class="entrada">
                    <i class='bx bx-comment-detail'></i>
                    <div class="input">
                        <p class="detalle">Motivo</p>
                        <input class="motivo" type="text" autocomplete="off" placeholder=" " required>
                    </div>
                </div>
                <div class="info-sistema">
                    <i class='bx bx-info-circle'></i>
                    <div class="detalle-info">
                        <p>Vas a eliminar un registro del sistema. Esta acción no se puede deshacer y podría afectar a otros registros relacionados. Asegúrate de que deseas continuar.</p>
                    </div>
                </div>

            </div>
            <div class="anuncio-botones">
                <button class="btn-eliminar-registro btn red"><i class="bx bx-trash"></i> Confirmar eliminación</button>
            </div>
        `;
            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '70px';
            mostrarAnuncioTercer();

            // Agregar evento al botón guardar
            const btnEliminar = contenido.querySelector('.btn-eliminar-registro');
            btnEliminar.addEventListener('click', confirmarEliminacion);

            async function confirmarEliminacion() {
                const motivo = document.querySelector('.motivo').value.trim();

                if (!motivo) {
                    mostrarNotificacion({
                        message: 'Debe ingresar el motivo de la eliminación',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga('.carga-procesar')
                    const response = await fetch(`/eliminar-registro-almacen/${registroId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        await obtenerRegistrosAlmacen();
                        cerrarAnuncioManual('anuncioSecond');
                        updateHTMLWithData();
                        mostrarNotificacion({
                            message: 'Registro eliminado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Eliminación',
                            usuarioInfo.nombre + ' elimino el registro de almacen llamado: ' + registro.nombre_movimiento + ' con el id: ' + registro.id + ' tipo: ' + registro.tipo + ' por el motivo de: ' + motivo)

                    } else {
                        throw new Error(data.error || 'Error al eliminar el registro');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al procesar la operación',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar')
                }
            }
        }
        function anular(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Anular registro</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <p class="normal">Información básica</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Nombre: </strong>${registro.nombre_movimiento}</span>
                    <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha_hora.split(',')[0]}</span>
                    <span class="valor"><strong><i class='bx bx-time'></i> Hora: </strong>${registro.fecha_hora.split(',')[1]}</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Tipo: </strong>${registro.tipo}</span>
                </div>
                <p class="normal">Motivo de la anulación</p>
                <div class="entrada">
                    <i class='bx bx-comment-detail'></i>
                    <div class="input">
                        <p class="detalle">Motivo</p>
                        <input class="motivo" type="text" autocomplete="off" placeholder=" " required>
                    </div>
                </div>
                <div class="info-sistema">
                    <i class='bx bx-info-circle'></i>
                    <div class="detalle-info">
                        <p>Estás por anular un registro del sistema. Esta acción no eliminará el regsitro y te regresara el stock que ingreso o salio de almacen en este registro, pero asegurante de anular este registro</p>
                    </div>
                </div>

            </div>
            <div class="anuncio-botones">
                <button class="btn-anular-registro btn red"><i class='bx bx-x-circle'></i> Confirmar anulación</button>
            </div>
        `;
            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '70px';
            mostrarAnuncioTercer();

            const btnAnular = contenido.querySelector('.btn-anular-registro');
            btnAnular.addEventListener('click', confirmarAnulacion);

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
                    mostrarCarga('.carga-procesar')
                    const response = await fetch(`/anular-movimiento/${registro.id}`, {
                        method: 'PUT', // Cambiado a PUT ya que vamos a actualizar
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            motivo,
                            estado: 'Anulado'
                        })
                    });

                    if (!response.ok) throw new Error('Error en la respuesta del servidor');

                    const data = await response.json();

                    if (data.success) {
                        await obtenerRegistrosAlmacen();
                        info(registroId);
                        updateHTMLWithData();
                        mostrarNotificacion({
                            message: 'Registro anulado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Información',
                            usuarioInfo.nombre + ' anulo el registro con el nombre de: ' + registro.nombre_movimiento + ' con el id: ' + registro.id + 'tipo ' + registro.tipo + ' por el motivo de: ' + motivo)
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al anular el registro',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar')
                }
            }
        }
        function copia(registro) {
            try {
                const idProductos = registro.idProductos.split(';');
                const cantidades = registro.cantidades.split(';');
                // Guarda solo el array de {id, cantidad} en un localStorage temporal
                const productosACopiar = idProductos.map((id, i) => ({
                    id,
                    cantidad: parseInt(cantidades[i])
                }));
                localStorage.setItem('productosACopiar', JSON.stringify(productosACopiar));
                mostrarNotificacion({
                    message: 'Productos copiados al carrito correctamente',
                    type: 'success',
                    duration: 3000
                });
                if (registro.tipo.toLowerCase() === 'ingreso') {
                    mostrarIngresosAlmacen();
                } else {
                    mostrarSalidasAlmacen();
                }
            } catch (error) {
                console.error('Error al copiar productos:', error);
                mostrarNotificacion({
                    message: 'Error al copiar los productos al carrito',
                    type: 'error',
                    duration: 3500
                });
            }
        }
        function anexar(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Anexar a Producción</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno">
                    <p class="normal">Ingrese el ID del registro de producción al que desea anexar este movimiento:</p>
                    <div class="entrada">
                        <i class='bx bx-id-card'></i>
                        <div class="input">
                            <p class="detalle">ID Producción(Ej: RP-513)</p>
                            <input class="id-produccion-anexar" type="text" autocomplete="off" required>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button class="btn-anexar-produccion btn green"><i class='bx bx-check-circle'></i> Anexar</button>
                </div>
            `;
            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '70px';
            mostrarAnuncioTercer();

            const btnAnexar = contenido.querySelector('.btn-anexar-produccion');
            btnAnexar.addEventListener('click', async () => {
                const idProduccion = contenido.querySelector('.id-produccion-anexar').value.trim();
                if (!idProduccion) {
                    mostrarNotificacion({
                        message: 'Debe ingresar el ID de producción',
                        type: 'warning',
                        duration: 3000
                    });
                    return;
                }
                mostrarCarga('.carga-procesar')
                try {
                    const response = await fetch(`/anexar-movimiento-produccion/${registro.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idProduccion })
                    });
                    const data = await response.json();
                    if (response.ok && data.success) {
                        mostrarNotificacion({
                            message: 'Movimiento anexado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        await obtenerRegistrosAlmacen();
                        cerrarAnuncioManual('anuncioTercer');
                        updateHTMLWithData();
                    } else {
                        throw new Error(data.error || 'Error al anexar el movimiento');
                    }
                } catch (error) {
                    mostrarNotificacion({
                        message: error.message || 'Error al anexar el movimiento',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar')
                }
            });
        }
    }
    btnExcel.forEach(btn => {
        btn.addEventListener('click', () => exportarArchivos('almacen', registrosAExportar));
    });
    btnPDF.forEach(btn => {
        btn.addEventListener('click', () => exportarArchivosPDF('almacen', registrosAExportar));
    });
    aplicarFiltros();
}