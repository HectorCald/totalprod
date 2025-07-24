export let productos = [];
let etiquetas = [];
let precios = [];
let clientes = [];
let modoGlobal = localStorage.getItem("modoGlobal");

let carritoSalidas = new Map(JSON.parse(localStorage.getItem('damabrava_carrito') || '[]'));


const DB_NAME = 'damabrava_db';
const PRODUCTO_ALM_DB = 'prductos_alm';
const PRECIOS_ALM_DB = 'precios_alm';
const ETIQUETAS_ALM_DB = 'etiquetas_almacen';
const CLIENTES_DB = 'clientes';


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



export async function mostrarSalidasAlmacen() {
    renderInitialHTML();
    mostrarAnuncio();

    // Luego cargar el resto de datos en segundo plano
    const [clientes, etiquetas, precios, almacen] = await Promise.all([
        obtenerClientes(),
        obtenerEtiquetas(),
        obtenerPrecios(),
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

                    <div class="input switch-container" style="display:flex;align-items:center;gap:6px;">
                        <label class="switch" style="position:relative;">
                            <input type="checkbox" class="botones-cancelacion switch-tira-global">
                            <span class="slider round slider-thumb"></span>
                        </label>
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
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '10px';
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
    ));

    // Renderizar HTML
    productosContainer.innerHTML = productosHTML.join('');
    eventosAlmacenGeneral();
}


function eventosAlmacenGeneral() {

    const productosACopiar = JSON.parse(localStorage.getItem('productosACopiar') || '[]');
    if (productosACopiar.length > 0) {
        carritoSalidas.clear();
        localStorage.setItem('damabrava_carrito', JSON.stringify([]));
        productosACopiar.forEach(({ id, cantidad }) => {
            for (let i = 0; i < cantidad; i++) {
                agregarAlCarrito(id);
            }
        });
        localStorage.removeItem('productosACopiar');
    }

    const botonesEtiquetas = document.querySelectorAll('.filtros-opciones.etiquetas-filter .btn-filtro');
    const botonesCantidad = document.querySelectorAll('.filtros-opciones.cantidad-filter .btn-filtro');
    const selectPrecios = document.querySelector('.precios-select');
    const items = document.querySelectorAll('.registro-item');
    const inputBusqueda = document.querySelector('.search');
    const contenedor = document.querySelector('.anuncio .relleno');
    const botonFlotante = document.querySelector('.btn-flotante-salidas')
    const switchTiraGlobal = document.querySelector('.switch-tira-global');

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
                            const nombreA = a.querySelector('.detalle')?.textContent || '';
                            const nombreB = b.querySelector('.detalle')?.textContent || '';
                            return nombreA.localeCompare(nombreB);
                        });
                        break;
                    case 3:
                        productosFiltrados.sort((a, b) => {
                            const nombreA = a.querySelector('.detalle')?.textContent || '';
                            const nombreB = b.querySelector('.detalle')?.textContent || '';
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
        mostrarCarga('.carga-procesar');
        scrollToCenter(e.target, e.target.parentElement);
        aplicarFiltros();
        setTimeout(() => {
            reconstruirCarritoConModoYPrecioActual();
            ocultarCarga('.carga-procesar');
        }, 1000);
    });

    if (modoGlobal === null) modoGlobal = true;
    else modoGlobal = modoGlobal === "true";

    switchTiraGlobal.checked = modoGlobal;

    switchTiraGlobal.addEventListener('change', (e) => {
        mostrarCarga('.carga-procesar');
        modoGlobal = e.target.checked;
        localStorage.setItem("modoGlobal", e.target.checked);
        setTimeout(() => {
            reconstruirCarritoConModoYPrecioActual();
            ocultarCarga('.carga-procesar');
        }, 1000);
        mostrarNotificacion({
            message: modoGlobal ? 'Modo Tira activado' : 'Modo Unidad activado',
            type: modoGlobal ? 'success' : 'info',
            duration: 2000
        });
    });
    botonFlotante.addEventListener('click', mostrarCarritoSalidas);

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
        const precioUnitario = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;
        const precioFinal = modoGlobal ? precioUnitario * cantidadxgrupo : precioUnitario;
        const stockDisponible = modoGlobal ? producto.stock : producto.stock * cantidadxgrupo;

        // Si ya está en el carrito, suma 1 (si hay stock suficiente)
        if (carritoSalidas.has(productoId)) {
            const item = carritoSalidas.get(productoId);
            if (item.cantidad < stockDisponible) {
                item.cantidad += 1;
                // NO actualizar el precio aquí, debe mantenerse el precio con el que se agregó
            }
        } else {
            carritoSalidas.set(productoId, {
                ...producto,
                cantidad: 1,
                stockFinal: stockDisponible,
                subtotal: precioFinal, // Este es el precio con el que se agrega
                ciudadSeleccionada: ciudadSeleccionada, // Guardar ciudad para referencia
                precioUnitarioSeleccionado: precioUnitario // Guardar precio unitario seleccionado
            });
        }
        if (window.innerWidth > 768) {
            mostrarCarritoSalidas();
            setTimeout(() => {
                const inputCantidad = document.querySelector(`.carrito-item[data-id='${productoId}'] input[type='number']`);
                if (inputCantidad) {
                    inputCantidad.focus();
                    inputCantidad.select();
                }
            }, 100);
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

    function reconstruirCarritoConModoYPrecioActual() {
        // 1. Guarda los productos y cantidades actuales
        const itemsPrevios = Array.from(carritoSalidas.values()).map(item => ({
            id: item.id,
            cantidad: item.cantidad
        }));

        // 2. Limpia el carrito
        carritoSalidas.clear();
        localStorage.setItem('damabrava_carrito', JSON.stringify([]));

        // 3. Vuelve a agregar los productos con el precio y modo actual
        for (const { id, cantidad } of itemsPrevios) {
            for (let i = 0; i < cantidad; i++) {
                agregarAlCarrito(id);
            }
        }

        // 4. Actualiza la UI del carrito si está abierto
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (anuncioSecond && anuncioSecond.innerHTML.includes('Carrito de Salidas')) {
            mostrarCarritoSalidas();
        }
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
            localStorage.setItem('damabrava_carrito', JSON.stringify([]));
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
            subtotal: subtotalSalida.toFixed(2),
            descuento: parseFloat(document.querySelector('.descuento').value) || 0,
            aumento: parseFloat(document.querySelector('.aumento').value) || 0,
            total: 0,
            observaciones: document.querySelector('.observaciones').value || 'Ninguna',
            precios_unitarios: preciosUnitariosSalida.join(';'),
            estado: estadoSelect.value,
            tipoMovimiento // Nuevo campo para backend
        };
        registroSalida.descuento = Number(document.querySelector('.descuento').value) || 0;
        registroSalida.aumento = Number(document.querySelector('.aumento').value) || 0;
        registroSalida.total = (parseFloat(registroSalida.subtotal) - registroSalida.descuento + registroSalida.aumento).toFixed(2); // <-- número
        console.log(registroSalida)
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
            localStorage.setItem('damabrava_carrito', JSON.stringify([]));
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
            mostrarMovimientosAlmacen(data.id);
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
    aplicarFiltros();
}