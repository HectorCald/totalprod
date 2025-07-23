export let productos = [];
let productosAcopio = [];
let etiquetas = [];
let precios = [];
let clientes = [];
let proveedores = [];
let tipoEvento = [];
let modoGlobal = localStorage.getItem("modoGlobal");

let carritoSalidas = new Map(JSON.parse(localStorage.getItem('damabrava_carrito') || '[]'));
let carritoIngresos = new Map(JSON.parse(localStorage.getItem('damabrava_carrito_ingresos') || '[]'));


const DB_NAME = 'damabrava_db';
const PRODUCTO_ALM_DB = 'prductos_alm';
const PRODUCTOS_AC_DB = 'productos_acopio';
const PRECIOS_ALM_DB = 'precios_alm';
const ETIQUETAS_ALM_DB = 'etiquetas_almacen';
const CLIENTES_DB = 'clientes';
const PROVEEDOR_DB = 'proveedores';


async function obtenerProveedores() {
    try {

        const proveedoresCache = await obtenerLocal(PROVEEDOR_DB, DB_NAME);

        if (proveedoresCache.length > 0) {
            proveedores = proveedoresCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            console.log('actualizando desde el cache(Proveedores)')
        }

        try {

            const response = await fetch('/obtener-proovedores');
            const data = await response.json();

            if (data.success) {
                proveedores = data.proovedores.sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA;
                });

                if (JSON.stringify(proveedoresCache) !== JSON.stringify(proveedores)) {
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
                            for (const item of proveedores) {
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
                return true;
            } else {
                return false;
            }
        } catch (error) {
            throw error;
        }

    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        return false;
    }
}
async function obtenerClientes() {
    try {
        const clientesCache = await obtenerLocal(CLIENTES_DB, DB_NAME);

        if (clientesCache.length > 0) {
            clientes = clientesCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            console.log('actualizando desde el cache(Clientes)')
        }
        try {

            const response = await fetch('/obtener-clientes');
            const data = await response.json();

            if (data.success) {
                clientes = data.clientes.sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA;
                });

                if (JSON.stringify(clientesCache) !== JSON.stringify(clientes)) {
                    console.log('Diferencias encontradas, actualizando UI');
                    renderInitialHTML();
                    updateHTMLWithData();
                    (async () => {
                        try {
                            const db = await initDB(CLIENTES_DB, DB_NAME);
                            const tx = db.transaction(CLIENTES_DB, 'readwrite');
                            const store = tx.objectStore(CLIENTES_DB);

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
                return true;
            } else {
                return false;
            }
        } catch (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return false;
    }
}
async function obtenerEtiquetas() {
    try {

        const etiquetasAlmacenCache = await obtenerLocal(ETIQUETAS_ALM_DB, DB_NAME);

        if (etiquetasAlmacenCache.length > 0) {
            etiquetas = etiquetasAlmacenCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            console.log('actualizando desde el cache(Etiquetas almacen)')
        }

        const response = await fetch('/obtener-etiquetas');
        const data = await response.json();
        if (data.success) {
            etiquetas = data.etiquetas.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });

            if (JSON.stringify(etiquetasAlmacenCache) !== JSON.stringify(etiquetas)) {
                console.log('Diferencias encontradas, actualizando UI');
                renderInitialHTML();
                updateHTMLWithData();

                (async () => {
                    try {
                        const db = await initDB(ETIQUETAS_ALM_DB, DB_NAME);
                        const tx = db.transaction(ETIQUETAS_ALM_DB, 'readwrite');
                        const store = tx.objectStore(ETIQUETAS_ALM_DB);

                        // Limpiar todos los registros existentes
                        await store.clear();

                        // Guardar los nuevos registros
                        for (const item of etiquetas) {
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
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        return false;
    }
}
async function obtenerPrecios() {
    try {

        const preciosAlmCachce = await obtenerLocal(PRECIOS_ALM_DB, DB_NAME);

        if (preciosAlmCachce.length > 0) {
            precios = preciosAlmCachce.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            console.log('actualizando desde el cache(Precios)')
        }
        try {
            const response = await fetch('/obtener-precios');
            const data = await response.json();

            if (data.success) {
                precios = data.precios.sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA;
                });
                if (JSON.stringify(preciosAlmCachce) !== JSON.stringify(precios)) {
                    console.log('Diferencias encontradas, actualizando UI');
                    renderInitialHTML();
                    updateHTMLWithData();
                    (async () => {
                        try {
                            const db = await initDB(PRECIOS_ALM_DB, DB_NAME);
                            const tx = db.transaction(PRECIOS_ALM_DB, 'readwrite');
                            const store = tx.objectStore(PRECIOS_ALM_DB);

                            // Limpiar todos los registros existentes
                            await store.clear();

                            // Guardar los nuevos registros
                            for (const item of precios) {
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
                return true;
            } else {
                return false;
            }

        } catch (error) {
            throw error;
        }

    } catch (error) {
        return false;
    } finally {

    }
}
async function obtenerAlmacenAcopio() {
    try {

        const productosAcopioCache = await obtenerLocal(PRODUCTOS_AC_DB, DB_NAME);

        if (productosAcopioCache.length > 0) {
            productosAcopio = productosAcopioCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            console.log('actualizando desde el cache(acopio)')
        }
        const response = await fetch('/obtener-productos-acopio');
        const data = await response.json();

        if (data.success) {
            productosAcopio = data.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });

            if (JSON.stringify(productosAcopioCache) !== JSON.stringify(productosAcopio)) {
                console.log('Diferencias encontradas, actualizando UI');
                (async () => {
                    try {
                        const db = await initDB(PRODUCTOS_AC_DB, DB_NAME);
                        const tx = db.transaction(PRODUCTOS_AC_DB, 'readwrite');
                        const store = tx.objectStore(PRODUCTOS_AC_DB);

                        // Limpiar todos los registros existentes
                        await store.clear();

                        // Guardar los nuevos registros
                        for (const item of productosAcopio) {
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
            return true;
        } else {
            return false;
        }


    } catch (error) {
        console.error('Error al obtener los pagos:', error);
        return false;
    }
}
async function obtenerAlmacenGeneral() {
    try {
        const productosCache = await obtenerLocal(PRODUCTO_ALM_DB, DB_NAME);

        if (productosCache.length > 0) {
            productos = productosCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            renderInitialHTML();
            updateHTMLWithData();
            console.log('actualizando desde el cache(almacen)')
        }

        try {
            const response = await fetch('/obtener-productos');
            const data = await response.json();
            if (data.success) {
                productos = data.productos.sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA;
                });
                if (JSON.stringify(productosCache) !== JSON.stringify(productos)) {
                    console.log('Diferencias encontradas, actualizando UI');
                    renderInitialHTML();
                    updateHTMLWithData();

                    try {
                        const db = await initDB(PRODUCTO_ALM_DB, DB_NAME);
                        const tx = db.transaction(PRODUCTO_ALM_DB, 'readwrite');
                        const store = tx.objectStore(PRODUCTO_ALM_DB);

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
                }

                return true;
            } else {
                return false;
            }
        } catch (error) {
            throw error;
        }

    } catch (error) {
        console.error('Error al obtener productos:', error);
        return false;
    }
}



export async function mostrarAlmacenGeneral() {
    tipoEvento = localStorage.getItem('tipoEventoAlmacenLocal') || 'almacen';
    renderInitialHTML();
    mostrarAnuncio();

    // Luego cargar el resto de datos en segundo plano
    const [proovedores, clientes, etiquetas, precios, acopio, almacen] = await Promise.all([
        obtenerProveedores(),
        obtenerClientes(),
        obtenerEtiquetas(),
        obtenerPrecios(),
        obtenerAlmacenAcopio(),
        await obtenerAlmacenGeneral(),
    ]);
}
function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');

    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Almacén General</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio');"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <div class="pull-to-refresh">
                <i class='bx bx-refresh'></i>
                <span>Desliza para recargar</span>
            </div>
            <div class="busqueda">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="search" placeholder="">
                    </div>
                </div>
                
                <div class="acciones-grande">
                ${tienePermiso('creacion') && tipoEvento === 'almacen' ? `
                    <button class="btn-crear-producto btn orange"> <i class='bx bx-plus'></i> <span>Nuevo</span></button>
                    <button class="btn-etiquetas btn especial"><i class='bx bx-purchase-tag'></i>  <span>Etiquetas</span></button>
                    <button class="btn-precios btn especial"><i class='bx bx-dollar'></i> <span>Precios</span></button>
                     ` : ''}
                ${tipoEvento === 'conteo' ? `
                    <button class="vista-previa btn orange"><i class='bx bx-show'></i> <span>Vista previa</span></button>
                ` : ''}
                </div>
               
            </div>
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro todos activado">Todos</button>
                ${Array(5).fill().map(() => `
                    <div class="skeleton skeleton-etiqueta"></div>
                `).join('')}
            </div>
            <div class="filtros-opciones cantidad-filter">
                <button class="btn-filtro"><i class='bx bx-sort-down'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-up'></i></button>
                <button class="btn-filtro activado"><i class='bx bx-sort-a-z'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-z-a'></i></button>
                <button class="btn-filtro">Sueltas</button>
                <select class="precios-select" style="width:auto">
                    <option value="">Precios</option>
                </select>
                <select name="tipoEventos" id="eventoTipo" class="select">
                    <option value="almacen">Almacen</option>
                    <option value="conteo">Conteo</option>
                    <option value="salidas">Salida</option>
                    <option value="ingresos">Ingreso</option>
                </select>
                ${tipoEvento === 'salidas' || tipoEvento === 'ingresos' ? `
                    <div class="input switch-container" style="display:flex;align-items:center;gap:6px;">
                        <label class="switch" style="position:relative;">
                            <input type="checkbox" class="botones-cancelacion switch-tira-global">
                            <span class="slider round slider-thumb"></span>
                        </label>
            </div>
                ` : ''}
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
        <button class="btn-flotante-salidas">
            <i class="fas fa-arrow-down"></i>
            <span class="carrito-cantidad-flotante"></span>
        </button>
        <button class="btn-flotante-ingresos">
            <i class="fas fa-arrow-down"></i>
            <span class="carrito-cantidad-flotante"></span>
        </button>
        <div class="anuncio-botones">
        ${tienePermiso('creacion') && tipoEvento === 'almacen' ? `
            <button class="btn-crear-producto btn orange"> <i class='bx bx-plus'></i> Nuevo</button>
            <button class="btn-etiquetas btn especial"><i class='bx bx-purchase-tag'></i> Etiquetas</button>
            <button class="btn-precios btn especial"><i class='bx bx-dollar'></i> Precios</button>
        ` : ''}
         ${tipoEvento === 'conteo' ? `
                    <button class="vista-previa btn orange"><i class='bx bx-show'></i> <span>Vista previa</span></button>
                    ` : ''}
        
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '10px';
    if (tienePermiso('creacion') && tipoEvento !== 'salidas' && tipoEvento !== 'ingresos') {
        contenido.style.paddingBottom = '70px';
    }
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);
}
async function updateHTMLWithData() {
    const etiquetasFilter = document.querySelector('.etiquetas-filter');
    const skeletons = etiquetasFilter.querySelectorAll('.skeleton');
    skeletons.forEach(s => s.remove());

    // ✅ AGREGAR ESTA LÍNEA - Eliminar etiquetas existentes
    const etiquetasExistentes = etiquetasFilter.querySelectorAll('.btn-filtro:not(.todos)');
    etiquetasExistentes.forEach(e => e.remove());

    const etiquetasHTML = etiquetas.map(etiqueta => `
    <button class="btn-filtro">${etiqueta.etiqueta}</button>
    `).join('');

    etiquetasFilter.insertAdjacentHTML('beforeend', etiquetasHTML);

    const preciosSelect = document.querySelector('.precios-select');
    const preciosOpciones = precios.map((precio, index) => {
        const primerPrecio = precio.precio.split(';')[0].split(',')[0];
        return `<option value="${precio.id}" ${index === 1 ? 'selected' : ''}>${primerPrecio}</option>`;
    }).join('');
    preciosSelect.innerHTML = preciosOpciones;

    // Update precios select
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = await Promise.all(productos.map(async producto => {
        let imagenMostrar = '<i class=\'bx bx-package\'></i>';
        // Formatear precio a dos decimales
        let precioMostrar = '';
        if (producto.precios) {
            const primerPrecio = producto.precios.split(';')[0];
            const valor = primerPrecio.split(',')[1];
            precioMostrar = !isNaN(parseFloat(valor)) ? parseFloat(valor).toFixed(2) : '0.00';
        } else {
            precioMostrar = '0.00';
        }

        if (tipoEvento === 'conteo') {
            return `
            <div class="registro-item" data-id="${producto.id}">
                <div class="header">
                    ${imagenMostrar}
                    <div class="info-header">
                        <span class="id-flotante"><span>${producto.id}</span><span style="display:none">${producto.stock} Und.</span><input type="number" class="entrada-conteo stock-fisico" value="${producto.stock}" min="0"></span>
                        </span>
                        <span class="detalle"><strong>${producto.producto} - ${producto.gramos}gr.</strong></span>
                        <span class="pie">${producto.etiquetas.split(';').join(' • ')}</span>
                    </div>
                </div>
            </div>
        `;
        } else if (tipoEvento === 'almacen') {
            return `
            <div class="registro-item" data-id="${producto.id}">
                <div class="header">
                    ${imagenMostrar}
                    <div class="info-header">
                        <span class="id-flotante"><span>${producto.id}</span><span style="display:flex;gap:5px"><span class="flotante-item orange">${producto.stock} Und.</span><span class="flotante-item green">Bs. ${precioMostrar}</span></span></span>
                        <span class="detalle"><strong>${producto.producto} - ${producto.gramos}gr.</strong></span>
                        <span class="pie">${producto.etiquetas.split(';').join(' • ')}</span>
                    </div>
                </div>
            </div>
        `;
        } else if (tipoEvento === 'salidas' || tipoEvento === 'ingresos') {

            return `
                <div class="registro-item" data-id="${producto.id}">
                    <div class="header">
                        ${imagenMostrar}
                        <div class="info-header">
                            <span class="id-flotante"><span>${producto.id}</span></span>
                            <span class="detalle"><strong>${producto.producto} - ${producto.gramos}gr.</strong></span>
                            <span class="pie">${producto.etiquetas.split(';').join(' • ')}</span>
                        </div>
                    </div>
                </div>
            `
        }
    }));

    // Renderizar HTML
    productosContainer.innerHTML = productosHTML.join('');
    eventosAlmacenGeneral();
}


function eventosAlmacenGeneral() {
    const botonesEtiquetas = document.querySelectorAll('.filtros-opciones.etiquetas-filter .btn-filtro');
    const botonesCantidad = document.querySelectorAll('.filtros-opciones.cantidad-filter .btn-filtro');
    const selectPrecios = document.querySelector('.precios-select');

    const items = document.querySelectorAll('.registro-item');

    const inputBusqueda = document.querySelector('.search');
    const contenedor = document.querySelector('.anuncio .relleno');

    const select = document.getElementById('eventoTipo');

    select.value = tipoEvento;
    select.addEventListener('change', () => {
        localStorage.setItem('tipoEventoAlmacenLocal', select.value);
        tipoEvento = select.value; // <-- ACTUALIZA la variable global
        renderInitialHTML();
        updateHTMLWithData();
    });
    select.addEventListener('click', (e) => {
        scrollToCenter(e.target, e.target.parentElement);
    });

    let filtroEtiquetaAlmacen = localStorage.getItem('filtroEtiquetaAlmacen') || 'Todos';


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

    function aplicarFiltros() {
        const registros = document.querySelectorAll('.registro-item');
        const busqueda = normalizarTexto(inputBusqueda.value);
        const precioSeleccionado = selectPrecios.selectedIndex >= 0 && selectPrecios.options[selectPrecios.selectedIndex] ?
            selectPrecios.options[selectPrecios.selectedIndex].text : '';
        const botonCantidadActivo = document.querySelector('.filtros-opciones.cantidad-filter .btn-filtro.activado');
        const botonSueltas = document.querySelector('.filtros-opciones.cantidad-filter .btn-filtro:nth-child(5)');
        const mostrarSueltas = botonSueltas.classList.contains('activado');
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Animación de ocultamiento
        registros.forEach(registro => {
            registro.style.opacity = '0';
            registro.style.transform = 'translateY(-20px)';
        });

        setTimeout(() => {
            // Ocultar elementos y procesar filtros
            registros.forEach(registro => {
                registro.style.display = 'none';
                const producto = productos.find(p => p.id === registro.dataset.id);
                const stockSpan = registro.querySelector('.stock');
                if (stockSpan && producto) {
                    stockSpan.textContent = mostrarSueltas ?
                        `${producto.uSueltas || 0} Sueltas` :
                        `${producto.stock} Und.`;
                }
            });

            // Filtrar y ordenar
            const productosFiltrados = Array.from(registros).filter(registro => {
                const producto = productos.find(p => p.id === registro.dataset.id);
                if (!producto) return false;

                const etiquetasProducto = producto.etiquetas.split(';').map(e => e.trim());
                let mostrar = true;

                // Filtro de sueltas
                if (mostrarSueltas) {
                    mostrar = mostrar && (producto.uSueltas && producto.uSueltas > 0);
                }

                // Filtro de etiquetas
                if (mostrar && filtroEtiquetaAlmacen !== 'Todos') {
                    mostrar = mostrar && etiquetasProducto.includes(filtroEtiquetaAlmacen);
                }

                // Filtro de búsqueda
                if (mostrar && busqueda) {
                    mostrar = mostrar && (
                        normalizarTexto(producto.producto).includes(busqueda) ||
                        normalizarTexto(producto.gramos.toString()).includes(busqueda) ||
                        normalizarTexto(producto.codigo_barras).includes(busqueda) ||
                        normalizarTexto(producto.id).includes(busqueda)

                    );
                }

                return mostrar;
            });

            // Ordenamiento
            if (botonCantidadActivo) {
                const index = Array.from(botonesCantidad).indexOf(botonCantidadActivo);
                switch (index) {
                    case 0:
                        productosFiltrados.sort((a, b) => {
                            const productoA = productos.find(p => p.id === a.dataset.id);
                            const productoB = productos.find(p => p.id === b.dataset.id);
                            const valA = mostrarSueltas ?
                                (productoA?.uSueltas || 0) :
                                parseInt(a.querySelector('.stock')?.textContent || '0');
                            const valB = mostrarSueltas ?
                                (productoB?.uSueltas || 0) :
                                parseInt(b.querySelector('.stock')?.textContent || '0');
                            return valB - valA;
                        });
                        break;
                    case 1:
                        productosFiltrados.sort((a, b) => {
                            const productoA = productos.find(p => p.id === a.dataset.id);
                            const productoB = productos.find(p => p.id === b.dataset.id);
                            const valA = mostrarSueltas ?
                                (productoA?.uSueltas || 0) :
                                parseInt(a.querySelector('.stock')?.textContent || '0');
                            const valB = mostrarSueltas ?
                                (productoB?.uSueltas || 0) :
                                parseInt(b.querySelector('.stock')?.textContent || '0');
                            return valA - valB;
                        });
                        break;
                    case 2:
                        productosFiltrados.sort((a, b) => {
                            const nombreA = a.querySelector('.nombre strong')?.textContent || '';
                            const nombreB = b.querySelector('.nombre strong')?.textContent || '';
                            return nombreA.localeCompare(nombreB);
                        });
                        break;
                    case 3:
                        productosFiltrados.sort((a, b) => {
                            const nombreA = a.querySelector('.nombre strong')?.textContent || '';
                            const nombreB = b.querySelector('.nombre strong')?.textContent || '';
                            return nombreB.localeCompare(nombreA);
                        });
                        break;
                }
            }

            // Mostrar elementos filtrados con animación
            productosFiltrados.forEach(registro => {
                registro.style.display = 'flex';
                registro.style.opacity = '0';
                registro.style.transform = 'translateY(20px)';

                setTimeout(() => {
                    registro.style.opacity = '1';
                    registro.style.transform = 'translateY(0)';
                }, 0);
            });

            // Actualizar precios y reordenar DOM
            const contenedor = document.querySelector('.productos-container');
            productosFiltrados.forEach(registro => {
                const producto = productos.find(p => p.id === registro.dataset.id);
                if (precioSeleccionado && producto) {
                    const preciosProducto = producto.precios.split(';');
                    const precioFiltrado = preciosProducto.find(p => p.split(',')[0] === precioSeleccionado);
                    if (precioFiltrado) {
                        const precio = parseFloat(precioFiltrado.split(',')[1]);
                        const precioElement = registro.querySelector('.precio');
                        if (precioElement) {
                            precioElement.textContent = `Bs. ${precio.toFixed(2)}`;
                        }
                    }
                }
                contenedor.appendChild(registro);
            });

            // Mensaje vacío
            if (mensajeNoEncontrado) {
                mensajeNoEncontrado.style.display = productosFiltrados.length === 0 ? 'block' : 'none';
            }
        }, 200);
    }
    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });
    inputBusqueda.addEventListener('input', (e) => {
        aplicarFiltros();
    });

    botonesEtiquetas.forEach(boton => {
        boton.classList.remove('activado');
        if (boton.textContent.trim() === filtroEtiquetaAlmacen) {
            boton.classList.add('activado');
        }
        boton.addEventListener('click', () => {
            botonesEtiquetas.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            filtroEtiquetaAlmacen = boton.textContent.trim();
            aplicarFiltros();
            scrollToCenter(boton, boton.parentElement);
            localStorage.setItem('filtroEtiquetaAlmacen', filtroEtiquetaAlmacen);
        });
    });
    botonesCantidad.forEach(boton => {
        boton.addEventListener('click', () => {
            if (boton.textContent.trim() === 'Sueltas') {
                boton.classList.toggle('activado');
            } else {
                // Comportamiento normal para otros botones
                botonesCantidad.forEach(b => {
                    if (b.textContent.trim() !== 'Sueltas') {
                        b.classList.remove('activado');
                    }
                });
                boton.classList.add('activado');
            }
            scrollToCenter(boton, boton.parentElement);
            aplicarFiltros();
        });
    });


    selectPrecios.addEventListener('click', (e) => {
        scrollToCenter(e.target, e.target.parentElement);
    });
    selectPrecios.addEventListener('change', (e) => {
        scrollToCenter(e.target, e.target.parentElement);
        aplicarFiltros();
    });



    if (tipoEvento === 'almacen') {
        const btnCrearProducto = document.querySelectorAll('.btn-crear-producto');
        const btnEtiquetas = document.querySelectorAll('.btn-etiquetas');
        const btnPrecios = document.querySelectorAll('.btn-precios');
        items.forEach(item => {
            item.addEventListener('click', function () {
                const registroId = this.dataset.id;
                window.info(registroId);
            });
        });
        if (tienePermiso('creacion')) {
            btnCrearProducto.forEach(btn => {
                btn.addEventListener('click', crearProducto);
            });
            btnEtiquetas.forEach(btn => {
                btn.addEventListener('click', gestionarEtiquetas);
            });
            btnPrecios.forEach(btn => {
                btn.addEventListener('click', gestionarPrecios);
            });
        }

        window.info = async function (registroId) {
            const producto = productos.find(r => r.id === registroId);
            if (!producto) return;

            // Procesar los precios
            const preciosFormateados = producto.precios.split(';')
                .filter(precio => precio.trim()) // Eliminar elementos vacíos
                .map(precio => {
                    const [ciudad, valor] = precio.split(',');
                    return `<span class="valor"><strong><i class='bx bx-store'></i> ${ciudad}: </strong>Bs. ${parseFloat(valor).toFixed(2)}</span>`;
                })
                .join('');
            const etiquetasFormateados = producto.etiquetas.split(';')
                .filter(precio => precio.trim()) // Eliminar elementos vacíos
                .map(precio => {
                    const [valor] = precio.split(';');
                    return `<span class="valor"><strong><i class='bx bx-tag'></i> ${valor}</span>`;
                })
                .join('');
            const contenido = document.querySelector('.anuncio-second .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Información</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond');"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno">
                    <p class="normal">Detalles del producto</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class="bx bx-box"></i> Producto: </strong>${producto.producto} - ${producto.gramos}gr.</span>
                        <span class="valor"><strong><i class='bx bx-package'></i> Stock: </strong>${producto.stock} Und.</span>
                        <span class="valor"><strong><i class='bx bx-hash'></i> Codigo: </strong>${producto.codigo_barras}</span>
                        <span class="valor"><strong><i class='bx bx-hash'></i> Cantidad por grupo: </strong>${producto.cantidadxgrupo}</span>
                        <span class="valor"><strong><i class='bx bx-list-ul'></i> Lista: </strong>${producto.lista}</span>
                        <span class="valor"><strong><i class='bx bx-package'></i> Almacen acopio: </strong>${producto.alm_acopio_producto}</span>
                        <span class="valor"><strong><i class='bx bx-package'></i> Unidades sueltas: </strong>${producto.uSueltas}</span>
                    </div>

                    <p class="normal">Precios</p>
                    <div class="campo-vertical">
                        ${preciosFormateados}
                    </div>

                    <p class="normal">Etiquetas</p>
                    <div class="campo-vertical">
                        ${etiquetasFormateados}
                    </div>
                </div>
                ${tienePermiso('edicion') || tienePermiso('eliminacion') ? `
                <div class="anuncio-botones">
                    ${tienePermiso('edicion') ? `<button class="btn-editar btn blue" data-id="${producto.id}"><i class='bx bx-edit'></i>Editar</button>` : ''}
                    ${tienePermiso('eliminacion') ? `<button class="btn-eliminar btn red" data-id="${producto.id}"><i class="bx bx-trash"></i>Eliminar</button>` : ''}
                </div>` : ''}
            `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '10px';
            mostrarAnuncioSecond();


            if (tienePermiso('edicion') || tienePermiso('eliminacion')) {
                contenido.style.paddingBottom = '70px';
            }


            if (tienePermiso('edicion')) {
                const btnEditar = contenido.querySelector('.btn-editar');
                btnEditar.addEventListener('click', () => editar(producto));
            }
            if (tienePermiso('eliminacion')) {
                const btnEliminar = contenido.querySelector('.btn-eliminar');
                btnEliminar.addEventListener('click', () => eliminar(producto));
            }
            function eliminar(producto) {
                const contenido = document.querySelector('.anuncio-tercer .contenido');
                const registrationHTML = `
                    <div class="encabezado">
                        <h1 class="titulo">Eliminar producto</h1>
                        <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer');"><i class="fas fa-arrow-right"></i></button>
                    </div>
                    <div class="relleno">
                        <p class="normal">Detalles del producto</p>
                        <div class="campo-vertical">
                            <span class="valor"><strong><i class='bx bx-box'></i> Producto: </strong>${producto.producto} - ${producto.gramos}gr.</span>
                            <span class="valor"><strong><i class='bx bx-package'></i> Stock: </strong>${producto.stock} Und.</span>
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
                                <p>Vas a eliminar un producto del sistema. Esta acción no se puede deshacer y podría afectar a varios registros relacionados. Asegúrate de que deseas continuar.</p>
                            </div>
                        </div>

                    </div>
                    <div class="anuncio-botones">
                        <button class="btn-eliminar-producto btn red"><i class="bx bx-trash"></i> Confirmar eliminación</button>
                    </div>
                `;
                contenido.innerHTML = registrationHTML;
                contenido.style.paddingBottom = '80px';
                mostrarAnuncioTercer();

                // Agregar evento al botón guardar
                const btnEliminarProducto = contenido.querySelector('.btn-eliminar-producto');
                btnEliminarProducto.addEventListener('click', confirmarEliminacionProducto);

                async function confirmarEliminacionProducto() {
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
                        const response = await fetch(`/eliminar-producto/${registroId}`, {
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
                            await obtenerAlmacenGeneral();
                            updateHTMLWithData();
                            cerrarAnuncioManual('anuncioSecond');
                            mostrarNotificacion({
                                message: 'Producto eliminado correctamente',
                                type: 'success',
                                duration: 3000
                            });
                            registrarNotificacion(
                                'Administración',
                                'Eliminación',
                                usuarioInfo.nombre + ' elimino el producto ' + producto.producto + ' Id: ' + producto.id + ' su motivo fue: ' + motivo)
                        } else {
                            throw new Error(data.error || 'Error al eliminar el producto');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        mostrarNotificacion({
                            message: error.message || 'Error al eliminar el producto',
                            type: 'error',
                            duration: 3500
                        });
                    } finally {
                        ocultarCarga('.carga-procesar')
                    }
                }
            }
            function editar(producto) {

                // Procesar las etiquetas actuales del producto
                const etiquetasProducto = producto.etiquetas.split(';').filter(e => e.trim());
                const etiquetasHTML = etiquetasProducto.map(etiqueta => `
                    <div class="etiqueta-item" data-valor="${etiqueta}">
                        <i class='bx bx-purchase-tag'></i>
                        <span>${etiqueta}</span>
                        <button type="button" class="btn-quitar-etiqueta"><i class='bx bx-x'></i></button>
                    </div>
                    `).join('');

                // Procesar los precios del producto
                // Procesar los precios del producto
                const preciosFormateados = producto.precios.split(';')
                    .filter(precio => precio.trim())
                    .map(precio => {
                        const [ciudad, valor] = precio.split(',');
                        return `<div class="entrada">
                                <i class='bx bx-store'></i>
                                <div class="input">
                                    <p class="detalle">${ciudad}</p>
                                    <input class="precio-input" data-ciudad="${ciudad}" type="number" value="${valor}" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>`;
                    })
                    .join('');

                // Lista de etiquetas disponibles (excluyendo las ya seleccionadas)
                const etiquetasDisponibles = etiquetas
                    .map(e => e.etiqueta)
                    .filter(e => !etiquetasProducto.includes(e));

                const contenido = document.querySelector('.anuncio-tercer .contenido');
                const registrationHTML = `
                    <div class="encabezado">
                        <h1 class="titulo">Editar producto</h1>
                        <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer');"><i class="fas fa-arrow-right"></i></button>
                    </div>
                        <div class="relleno">
                        <p class="normal">Información basica</p>
                            <div class="entrada">
                                <i class='bx bx-cube'></i>
                                <div class="input">
                                    <p class="detalle">Producto</p>
                                    <input class="producto" type="text" value="${producto.producto}" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                        <div class="campo-horizontal">
                            <div class="entrada">
                                <i class="ri-scales-line"></i>
                                <div class="input">
                                    <p class="detalle">Gramaje</p>
                                    <input class="gramaje" type="number" value="${producto.gramos}" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                            <div class="entrada">
                                <i class='bx bx-package'></i>
                                <div class="input">
                                    <p class="detalle">Stock</p>
                                    <input class="stock" type="number" value="${producto.stock}" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                        </div>
                        <div class="campo-horizontal">
                            <div class="entrada">
                                <i class='bx bx-barcode'></i>
                                <div class="input">
                                    <p class="detalle">Código</p>
                                    <input class="codigo-barras" type="text" value="${producto.codigo_barras}" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                            <div class="entrada">
                                <i class='bx bx-list-ul'></i>
                                <div class="input">
                                    <p class="detalle">Lista</p>
                                    <input class="lista" type="text" value="${producto.lista}" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                        </div>
                        <div class="campo-horizontal">
                            <div class="entrada">
                                <i class='bx bx-package'></i>
                                <div class="input">
                                    <p class="detalle">U. por Tira</p>
                                    <input class="cantidad-grupo" type="number" value="${producto.cantidadxgrupo}" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                            <div class="entrada">
                                <i class='bx bx-package'></i>
                                <div class="input">
                                    <p class="detalle">U. Sueltas</p>
                                    <input class="unidades-sueltas" type="number" value="${producto.uSueltas}" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                        </div>
                            <div class="entrada">
                                <div class="input">
                                    <label class="custom-file-upload" for="imagenInput">
                                        <i class='bx bx-image'></i>
                                        Subir imagen
                                    </label>
                                    <input style="display:none"id="imagenInput" class="imagen-producto" type="file" accept="image/*">
                                </div>
                            </div>
                        <p class="normal">Etiquetas</p>
                        <div class="etiquetas-container">
                            <div class="etiquetas-actuales">
                                ${etiquetasHTML}
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-purchase-tag'></i>
                            <div class="input">
                                <p class="detalle">Selecciona nueva etiqueta</p>
                                <select class="select-etiqueta" required>
                                ${etiquetasDisponibles.map(etiqueta =>
                            `<option value="${etiqueta}">${etiqueta}</option>`
                        ).join('')}
                                </select>
                                <button type="button" class="btn-agregar-etiqueta"><i class='bx bx-plus'></i></button>
                            </div>
                        </div>
            
                        <p class="normal">Precios</p>
                            ${preciosFormateados}
            
                        <p class="normal">Almacén acopio</p>
                            <div class="entrada">
                                <i class='bx bx-package'></i>
                                <div class="input">
                                    <p class="detalle">Selecciona Almacén acopio</p>
                                    <select class="alm-acopio-producto" required>
                                        <option value=""></option>
                                        ${productosAcopio.map(productoAcopio => `
                                            <option value="${productoAcopio.id}" ${productoAcopio.producto === producto.alm_acopio_producto ? 'selected' : ''}>
                                                ${productoAcopio.producto}
                                            </option>   
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
            
                        <p class="normal">Motivo de la edición</p>
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
                                    <p>Estás por editar un producto del sistema. Asegúrate de realizar los cambios correctamente, ya que podrían modificar información relacionada.</p>
                                </div>
                            </div>

                    </div>
                    <div class="anuncio-botones">
                        <button class="btn-editar-producto btn blue"><i class="bx bx-save"></i> Guardar cambios</button>
                    </div>
                `;

                contenido.innerHTML = registrationHTML;
                contenido.style.paddingBottom = '70px';

                // Eventos para manejar etiquetas
                const btnAgregarEtiqueta = contenido.querySelector('.btn-agregar-etiqueta');
                const selectEtiqueta = contenido.querySelector('.select-etiqueta');
                const etiquetasActuales = contenido.querySelector('.etiquetas-actuales');

                btnAgregarEtiqueta.addEventListener('click', () => {
                    const etiquetaSeleccionada = selectEtiqueta.value;
                    if (etiquetaSeleccionada) {
                        const nuevaEtiqueta = document.createElement('div');
                        nuevaEtiqueta.className = 'etiqueta-item';
                        nuevaEtiqueta.dataset.valor = etiquetaSeleccionada;
                        nuevaEtiqueta.innerHTML = `
                    <i class='bx bx-purchase-tag'></i>
                    <span>${etiquetaSeleccionada}</span>
                    <button type="button" class="btn-quitar-etiqueta"><i class='bx bx-x'></i></button>
                `;
                        etiquetasActuales.appendChild(nuevaEtiqueta);
                        selectEtiqueta.querySelector(`option[value="${etiquetaSeleccionada}"]`).remove();
                        selectEtiqueta.value = '';
                    }
                });

                // Eventos para quitar etiquetas
                etiquetasActuales.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-quitar-etiqueta')) {
                        const etiquetaItem = e.target.closest('.etiqueta-item');
                        const valorEtiqueta = etiquetaItem.dataset.valor;
                        const option = document.createElement('option');
                        option.value = valorEtiqueta;
                        option.textContent = valorEtiqueta;
                        selectEtiqueta.appendChild(option);
                        etiquetaItem.remove();
                    }
                });

                mostrarAnuncioTercer();

                // Agregar evento al botón guardar
                const btnEditarProducto = contenido.querySelector('.btn-editar-producto');
                btnEditarProducto.addEventListener('click', confirmarEdicionProducto);

                async function confirmarEdicionProducto() {
                    try {
                        // Crear FormData para enviar la imagen y los datos
                        const formData = new FormData();

                        // Obtener todos los campos del formulario
                        const producto = document.querySelector('.producto').value.trim();
                        const gramos = document.querySelector('.gramaje').value.trim();
                        const stock = document.querySelector('.stock').value.trim();
                        const cantidadxgrupo = document.querySelector('.cantidad-grupo').value.trim();
                        const lista = document.querySelector('.lista').value.trim();
                        const codigo_barras = document.querySelector('.codigo-barras').value.trim();
                        const uSueltas = document.querySelector('.unidades-sueltas').value.trim();
                        const motivo = document.querySelector('.motivo').value.trim();
                        const alm_acopio_id = document.querySelector('.alm-acopio-producto').value;
                        const alm_acopio_producto = alm_acopio_id ?
                            productosAcopio.find(p => p.id === alm_acopio_id)?.producto :
                            '';

                        // Validar motivo
                        if (!motivo) {
                            mostrarNotificacion({
                                message: 'Debe ingresar el motivo de la edición',
                                type: 'warning',
                                duration: 3500
                            });
                            return;
                        }

                        // Obtener etiquetas seleccionadas
                        const etiquetasSeleccionadas = Array.from(document.querySelectorAll('.etiquetas-actuales .etiqueta-item'))
                            .map(item => item.dataset.valor)
                            .join(';');

                        // Obtener precios
                        const preciosInputs = document.querySelectorAll('.precio-input');
                        const preciosActualizados = Array.from(preciosInputs)
                            .map(input => `${input.dataset.ciudad},${input.value}`)
                            .join(';');

                        // Agregar todos los campos al FormData 
                        formData.append('producto', producto);
                        formData.append('gramos', gramos);
                        formData.append('stock', stock);
                        formData.append('cantidadxgrupo', cantidadxgrupo);
                        formData.append('lista', lista);
                        formData.append('codigo_barras', codigo_barras);
                        formData.append('etiquetas', etiquetasSeleccionadas);
                        formData.append('precios', preciosActualizados);
                        formData.append('uSueltas', uSueltas);
                        formData.append('alm_acopio_id', alm_acopio_id);
                        formData.append('alm_acopio_producto', alm_acopio_producto);
                        formData.append('motivo', motivo);

                        // Procesar imagen si existe
                        const imagenInput = document.querySelector('.imagen-producto');
                        if (imagenInput.files && imagenInput.files[0]) {
                            formData.append('imagen', imagenInput.files[0]);
                        }

                        mostrarCarga('.carga-procesar')

                        const response = await fetch(`/actualizar-producto/${registroId}`, {
                            method: 'PUT',
                            body: formData // Ya no necesitamos headers porque FormData los establece automáticamente
                        });

                        if (!response.ok) {
                            throw new Error('Error en la respuesta del servidor');
                        }

                        const data = await response.json();

                        if (data.success) {
                            await obtenerAlmacenGeneral();
                            info(registroId)
                            updateHTMLWithData();
                            mostrarNotificacion({
                                message: 'Producto actualizado correctamente',
                                type: 'success',
                                duration: 3000
                            });
                            registrarNotificacion(
                                'Administración',
                                'Edición',
                                usuarioInfo.nombre + ' editó el producto ' + producto + ' su motivo fue: ' + motivo
                            );
                        } else {
                            throw new Error(data.error || 'Error al actualizar el producto');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        mostrarNotificacion({
                            message: error.message || 'Error al actualizar el producto',
                            type: 'error',
                            duration: 3500
                        });
                    } finally {
                        ocultarCarga('.carga-procesar')
                    }
                }
            }
        }

        function crearProducto() {

            const preciosFormateados = precios.map(precio => {
                return `<div class="entrada">
                        <i class='bx bx-store'></i>
                        <div class="input">
                            <p class="detalle">${precio.precio}</p>
                            <input class="precio-input" data-ciudad="${precio.precio}" type="number" value="" autocomplete="off" placeholder=" " required>
                        </div>
                    </div>`;
            }).join('');

            // Lista de todas las etiquetas disponibles
            const etiquetasDisponibles = etiquetas.map(e => e.etiqueta);

            const contenido = document.querySelector('.anuncio-second .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Nuevo producto</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno">
                    <p class="normal">Información basica</p>
                        <div class="entrada">
                            <i class='bx bx-cube'></i>
                            <div class="input">
                                <p class="detalle">Producto</p>
                                <input class="producto" type="text"  autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class="ri-scales-line"></i>
                            <div class="input">
                                <p class="detalle">Gramaje</p>
                                <input class="gramaje" type="number"  autocomplete="off" placeholder=" " required>
                            </div>
                        </div>

                    <p class="normal">Detalles del producto</p>
                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class='bx bx-package'></i>
                            <div class="input">
                                <p class="detalle">Stock</p>
                                <input class="stock" type="number"  autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-barcode'></i>
                            <div class="input">
                                <p class="detalle">Código</p>
                                <input class="codigo-barras" type="number" autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                    </div>
                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class='bx bx-list-ul'></i>
                            <div class="input">
                                <p class="detalle">Lista</p>
                                <input class="lista" type="text" autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-package'></i>
                            <div class="input">
                                <p class="detalle">U. por Tira</p>
                                <input class="cantidad-grupo" type="number"  autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                    </div>
                        
                        
                    <p class="normal">Etiquetas</p>
                    <div class="etiquetas-container">
                        <div class="etiquetas-actuales">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-purchase-tag'></i>
                        <div class="input">
                            <p class="detalle">Selecciona nueva etiqueta</p>
                            <select class="select-etiqueta" required>
                                <option value=""></option>
                                ${etiquetasDisponibles.map(etiqueta =>
                `<option value="${etiqueta}">${etiqueta}</option>`
            ).join('')} 
                            </select>
                            <button type="button" class="btn-agregar-etiqueta"><i class='bx bx-plus'></i></button>
                        </div>
                    </div>

                    <p class="normal">Precios</p>
                        ${preciosFormateados}

                    <p class="normal">Almacen acopio</p>
                    <div class="entrada">
                        <i class='bx bx-package'></i>
                        <div class="input">
                            <p class="detalle">Selecciona Almacén acopio</p>
                            <select class="alm-acopio-producto" required>
                                <option value=""></option>
                                ${productosAcopio.map(producto => `
                                    <option value="${producto.id}">${producto.producto}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button class="btn-crear-producto btn orange"><i class="bx bx-plus"></i> Crear producto</button>
                </div>
            `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '70px'

            // Eventos para manejar etiquetas
            const btnAgregarEtiqueta = contenido.querySelector('.btn-agregar-etiqueta');
            const selectEtiqueta = contenido.querySelector('.select-etiqueta');
            const etiquetasActuales = contenido.querySelector('.etiquetas-actuales');

            btnAgregarEtiqueta.addEventListener('click', () => {
                const etiquetaSeleccionada = selectEtiqueta.value;
                if (etiquetaSeleccionada) {
                    const nuevaEtiqueta = document.createElement('div');
                    nuevaEtiqueta.className = 'etiqueta-item';
                    nuevaEtiqueta.dataset.valor = etiquetaSeleccionada;
                    nuevaEtiqueta.innerHTML = `
                <i class='bx bx-purchase-tag'></i>
                <span>${etiquetaSeleccionada}</span>
                <button type="button" class="btn-quitar-etiqueta"><i class='bx bx-x'></i></button>
            `;
                    etiquetasActuales.appendChild(nuevaEtiqueta);
                    selectEtiqueta.querySelector(`option[value="${etiquetaSeleccionada}"]`).remove();
                    selectEtiqueta.value = '';
                }
            });

            // Eventos para quitar etiquetas
            etiquetasActuales.addEventListener('click', (e) => {
                if (e.target.closest('.btn-quitar-etiqueta')) {
                    const etiquetaItem = e.target.closest('.etiqueta-item');
                    const valorEtiqueta = etiquetaItem.dataset.valor;
                    const option = document.createElement('option');
                    option.value = valorEtiqueta;
                    option.textContent = valorEtiqueta;
                    selectEtiqueta.appendChild(option);
                    etiquetaItem.remove();
                }
            });

            mostrarAnuncioSecond();

            // Agregar evento al botón guardar
            const btnCrear = contenido.querySelector('.btn-crear-producto');
            btnCrear.addEventListener('click', confirmarCreacion);

            async function confirmarCreacion() {
                const producto = document.querySelector('.producto').value.trim();
                const gramos = document.querySelector('.gramaje').value.trim();
                const stock = document.querySelector('.stock').value.trim();
                const cantidadxgrupo = document.querySelector('.cantidad-grupo').value.trim();
                const lista = document.querySelector('.lista').value.trim();
                const codigo_barras = document.querySelector('.codigo-barras').value.trim();
                const acopioSelect = document.querySelector('.alm-acopio-producto');

                // Obtener precios formateados (ciudad,valor;ciudad,valor)
                const preciosSeleccionados = Array.from(document.querySelectorAll('.nuevo-producto .precio-input'))
                    .map(input => `${input.dataset.ciudad},${input.value || '0'}`)
                    .join(';');

                // Obtener etiquetas del contenedor (etiqueta;etiqueta)
                const etiquetasSeleccionadas = Array.from(document.querySelectorAll('.nuevo-producto .etiquetas-actuales .etiqueta-item'))
                    .map(item => item.dataset.valor)
                    .join(';');

                // Obtener info del producto de acopio
                const acopio_id = acopioSelect.value;
                const alm_acopio_producto = acopio_id ?
                    productosAcopio.find(p => p.id === acopio_id)?.producto :
                    'No hay índice seleccionado';

                if (!producto || !gramos || !stock || !cantidadxgrupo || !lista) {
                    mostrarNotificacion({
                        message: 'Por favor complete todos los campos obligatorios',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga('.carga-procesar')
                    const response = await fetch('/crear-producto', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            producto,
                            gramos,
                            stock,
                            cantidadxgrupo,
                            lista,
                            codigo_barras,
                            precios: preciosSeleccionados,
                            etiquetas: etiquetasSeleccionadas,
                            acopio_id,
                            alm_acopio_producto
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        await obtenerAlmacenGeneral();
                        updateHTMLWithData();
                        info(data.id)
                        mostrarNotificacion({
                            message: 'Producto creado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Creación',
                            usuarioInfo.nombre + ' creo un nuevo producto: ' + producto + ' ' + gramos + 'gr.')
                    } else {
                        throw new Error(data.error || 'Error al crear el producto');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al crear el producto',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar')
                }
            }
        }
        function gestionarEtiquetas() {
            const contenido = document.querySelector('.anuncio-second .contenido');
            const etiquetasHTML = etiquetas.map(etiqueta => `
                <div class="etiqueta-item" data-id="${etiqueta.id}">
                    <i class='bx bx-purchase-tag'></i>
                    <span>${etiqueta.etiqueta}</span>
                    <button type="button" class="btn-quitar-etiqueta"><i class='bx bx-x'></i></button>
                </div>
            `).join('');

            const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Gestionar Etiquetas</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <p class="normal">Etiquetas existentes</p>
                <div class="etiquetas-container">
                    <div class="etiquetas-actuales">
                        ${etiquetasHTML}
                    </div>
                </div>

                <p class="normal">Agregar nueva etiqueta</p>
                <div class="entrada">
                    <i class='bx bx-purchase-tag'></i>
                    <div class="input">
                        <p class="detalle">Nueva etiqueta</p>
                        <input class="nueva-etiqueta" type="text" autocomplete="off" placeholder=" " required>
                        <button type="button" class="btn-agregar-etiqueta-temp"><i class='bx bx-plus'></i></button>
                    </div>
                </div>
            </div>
            `;

            contenido.innerHTML = registrationHTML;
            mostrarAnuncioSecond();


            const btnAgregarTemp = contenido.querySelector('.btn-agregar-etiqueta-temp');
            const etiquetasActuales = contenido.querySelector('.etiquetas-actuales');


            btnAgregarTemp.addEventListener('click', async () => {
                const nuevaEtiqueta = document.querySelector('.nueva-etiqueta').value.trim();
                if (nuevaEtiqueta) {
                    try {
                        mostrarCarga('.carga-procesar')
                        const response = await fetch('/agregar-etiqueta', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ etiqueta: nuevaEtiqueta })
                        });

                        if (!response.ok) throw new Error('Error al agregar etiqueta');

                        const data = await response.json();
                        if (data.success) {
                            await obtenerEtiquetas();
                            updateHTMLWithData();
                            gestionarEtiquetas();
                            document.querySelector('.nueva-etiqueta').value = '';
                            mostrarNotificacion({
                                message: 'Etiqueta agregada correctamente',
                                type: 'success',
                                duration: 3000
                            });
                        }
                    } catch (error) {
                        mostrarNotificacion({
                            message: error.message,
                            type: 'error',
                            duration: 3500
                        });
                    } finally {
                        ocultarCarga('.carga-procesar')
                    }
                }
            });
            etiquetasActuales.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-quitar-etiqueta')) {
                    try {
                        mostrarCarga('.carga-procesar')
                        const etiquetaItem = e.target.closest('.etiqueta-item');
                        const etiquetaId = etiquetaItem.dataset.id;
                        // Obtener el nombre de la etiqueta eliminada
                        const etiquetaEliminada = etiquetaItem.querySelector('span').textContent.trim();

                        const response = await fetch(`/eliminar-etiqueta/${etiquetaId}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok) throw new Error('Error al eliminar etiqueta');

                        const data = await response.json();
                        if (data.success) {
                            // Eliminar la etiqueta de todos los productos que la contengan
                            let productosModificados = 0;
                            for (const producto of productos) {
                                if (producto.etiquetas && producto.etiquetas.includes(etiquetaEliminada)) {
                                    // Quitar la etiqueta del string
                                    const nuevasEtiquetas = producto.etiquetas
                                        .split(';')
                                        .map(e => e.trim())
                                        .filter(e => e && e !== etiquetaEliminada)
                                        .join(';');
                                    if (nuevasEtiquetas !== producto.etiquetas) {
                                        productosModificados++;
                                        // Enviar todos los campos relevantes del producto para evitar borrar otros datos
                                        const body = {
                                            producto: producto.producto,
                                            gramos: producto.gramos,
                                            stock: producto.stock,
                                            cantidadxgrupo: producto.cantidadxgrupo,
                                            lista: producto.lista,
                                            codigo_barras: producto.codigo_barras,
                                            etiquetas: nuevasEtiquetas,
                                            precios: producto.precios,
                                            uSueltas: producto.uSueltas,
                                            alm_acopio_id: producto.acopio_id || producto.alm_acopio_id || '',
                                            alm_acopio_producto: producto.alm_acopio_producto || '',
                                            motivo: 'Eliminación de etiqueta global'
                                        };
                                        await fetch(`/actualizar-producto/${producto.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(body)
                                        });
                                    }
                                }
                            }
                            await obtenerEtiquetas();
                            await obtenerAlmacenGeneral();
                            updateHTMLWithData();
                            gestionarEtiquetas();
                            mostrarNotificacion({
                                message: 'Etiqueta eliminada correctamente' + (productosModificados ? ` y eliminada de ${productosModificados} productos` : ''),
                                type: 'success',
                                duration: 3000
                            });
                        }
                    } catch (error) {
                        mostrarNotificacion({
                            message: error.message,
                            type: 'error',
                            duration: 3500
                        });
                    } finally {
                        ocultarCarga('.carga-procesar')
                    }
                }
            });
        }
        function gestionarPrecios() {
            const preciosActuales = precios.map(precio => `
                <div class="precio-item" data-id="${precio.id}">
                    <i class='bx bx-dollar'></i>
                    <span>${precio.precio}</span>
                    <button class="btn-eliminar-precio"><i class='bx bx-x'></i></button>
                </div>
            `).join('');

            const contenido = document.querySelector('.anuncio-second .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Gestionar precios</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno">
                    <p class="normal">Precios actuales</p>
                    <div class="precios-container">
                        <div class="precios-actuales">
                        ${preciosActuales}
                        </div>
                    </div>

                    <p class="normal">Agregar nuevo precio</p>
                    <div class="entrada">
                        <i class='bx bx-dollar'></i>
                        <div class="input">
                            <p class="detalle">Nuevo precio</p>
                            <input class="nuevo-precio" type="text" autocomplete="off" placeholder=" " required>
                            <button class="btn-agregar-precio"><i class='bx bx-plus'></i></button>
                        </div>
                    </div>
                    <p class="normal">Actualización de precios</p>
                    <div class="campo-horizontal">
                        <buttom class="btn blue" id="excel-precios"><i class='bx bx-upload' style="color:white !important"></i>Subir excel</buttom>
                        <buttom class="btn blue" id="hoja-vinculada"><i class='bx bx-refresh' style="color:white !important"></i>Vincular hoja</buttom>
                    </div>
                    
                </div>
            `;

            contenido.innerHTML = registrationHTML;
            mostrarAnuncioSecond();

            // Event listeners
            const btnAgregarPrecio = contenido.querySelector('.btn-agregar-precio');
            btnAgregarPrecio.addEventListener('click', async () => {
                const nuevoPrecioInput = document.querySelector('.nuevo-precio');
                const nuevoPrecio = nuevoPrecioInput.value.trim();

                if (!nuevoPrecio) {
                    mostrarNotificacion({
                        message: 'Debe ingresar un precio',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga('.carga-procesar')
                    const response = await fetch('/agregar-precio', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ precio: nuevoPrecio })
                    });

                    const data = await response.json();

                    if (data.success) {
                        await obtenerPrecios();
                        updateHTMLWithData();
                        gestionarPrecios();
                        nuevoPrecioInput.value = '';

                        mostrarNotificacion({
                            message: 'Precio agregado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                    } else {
                        throw new Error(data.error || 'Error al agregar el precio');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al agregar el precio',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar')
                }
            });
            const inputExcel = contenido.querySelector('#excel-precios');
            let file = null;



            inputExcel.addEventListener('click', () => {
                // Crear un nuevo input temporal
                const tempInput = document.createElement('input');
                tempInput.type = 'file';
                tempInput.accept = '.xlsx,.xls';

                // Cuando se seleccione un archivo
                tempInput.addEventListener('change', (e) => {
                    file = e.target.files[0];
                    actualizarPlanilla(file.name);
                });

                // Simular click en el input temporal
                tempInput.click();
            });

            async function actualizarPlanilla(fileName = '') {
                const contenido = document.querySelector('.anuncio-tercer .contenido');
                const registrationHTML = `
                    <div class="encabezado">
                        <h1 class="titulo">Subir planilla de precios</h1>
                        <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                    </div>
                    <div class="relleno">
                        <p class="normal">Archivo seleccionado</p>
                        <div class="archivo-info">
                            <i class='bx bx-file'></i>
                            <span style="color: gray; font-size: 12px">${fileName}</span>
                        </div>

                        <p class="normal">Motivo de la actualización</p>
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
                                <p>Esta acción actualizará los precios de los productos según la planilla. Asegúrese de que el formato sea correcto.</p>
                            </div>
                        </div>
                    </div>
                    <div class="anuncio-botones">
                        <button class="btn-procesar-planilla btn blue"><i class="bx bx-check"></i> Procesar planilla</button>
                    </div>
                `;

                contenido.innerHTML = registrationHTML;
                contenido.style.paddingBottom = '70px';

                mostrarAnuncioTercer();

                // Modifica la parte del frontend donde registras la notificación
                const btnProcesar = contenido.querySelector('.btn-procesar-planilla');
                btnProcesar.addEventListener('click', async () => {
                    const motivo = contenido.querySelector('.motivo').value.trim();
                    if (!motivo) {
                        mostrarNotificacion({
                            message: 'Debe ingresar un motivo',
                            type: 'warning',
                            duration: 3500
                        });
                        return;
                    }

                    try {
                        mostrarCarga('.carga-procesar')
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('motivo', motivo);

                        const response = await fetch('/actualizar-precios-planilla', {
                            method: 'POST',
                            body: formData
                        });

                        const data = await response.json();

                        if (data.success) {
                            mostrarNotificacion({
                                message: 'Precios actualizados correctamente',
                                type: 'success',
                                duration: 3000
                            });
                            registrarNotificacion(
                                'Administración',
                                'Edición',
                                `${usuarioInfo.nombre} actualizó los precios mediante planilla. Motivo: ${motivo}`
                            );
                            await mostrarAlmacenGeneral();
                        } else {
                            throw new Error(data.error || 'Error al procesar la planilla');
                        }
                    } catch (error) {
                        mostrarNotificacion({
                            message: error.message,
                            type: 'error',
                            duration: 3500
                        });
                    } finally {
                        ocultarCarga('.carga-procesar')
                    }
                });

            };
            contenido.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-eliminar-precio')) {
                    const precioItem = e.target.closest('.precio-item');
                    const precioId = precioItem.dataset.id;

                    try {
                        mostrarCarga('.carga-procesar')
                        const response = await fetch(`/eliminar-precio/${precioId}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok) {
                            throw new Error('Error al eliminar el precio');
                        }

                        const data = await response.json();

                        if (data.success) {
                            await obtenerPrecios();
                            updateHTMLWithData();
                            gestionarPrecios();
                            precioItem.remove();
                            mostrarNotificacion({
                                message: 'Precio eliminado correctamente',
                                type: 'success',
                                duration: 3000
                            });
                        } else {
                            throw new Error(data.error || 'Error al eliminar el precio');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        mostrarNotificacion({
                            message: error.message || 'Error al eliminar el precio',
                            type: 'error',
                            duration: 3500
                        });
                    } finally {
                        ocultarCarga('.carga-procesar')
                    }
                }
            });

            const btnHojaVinculada = contenido.querySelector('#hoja-vinculada');
            btnHojaVinculada.addEventListener('click', async () => {
                const contenidoTercer = document.querySelector('.anuncio-tercer .contenido');
                const registrationHTML = `
                    <div class="encabezado">
                        <h1 class="titulo">Actualizar desde hoja vinculada</h1>
                        <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                    </div>
                    <div class="relleno">
                        <p class="normal">Motivo de la actualización</p>
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
                                <p>Esta acción actualizará los precios de los productos según la hoja vinculada de Google Sheets (CATALOGO). Asegúrese de que el formato sea correcto (ID,Producto,Precios...etc).</p>
                            </div>
                        </div>
                    </div>
                    <div class="anuncio-botones">
                        <button class="btn-procesar-hoja btn blue"><i class="bx bx-check"></i> Procesar hoja vinculada</button>
                    </div>
                `;
                contenidoTercer.innerHTML = registrationHTML;
                contenidoTercer.style.paddingBottom = '70px';
                mostrarAnuncioTercer();

                const btnProcesar = contenidoTercer.querySelector('.btn-procesar-hoja');
                btnProcesar.addEventListener('click', async () => {
                    const motivo = contenidoTercer.querySelector('.motivo').value.trim();
                    if (!motivo) {
                        mostrarNotificacion({
                            message: 'Debe ingresar un motivo',
                            type: 'warning',
                            duration: 3500
                        });
                        return;
                    }
                    try {
                        mostrarCarga('.carga-procesar')
                        const response = await fetch('/actualizar-precios-hoja-vinculada', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ motivo })
                        });
                        const data = await response.json();
                        if (data.success) {
                            mostrarNotificacion({
                                message: 'Precios actualizados correctamente desde hoja vinculada',
                                type: 'success',
                                duration: 3000
                            });
                            registrarNotificacion(
                                'Administración',
                                'Edición',
                                `${usuarioInfo.nombre} actualizó los precios mediante hoja vinculada. Motivo: ${motivo}`
                            );
                            await mostrarAlmacenGeneral();
                        } else {
                            throw new Error(data.error || 'Error al procesar la hoja vinculada');
                        }
                    } catch (error) {
                        mostrarNotificacion({
                            message: error.message,
                            type: 'error',
                            duration: 3500
                        });
                    } finally {
                        ocultarCarga('.carga-procesar');
                    }
                });
            });

        }
    } else if (tipoEvento === 'conteo') {
        const vistaPrevia = document.querySelectorAll('.vista-previa');

        document.querySelectorAll('.stock-fisico').forEach(input => {
            input.addEventListener('change', (e) => {
                const productoId = e.target.closest('.registro-item').dataset.id;
                const nuevoValor = parseInt(e.target.value);

                // Obtener datos existentes o crear nuevo objeto
                let stockFisico = JSON.parse(localStorage.getItem('damabrava_stock_fisico') || '{}');

                // Actualizar valor
                stockFisico[productoId] = nuevoValor;

                // Guardar en localStorage
                localStorage.setItem('damabrava_stock_fisico', JSON.stringify(stockFisico));
            });
        });
        const stockGuardado = JSON.parse(localStorage.getItem('damabrava_stock_fisico') || '{}');
        Object.entries(stockGuardado).forEach(([id, valor]) => {
            const input = document.querySelector(`.registro-item[data-id="${id}"] .stock-fisico`);
            if (input) {
                input.value = valor;
            }
        });
        vistaPrevia.forEach(btn => {
            btn.addEventListener('click', vistaPreviaConteo);
        })
        function vistaPreviaConteo() {
            const stockFisico = JSON.parse(localStorage.getItem('damabrava_stock_fisico') || '{}');
            const contenido = document.querySelector('.anuncio-second .contenido');

            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Vista Previa del Conteo</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno">
                    <p class="normal">Resumen del conteo</p>
                    ${productos
                        .map(producto => {
                            const stockActual = parseInt(producto.stock);
                            const stockContado = parseInt(stockFisico[producto.id] || producto.stock);
                            const diferencia = stockContado - stockActual;
                            const colorDiferencia = diferencia > 0 ? '#4CAF50' : diferencia < 0 ? '#f44336' : '#2196F3';
                            // Mostrar solo si la diferencia es distinta de 0
                            if (diferencia === 0) return '';
                            return `
                            <div class="campo-vertical">
                                <span><strong><i class='bx bx-package'></i> Producto:</strong> ${producto.producto} - ${producto.gramos}gr.</span>
                                <div style="display: flex; justify-content: space-between; margin-top: 5px; gap:5px">
                                    <span><strong><i class='bx bx-box'></i> Sistema: ${stockActual}</strong> </span>
                                    <span><strong><i class='bx bx-calculator'></i> Fisico: ${stockContado}</strong> </span>
                                    <span style="color: ${colorDiferencia}"><strong><i class='bx bx-transfer'></i> Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia}</strong></span>
                                </div>
                            </div>
                            `;
                        })
                        .join('')}
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones</p>
                            <input class="Observaciones" type="text" placeholder=" " required>
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-label'></i>  
                        <div class="input">
                            <p class="detalle">Nombre del conteo</p>
                            <input class="nombre-conteo" type="text" placeholder=" " required>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button id="registrar-conteo" class="btn orange"><i class='bx bx-save'></i> Registrar</button>
                    <button id="restaurar-conteo" class="btn especial"><i class='bx bx-reset'></i> Restaurar</button>
                </div>
            `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '70px';
            mostrarAnuncioSecond();

            // Agregar evento al botón de registrar
            // Modificar la función del botón registrar en vistaPreviaConteo
            document.getElementById('registrar-conteo').addEventListener('click', async () => {
                try {
                    mostrarCarga('.carga-procesar')
                    const stockFisico = JSON.parse(localStorage.getItem('damabrava_stock_fisico') || '{}');
                    const observaciones = document.querySelector('.Observaciones').value;
                    const nombre = document.querySelector('.nombre-conteo').value;

                    // Preparar los datos en el formato requerido
                    const idProductos = productos.map(p => p.id).join(';');
                    const productosFormateados = productos.map(p => `${p.producto} - ${p.gramos}gr`).join(';');
                    const sistemaCantidades = productos.map(p => p.stock).join(';');
                    const fisicoCantidades = productos.map(p => stockFisico[p.id] || p.stock).join(';');
                    const diferencias = productos.map(p => {
                        const fisico = parseInt(stockFisico[p.id] || p.stock);
                        const sistema = parseInt(p.stock);
                        return fisico - sistema;
                    }).join(';');

                    const response = await fetch('/registrar-conteo', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            nombre: nombre || "Conteo",
                            idProductos: idProductos,
                            productos: productosFormateados,
                            sistema: sistemaCantidades,
                            fisico: fisicoCantidades,
                            diferencia: diferencias,
                            observaciones
                        })

                    });

                    const data = await response.json();

                    if (data.success) {
                        mostrarNotificacion({
                            message: 'Conteo registrado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Creación',
                            usuarioInfo.nombre + ' hizo un nuevo registro de conteo fisico con el nombre de ' + nombre + ' observaciones: ' + observaciones)
                        localStorage.removeItem('damabrava_stock_fisico');
                        cerrarAnuncioManual('anuncioSecond');
                    } else {
                        throw new Error(data.error || 'Error al registrar el conteo');
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
            });
            const restaurarConteo = document.getElementById('restaurar-conteo');
            restaurarConteo.addEventListener('click', restaurarConteoAlmacen);
            function restaurarConteoAlmacen() {
                // Mostrar confirmación antes de restaurar

                // Limpiar el localStorage
                localStorage.removeItem('damabrava_stock_fisico');

                // Restaurar todos los inputs al valor original del stock
                document.querySelectorAll('.registro-item').forEach(registro => {
                    const productoId = registro.dataset.id;
                    const producto = productos.find(p => p.id === productoId);
                    const input = registro.querySelector('.stock-fisico');

                    if (producto && input) {
                        input.value = producto.stock;
                    }
                });

                // Mostrar notificación de éxito
                mostrarNotificacion({
                    message: 'Valores restaurados correctamente',
                    type: 'success',
                    duration: 3000
                });
                cerrarAnuncioManual('anuncioSecond');
            }
        }
    } else if (tipoEvento === 'salidas') {
        const botonFlotante = document.querySelector('.btn-flotante-salidas')
        const switchTiraGlobal = document.querySelector('.switch-tira-global');

        if (modoGlobal === null) modoGlobal = true; // Por defecto activo
        else modoGlobal = modoGlobal === "true";    // Convierte a booleano

        switchTiraGlobal.checked = modoGlobal;


        switchTiraGlobal.checked = modoGlobal;
        if (switchTiraGlobal) {
            switchTiraGlobal.addEventListener('change', (e) => {
                modoGlobal = e.target.checked;
                localStorage.setItem("modoGlobal", e.target.checked);

                // 1. Guarda las cantidades actuales
                const cantidadesPrevias = Array.from(carritoSalidas.values()).map(item => ({
                    id: item.id,
                    cantidad: item.cantidad
                }));

                // 2. Limpia el carrito
                carritoSalidas.clear();
                localStorage.setItem('damabrava_carrito', JSON.stringify([]));

                // 3. Vuelve a agregar los productos con las cantidades previas
                for (const { id, cantidad } of cantidadesPrevias) {
                    for (let i = 0; i < cantidad; i++) {
                        agregarAlCarrito(id);
                    }
                }

                // 4. Actualiza la UI del carrito si está abierto
                const anuncioSecond = document.querySelector('.anuncio-second .contenido');
                if (anuncioSecond && anuncioSecond.innerHTML.includes('Carrito de Salidas')) {
                    mostrarCarritoSalidas();
                }

                mostrarNotificacion({
                    message: modoGlobal ? 'Modo Tira activado' : 'Modo Unidad activado',
                    type: modoGlobal ? 'success' : 'info',
                    duration: 2000
                });
            });
        }
        botonFlotante.addEventListener('click', mostrarCarritoSalidas);
        const items = document.querySelectorAll('.registro-item');

        items.forEach(item => {
            item.addEventListener('click', () => agregarAlCarrito(item.dataset.id));
        });



        function agregarAlCarrito(productoId) {
            const producto = productos.find(p => p.id === productoId);
            if (!producto) return;

            // Si no hay stock, no agregues
            if (producto.stock <= 0) {
                mostrarNotificacion({
                    message: 'Sin stock disponible',
                    type: 'warning',
                    duration: 2000
                });
                return;
            }

            // Calcula el precio actual según el modo y ciudad seleccionada
            const cantidadxgrupo = producto.cantidadxgrupo || 1;
            const selectPrecios = document.querySelector('.precios-select');
            const ciudadSeleccionada = selectPrecios.options[selectPrecios.selectedIndex]?.text || '';
            const preciosProducto = producto.precios.split(';');
            const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
            const precioActual = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;
            const precioFinal = modoGlobal ? precioActual * cantidadxgrupo : precioActual;
            const stockDisponible = modoGlobal ? producto.stock : producto.stock * cantidadxgrupo;

            // Si ya está en el carrito, suma 1 (si hay stock suficiente)
            if (carritoSalidas.has(productoId)) {
                const item = carritoSalidas.get(productoId);
                if (item.cantidad < stockDisponible) {
                    item.cantidad += 1;
                    item.subtotal = precioFinal;
                }
            } else {
                carritoSalidas.set(productoId, {
                    ...producto,
                    cantidad: 1,
                    stockFinal: stockDisponible,
                    subtotal: precioFinal
                });
            }

            // Guarda en localStorage
            localStorage.setItem('damabrava_carrito', JSON.stringify(Array.from(carritoSalidas.entries())));

            // Muestra el botón flotante si hay productos
            const botonFlotante = document.querySelector('.btn-flotante-salidas');
            if (botonFlotante) {
                botonFlotante.style.display = carritoSalidas.size > 0 ? 'block' : 'none';
            }

            // Si el carrito está abierto, refresca el HTML del carrito
            const anuncioSecond = document.querySelector('.anuncio-second .contenido');
            if (anuncioSecond && anuncioSecond.innerHTML.includes('Carrito de Salidas')) {
                mostrarCarritoSalidas();
            }
            actualizarBotonFlotante();
            const itemDiv = document.querySelector(`.registro-item[data-id="${productoId}"]`);
            if (itemDiv) {
                itemDiv.classList.add('disabled');
            }
        }
        window.eliminarDelCarrito = (id) => {
            // 1. Eliminar del Map
            carritoSalidas.delete(id);

            // 2. Eliminar del DOM
            const itemToRemove = document.querySelector(`.carrito-item[data-id="${id}"]`);
            if (itemToRemove) {
                itemToRemove.remove();
            }

            // 3. Actualizar localStorage
            localStorage.setItem('damabrava_carrito', JSON.stringify(Array.from(carritoSalidas.entries())));

            // 4. Actualizar el botón flotante
            const botonFlotante = document.querySelector('.btn-flotante-salidas');
            if (botonFlotante) {
                botonFlotante.style.display = carritoSalidas.size > 0 ? 'block' : 'none';
            }

            // 5. Actualizar totales del carrito
            actualizarTotalesCarrito();
            actualizarBotonFlotante();

            if (carritoSalidas.size < 1) {
                ocultarAnuncioSecond();
            }
            // Si ya no está en el carrito, quita la clase disabled
            const itemDiv = document.querySelector(`.registro-item[data-id="${id}"]`);
            if (itemDiv) {
                itemDiv.classList.remove('disabled');
            }
        };
        function actualizarTotalesCarrito() {
            const subtotal = Array.from(carritoSalidas.values()).reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0);
            const totalElement = document.querySelector('.total-final');
            const subtotalElement = document.querySelector('.campo-vertical span:first-child');
            if (subtotalElement && totalElement) {
                subtotalElement.innerHTML = `<strong>Subtotal: </strong>Bs. ${subtotal.toFixed(2)}`;
                totalElement.innerHTML = `<strong>Total Final: </strong>Bs. ${subtotal.toFixed(2)}`;
                const descuentoInput = document.querySelector('.descuento');
                const aumentoInput = document.querySelector('.aumento');
                if (descuentoInput && aumentoInput) {
                    const descuentoValor = parseFloat(descuentoInput.value) || 0;
                    const aumentoValor = parseFloat(aumentoInput.value) || 0;
                    const totalCalculado = subtotal - descuentoValor + aumentoValor;
                    totalElement.innerHTML = `<strong>Total Final: </strong>Bs. ${totalCalculado.toFixed(2)}`;
                }
            }
        }
        window.ajustarCantidad = (id, delta) => {
            const item = carritoSalidas.get(id);
            if (!item) return;

            // Lógica de stock máximo y mínimo
            const min = 1;
            const max = item.stockFinal || item.stock || 1;
            let nuevaCantidad = item.cantidad + delta;
            if (nuevaCantidad < min) nuevaCantidad = min;
            if (nuevaCantidad > max) nuevaCantidad = max;

            if (nuevaCantidad === item.cantidad) return; // No hay cambio

            item.cantidad = nuevaCantidad;

            // Actualiza el subtotal si es necesario (por si el precio depende de la cantidad)
            // item.subtotal = ... (si tu lógica lo requiere, normalmente no cambia)

            // Actualiza el localStorage
            localStorage.setItem('damabrava_carrito', JSON.stringify(Array.from(carritoSalidas.entries())));

            // Solo actualiza los valores del DOM de ese producto
            const itemDiv = document.querySelector(`.carrito-item[data-id="${id}"]`);
            if (itemDiv) {
                // Actualiza el input de cantidad
                const input = itemDiv.querySelector('input[type="number"]');
                if (input) input.value = item.cantidad;

                // Actualiza el stock disponible
                const stockDisponible = (item.stockFinal || item.stock || 1) - item.cantidad;
                const stockSpan = itemDiv.querySelector('.stock-disponible');
                if (stockSpan) stockSpan.textContent = `${stockDisponible} Und.`;

                // Actualiza el subtotal y total de ese producto
                const unitario = itemDiv.querySelector('.unitario');
                if (unitario) unitario.textContent = `Bs. ${(item.subtotal).toFixed(2)}`;
                const subtotal = itemDiv.querySelector('.subtotal');
                if (subtotal) subtotal.textContent = `Bs. ${(item.cantidad * item.subtotal).toFixed(2)}`;
            }

            // Actualiza los totales generales del carrito
            actualizarTotalesCarrito();
        };
        function actualizarBotonFlotante() {
            const botonFlotante = document.querySelector('.btn-flotante-salidas');
            const spanCantidad = botonFlotante ? botonFlotante.querySelector('.carrito-cantidad-flotante') : null;
            const cantidad = carritoSalidas.size;

            if (botonFlotante) {
                botonFlotante.style.display = cantidad > 0 ? 'block' : 'none';
                if (spanCantidad) {
                    spanCantidad.textContent = cantidad;
                    spanCantidad.style.display = cantidad > 0 ? 'inline-block' : 'none';
                }
            }
        }
        function marcarItemsAgregadosAlCarrito() {
            document.querySelectorAll('.registro-item').forEach(itemDiv => {
                const id = itemDiv.dataset.id;
                if (carritoSalidas.has(id)) {
                    itemDiv.classList.add('disabled');
                } else {
                    itemDiv.classList.remove('disabled');
                }
            });
        }




        function mostrarCarritoSalidas() {
            const anuncioSecond = document.querySelector('.anuncio-second .contenido');
            if (!anuncioSecond) return;

            const subtotal = Array.from(carritoSalidas.values()).reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0);
            let descuento = 0;
            let aumento = 0;

            anuncioSecond.innerHTML = `
            <div class="encabezado">
                <h1 class="titulo">Carrito de Salidas</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
                <button class="btn filtros limpiar"><i class="fas fa-broom"></i></button>
            </div>
            <div class="relleno">
                <div class="carrito-items">
                    ${Array.from(carritoSalidas.values()).map(item => `
                        <div class="carrito-item" data-id="${item.id}">
                            <div class="item-info">
                                <h3>${item.producto} - ${item.gramos}gr</h3>
                                <div class="cantidad-control">
                                    <button class="btn-cantidad" style="color:var(--error)" onclick="ajustarCantidad('${item.id}', -1)">-</button>
                                    <input type="number" value="${item.cantidad}" min="1" max="${item.stockFinal || item.stock}" onchange="ajustarCantidad('${item.id}', this.value - ${item.cantidad})">
                                    <button class="btn-cantidad"style="color:var(--success)" onclick="ajustarCantidad('${item.id}', 1)">+</button>
                                </div>
                            </div>
                            <div class="subtotal-delete">
                                <div class="info-valores">
                                    <p class="stock-disponible">${item.stockFinal - item.cantidad} Und.</p>
                                    <p class="unitario">Bs. ${(item.subtotal).toFixed(2)}</p>
                                    <p class="subtotal">Bs. ${(item.cantidad * item.subtotal).toFixed(2)}</p>
                                </div>
                                <button class="btn-eliminar" onclick="eliminarDelCarrito('${item.id}')">
                                    <i class="bx bx-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    <div class="carrito-total">
                        <div class="leyenda">
                            <div class="item">
                                <span class="punto orange"></span>
                                <p>Stock actual</p>
                            </div>
                            <div class="item">
                                <span class="punto blue-light"></span>
                                <p>Precio unitario</p>
                            </div>
                            <div class="item">
                                <span class="punto verde"></span>
                                <p>Subtotal</p>
                            </div>
                        </div>
                        <div class="campo-vertical">
                            <span><strong>Subtotal: </strong>Bs. ${subtotal.toFixed(2)}</span>
                            <span class="total-final"><strong>Total Final: </strong>Bs. ${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-label'></i>
                            <div class="input">
                                <p class="detalle">Nombre del movimiento</p>
                                <input class="nombre-movimiento" type="text" value="NOTA DE ENTREGA" autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                        <div class="campo-horizontal">
                            <div class="entrada">
                                <i class='bx bx-purchase-tag-alt'></i>
                                <div class="input">
                                    <p class="detalle">Descuento</p>
                                    <input class="descuento" type="number" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                            <div class="entrada">
                                <i class='bx bx-plus'></i>
                                <div class="input">
                                    <p class="detalle">Aumento</p>
                                    <input class="aumento" type="number" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                        </div>
                        <div class="campo-horizontal">
                            <div class="entrada">
                                <i class='bx bx-user'></i>
                                <div class="input">
                                    <p class="detalle">Cliente</p>
                                    <select class="select-cliente" required>
                                        <option value=""></option>
                                        ${clientes.map(cliente => `
                                            <option value="${cliente.id}">${cliente.nombre}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="entrada">
                                <i class='bx bx-money'></i>
                                <div class="input">
                                    <p class="detalle">Estado</p>
                                    <select class="select" required>
                                        <option value="" disabled selected></option>
                                        <option value="pagado">Pagado</option>
                                        <option value="no-pagado">No pagado</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-comment-detail'></i>
                            <div class="input">
                                <p class="detalle">Observaciones</p>
                                <input class="observaciones" type="text" autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-procesar-salida btn green" onclick="registrarSalida()"><i class='bx bx-export'></i> Procesar Salida</button>
            </div>
        `;
            anuncioSecond.style.paddingBottom = '70px'
            mostrarAnuncioSecond();

            const clienteSelect = anuncioSecond.querySelector('.select-cliente');
            const nombreMovimientoInput = anuncioSecond.querySelector('.nombre-movimiento');

            if (clienteSelect && nombreMovimientoInput) {
                clienteSelect.addEventListener('change', function () {
                    const clienteId = clienteSelect.value; // El value es solo el id

                    // Buscar el cliente en tu array de clientes
                    const cliente = clientes.find(c => String(c.id) === String(clienteId));
                    if (cliente && cliente.salidas_num !== undefined) {
                        // Sumar uno al número de salida
                        const nuevoNum = Number(cliente.salidas_num) + 1;
                        nombreMovimientoInput.value = `NOTA DE ENTREGA Nº ${nuevoNum}`;
                    } else {
                        nombreMovimientoInput.value = '';
                    }
                });
            }



            const botonLimpiar = anuncioSecond.querySelector('.btn.filtros.limpiar');
            botonLimpiar.addEventListener('click', () => {

                carritoSalidas.forEach((item, id) => {
                    const headerItem = document.querySelector(`.registro-item[data-id="${id}"]`);
                    if (headerItem) {
                        const cantidadSpan = headerItem.querySelector('.carrito-cantidad');
                        const stockSpan = headerItem.querySelector('.stock');
                        if (cantidadSpan) cantidadSpan.textContent = '';
                        if (stockSpan) stockSpan.textContent = `${item.stock} Und.`;
                    }
                });

                carritoSalidas.clear();
                ocultarAnuncioSecond();
                marcarItemsAgregadosAlCarrito();
                mostrarNotificacion({
                    message: 'Carrito limpiado exitosamente',
                    type: 'success',
                    duration: 2000
                });
                document.querySelector('.btn-flotante-salidas').style.display = 'none';
            });
        }
        async function registrarSalida() {
            const clienteSelect = document.querySelector('.select-cliente');
            const nombreMovimiento = document.querySelector('.nombre-movimiento');
            const estadoSelect = document.querySelector('.select');  // Nuevo
            const observacionesValor = document.querySelector('.observaciones').value;

            if (!clienteSelect.value) {
                mostrarNotificacion({
                    message: 'Seleccione un cliente antes de continuar',
                    type: 'error',
                    duration: 3000
                });
                return;
            } else if (!nombreMovimiento.value) {
                mostrarNotificacion({
                    message: 'Ingrese un nombre para el movimiento',
                    type: 'error',
                    duration: 3000
                });
                return;
            }
            const fecha = new Date().toLocaleString('es-ES', {
                timeZone: 'America/La_Paz' // Puedes cambiar esto según tu país o ciudad
            });

            // --- NUEVO: Calcular tiras y sueltas para cada producto si aplica ---
            let actualizacionesStock = [];
            let productosSalida = [];
            let cantidadesSalida = [];
            let tirasSalida = [];
            let sueltasSalida = [];
            let preciosUnitariosSalida = [];
            let subtotalSalida = 0;

            carritoSalidas.forEach((item, id) => {
                let cantidad = item.cantidad; // Esta es la cantidad de tiras o unidades dependiendo del modo al agregar
                let cantidadxgrupo = item.cantidadxgrupo ? parseInt(item.cantidadxgrupo) : 1;

                // Si el modo es tira, la cantidad es en tiras.
                // Si el modo es unidad, la cantidad es en unidades, y hay que ver a cuantas tiras y sueltas corresponde.
                let tirasParaRestar = 0;
                let sueltasParaRestar = 0;
                let sueltasParaSumar = 0;

                if (modoGlobal) { // La cantidad es en Tiras
                    tirasParaRestar = cantidad;
                } else { // La cantidad es en Unidades
                    const productoAlmacen = productos.find(p => p.id === id);
                    let stockSueltasActual = productoAlmacen.uSueltas || 0;

                    if (cantidad <= stockSueltasActual) { // Se pueden despachar solo de sueltas
                        sueltasParaRestar = cantidad;
                    } else { // Se necesita abrir tiras
                        sueltasParaRestar = stockSueltasActual;
                        let unidadesFaltantes = cantidad - stockSueltasActual;
                        tirasParaRestar = Math.ceil(unidadesFaltantes / cantidadxgrupo);
                        let unidadesDeTirasAbiertas = tirasParaRestar * cantidadxgrupo;
                        sueltasParaSumar = unidadesDeTirasAbiertas - unidadesFaltantes;
                    }
                }

                actualizacionesStock.push({
                    id: id,
                    cantidad: tirasParaRestar,
                    restarSueltas: sueltasParaRestar,
                    sumarSueltas: sueltasParaSumar
                });

                productosSalida.push(`${item.producto} - ${item.gramos}gr`);
                cantidadesSalida.push(cantidad);
                tirasSalida.push(tirasParaRestar);
                sueltasSalida.push(sueltasParaRestar > 0 ? sueltasParaRestar : 0);
                preciosUnitariosSalida.push(parseFloat(item.subtotal).toFixed(2));
                subtotalSalida += cantidad * item.subtotal;
            });

            const tipoMovimiento = modoGlobal ? 'Tiras' : 'Unidades';
            const registroSalida = {
                fechaHora: fecha,
                tipo: 'Salida',
                idProductos: Array.from(carritoSalidas.values()).map(item => item.id).join(';'),
                productos: productosSalida.join(';'),
                cantidades: cantidadesSalida.join(';'),
                tiras: tirasSalida.join(';'), // Nuevo campo
                sueltas: sueltasSalida.join(';'), // Nuevo campo
                operario: `${usuarioInfo.nombre} ${usuarioInfo.apellido}`,
                clienteId: clienteSelect.value,
                nombre_movimiento: nombreMovimiento.value,
                subtotal: subtotalSalida,
                descuento: parseFloat(document.querySelector('.descuento').value) || 0,
                aumento: parseFloat(document.querySelector('.aumento').value) || 0,
                total: 0,
                observaciones: document.querySelector('.observaciones').value || 'Ninguna',
                precios_unitarios: preciosUnitariosSalida.join(';'),
                estado: estadoSelect.value,
                tipoMovimiento // Nuevo campo para backend
            };
            registroSalida.total = registroSalida.subtotal - registroSalida.descuento + registroSalida.aumento;

            try {
                mostrarCarga('.carga-procesar')
                // Primero registramos el movimiento
                const response = await fetch('/registrar-movimiento', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('damabrava_token')}`
                    },
                    body: JSON.stringify(registroSalida)
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Error en la respuesta del servidor');
                }

                // --- NUEVO: Actualizar el stock en Almacen general considerando sueltas ---
                const responseStock = await fetch('/actualizar-stock', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('damabrava_token')}`
                    },
                    body: JSON.stringify({
                        actualizaciones: actualizacionesStock,
                        tipo: 'salida'
                    })
                });

                const dataStock = await responseStock.json();

                if (!responseStock.ok || !dataStock.success) {
                    throw new Error(dataStock.error || 'Error al actualizar el stock');
                }

                // Limpiar carrito y actualizar UI
                carritoSalidas.clear();
                await obtenerClientes()
                await obtenerAlmacenGeneral()
                document.querySelector('.btn-flotante-salidas').style.display = 'none';
                ocultarAnuncioSecond();

                mostrarNotificacion({
                    message: 'Salida registrada exitosamente',
                    type: 'success',
                    duration: 3000
                });
                if (observacionesValor !== '') {
                    registrarNotificacion(
                        'Administración',
                        'Creación',
                        usuarioInfo.nombre + ' registro una salida al almacen de: ' + clienteSelect.value + ' Observaciones: ' + observacionesValor)
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
        window.registrarSalida = registrarSalida;
        actualizarBotonFlotante();
        marcarItemsAgregadosAlCarrito();
    } else if (tipoEvento === 'ingresos') {
        const botonFlotanteIngresos = document.querySelector('.btn-flotante-ingresos')
        const switchTiraGlobal = document.querySelector('.switch-tira-global');

        if (modoGlobal === null) modoGlobal = true; // Por defecto activo
        else modoGlobal = modoGlobal === "true";    // Convierte a booleano

        switchTiraGlobal.checked = modoGlobal;


        switchTiraGlobal.checked = modoGlobal;
        if (switchTiraGlobal) {
            switchTiraGlobal.addEventListener('change', (e) => {
                modoGlobal = e.target.checked;
                localStorage.setItem("modoGlobal", e.target.checked);

                // 1. Guarda las cantidades actuales
                const cantidadesPrevias = Array.from(carritoIngresos.values()).map(item => ({
                    id: item.id,
                    cantidad: item.cantidad
                }));

                // 2. Limpia el carrito
                carritoIngresos.clear();
                localStorage.setItem('damabrava_carrito', JSON.stringify([]));

                // 3. Vuelve a agregar los productos con las cantidades previas
                for (const { id, cantidad } of cantidadesPrevias) {
                    for (let i = 0; i < cantidad; i++) {
                        agregarAlCarrito(id);
                    }
                }

                // 4. Actualiza la UI del carrito si está abierto
                const anuncioSecond = document.querySelector('.anuncio-second .contenido');
                if (anuncioSecond && anuncioSecond.innerHTML.includes('Carrito de Salidas')) {
                    mostrarCarritoSalidas();
                }

                mostrarNotificacion({
                    message: modoGlobal ? 'Modo Tira activado' : 'Modo Unidad activado',
                    type: modoGlobal ? 'success' : 'info',
                    duration: 2000
                });
            });
        }
        botonFlotanteIngresos.addEventListener('click', mostrarCarritoIngresos);
        const items = document.querySelectorAll('.registro-item');

        items.forEach(item => {
            item.addEventListener('click', () => agregarAlCarrito(item.dataset.id));
        });



        function agregarAlCarrito(productoId) {
            const producto = productos.find(p => p.id === productoId);
            if (!producto) return;

            // Calcula el precio actual según el modo y ciudad seleccionada
            const cantidadxgrupo = producto.cantidadxgrupo || 1;
            const selectPrecios = document.querySelector('.precios-select');
            const ciudadSeleccionada = selectPrecios.options[selectPrecios.selectedIndex]?.text || '';
            const preciosProducto = producto.precios.split(';');
            const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
            const precioActual = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;
            const precioFinal = modoGlobal ? precioActual * cantidadxgrupo : precioActual;
            const stockDisponible = modoGlobal ? producto.stock : producto.stock * cantidadxgrupo;

            // Si ya está en el carrito, suma 1 (si hay stock suficiente)
            if (carritoIngresos.has(productoId)) {
                const item = carritoIngresos.get(productoId);
                if (item.cantidad < stockDisponible) {
                    item.cantidad += 1;
                    item.subtotal = precioFinal;
                }
            } else {
                carritoIngresos.set(productoId, {
                    ...producto,
                    cantidad: 1,
                    stockFinal: stockDisponible,
                    subtotal: precioFinal
                });
            }

            // Guarda en localStorage
            localStorage.setItem('damabrava_carrito_ingresos', JSON.stringify(Array.from(carritoIngresos.entries())));

            // Muestra el botón flotante si hay productos
            const botonFlotante = document.querySelector('.btn-flotante-ingresos');
            if (botonFlotante) {
                botonFlotante.style.display = carritoIngresos.size > 0 ? 'block' : 'none';
            }

            // Si el carrito está abierto, refresca el HTML del carrito
            const anuncioSecond = document.querySelector('.anuncio-second .contenido');
            if (anuncioSecond && anuncioSecond.innerHTML.includes('Carrito de Ingresos')) {
                mostrarCarritoIngresos();
            }
            actualizarBotonFlotante();
            const itemDiv = document.querySelector(`.registro-item[data-id="${productoId}"]`);
            if (itemDiv) {
                itemDiv.classList.add('disabled');
            }
        }
        window.eliminarDelCarrito = (id) => {
            // 1. Eliminar del Map
            carritoIngresos.delete(id);

            // 2. Eliminar del DOM
            const itemToRemove = document.querySelector(`.carrito-item[data-id="${id}"]`);
            if (itemToRemove) {
                itemToRemove.remove();
            }

            // 3. Actualizar localStorage
            localStorage.setItem('damabrava_carrito_ingresos', JSON.stringify(Array.from(carritoIngresos.entries())));

            // 4. Actualizar el botón flotante
            const botonFlotante = document.querySelector('.btn-flotante-ingresos');
            if (botonFlotante) {
                botonFlotante.style.display = carritoIngresos.size > 0 ? 'block' : 'none';
            }

            // 5. Actualizar totales del carrito
            actualizarTotalesCarrito();
            actualizarBotonFlotante();

            if (carritoIngresos.size < 1) {
                ocultarAnuncioSecond();
            }
            // Si ya no está en el carrito, quita la clase disabled
            const itemDiv = document.querySelector(`.registro-item[data-id="${id}"]`);
            if (itemDiv) {
                itemDiv.classList.remove('disabled');
            }
        };
        function actualizarTotalesCarrito() {
            const subtotal = Array.from(carritoIngresos.values()).reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0);
            const totalElement = document.querySelector('.total-final');
            const subtotalElement = document.querySelector('.campo-vertical span:first-child');
            if (subtotalElement && totalElement) {
                subtotalElement.innerHTML = `<strong>Subtotal: </strong>Bs. ${subtotal.toFixed(2)}`;
                totalElement.innerHTML = `<strong>Total Final: </strong>Bs. ${subtotal.toFixed(2)}`;
                const descuentoInput = document.querySelector('.descuento');
                const aumentoInput = document.querySelector('.aumento');
                if (descuentoInput && aumentoInput) {
                    const descuentoValor = parseFloat(descuentoInput.value) || 0;
                    const aumentoValor = parseFloat(aumentoInput.value) || 0;
                    const totalCalculado = subtotal - descuentoValor + aumentoValor;
                    totalElement.innerHTML = `<strong>Total Final: </strong>Bs. ${totalCalculado.toFixed(2)}`;
                }
            }
        }
        window.ajustarCantidad = (id, delta) => {
            const item = carritoIngresos.get(id);
            if (!item) return;

            // Lógica de mínimo (no puede ser menor a 1)
            const min = 1;
            let nuevaCantidad = item.cantidad + delta;
            if (nuevaCantidad < min) nuevaCantidad = min;

            if (nuevaCantidad === item.cantidad) return; // No hay cambio

            item.cantidad = nuevaCantidad;

            // Actualiza el localStorage
            localStorage.setItem('damabrava_carrito_ingresos', JSON.stringify(Array.from(carritoIngresos.entries())));

            // Solo actualiza los valores del DOM de ese producto
            const itemDiv = document.querySelector(`.carrito-item[data-id="${id}"]`);
            if (itemDiv) {
                // Actualiza el input de cantidad
                const input = itemDiv.querySelector('input[type="number"]');
                if (input) input.value = item.cantidad;

                // Actualiza el stock disponible correctamente según el modo
                const stockSpan = itemDiv.querySelector('.stock-disponible');
                const stockActual = Number(item.stock) || 0;
                const cantidadxgrupo = Number(item.cantidadxgrupo) || 1;
                let stockDisponible;
                if (modoGlobal) {
                    stockDisponible = `${stockActual + item.cantidad} Tiras`;
                } else {
                    stockDisponible = `${(stockActual * cantidadxgrupo) + item.cantidad} Unidades`;
                }
                if (stockSpan) stockSpan.textContent = stockDisponible;

                // Actualiza el subtotal y total de ese producto
                const unitario = itemDiv.querySelector('.unitario');
                if (unitario) unitario.textContent = `Bs. ${(item.subtotal).toFixed(2)}`;
                const subtotal = itemDiv.querySelector('.subtotal');
                if (subtotal) subtotal.textContent = `Bs. ${(item.cantidad * item.subtotal).toFixed(2)}`;
            }

            // Actualiza los totales generales del carrito
            actualizarTotalesCarrito();
        };
        function actualizarBotonFlotante() {
            const botonFlotante = document.querySelector('.btn-flotante-ingresos');
            const spanCantidad = botonFlotante ? botonFlotante.querySelector('.carrito-cantidad-flotante') : null;
            const cantidad = carritoIngresos.size;

            if (botonFlotante) {
                botonFlotante.style.display = cantidad > 0 ? 'block' : 'none';
                if (spanCantidad) {
                    spanCantidad.textContent = cantidad;
                    spanCantidad.style.display = cantidad > 0 ? 'inline-block' : 'none';
                }
            }
        }
        function marcarItemsAgregadosAlCarrito() {
            document.querySelectorAll('.registro-item').forEach(itemDiv => {
                const id = itemDiv.dataset.id;
                if (carritoIngresos.has(id)) {
                    itemDiv.classList.add('disabled');
                } else {
                    itemDiv.classList.remove('disabled');
                }
            });
        }
        function mostrarCarritoIngresos() {
            const anuncioSecond = document.querySelector('.anuncio-second .contenido');
            if (!anuncioSecond) return;

            const subtotal = Array.from(carritoIngresos.values()).reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0);
            let descuento = 0;
            let aumento = 0;

            anuncioSecond.innerHTML = `
            <div class="encabezado">
                <h1 class="titulo">Carrito de Ingresos</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
                <button class="btn filtros limpiar"><i class="fas fa-broom"></i></button>
            </div>
            <div class="relleno">
                <div class="carrito-items">
                    ${Array.from(carritoIngresos.values()).map(item => `
                        <div class="carrito-item" data-id="${item.id}">
                            <div class="item-info">
                                <h3>${item.producto} - ${item.gramos}gr</h3>
                                <div class="cantidad-control">
                                    <button class="btn-cantidad" style="color:var(--error)" onclick="ajustarCantidad('${item.id}', -1)">-</button>
                                    <input type="number" value="${item.cantidad}" min="1" max="${item.stockFinal || item.stock}" onchange="ajustarCantidad('${item.id}', this.value - ${item.cantidad})">
                                    <button class="btn-cantidad"style="color:var(--success)" onclick="ajustarCantidad('${item.id}', 1)">+</button>
                                </div>
                            </div>
                            <div class="subtotal-delete">
                                <div class="info-valores">
                                    <p class="stock-disponible">${Number(item.stock || 0) + Number(item.cantidad)} Und.</p>
                                    <p class="unitario">Bs. ${(item.subtotal).toFixed(2)}</p>
                                    <p class="subtotal">Bs. ${(item.cantidad * item.subtotal).toFixed(2)}</p>
                                </div>
                                <button class="btn-eliminar" onclick="eliminarDelCarrito('${item.id}')">
                                    <i class="bx bx-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    <div class="carrito-total">
                        <div class="leyenda">
                            <div class="item">
                                <span class="punto orange"></span>
                                <p>Stock actual</p>
                            </div>
                            <div class="item">
                                <span class="punto blue-light"></span>
                                <p>Precio unitario</p>
                            </div>
                            <div class="item">
                                <span class="punto verde"></span>
                                <p>Subtotal</p>
                            </div>
                        </div>
                        <div class="campo-vertical">
                            <span><strong>Subtotal: </strong>Bs. ${subtotal.toFixed(2)}</span>
                            <span class="total-final"><strong>Total Final: </strong>Bs. ${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-label'></i>
                            <div class="input">
                                <p class="detalle">Nombre del movimiento</p>
                                <input class="nombre-movimiento" type="text" value="NOTA DE ENTREGA" autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                        <div class="campo-horizontal">
                            <div class="entrada">
                                <i class='bx bx-purchase-tag-alt'></i>
                                <div class="input">
                                    <p class="detalle">Descuento</p>
                                    <input class="descuento" type="number" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                            <div class="entrada">
                                <i class='bx bx-plus'></i>
                                <div class="input">
                                    <p class="detalle">Aumento</p>
                                    <input class="aumento" type="number" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-user'></i>
                            <div class="input">
                                <p class="detalle">Proveedor</p>
                                <select class="select-cliente" required>
                                    <option value=""></option>
                                    ${clientes.map(cliente => `
                                        <option value="${cliente.id}">${cliente.nombre}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-comment-detail'></i>
                            <div class="input">
                                <p class="detalle">Observaciones</p>
                                <input class="observaciones" type="text" autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-procesar-salida btn green" onclick="registrarIngreso()"><i class='bx bx-export'></i> Procesar Ingreso</button>
            </div>
        `;
            anuncioSecond.style.paddingBottom = '70px'
            mostrarAnuncioSecond();

            const clienteSelect = anuncioSecond.querySelector('.select-cliente');
            const nombreMovimientoInput = anuncioSecond.querySelector('.nombre-movimiento');

            if (clienteSelect && nombreMovimientoInput) {
                clienteSelect.addEventListener('change', function () {
                    const clienteId = clienteSelect.value; // El value es solo el id

                    // Buscar el cliente en tu array de clientes
                    const cliente = clientes.find(c => String(c.id) === String(clienteId));
                    if (cliente && cliente.ingresos_num !== undefined) {
                        // Sumar uno al número de salida
                        const nuevoNum = Number(cliente.ingresos_num) + 1;
                        nombreMovimientoInput.value = `NOTA DE INGRESO Nº ${nuevoNum}`;
                    } else {
                        nombreMovimientoInput.value = '';
                    }
                });
            }



            const botonLimpiar = anuncioSecond.querySelector('.btn.filtros.limpiar');
            botonLimpiar.addEventListener('click', () => {

                carritoIngresos.forEach((item, id) => {
                    const headerItem = document.querySelector(`.registro-item[data-id="${id}"]`);
                    if (headerItem) {
                        const cantidadSpan = headerItem.querySelector('.carrito-cantidad');
                        const stockSpan = headerItem.querySelector('.stock');
                        if (cantidadSpan) cantidadSpan.textContent = '';
                        if (stockSpan) stockSpan.textContent = `${item.stock} Und.`;
                    }
                });

                carritoIngresos.clear();
                ocultarAnuncioSecond();
                marcarItemsAgregadosAlCarrito();
                mostrarNotificacion({
                    message: 'Carrito limpiado exitosamente',
                    type: 'success',
                    duration: 2000
                });
                document.querySelector('.btn-flotante-ingresos').style.display = 'none';
            });
        }

        async function registrarIngreso() {
            const clienteSelect = document.querySelector('.select-cliente');
            const nombreMovimiento = document.querySelector('.nombre-movimiento');
            const estadoSelect = document.querySelector('.select');  // Nuevo
            const observacionesValor = document.querySelector('.observaciones').value;

            if (!clienteSelect.value) {
                mostrarNotificacion({
                    message: 'Seleccione un proveedor antes de continuar',
                    type: 'error',
                    duration: 3000
                });
                return;
            } else if (!nombreMovimiento.value) {
                mostrarNotificacion({
                    message: 'Ingrese un nombre para el movimiento',
                    type: 'error',
                    duration: 3000
                });
                return;
            }
            const fecha = new Date().toLocaleString('es-ES', {
                timeZone: 'America/La_Paz' // Puedes cambiar esto según tu país o ciudad
            });

            // --- NUEVO: Calcular tiras y sueltas para cada producto si aplica ---
            let actualizacionesStock = [];
            let productosIngresos = [];
            let cantidadesIngresos = [];
            let tirasIngresos = [];
            let sueltasIngresos = [];
            let preciosUnitariosIngresos = [];
            let subtotalIngresos = 0;

            carritoIngresos.forEach((item, id) => {
                let cantidad = item.cantidad; // Esta es la cantidad de tiras o unidades dependiendo del modo al agregar
                let cantidadxgrupo = item.cantidadxgrupo ? parseInt(item.cantidadxgrupo) : 1;

                // Si el modo es tira, la cantidad es en tiras.
                // Si el modo es unidad, la cantidad es en unidades, y hay que ver a cuantas tiras y sueltas corresponde.
                let tirasParaRestar = 0;
                let sueltasParaRestar = 0;
                let sueltasParaSumar = 0;

                if (modoGlobal) { // La cantidad es en Tiras
                    tirasParaRestar = cantidad;
                } else { // La cantidad es en Unidades
                    const productoAlmacen = productos.find(p => p.id === id);
                    let stockSueltasActual = productoAlmacen.uSueltas || 0;

                    if (cantidad <= stockSueltasActual) { // Se pueden despachar solo de sueltas
                        sueltasParaRestar = cantidad;
                    } else { // Se necesita abrir tiras
                        sueltasParaRestar = stockSueltasActual;
                        let unidadesFaltantes = cantidad - stockSueltasActual;
                        tirasParaRestar = Math.ceil(unidadesFaltantes / cantidadxgrupo);
                        let unidadesDeTirasAbiertas = tirasParaRestar * cantidadxgrupo;
                        sueltasParaSumar = unidadesDeTirasAbiertas - unidadesFaltantes;
                    }
                }

                if (modoGlobal) {
                    // Modo tira: sumar tiras
                    actualizacionesStock.push({
                        id: item.id,
                        cantidad: item.cantidad, // tiras
                        sumarSueltas: 0
                    });
                } else {
                    // Modo unidad: sumar unidades a sueltas
                    actualizacionesStock.push({
                        id: item.id,
                        cantidad: 0,
                        sumarSueltas: item.cantidad // unidades
                    });
                }

                productosIngresos.push(`${item.producto} - ${item.gramos}gr`);
                cantidadesIngresos.push(cantidad);
                tirasIngresos.push(tirasParaRestar);
                sueltasIngresos.push(sueltasParaRestar > 0 ? sueltasParaRestar : 0);
                preciosUnitariosIngresos.push(parseFloat(item.subtotal).toFixed(2));
                subtotalIngresos += cantidad * item.subtotal;
            });

            const tipoMovimiento = modoGlobal ? 'Tiras' : 'Unidades';
            const registroIngreso = {
                fechaHora: fecha,
                tipo: 'Ingreso',
                idProductos: Array.from(carritoIngresos.values()).map(item => item.id).join(';'),
                productos: productosIngresos.join(';'),
                cantidades: cantidadesIngresos.join(';'),
                tiras: tirasIngresos.join(';'), // Nuevo campo
                sueltas: sueltasIngresos.join(';'), // Nuevo campo
                operario: `${usuarioInfo.nombre} ${usuarioInfo.apellido}`,
                clienteId: clienteSelect.value,
                nombre_movimiento: nombreMovimiento.value,
                subtotal: subtotalIngresos,
                descuento: parseFloat(document.querySelector('.descuento').value) || 0,
                aumento: parseFloat(document.querySelector('.aumento').value) || 0,
                total: 0,
                observaciones: document.querySelector('.observaciones').value || 'Ninguna',
                precios_unitarios: preciosUnitariosIngresos.join(';'),
                estado: estadoSelect.value,
                tipoMovimiento // Nuevo campo para backend
            };
            registroIngreso.total = registroIngreso.subtotal - registroIngreso.descuento + registroIngreso.aumento;

            try {
                mostrarCarga('.carga-procesar')
                // Primero registramos el movimiento
                const response = await fetch('/registrar-movimiento', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('damabrava_token')}`
                    },
                    body: JSON.stringify(registroIngreso)
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Error en la respuesta del servidor');
                }

                // --- NUEVO: Actualizar el stock en Almacen general considerando sueltas ---
                const responseStock = await fetch('/actualizar-stock', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('damabrava_token')}`
                    },
                    body: JSON.stringify({
                        actualizaciones: actualizacionesStock,
                        tipo: 'ingreso'
                    })
                });

                const dataStock = await responseStock.json();

                if (!responseStock.ok || !dataStock.success) {
                    throw new Error(dataStock.error || 'Error al actualizar el stock');
                }

                // Limpiar carrito y actualizar UI
                carritoIngresos.clear();
                await obtenerClientes();
                await obtenerAlmacenGeneral()
                document.querySelector('.btn-flotante-ingresos').style.display = 'none';
                ocultarAnuncioSecond();

                mostrarNotificacion({
                    message: 'Ingreso registrado exitosamente',
                    type: 'success',
                    duration: 3000
                });
                if (observacionesValor !== '') {
                    registrarNotificacion(
                        'Administración',
                        'Creación',
                        usuarioInfo.nombre + ' registro un ingreso al almacen de: ' + clienteSelect.value + ' Observaciones: ' + observacionesValor)
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

        window.registrarIngreso = registrarIngreso;
        actualizarBotonFlotante();
        marcarItemsAgregadosAlCarrito();
    }


    if (tipoEvento === 'almacen' || tipoEvento === 'conteo') {
        // Oculta el botón flotante del carrito si existe
        const botonFlotante = document.querySelector('.btn-flotante-salidas');
        if (botonFlotante) {
            botonFlotante.style.display = 'none';
        }
        const botonFlotanteIngresos = document.querySelector('.btn-flotante-ingresos');
        if (botonFlotanteIngresos) {
            botonFlotante.style.display = 'none';
        }
    }
    aplicarFiltros();
}