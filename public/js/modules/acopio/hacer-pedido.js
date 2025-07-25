let productos = [];
let etiquetasAcopio = [];

const DB_NAME = 'damabrava_db';
const PRODUCTOS_AC_DB = 'productos_acopio';
const ETIQUETAS_AC_DB = 'etiquetas_acopio';


let carritoPedidos = new Map(JSON.parse(localStorage.getItem('damabrava_carrito_pedidos') || '[]'));

async function obtenerEtiquetasAcopio() {
    try {

        const etiquetasAcopioCache = await obtenerLocal(ETIQUETAS_AC_DB, DB_NAME);

        if (etiquetasAcopioCache.length > 0) {
            etiquetasAcopio = etiquetasAcopioCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            console.log('actualizando desde el cache etiquetas')
            updateHTMLWithData();
        }


        const response = await fetch('/obtener-etiquetas-acopio');
        const data = await response.json();

        if (data.success) {
            etiquetasAcopio = data.etiquetas.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });

            if (JSON.stringify(etiquetasAcopioCache) !== JSON.stringify(etiquetasAcopio)) {
                console.log('Diferencias encontradas, actualizando UI');
                updateHTMLWithData();

                (async () => {
                    try {
                        const db = await initDB(ETIQUETAS_AC_DB, DB_NAME);
                        const tx = db.transaction(ETIQUETAS_AC_DB, 'readwrite');
                        const store = tx.objectStore(ETIQUETAS_AC_DB);

                        // Limpiar todos los registros existentes
                        await store.clear();

                        // Guardar los nuevos registros
                        for (const item of etiquetasAcopio) {
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
        }
        else {
            console.log('no son diferentes')
        }
        return true;

    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        return false;
    }
}
async function obtenerAlmacenAcopio() {
    try {

        const productosAcopioCache = await obtenerLocal(PRODUCTOS_AC_DB, DB_NAME);

        if (productosAcopioCache.length > 0) {
            productos = productosAcopioCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            updateHTMLWithData();
            console.log('actualizando desde el cache productos')
        }
        const response = await fetch('/obtener-productos-acopio');
        const data = await response.json();

        if (data.success) {
            productos = data.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });

            if (JSON.stringify(productosAcopioCache) !== JSON.stringify(productos)) {
                console.log('Diferencias encontradas, actualizando UI');
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
            return false;
        }


    } catch (error) {
        console.error('Error al obtener los pagos:', error);
        return false;
    }
}


export async function mostrarHacerPedido() {
    renderInitialHTML(); // Render initial HTML immediately
    mostrarAnuncio();

    const [almacenGeneral, etiquetasResult] = await Promise.all([
        obtenerEtiquetasAcopio(),
        await obtenerAlmacenAcopio(),
    ]);
}
function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Nuevo pedido</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
            <button class="btn filtros" onclick="mostrarFormatoPedido()"><i class='bx bx-comment-detail'></i></button>
        </div>
        <div class="relleno">
            <div class="buscador-filtros">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="search" placeholder="">
                    </div>
                </div>
            </div>
    
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro activado">Todos</button>
                ${Array(5).fill().map(() => `
                    <div class="skeleton skeleton-etiqueta"></div>
                `).join('')}
            </div>
            <div class="filtros-opciones cantidad-filter" style="overflow:hidden">
                <button class="btn-filtro" title="Mayor a menor"><i class='bx bx-sort-down'></i></button>
                <button class="btn-filtro" title="Menor a mayor"><i class='bx bx-sort-up'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-a-z'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-z-a'></i></button>
                <button class="btn-filtro" title="Bruto">Bruto</button>
                <button class="btn-filtro" title="Prima">Prima</button>
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
                <i class='bx bx-package' style="font-size: 50px;opacity:0.5"></i>
                <p style="text-align: center; color: #555;">¡Ups!, No se encontraron productos segun tu busqueda o filtrado.</p>
            </div>
        </div>
    `;
    contenido.style.paddingBottom = '10px';
    contenido.innerHTML = initialHTML;
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);
}
function updateHTMLWithData() {
    // Update etiquetas filter
    const etiquetasFilter = document.querySelector('.etiquetas-filter');
    const etiquetasHTML = etiquetasAcopio.map(etiqueta => `
        <button class="btn-filtro">${etiqueta.etiqueta}</button>
    `).join('');
    etiquetasFilter.innerHTML = `
        <button class="btn-filtro activado">Todos</button>
        ${etiquetasHTML}
    `;

    // Update productos
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = productos.map(producto => {
        // Calcular totales de bruto y prima
        const totalBruto = producto.bruto.split(';')
            .reduce((sum, lote) => sum + parseFloat(lote.split('-')[0]), 0);
        const totalPrima = producto.prima.split(';')
            .reduce((sum, lote) => sum + parseFloat(lote.split('-')[0]), 0);

        // Obtener la cantidad del carrito si existe
        const itemCarrito = carritoPedidos.get(producto.id);
        const cantidadEnCarrito = itemCarrito ? itemCarrito.cantidad : '';

        return `
            <div class="registro-item" data-id="${producto.id}">
                <div class="header">
                    <i class='bx bx-package'></i>
                    <div class="info-header">
                        <span class="id-flotante"><span>${producto.id}</span><span class="flotante-item orange stock">${totalBruto.toFixed(2)} Kg.</span></span>
                        <span class="detalle">${producto.producto}</span>
                        <span class="pie">${producto.etiquetas.split(';').join(' • ')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    productosContainer.innerHTML = productosHTML;
    eventosPedidos();
}


function eventosPedidos() {
    const botonesEtiquetas = document.querySelectorAll('.filtros-opciones.etiquetas-filter .btn-filtro');
    const botonesCantidad = document.querySelectorAll('.filtros-opciones.cantidad-filter .btn-filtro');
    const inputBusqueda = document.querySelector('.search');
    const botonFlotante = document.createElement('button');
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

    let pesoMostrado = 'bruto';
    let filtroNombreActual = 'Todos';

    botonFlotante.className = 'btn-flotante-pedidos';
    botonFlotante.innerHTML = '<i class="bx bx-cart"></i>';
    document.body.appendChild(botonFlotante);

    actualizarBotonFlotante();
    botonFlotante.addEventListener('click', mostrarCarritoPedidos);

    const items = document.querySelectorAll('.registro-item');
    items.forEach(item => {
        item.addEventListener('click', () => agregarAlCarrito(item.dataset.id));
    });

    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });
    inputBusqueda.addEventListener('input', (e) => {
        aplicarFiltros();
    });

    function aplicarFiltros() {
        const registros = document.querySelectorAll('.registro-item');
        const busqueda = normalizarTexto(inputBusqueda.value);
        const botonCantidadActivo = document.querySelector('.filtros-opciones.cantidad-filter .btn-filtro.activado');

        // Ocultar todos con animación
        registros.forEach(registro => {
            registro.style.opacity = '0';
            registro.style.transform = 'translateY(-20px)';
        });

        setTimeout(() => {
            registros.forEach(registro => registro.style.display = 'none');

            // Filtrar y ordenar
            const productosFiltrados = Array.from(registros).filter(registro => {
                const producto = productos.find(p => p.id === registro.dataset.id);
                if (!producto) return false;

                const etiquetasProducto = producto.etiquetas ? producto.etiquetas.split(';').map(e => e.trim()) : [];
                let mostrar = true;

                if (filtroNombreActual !== 'Todos') {
                    mostrar = etiquetasProducto.includes(filtroNombreActual);
                }

                if (busqueda) {
                    mostrar = mostrar && (
                        normalizarTexto(producto.producto).includes(busqueda) ||
                        normalizarTexto(producto.id).includes(busqueda) ||
                        normalizarTexto(producto.etiquetas || '').includes(busqueda)
                    );
                }

                return mostrar;
            });

            // Ordenamiento
            if (botonCantidadActivo) {
                const index = Array.from(botonesCantidad).indexOf(botonCantidadActivo);
                switch (index) {
                    case 0: // Mayor a menor
                        productosFiltrados.sort((a, b) => parseFloat(b.querySelector('.stock').textContent) - parseFloat(a.querySelector('.stock').textContent));
                        break;
                    case 1: // Menor a mayor
                        productosFiltrados.sort((a, b) => parseFloat(a.querySelector('.stock').textContent) - parseFloat(b.querySelector('.stock').textContent));
                        break;
                    case 2: // A-Z
                        productosFiltrados.sort((a, b) => a.querySelector('.detalle').textContent.localeCompare(b.querySelector('.detalle').textContent));
                        break;
                    case 3: // Z-A
                        productosFiltrados.sort((a, b) => b.querySelector('.detalle').textContent.localeCompare(a.querySelector('.detalle').textContent));
                        break;
                }
            }

            const contenedor = document.querySelector('.productos-container');
            productosFiltrados.forEach(registro => {
                registro.style.display = 'flex';
                contenedor.appendChild(registro);
                setTimeout(() => {
                    registro.style.opacity = '1';
                    registro.style.transform = 'translateY(0)';
                }, 50);
            });

            // Mensaje de no encontrado
            const mensajeNoEncontrado = document.querySelector('.no-encontrado');
            mensajeNoEncontrado.style.display = productosFiltrados.length === 0 ? 'block' : 'none';
        }, 200);
    }

    botonesCantidad.forEach((boton, index) => {
        boton.addEventListener('click', () => {
            // Si es botón de peso (Bruto/Prima)
            if (index === 4 || index === 5) {
                // Desactivar solo los botones de peso
                botonesCantidad[4].classList.remove('activado');
                botonesCantidad[5].classList.remove('activado');
                boton.classList.add('activado');

                pesoMostrado = index === 4 ? 'bruto' : 'prima';
                actualizarPesoMostrado();
            } else {
                // Para botones de ordenamiento (0-3)
                const botonesOrdenamiento = Array.from(botonesCantidad).slice(0, 4);
                botonesOrdenamiento.forEach(b => b.classList.remove('activado'));
                boton.classList.add('activado');
            }

            aplicarFiltros();
        });
    });

    function actualizarPesoMostrado() {
        const registros = document.querySelectorAll('.registro-item');
        registros.forEach(registro => {
            const producto = productos.find(p => p.id === registro.dataset.id);
            if (producto) {
                const total = pesoMostrado === 'bruto'
                    ? producto.bruto.split(';').reduce((sum, lote) => sum + parseFloat(lote.split('-')[0]), 0)
                    : producto.prima.split(';').reduce((sum, lote) => sum + parseFloat(lote.split('-')[0]), 0);

                const stockSpan = registro.querySelector('.stock');
                if (stockSpan) {
                    stockSpan.textContent = `${total.toFixed(2)} Kg.`;
                }
            }
        });
    }
    botonesEtiquetas.forEach(boton => {
        boton.addEventListener('click', () => {
            botonesEtiquetas.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            filtroNombreActual = boton.textContent.trim();
            aplicarFiltros();
            scrollToCenter(boton, boton.parentElement);
        });
    });


    

    function agregarAlCarrito(productoId) {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;

        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        const item = document.querySelector(`.registro-item[data-id="${productoId}"]`);
        if (item) {
            item.classList.add('agregado-al-carrito');
            setTimeout(() => {
                item.classList.remove('agregado-al-carrito');
            }, 500);
        }

        if (carritoPedidos.has(productoId)) {
            const itemCarrito = carritoPedidos.get(productoId);
            itemCarrito.cantidad += 1;
            if (item) {
                const cantidadSpan = item.querySelector('.carrito-cantidad');
                if (cantidadSpan) cantidadSpan.textContent = itemCarrito.cantidad;
            }
        } else {
            carritoPedidos.set(productoId, {
                ...producto,
                cantidad: 1
            });
            if (item) {
                const cantidadSpan = item.querySelector('.carrito-cantidad');
                if (cantidadSpan) cantidadSpan.textContent = '1';
            }
        }
        actualizarCarritoLocal();
        actualizarBotonFlotante();
        actualizarCarritoUI();
    }
    window.eliminarDelCarrito = (id) => {
        const itemToRemove = document.querySelector(`.carrito-item[data-id="${id}"]`);
        const headerItem = document.querySelector(`.registro-item[data-id="${id}"]`);

        if (headerItem) {
            const cantidadSpan = headerItem.querySelector('.carrito-cantidad');
            if (cantidadSpan) cantidadSpan.textContent = '';
        }

        if (itemToRemove) {
            itemToRemove.style.height = `${itemToRemove.offsetHeight}px`;
            itemToRemove.classList.add('eliminar-item');

            setTimeout(() => {
                itemToRemove.style.height = '0';
                itemToRemove.style.margin = '0';
                itemToRemove.style.padding = '0';

                setTimeout(() => {
                    carritoPedidos.delete(id);
                    actualizarCarritoLocal();
                    actualizarBotonFlotante();
                    itemToRemove.remove();

                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }

                    if (carritoPedidos.size === 0) {
                        ocultarAnuncioSecond();
                        mostrarNotificacion({
                            message: 'Carrito vacío',
                            type: 'info',
                            duration: 2000
                        });
                    }
                }, 300);
            }, 0);
        }
    };
    function actualizarBotonFlotante() {
        const botonFlotante = document.querySelector('.btn-flotante-pedidos');
        if (!botonFlotante) return;

        botonFlotante.style.display = carritoPedidos.size > 0 ? 'flex' : 'none';
        botonFlotante.innerHTML = `
            <i class="bx bx-cart"></i>
            <span class="cantidad">${carritoPedidos.size}</span>
        `;
    }
    function mostrarCarritoPedidos() {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (!anuncioSecond) return;

        anuncioSecond.innerHTML = `
            <div class="encabezado">
                <h1 class="titulo">Carrito de Pedidos</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
                <button class="btn filtros limpiar"><i class="fas fa-broom"></i></button>
            </div>
            <div class="relleno">
                <div class="carrito-items">
                    ${Array.from(carritoPedidos.values()).map(item => `
                        <div class="carrito-item" data-id="${item.id}">
                            <div class="item-info">
                                <h3>${item.producto}</h3>
                                <div class="cantidad-control">
                                    <button class="btn-cantidad" style="color:var(--error)" onclick="ajustarCantidad('${item.id}', -1)">-</button>
                                    <input type="number" value="${item.cantidad}" min="1"
                                        onfocus="this.select()"
                                        onchange="actualizarCantidad('${item.id}', this.value)">
                                    <button class="btn-cantidad" style="color:var(--success)" onclick="ajustarCantidad('${item.id}', 1)">+</button>
                                </div>
                            </div>
                            <div class="subtotal-delete">
                                <div class="info-valores">
                                    <select class="unidad">
                                        <option value="Bolsas">Bls.</option>
                                        <option value="Arrobas">@</option>
                                        <option value="Libras">Lbrs.</option>
                                        <option value="Cajas">Cjs.</option>
                                        <option value="Kilos">Kg.</option>
                                        <option value="Quintales">qq.</option>
                                        <option value="Unidades">Und.</option>
                                    </select>
                                    <input type="text" class="detalle" placeholder="Observaciones">
                                </div>
                                <button class="btn-eliminar" onclick="eliminarDelCarrito('${item.id}')">
                                    <i class="bx bx-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-procesar-pedido btn green" onclick="registrarPedido()">
                    <i class='bx bx-check'></i> Procesar Pedido
                </button>
            </div>
        `;

        mostrarAnuncioSecond();
        anuncioSecond.style.paddingBottom = '70px';

        const botonLimpiar = anuncioSecond.querySelector('.btn.filtros.limpiar');
        botonLimpiar.addEventListener('click', () => {
            carritoPedidos.forEach((item, id) => {
                const headerItem = document.querySelector(`.registro-item[data-id="${id}"]`);
                if (headerItem) {
                    const cantidadSpan = headerItem.querySelector('.carrito-cantidad');
                    if (cantidadSpan) cantidadSpan.textContent = '';
                }
            });

            carritoPedidos.clear();
            actualizarCarritoLocal();
            actualizarBotonFlotante();
            ocultarAnuncioSecond();
            mostrarNotificacion({
                message: 'Carrito limpiado exitosamente',
                type: 'success',
                duration: 2000
            });
        });
    }
    window.ajustarCantidad = (id, delta) => {
        const item = carritoPedidos.get(id);
        if (!item) return;

        const nuevaCantidad = item.cantidad + delta;
        if (nuevaCantidad > 0) {
            item.cantidad = nuevaCantidad;
            const headerItem = document.querySelector(`.registro-item[data-id="${id}"]`);
            if (headerItem) {
                const cantidadSpan = headerItem.querySelector('.carrito-cantidad');
                if (cantidadSpan) cantidadSpan.textContent = nuevaCantidad;
            }
            actualizarCarritoLocal();
            actualizarCarritoUI();
        }
    };
    window.actualizarCantidad = (id, valor) => {
        const item = carritoPedidos.get(id);
        if (!item) return;

        const cantidad = parseInt(valor);
        if (cantidad > 0) {
            item.cantidad = cantidad;
            const headerCounter = document.querySelector(`.registro-item[data-id="${id}"] .carrito-cantidad`);
            if (headerCounter) {
                headerCounter.textContent = cantidad;
            }
            actualizarCarritoLocal();
            actualizarCarritoUI();
        }
    };
    function actualizarCarritoUI() {
        if (carritoPedidos.size === 0) {
            ocultarAnuncioSecond();
            document.querySelector('.btn-flotante-pedidos').style.display = 'none';
            return;
        }

        const items = document.querySelectorAll('.carrito-item');
        items.forEach(item => {
            const id = item.dataset.id;
            const producto = carritoPedidos.get(id);
            if (producto) {
                const cantidadInput = item.querySelector('input[type="number"]');
                cantidadInput.value = producto.cantidad;
            }
        });
    }
    function actualizarCarritoLocal() {
        localStorage.setItem('damabrava_carrito_pedidos', JSON.stringify(Array.from(carritoPedidos.entries())));
    }
    let mensajePedido = localStorage.getItem('damabrava_mensaje_pedido') || 'Pedido de materia prima:\n• Sin productos en el pedido';

    // Modificar la función registrarPedido
    async function registrarPedido() {
        try {
            if (carritoPedidos.size === 0) {
                mostrarNotificacion({
                    message: 'El carrito está vacío',
                    type: 'error',
                    duration: 3000
                });
                return;
            }

            mostrarCarga('.carga-procesar');

            // Format products from cart
            const productosParaEnviar = Array.from(carritoPedidos.entries()).map(([id, item]) => {
                const carritoItem = document.querySelector(`.carrito-item[data-id="${id}"]`);
                const observacionesInput = carritoItem.querySelector('.detalle');
                const unidadSelect = carritoItem.querySelector('.unidad');
                const unidad = unidadSelect ? unidadSelect.value : 'Bolsas';

                return {
                    id: item.id,
                    nombre: item.producto,
                    cantidad: `${item.cantidad} ${unidad}`,
                    observaciones: observacionesInput ? observacionesInput.value.trim() : ''
                };
            });

            const response = await fetch('/registrar-pedido', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productos: productosParaEnviar
                })
            });

            const data = await response.json();

            if (data.success) {
                // Generar el texto del pedido
                mensajePedido = 'Pedido de materia prima:\n\n' + productosParaEnviar
                    .map(item => `• ${item.nombre} - ${item.cantidad}${item.observaciones ? ` (${item.observaciones})` : ''}`)
                    .join('\n') +
                    '\n\nEl pedido ya se encuentra en la App de TotalProd.';


                // Guardar el mensaje en localStorage
                localStorage.setItem('damabrava_mensaje_pedido', mensajePedido);

                // Clear cart
                carritoPedidos.clear();
                localStorage.setItem('damabrava_carrito_pedidos', '[]');
                ocultarCarga('.carga-procesar');
                mostrarNotificacion({
                    message: 'Pedido registrado correctamente',
                    type: 'success',
                    duration: 3000
                });
                registrarNotificacion(
                    'Administración',
                    'Creación',
                    usuarioInfo.nombre + ' hizo un nuevo pedido de materia prima')
                mostrarMensajePedido();
                await obtenerPedidos();
            } else {
                throw new Error(data.error || 'Error al registrar el pedido');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion({
                message: error.message || 'Error al procesar la operación',
                type: 'error',
                duration: 3500
            });
        } finally {
            ocultarCarga('.carga-procesar');
        }
    }

    function mostrarMensajePedido() {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        const formatoHTML = `
        <div class="encabezado">
            <h1 class="titulo">Pedido Registrado</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')">
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>
        <div class="relleno">
            <div class="formato-pedido">
                <div contenteditable="true" style="min-height: fit-content; white-space: pre-wrap; font-family: Arial, sans-serif; text-align: left; padding: 15px;">${mensajePedido}</div>
            </div>
        </div>
        <div class="anuncio-botones" style="display: flex; gap: 10px;">
            <button class="btn blue" onclick="limpiarFormatoPedido()">
                <i class="fas fa-broom"></i> Limpiar
            </button>
            <button class="btn green" onclick="compartirFormatoPedido()">
                <i class="fas fa-share-alt"></i> Compartir
            </button>
        </div>
    `;

        anuncioSecond.innerHTML = formatoHTML;
        anuncioSecond.style.paddingBottom = '70px';
        mostrarAnuncioSecond();
    }
    window.mostrarFormatoPedido = function () {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (!anuncioSecond) return;
        mostrarMensajePedido();
    };
    window.limpiarFormatoPedido = function () {
        mensajePedido = 'Pedido de materia prima:\n• Sin productos en el pedido';
        localStorage.setItem('damabrava_mensaje_pedido', mensajePedido);
        const formatoDiv = document.querySelector('.formato-pedido div[contenteditable]');
        if (formatoDiv) {
            formatoDiv.innerHTML = mensajePedido;
        }
    };
    window.compartirFormatoPedido = async function () {
        const formatoDiv = document.querySelector('.formato-pedido div[contenteditable]');
        if (!formatoDiv) return;

        const texto = encodeURIComponent(formatoDiv.innerText);

        // Open WhatsApp web with the text pre-filled
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    };
    window.registrarPedido = registrarPedido;



    aplicarFiltros();
}