import { registrarNotificacion } from '../componentes/componentes.js';

let pedidosGlobal = [];
let productos = [];
let proovedoresAcopioGlobal = [];
let mensajeCompras = localStorage.getItem('damabrava_mensaje_compras') || 'Se compro:\n• Sin compras registradas';
let carritoIngresosAcopio = new Map(JSON.parse(localStorage.getItem('damabrava_ingreso_acopio') || '[]'));

const DB_NAME = 'damabrava_db';
const PROVEEDOR_DB = 'proveedores';
const PRODUCTOS_AC_DB = 'productos_acopio';
const PEDIDOS_ACOPIO_DB = 'pedidos_acopio';

async function obtenerProovedoresAcopio() {
    try {
        const proovedoresCache = await obtenerLocal(PROVEEDOR_DB, DB_NAME);

        if (proovedoresCache.length > 0) {
            proovedoresAcopioGlobal = proovedoresCache.sort((a, b) => {
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
            proovedoresAcopioGlobal = data.proovedores.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Descending order
            });

            if (JSON.stringify(proovedoresCache) !== JSON.stringify(proovedoresAcopioGlobal)) {
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
                        for (const item of proovedoresAcopioGlobal) {
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
async function obtenerAlmacenAcopio() {
    try {
        const productoAcopioCache = await obtenerLocal(PRODUCTOS_AC_DB, DB_NAME);

        if (productoAcopioCache.length > 0) {
            productos = productoAcopioCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            console.log('actulizando desde el cache')
        }

        const response = await fetch('/obtener-productos-acopio');
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }

        const data = await response.json();

        if (data.success) {
            productos = data.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });

            if (JSON.stringify(productoAcopioCache) !== JSON.stringify(productos)) {
                console.log('Diferencias encontradas, actualizando UI');
                renderInitialHTML();
                updateHTMLWithData();

                (async () => {
                    try {
                        const db = await initDB(PRODUCTOS_AC_DB, DB_NAME);
                        const tx = db.transaction(PRODUCTOS_AC_DB, 'readwrite');
                        const store = tx.objectStore(PRODUCTOS_AC_DB);

                        // Limpiar todos los registros existentes
                        await store.clear();

                        // Guardar los nuevos registros
                        for (const item of productos) {
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
            throw new Error(data.error || 'Error al obtener los productos');
        }
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return false;
    }
}
async function obtenerPedidos() {
    try {

        const registrosCachePedidos = await obtenerLocal(PEDIDOS_ACOPIO_DB, DB_NAME);

        // Si hay registros en caché, actualizar la UI inmediatamente
        if (registrosCachePedidos.length > 0) {
            pedidosGlobal = registrosCachePedidos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            renderInitialHTML();
            updateHTMLWithData();
        }

        const response = await fetch('/obtener-pedidos');
        const data = await response.json();

        if (data.success) {
            // Filtrar registros por el email del usuario actual y ordenar de más reciente a más antiguo
            pedidosGlobal = data.pedidos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Orden descendente por número de ID
            });

            // Verificar si hay diferencias entre el caché y los nuevos datos
            if (JSON.stringify(registrosCachePedidos) !== JSON.stringify(pedidosGlobal)) {
                console.log('Diferencias encontradas, actualizando UI');
                renderInitialHTML();
                updateHTMLWithData();
            }

            // Actualizar el caché en segundo plano
            (async () => {
                try {
                    const db = await initDB(PEDIDOS_ACOPIO_DB, DB_NAME);
                    const tx = db.transaction(PEDIDOS_ACOPIO_DB, 'readwrite');
                    const store = tx.objectStore(PEDIDOS_ACOPIO_DB);

                    await store.clear();

                    for (const registro of pedidosGlobal) {
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

            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        return false;
    }
}


function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Pedidos</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
            <button class="btn filtros" onclick="mostrarFormatoCompras()"><i class='bx bx-comment-detail'></i></button>
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
                    <button class="exportar-excel btn orange"><i class='bx bx-download'></i> <span>Descargar</span></button>
                    <button class="nuevo-pedido btn blue"><i class='bx bx-plus'></i> <span>Nuevo pedido</span></button>
                </div>
            </div>
            
            <div class="filtros-opciones estado">
                <button class="btn-filtro activado">Todos</button>
                <button class="btn-filtro">Pendientes</button>
                <button class="btn-filtro">Recibidos</button>
                <button class="btn-filtro">Ingresados</button>
                <button class="btn-filtro">Rechazados</button>
                <button class="btn-filtro">No llegaron</button>
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
                <p style="text-align: center; color: #555;">¡Ups!, No se encontraron pedidos segun tu busqueda o filtrado.</p>
            </div>
        </div>
        <div class="anuncio-botones">
            <button class="exportar-excel btn orange"><i class='bx bx-download'></i> Descargar</button>
            <button class="nuevo-pedido btn blue"><i class='bx bx-plus'></i> Nuevo pedido</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '70px';
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);
}
export async function mostrarPedidos() {
    renderInitialHTML();
    mostrarAnuncio();

    const [proveedores, productos, pedidos] = await Promise.all([
        obtenerProovedoresAcopio(),
        obtenerAlmacenAcopio(),
        await obtenerPedidos()
    ]);
}
function updateHTMLWithData() {
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = pedidosGlobal.map(pedido => `
        <div class="registro-item" data-id="${pedido.id}">
            <div class="header">
                <i class='bx bx-file'></i>
                <div class="info-header">
                    <span class="id-flotante"><span>${pedido.id}</span><span class="flotante-item ${pedido.estado==='Pendiente' ? 'gray' : pedido.estado==='Recibido' ? 'green' : pedido.estado==='Ingresado' ? 'blue' : pedido.estado==='Rechazado' ? 'red' : 'orange'} ">${pedido.estado}</span></span>
                    <span class="detalle">${pedido.producto}
                        ${pedido.estado.toLowerCase() === 'pendiente' ?
                    `<span class="cantidad-pedida">(${pedido.cantidadPedida})</span>` :
                    pedido.estado.toLowerCase() === 'recibido' ?
                        `<span class="cantidad-pedida">(${pedido.cantidadEntregadaUnd || 'No registrado'})</span>` :
                        pedido.estado.toLowerCase() === 'ingresado' ?
                            `<span class="cantidad-pedida">(${pedido.cantidadIngresada || 'No registrado'} Kg.) </span>` :
                    pedido.estado.toLowerCase() === 'no llego' ?
                        `<span class="cantidad-pedida">(${pedido.cantidadEntregadaUnd || 'No registrado'}) </span>` : ''
        }
                    </span>
                    <span class="pie" data-fecha="${pedido.estado === 'Pendiente' ? pedido.fecha : pedido.estado === 'Recibido' ? pedido.fechaEntrega : pedido.estado === 'Ingresado' ? pedido.fechaIngreso : ''}">${pedido.estado === 'Pendiente' ? pedido.fecha : pedido.estado === 'Recibido' ? pedido.fechaEntrega : pedido.estado === 'Ingresado' ? pedido.fechaIngreso : ''}</span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
    eventosPedidos();
}


function eventosPedidos() {
    const btnExcel = document.querySelectorAll('.exportar-excel');
    const btnNuevoPedido = document.querySelectorAll('.nuevo-pedido');
    const registrosAExportar = pedidosGlobal;

    const botonesNombre = document.querySelectorAll('.filtros-opciones.nombre .btn-filtro');
    const botonesEstado = document.querySelectorAll('.filtros-opciones.estado .btn-filtro');


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

    let filtroFechaInstance = null;
    let filtroEstadoActual = 'Todos';

    function aplicarFiltros() {
        const fechasSeleccionadas = filtroFechaInstance?.selectedDates || [];
        const busqueda = normalizarTexto(inputBusqueda.value);
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Primero, filtrar todos los registros
        const registrosFiltrados = Array.from(items).map(registro => {
            const registroData = pedidosGlobal.find(r => r.id === registro.dataset.id);
            if (!registroData) return { elemento: registro, mostrar: false };

            let mostrar = true;

            if (filtroEstadoActual && filtroEstadoActual !== 'Todos') {
                if (filtroEstadoActual === 'Pendientes') {
                    mostrar = registroData.estado === 'Pendiente';
                } else if (filtroEstadoActual === 'Recibidos') {
                    mostrar = registroData.estado === 'Recibido';
                } else if (filtroEstadoActual === 'Ingresados') {
                    mostrar = registroData.estado === 'Ingresado';
                } else if (filtroEstadoActual === 'Rechazados') {
                    mostrar = registroData.estado === 'Rechazado';
                } else if (filtroEstadoActual === 'No llegaron') {
                    mostrar = registroData.estado === 'No llego';
                }
            }
            let fechaFiltrar = '';
            if (registroData.estado === 'Pendiente') {
                fechaFiltrar = registroData.fecha;
            } else if (registroData.estado === 'Recibido') {
                fechaFiltrar = registroData.fechaEntrega;
            } else if (registroData.estado === 'Ingresado') {
                fechaFiltrar = registroData.fechaIngreso;
            }

            if (mostrar && fechasSeleccionadas.length === 2) {
                const [dia, mes, anio] = fechaFiltrar.split('/');
                const fechaRegistro = new Date(anio, mes - 1, dia);
                const fechaInicio = fechasSeleccionadas[0];
                const fechaFin = fechasSeleccionadas[1];

                fechaRegistro.setHours(0, 0, 0, 0);
                fechaInicio.setHours(0, 0, 0, 0);
                fechaFin.setHours(23, 59, 59, 999);

                mostrar = fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin;
            }

            if (mostrar && busqueda) {
                const textoRegistro = [
                    registroData.id,
                    registroData.producto,
                    registroData.idProducto,
                    registroData.fecha,
                    registroData.proovedor,
                    registroData.estado
                ].filter(Boolean).join(' ').toLowerCase();

                mostrar = normalizarTexto(textoRegistro).includes(busqueda);
            }

            return { elemento: registro, mostrar };
        });

        const registrosVisibles = registrosFiltrados.filter(r => r.mostrar).length;

        // Animación de ocultamiento
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
        }, 100);
    }
    botonesNombre.forEach(boton => {
        if (boton.classList.contains('activado')) {
            filtroNombreActual = boton.textContent.trim();
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
    window.info = function (registroId) {
        const registro = pedidosGlobal.find(r => r.id === registroId);
        if (!registro) return;

        const contenido = document.querySelector('.anuncio-second .contenido');
        const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">${registro.producto}</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno verificar-registro">
            <p class="normal">Información</p>
            <div class="campo-horizontal">
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Cantidad pedida: </strong>${registro.cantidadPedida}</span>
                    <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                    <span class="estado ${registro.estado.toLowerCase()}"><strong><i class='bx bx-check-circle'></i> Estado: </strong>${registro.estado}</span>
                </div>
            </div>

            <p class="normal">Detalles del producto</p>
            <div class="campo-vertical">
                <span class="nombre"><strong><i class='bx bx-cube'></i> Producto: </strong>${registro.producto}</span>
                <span class="nombre"><strong><i class='bx bx-barcode'></i> ID Producto: </strong>${registro.idProducto}</span>
                <span class="observaciones"><strong><i class='bx bx-comment-detail'></i> Observaciones: </strong>${registro.observacionesPedido || 'Sin observaciones'}</span>
            </div>

            ${registro.estado !== 'Pendiente' ? `
            <p class="normal">Información de recepción</p>
            <div class="campo-vertical">
                <span class="valor"><strong><i class='bx bx-package'></i> Fecha de compra: </strong>${registro.fechaEntrega || 'No registrado'}</span>
                ${usuarioInfo.rol === 'Administración' ? `
                <span class="valor"><strong><i class='bx bx-package'></i> Cantidad entregada (KG): </strong>${registro.cantidadEntregadaKg || 'No registrado'}</span>` : ''}
                <span class="valor"><strong><i class='bx bx-package'></i> Cantidad entregada (UND): </strong>${registro.cantidadEntregadaUnd || 'No registrado'}</span>
                <span class="valor"><strong><i class='bx bx-user'></i> Proveedor: </strong>${registro.proovedor || 'No registrado'}</span>
                ${usuarioInfo.rol === 'Administración' ? `
                <span class="valor"><strong><i class='bx bx-money'></i> Precio: </strong>${'Bs. ' + (parseFloat(registro.precio) || 0).toFixed(2) || 'No registrado'}</span>` : ''}
                <span class="valor"><strong><i class='bx bx-money'></i> Estado: </strong>${registro.estadoCompra || 'No registrado'}</span>
                <span class="observaciones"><strong><i class='bx bx-comment-detail'></i> Observaciones compras: </strong>${registro.observacionesCompras || 'Sin observaciones'}</span>
            </div>
            ` : ''}

            ${registro.estado === 'Ingresado' ? `
            <p class="normal">Información de ingreso</p>
            <div class="campo-vertical">
                <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha ingreso: </strong>${registro.fechaIngreso || 'No registrado'}</span>
                <span class="valor"><strong><i class='bx bx-package'></i> Cantidad ingresada(KG): </strong>${registro.cantidadIngresada || 'No registrado'}</span>
                <span class="observaciones"><strong><i class='bx bx-comment-detail'></i> Observaciones ingreso: </strong>${registro.observacionesIngresado || 'Sin observaciones'}</span>
            </div>
            ` : ''}
        </div>
        <div class="anuncio-botones">
            ${registro.estado === 'Pendiente' && usuarioInfo.rol === 'Administración' ? `
                <button class="btn-entregar btn green" data-id="${registro.id}"><i class='bx bx-check-circle'></i>Entregar</button>
            ` : ''}
            ${registro.estado === 'Recibido' ? `
                <button class="btn-ingresar btn blue" data-id="${registro.id}"><i class='bx bx-log-in'></i>Ingresar</button>
                <button class="btn-rechazar btn yellow" data-id="${registro.id}"><i class='bx bx-block'></i>Rechazar</button>
            ` : ''}
            ${registro.estado === 'No llego' && usuarioInfo.rol === 'Administración' ? `
                <button class="btn-llego btn yellow" data-id="${registro.id}"><i class='bx bx-check-circle'></i>Llego</button>
            ` : ''}
            ${tienePermiso('edicion') && registro.estado !== 'Recibido' ? `<button class="btn-editar btn blue" data-id="${registro.id}"><i class='bx bx-edit'></i>Editar</button>` : ''}
            ${tienePermiso('eliminacion') ? `<button class="btn-eliminar btn red" data-id="${registro.id}"><i class="bx bx-trash"></i>Eliminar</button>` : ''}
        </div>
        `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '70px';
        mostrarAnuncioSecond();

        if (registro.estado === 'Ingresado' || registro.estado === 'No llego' || registro.estado === 'Rechazado') {
            contenido.style.paddingBottom = '10px';
            if (tienePermiso('edicion') || tienePermiso('eliminacion')) {
                contenido.style.paddingBottom = '80px';
            }
        }


        const btnEntregar = contenido.querySelector('.btn-entregar');
        const btnIngresar = contenido.querySelector('.btn-ingresar');
        const btnRechazar = contenido.querySelector('.btn-rechazar');
        const btnLlego = contenido.querySelector('.btn-llego');


        if (tienePermiso('edicion') && registro.estado !== 'Recibido') {
            const btnEditar = contenido.querySelector('.btn-editar');
            btnEditar.addEventListener('click', () => editar(registro));
        }
        if (tienePermiso('eliminacion')) {
            const btnEliminar = contenido.querySelector('.btn-eliminar');
            btnEliminar.addEventListener('click', () => eliminar(registro));
        }
        if (btnEntregar) {
            btnEntregar.addEventListener('click', () => entregar(registro));
        }
        if (btnIngresar) {
            btnIngresar.addEventListener('click', () => ingresar(registro));
        }
        if (btnRechazar) {
            btnRechazar.addEventListener('click', () => rechazar(registro));
        }
        if (btnLlego) {
            btnLlego.addEventListener('click', () => llego(registro));
        }

        function eliminar(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Eliminar pedido</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno">
                    <p class="normal">Información básica</p>
                    <div class="campo-horizontal">
                        <div class="campo-vertical">
                            <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                            <span class="valor"><strong><i class='bx bx-package'></i> Cantidad pedida: </strong>${registro.cantidadPedida}</span>
                            <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                            <span class="estado ${registro.estado.toLowerCase()}"><strong><i class='bx bx-check-circle'></i> Estado: </strong>${registro.estado}</span>
                        </div>
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
                    mostrarCarga('.carga-procesar');

                    const response = await fetch(`/eliminar-pedido/${registro.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ motivo })
                    });

                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        await obtenerPedidos();
                        cerrarAnuncioManual('anuncioSecond');
                        mostrarNotificacion({
                            message: 'Pedido eliminado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Eliminación',
                            usuarioInfo.nombre + ' elimino el registro de pedido de: ' + registro.producto + ' con el id: ' + registro.id + ' por el motivo de: ' + motivo)
                    } else {
                        throw new Error(data.error || 'Error al eliminar el pedido');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al eliminar el pedido',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar');
                }
            }
        }
        async function editar(registro) {
            await obtenerAlmacenAcopio();
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Editar pedido</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno editar-pedido">
                    <p class="normal">Información básica</p>
                    <div class="entrada">
                        <i class='bx bx-package'></i>
                        <div class="input">
                            <p class="detalle">Producto</p>
                            <input class="producto-pedido" type="text" value="${registro.producto}">
                        </div>
                    </div>
                    <div class="sugerencias" id="productos-list"></div>
                    <div class="entrada">
                        <i class='bx bx-package'></i>
                        <div class="input">
                            <p class="detalle">Cantidad Pedida</p>
                            <input class="cantidad-pedida" type="text" value="${registro.cantidadPedida}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones Pedido</p>
                            <input class="obs-pedido" type="text" value="${registro.observacionesPedido || ''}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-check-circle'></i>
                        <div class="input">
                            <p class="detalle">Estado</p>
                            <select class="estado" required>
                                <option value="${registro.estado}" selected>${registro.estado}</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="No llego">No llego</option>
                                <option value="Recibido">Recibido</option>
                                <option value="Rechazado">Rechazado</option>
                                <option value="Ingresado">Ingresado</option>
                            </select>
                        </div>
                    </div>
                    <p class="normal">Información de compra</p>
                    <div class="entrada">
                        <i class='bx bx-package'></i>
                        <div class="input">
                            <p class="detalle">Cantidad Entregada (Kg)</p>
                            <input class="cant-entr-kg" type="text" value="${registro.cantidadEntregadaKg || ''}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-store'></i>
                        <div class="input">
                            <p class="detalle">Proveedor</p>
                            <input class="proovedor" type="text" value="${registro.proovedor || ''}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-money'></i>
                        <div class="input">
                            <p class="detalle">Precio</p>
                            <input class="precio" type="text" value="${registro.precio || ''}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones Compras</p>
                            <input class="obs-compras" type="text" value="${registro.observacionesCompras || ''}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-package'></i>
                        <div class="input">
                            <p class="detalle">Cantidad Entregada (Unidades)</p>
                            <input class="cant-entrg-und" type="text" value="${registro.cantidadEntregadaUnd || ''}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-car'></i>
                        <div class="input">
                            <p class="detalle">Transporte/Otros</p>
                            <input class="trasp-otros" type="text" value="${registro.transporteOtros || ''}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-check-circle'></i>
                        <div class="input">
                            <p class="detalle">Estado Compra</p>
                            <input class="estado-compra" type="text" value="${registro.estadoCompra}">
                        </div>
                    </div>
                    <p class="normal">Información de ingreso</p>
                    <div class="entrada">
                        <i class='bx bx-package'></i>
                        <div class="input">
                            <p class="detalle">Cantidad Ingresada</p>
                            <input class="cant-ingre" type="text" value="${registro.cantidadIngresada || ''}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones Ingreso</p>
                            <input class="obs-ingre" type="text" value="${registro.observacionesIngresado}">
                        </div>
                    </div>
                    <p class="normal">Ingresa el motivo de la edición</p>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Motivo de edición</p>
                            <input class="motivo" type="text" required>
                        </div>
                    </div>
                    <div class="info-sistema">
                        <i class='bx bx-info-circle'></i>
                        <div class="detalle-info">
                            <p>Estás por editar un registro del sistema. Asegúrate de realizar los cambios correctamente, ya que podrían modificar información relacionada.</p>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button class="btn-guardar-edicion btn blue"><i class="bx bx-save"></i> Guardar cambios</button>
                </div>
            `;
            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '70px';
            mostrarAnuncioTercer();
            const productoInput = document.querySelector('.entrada .producto-pedido');
            const sugerenciasList = document.querySelector('#productos-list');

            function normalizarTexto(texto) {
                return texto.toString()
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[-_\s]+/g, '');
            }

            productoInput.addEventListener('input', (e) => {
                const valor = normalizarTexto(e.target.value);

                sugerenciasList.innerHTML = '';

                if (valor) {
                    const sugerencias = productos.filter(p =>
                        normalizarTexto(p.producto).includes(valor)
                    ).slice(0, 5);

                    if (sugerencias.length) {
                        sugerenciasList.style.display = 'flex';
                        sugerencias.forEach(p => {
                            const div = document.createElement('div');
                            div.classList.add('item');
                            div.textContent = p.producto;
                            div.onclick = () => {
                                productoInput.value = p.producto;
                                sugerenciasList.style.display = 'none';
                                window.idPro = p.id;
                                const event = new Event('focus');
                                gramajeInput.dispatchEvent(event);
                            };
                            sugerenciasList.appendChild(div);
                        });
                    }
                } else {
                    sugerenciasList.style.display = 'none';
                }
            });

            const btnGuardar = contenido.querySelector('.btn-guardar-edicion');
            btnGuardar.addEventListener('click', confirmarEdicion);

            async function confirmarEdicion() {
                try {
                    const datosActualizados = {
                        idProducto: window.idPro,
                        productoPedido: document.querySelector('.editar-pedido .producto-pedido').value,
                        cantidadPedida: document.querySelector('.editar-pedido .cantidad-pedida').value,
                        observacionesPedido: document.querySelector('.editar-pedido .obs-pedido').value,
                        estado: document.querySelector('.editar-pedido .estado').value,
                        cantidadEntregadaKg: document.querySelector('.editar-pedido .cant-entr-kg').value,
                        proovedor: document.querySelector('.editar-pedido .proovedor').value,
                        precio: document.querySelector('.editar-pedido .precio').value,
                        observacionesCompras: document.querySelector('.editar-pedido .obs-compras').value,
                        cantidadEntregadaUnd: document.querySelector('.editar-pedido .cant-entrg-und').value,
                        transporteOtros: document.querySelector('.editar-pedido .trasp-otros').value,
                        estadoCompra: document.querySelector('.editar-pedido .estado-compra').value,
                        cantidadIngresada: document.querySelector('.editar-pedido .cant-ingre').value,
                        observacionesIngresado: document.querySelector('.editar-pedido .obs-ingre').value,
                        motivo: document.querySelector('.editar-pedido .motivo').value
                    };

                    if (!datosActualizados.motivo) {
                        mostrarNotificacion({
                            message: 'Debe ingresar el motivo de la edición',
                            type: 'warning',
                            duration: 3500
                        });
                        return;
                    }

                    mostrarCarga('.carga-procesar');

                    const response = await fetch(`/editar-pedido/${registro.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(datosActualizados)
                    });

                    const data = await response.json();

                    if (data.success) {
                        await obtenerPedidos();
                        info(registroId)
                        mostrarNotificacion({
                            message: 'Pedido actualizado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Edición',
                            usuarioInfo.nombre + ' edito el registro pedido de: ' + registro.producto + ' con el id: ' + registro.id + ' por el motivo de: ' + datosActualizados.motivo)
                    } else {
                        throw new Error(data.error || 'Error al actualizar el pedido');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al actualizar el pedido',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar');
                }
            }
        }
        function entregar(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
            
                <div class="encabezado">
                    <h1 class="titulo">Entregar Pedido</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno verificar-registro">
                    <p class="normal">Información del pedido</p>
                    <div class="campo-horizontal">
                        <div class="campo-vertical">
                            <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                            <span class="nombre"><strong><i class='bx bx-box'></i> Producto: </strong>${registro.producto}</span>
                            <span class="valor"><strong><i class='bx bx-package'></i> Cantidad pedida: </strong>${registro.cantidadPedida}</span>
                            <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                        </div>
                    </div>

                    <p class="normal">Detalles de entrega</p>
                    <div class="entrada">
                        <i class='bx bx-package'></i>
                        <div class="input">
                            <p class="detalle">Cantidad entregada (KG)</p>
                            <input class="cantidad-kg" type="number" step="0.01" autocomplete="off" required>
                        </div>
                    </div>

                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class='bx bx-package'></i>
                            <div class="input">
                                <p class="detalle">Cantidad</p>
                                <input class="cantidad-und" type="number" autocomplete="off" required>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-package'></i>
                            <div class="input">
                                <p class="detalle">Medida</p>
                                <select class="unidad-medida">
                                    <option value="Bolsas">Bolsas</option>
                                    <option value="Cajas">Cajas</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="entrada">
                        <i class='bx bx-user'></i>
                        <div class="input">
                            <p class="detalle">Proveedor</p>
                            <select class="proovedor" required>
                                <option value=""></option>
                                ${proovedoresAcopioGlobal.map(p => `
                                    <option value="${p.nombre}">${p.nombre}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class='bx bx-money'></i>
                            <div class="input">
                                <p class="detalle">Precio</p>
                                <input class="precio" type="number" step="0.01" autocomplete="off" required>
                            </div>
                        </div>

                        <div class="entrada">
                            <i class='bx bx-car'></i>
                            <div class="input">
                                <p class="detalle">Trans./Otros</p>
                                <input class="transporte" type="text" autocomplete="off">
                            </div>
                        </div>
                    </div>

                    <div class="entrada">
                        <i class='bx bx-check-circle'></i>
                        <div class="input">
                            <p class="detalle">Estado de entrega</p>
                            <select class="estado-compra" required>
                                <option value="Llego">Llegó</option>
                                <option value="No llego">No llegó</option>
                            </select>
                        </div>
                    </div>

                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones</p>
                            <input class="observaciones" type="text" autocomplete="off">
                        </div>
                    </div>
                    <div class="info-sistema">
                        <i class='bx bx-info-circle'></i>
                        <div class="detalle-info">
                            <p>Estás por realizar una entrega. Asegúrate de llenar los campos con información correcta, ya que esta acción podria afectar información relacionada.</p>
                        </div>
                    </div>

                </div>
                <div class="anuncio-botones">
                    <button class="btn-confirmar-entrega btn green"><i class='bx bx-check-circle'></i> Confirmar entrega</button>
                </div>
            `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '70px';
            mostrarAnuncioTercer();


            const btnConfirmar = contenido.querySelector('.btn-confirmar-entrega');
            btnConfirmar.addEventListener('click', confirmarEntrega);

            async function confirmarEntrega() {
                try {
                    const cantidadKg = document.querySelector('.verificar-registro .cantidad-kg').value;
                    const cantidadUnd = document.querySelector('.verificar-registro .cantidad-und').value;
                    const unidadMedida = document.querySelector('.verificar-registro .unidad-medida').value;
                    const proovedor = document.querySelector('.verificar-registro .proovedor').value;
                    const precio = parseFloat(document.querySelector('.verificar-registro .precio').value);
                    const transporteOtros = parseFloat(document.querySelector('.verificar-registro .transporte').value) || 0;
                    const estadoCompra = document.querySelector('.verificar-registro .estado-compra').value;
                    const observaciones = document.querySelector('.verificar-registro .observaciones').value;

                    // Validaciones básicas
                    if (!cantidadKg || !cantidadUnd || !proovedor || !precio) {
                        mostrarNotificacion({
                            message: 'Por favor complete todos los campos requeridos',
                            type: 'warning',
                            duration: 3500
                        });
                        return;
                    }

                    mostrarCarga('.carga-procesar');

                    // 1. Registrar la entrega del pedido
                    const entregaResponse = await fetch(`/entregar-pedido/${registro.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            cantidadKg: parseFloat(cantidadKg),
                            cantidadUnidad: parseInt(cantidadUnd),
                            unidadMedida,
                            proovedor,
                            precio,
                            transporteOtros,
                            estadoCompra,
                            observaciones
                        })
                    });

                    const entregaData = await entregaResponse.json();

                    if (entregaData.success) {
                        await obtenerPedidos();
                        info(registroId)
                        ocultarCarga('.carga-procesar');
                        mostrarNotificacion({
                            message: 'Entrega registrada correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Acopio',
                            'Información',
                            usuarioInfo.nombre + ' se hizo la entrega del producto: ' + registro.producto + ' cantidad: ' + registro.cantidadEntregadaUnd)

                        // Actualizar mensaje de compras y notificar éxito
                        if (mensajeCompras === 'Se compro:\n• Sin compras registradas') {
                            mensajeCompras = 'Se compro:\n';
                        }
                        mensajeCompras = mensajeCompras.replace(/\n\nSe compro en la App de TotalProd.$/, '');
                        mensajeCompras = mensajeCompras.replace(/\n$/, '');
                        mensajeCompras += `\n• ${registro.producto} - ${cantidadUnd} ${unidadMedida} (${estadoCompra})`;
                        mensajeCompras += '\n\nSe compro en la App de TotalProd.';
                        localStorage.setItem('damabrava_mensaje_compras', mensajeCompras);

                        // 2. En segundo plano: crear registro de pago genérico y parcial
                        (async () => {
                            try {
                                const totalPago = precio + transporteOtros;
                                const proveedorInfo = proovedoresAcopioGlobal.find(p => p.nombre === proovedor);
                                const pagoGenerico = {
                                    nombre_pago: `Materia prima (${registro.producto})`,
                                    id_beneficiario: proveedorInfo?.id || 'No registrado',
                                    beneficiario: proovedor,
                                    pagado_por: usuarioInfo.nombre + ' ' + usuarioInfo.apellido,
                                    justificativos_id: registro.id,
                                    justificativos: 'Pago de materia prima: ' + registro.producto + ' (Bs./' + (parseFloat(precio) || 0).toFixed(2) + ')Transporte: (Bs./' + (parseFloat(transporteOtros) || 0).toFixed(2) + ')' + 'Cantidad: ' + cantidadUnd + ' ' + unidadMedida,
                                    subtotal: totalPago,
                                    descuento: 0,
                                    aumento: 0,
                                    total: totalPago,
                                    observaciones: observaciones || 'Sin observaciones',
                                    estado: 'Pagado',
                                    tipo: 'Acopio'
                                };
                                const pagoResponse = await fetch('/registrar-pago', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(pagoGenerico)
                                });
                                const pagoData = await pagoResponse.json();
                                if (pagoData.success) {
                                    // 3. Registrar pago parcial
                                    const pagoParcial = {
                                        pago_id: pagoData.id,
                                        pagado_por: usuarioInfo.nombre + ' ' + usuarioInfo.apellido,
                                        beneficiario: proovedor,
                                        cantidad_pagada: totalPago,
                                        observaciones: observaciones || 'Sin observaciones',
                                    };
                                    await fetch('/registrar-pago-parcial', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(pagoParcial)
                                    });
                                    mostrarNotificacion({
                                        message: 'Pago registrado correctamente',
                                        type: 'success',
                                        duration: 3000
                                    });
                                }
                            } catch (err) {
                                console.error('Error en el registro de pagos en segundo plano:', err);
                                mostrarNotificacion({
                                    message: 'Error al registrar el pago',
                                    type: 'error',
                                    duration: 3500
                                });
                            }
                        })();
                        // Fin segundo plano
                    } else {
                        throw new Error(entregaData.error || 'Error al entregar el pedido');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error en la operación',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar');
                }
            }
        }
        async function ingresar(registro) {
            mostrarCarga();
            mostrarIngresosAcopio(registro.idProducto, registro.id);
        }
        async function rechazar(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const html = `
        <div class="encabezado">
            <h1 class="titulo">Rechazar Pedido ${registro.id}</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>
        <div class="relleno">
            <p class="normal">Información del pedido</p>
            <div class="campo-horizontal">
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Cantidad pedida: </strong>${registro.cantidadPedida}</span>
                    <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                    <span class="estado ${registro.estado.toLowerCase()}"><strong><i class='bx bx-check-circle'></i> Estado: </strong>${registro.estado}</span>
                </div>
            </div>
            <p class="normal">Motivo del rechazo</p>
                <div class="entrada">
                    <i class='bx bx-comment-detail'></i>
                    <div class="input">
                        <p class="detalle">Motivo</p>
                        <input class="input-motivo" type="text" autocomplete="off" placeholder=" " required>
                    </div>
                </div>
                <div class="info-sistema">
                    <i class='bx bx-info-circle'></i>
                    <div class="detalle-info">
                        <p>Estás por rechazar un pedido. Asegúrate de ingresar el motivo del rechazo, ya que podrían afectar información relacionada.</p>
                    </div>
                </div>

        </div>
        <div class="anuncio-botones">
            <button class="btn red" onclick="confirmarRechazo('${registro.id}')"><i class='bx bx-x-circle'></i> Confirmar Rechazo</button>
        </div>

    `;
            contenido.innerHTML = html;
            contenido.style.paddingBottom = '70px';
            mostrarAnuncioTercer();
            window.confirmarRechazo = async function (idPedido) {
                const motivo = document.querySelector('.input-motivo').value;

                if (!motivo) {
                    mostrarNotificacion({
                        message: 'Debe ingresar un motivo de rechazo',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga('.carga-procesar');

                    const response = await fetch(`/rechazar-pedido/${idPedido}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ motivo })
                    });

                    const data = await response.json();
                    if (data.success) {
                        await obtenerPedidos();
                        info(registroId)
                        mostrarNotificacion({
                            message: 'Pedido rechazado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Información',
                            usuarioInfo.nombre + ' realizo el rechazo del pedido de: ' + registro.producto + ' con el id: ' + registro.id + ' por el motivo de: ' + motivo)
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: 'Error al rechazar el pedido',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar');
                }
            };
        }
        async function llego(registro) {

            try {
                mostrarCarga('.carga-procesar');

                const response = await fetch(`/llego-pedido/${registro.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                });

                const data = await response.json();
                if (data.success) {
                    await obtenerPedidos();
                    info(registroId)
                    mostrarNotificacion({
                        message: 'Se cambio el estado a llego',
                        type: 'success',
                        duration: 3000
                    });
                    registrarNotificacion(
                        'Acopio',
                        'Información',
                        usuarioInfo.nombre + ' se puso como llego el producto: ' + registro.producto + ' cantidad: ' + registro.cantidadEntregadaUnd)
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion({
                    message: 'Error al rechazar el pedido',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarCarga('.carga-procesar');
            }
        };

    }
    function mostrarMensajeCompras() {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        const formatoHTML = `
    <div class="encabezado">
        <h1 class="titulo">Compras Registradas</h1>
        <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')">
            <i class="fas fa-arrow-right"></i>
        </button>
    </div>
    <div class="relleno">
        <div class="formato-pedido">
            <div contenteditable="true" style="min-height: fit-content; white-space: pre-wrap; font-family: Arial, sans-serif; text-align: left; padding: 15px;">${mensajeCompras}</div>
        </div>
    </div>
    <div class="anuncio-botones" style="display: flex; gap: 10px;">
        <button class="btn blue" onclick="limpiarFormatoCompras()">
            <i class="fas fa-broom"></i> Limpiar
        </button>
        <button class="btn green" onclick="compartirFormatoCompras()">
            <i class="fas fa-share-alt"></i> Compartir
        </button>
    </div>
`;
        anuncioSecond.innerHTML = formatoHTML;
        anuncioSecond.style.paddingBottom = '70px';
        mostrarAnuncioSecond();
    }
    window.limpiarFormatoCompras = function () {
        mensajeCompras = 'Se compro:\n• Sin compras registradas';
        localStorage.setItem('damabrava_mensaje_compras', mensajeCompras);
        const formatoDiv = document.querySelector('.formato-pedido div[contenteditable]');
        if (formatoDiv) {
            formatoDiv.innerHTML = mensajeCompras;
        }
    };
    window.compartirFormatoCompras = async function () {
        const formatoDiv = document.querySelector('.formato-pedido div[contenteditable]');
        if (!formatoDiv) return;

        const texto = encodeURIComponent(formatoDiv.innerText);
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    };
    window.mostrarFormatoCompras = function () {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (!anuncioSecond) return;
        mostrarMensajeCompras();
    };
    btnNuevoPedido.forEach(btn => {
        btn.addEventListener('click', mostrarHacerPedido);
    });
    btnExcel.forEach(btn => {
        btn.addEventListener('click', () => exportarArchivos('pedidos-acopio', registrosAExportar));
    });
    aplicarFiltros();
}