let productos = [];
let productosAcopio = [];
let etiquetas = [];
let precios = [];
const DB_NAME = 'damabrava_db_img';
const DB_NAME_CACHE = 'damabrava_db';
const STORE_NAME = 'imagenes_cache';
const PRODUCTOS_STORE = 'productos_almacen_cache';
const ETIQUETAS_STORE = 'etiquetas_almacen_cache';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

function initDBCache() {
    return new Promise((resolve, reject) => {
        // Primero intentar obtener la versión actual de la base de datos
        const request = indexedDB.open(DB_NAME_CACHE);

        request.onerror = () => reject(request.error);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const currentVersion = db.version;
            db.close();

            // Abrir la base de datos con la versión actual + 1
            const upgradeRequest = indexedDB.open(DB_NAME_CACHE, currentVersion + 1);

            upgradeRequest.onerror = () => reject(upgradeRequest.error);
            upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);

            upgradeRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(PRODUCTOS_STORE)) {
                    db.createObjectStore(PRODUCTOS_STORE, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(ETIQUETAS_STORE)) {
                    db.createObjectStore(ETIQUETAS_STORE, { keyPath: 'id' });
                }
            };
        };
    });
}

async function guardarImagenLocal(id, imageUrl) {
    try {
        console.log(`⌛ Guardando imagen ${id}...`);
        const db = await initDB();

        // Primero verificar si existe
        const tx1 = db.transaction(STORE_NAME, 'readonly');
        const store1 = tx1.objectStore(STORE_NAME);

        const existente = await new Promise((resolve) => {
            const request = store1.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });

        if (existente &&
            existente.url === imageUrl &&
            Date.now() - existente.timestamp < 24 * 60 * 60 * 1000) {
            console.log(`📦 Imagen ya en caché: ${id}`);
            return existente;
        }

        // Si necesita actualizarse, procesar y guardar en una nueva transacción
        const blob = await urlToBlob(imageUrl);
        const base64 = await blobToBase64(blob);

        const imagenCache = {
            id,
            url: imageUrl,
            data: base64,
            timestamp: Date.now()
        };

        // Nueva transacción para guardar
        const tx2 = db.transaction(STORE_NAME, 'readwrite');
        const store2 = tx2.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store2.put(imagenCache);

            // Esperar a que complete la transacción
            tx2.oncomplete = () => {
                console.log(`✅ Imagen ${id} guardada exitosamente`);
                resolve(imagenCache);
            };

            tx2.onerror = () => {
                console.error(`Error en transacción para ${id}:`, tx2.error);
                reject(tx2.error);
            };

            tx2.onabort = () => {
                console.error(`Transacción abortada para ${id}`);
                reject(new Error('Transacción abortada'));
            };
        });

    } catch (error) {
        console.error(`❌ Error guardando imagen ${id}:`, error);
        return null;
    }
}
async function obtenerImagenLocal(id) {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error obteniendo imagen del cache:', error);
        return null;
    }
}
async function urlToBlob(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return blob;
}
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
function necesitaActualizacion(imagenCache, nuevaUrl) {
    if (!imagenCache) return true;
    if (imagenCache.url !== nuevaUrl) return true;

    // Opcional: verificar si el cache es muy antiguo (ej: más de 1 día)
    const unDia = 24 * 60 * 60 * 1000;
    if (Date.now() - imagenCache.timestamp > unDia) return true;

    return false;
}



async function obtenerEtiquetas() {
    try {
        const response = await fetch('/obtener-etiquetas');
        const data = await response.json();
        if (data.success) {
            const etiquetasProcesadas = data.etiquetas.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            etiquetas = etiquetasProcesadas;
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener etiquetas',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        mostrarNotificacion({
            message: 'Error al obtener etiquetas',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerPrecios() {
    try {
        const response = await fetch('/obtener-precios');
        const data = await response.json();

        if (data.success) {
            precios = data.precios.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener precios',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener precios:', error);
        mostrarNotificacion({
            message: 'Error al obtener precios',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerAlmacenAcopio() {
    try {
        const response = await fetch('/obtener-productos-acopio');
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }

        const data = await response.json();

        if (data.success) {
            productosAcopio = data.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            return true;
        } else {
            throw new Error(data.error || 'Error al obtener los productos');
        }
    } catch (error) {
        console.error('Error al obtener productos:', error);
        mostrarNotificacion({
            message: 'Error al obtener los productos de acopio',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerAlmacenGeneral() {
    try {
        // Siempre obtener productos del servidor
        const response = await fetch('/obtener-productos');
        const data = await response.json();
        if (data.success) {
            const productosProcesados = data.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            productos = productosProcesados;
            // Solo caché de imágenes
            await Promise.all(productosProcesados.map(async producto => {
                if (producto.imagen && producto.imagen.includes('https://res.cloudinary.com')) {
                    const imagenCache = await obtenerImagenLocal(producto.id);
                    if (!imagenCache || necesitaActualizacion(imagenCache, producto.imagen)) {
                        await guardarImagenLocal(producto.id, producto.imagen);
                    }
                }
            }));
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener productos del almacén',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener productos:', error);
        mostrarNotificacion({
            message: 'Error al obtener productos del almacén',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}



export async function mostrarAlmacenGeneral() {
    renderInitialHTML(); // Render initial HTML immediately
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);


    // Luego cargar el resto de datos en segundo plano
    const [almacenGeneral, etiquetasResult, preciosResult, almacenAcopio] = await Promise.all([
        await obtenerAlmacenGeneral(),
        await obtenerEtiquetas(),
        await obtenerPrecios(),
        await obtenerAlmacenAcopio(),
    ]);
    updateHTMLWithData();
}
function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');

    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Almacén General</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio');"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="pull-to-refresh">
                <i class='bx bx-refresh'></i>
                <span>Desliza para recargar</span>
            </div>
            <div class="busqueda">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="buscar-producto" placeholder="">
                    </div>
                </div>
                ${tienePermiso('creacion') ? `
                <div class="acciones-grande">
                    <button class="btn-crear-producto btn orange"> <i class='bx bx-plus'></i> <span>Nuevo</span></button>
                    <button class="btn-etiquetas btn especial"><i class='bx bx-purchase-tag'></i>  <span>Etiquetas</span></button>
                    <button class="btn-precios btn especial"><i class='bx bx-dollar'></i> <span>Precios</span></button>
                </div>
                ` : ''}
            </div>
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro todos activado">Todos</button>
                ${Array(5).fill().map(() => `
                    <div class="skeleton skeleton-etiqueta"></div>
                `).join('')}
            </div>
            <div class="filtros-opciones cantidad-filter2">
                <button class="btn-filtro"><i class='bx bx-sort-down'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-up'></i></button>
                <button class="btn-filtro activado"><i class='bx bx-sort-a-z'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-z-a'></i></button>
                <button class="btn-filtro">Sueltas</button>
                <select class="precios-select" style="width:auto">
                    <option value="">Precios</option>
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
                <i class='bx bx-package' style="font-size: 50px;opacity:0.5"></i>
                <p style="text-align: center; color: #555;">¡Ups!, No se encontraron productos segun tu busqueda o filtrado.</p>
            </div>
        </div>

        ${tienePermiso('creacion') ? `
        <div class="anuncio-botones">
            <button class="btn-crear-producto btn orange"> <i class='bx bx-plus'></i> Nuevo</button>
            <button class="btn-etiquetas btn especial"><i class='bx bx-purchase-tag'></i> Etiquetas</button>
            <button class="btn-precios btn especial"><i class='bx bx-dollar'></i> Precios</button>
        </div>
        ` : ''}
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '10px';
    if (tienePermiso('creacion')) {
        contenido.style.paddingBottom = '70px';
    }
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
        if (producto.imagen && producto.imagen.includes('https://res.cloudinary.com')) {
            const imagenCache = await obtenerImagenLocal(producto.id);
            if (imagenCache && !necesitaActualizacion(imagenCache, producto.imagen)) {
                imagenMostrar = `<img class="imagen" src="${imagenCache.data}" alt="${producto.producto}" 
                                onerror="this.parentElement.innerHTML='<i class=\\'bx bx-package\\'></i>'">`;
            }
        }
        // Formatear precio a dos decimales
        let precioMostrar = '';
        if (producto.precios) {
            const primerPrecio = producto.precios.split(';')[0];
            const valor = primerPrecio.split(',')[1];
            precioMostrar = !isNaN(parseFloat(valor)) ? parseFloat(valor).toFixed(2) : '0.00';
        } else {
            precioMostrar = '0.00';
        }
        return `
            <div class="registro-item" data-id="${producto.id}">
                <div class="header">
                    ${imagenMostrar}
                    <div class="info-header">
                        <div class="id">${producto.id}
                            <div class="precio-cantidad">
                                <span class="valor stock">${producto.stock} Und.</span>
                                <span class="valor precio">Bs. ${precioMostrar}</span>
                            </div>
                        </div>
                        <span class="nombre"><strong>${producto.producto} - ${producto.gramos}gr.</strong></span>
                        <span class="etiquetas">${producto.etiquetas.split(';').join(' • ')}</span>
                    </div>
                </div>
            </div>
        `;
    }));

    // Renderizar HTML
    productosContainer.innerHTML = productosHTML.join('');

    eventosAlmacenGeneral();
}


function eventosAlmacenGeneral() {
    const botonesEtiquetas = document.querySelectorAll('.filtros-opciones.etiquetas-filter .btn-filtro');
    const botonesCantidad = document.querySelectorAll('.filtros-opciones.cantidad-filter2 .btn-filtro');
    const selectPrecios = document.querySelector('.precios-select');

    const btnCrearProducto = document.querySelectorAll('.btn-crear-producto');
    const btnEtiquetas = document.querySelectorAll('.btn-etiquetas');
    const btnPrecios = document.querySelectorAll('.btn-precios');

    const items = document.querySelectorAll('.registro-item');

    const inputBusqueda = document.querySelector('.buscar-producto');
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

    function scrollToCenter(boton, contenedorPadre) {
        const scrollLeft = boton.offsetLeft - (contenedorPadre.offsetWidth / 2) + (boton.offsetWidth / 2);
        contenedorPadre.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    }
    function normalizarTexto(texto) {
        return texto.toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .replace(/[-_\s]+/g, ''); // Eliminar guiones, guiones bajos y espacios
    }
    function aplicarFiltros() {
        const registros = document.querySelectorAll('.registro-item');
        const busqueda = normalizarTexto(inputBusqueda.value);
        const precioSeleccionado = selectPrecios.selectedIndex >= 0 && selectPrecios.options[selectPrecios.selectedIndex] ?
            selectPrecios.options[selectPrecios.selectedIndex].text : '';
        const botonCantidadActivo = document.querySelector('.filtros-opciones.cantidad-filter2 .btn-filtro.activado');
        const botonSueltas = document.querySelector('.filtros-opciones.cantidad-filter2 .btn-filtro:nth-child(5)');
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
                if (mostrar && filtroNombreActual !== 'Todos') {
                    mostrar = mostrar && etiquetasProducto.includes(filtroNombreActual);
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
    let filtroNombreActual = localStorage.getItem('filtroEtiquetaAlmacen') || 'Todos';
    botonesEtiquetas.forEach(boton => {
        boton.classList.remove('activado');
        if (boton.textContent.trim() === filtroNombreActual) {
            boton.classList.add('activado');
        }
        boton.addEventListener('click', () => {
            botonesEtiquetas.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            filtroNombreActual = boton.textContent.trim();
            aplicarFiltros();
            scrollToCenter(boton, boton.parentElement);
            localStorage.setItem('filtroEtiquetaAlmacen', filtroNombreActual);
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


        let imagenMostrar = '<i class=\'bx bx-package\'></i>';
        if (producto.imagen && producto.imagen.includes('https://res.cloudinary.com')) {
            const imagenCache = await obtenerImagenLocal(producto.id);
            if (imagenCache && !necesitaActualizacion(imagenCache, producto.imagen)) {
                imagenMostrar = `<img class="imagen" src="${imagenCache.data}" alt="${producto.producto}" 
                            onerror="this.parentElement.innerHTML='<i class=\\'bx bx-package\\'></i>'">`;
            }
        }

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
            <h1 class="titulo">${producto.producto}</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond');"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <div class="imagen-producto-registro">
                ${imagenMostrar}
            </div>
            <p class="normal">Información general</p>
            <div class="campo-vertical">
                <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${producto.id}</span>
                <span class="valor"><strong><i class="ri-scales-line"></i> Gramaje: </strong>${producto.gramos}gr.</span>
                <span class="valor"><strong><i class='bx bx-package'></i> Stock: </strong>${producto.stock} Und.</span>
                <span class="valor"><strong><i class='bx bx-hash'></i> Codigo: </strong>${producto.codigo_barras}</span>
            </div>

            <p class="normal">Detalles adicionales</p>
            <div class="campo-vertical">
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
                <p class="normal">Información general</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${producto.id}</span>
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Producto: </strong>${producto.producto}</span>
                    <span class="valor"><strong><i class="ri-scales-line"></i> Gramaje: </strong>${producto.gramos}gr.</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Stock: </strong>${producto.stock} Und.</span>
                    <span class="valor"><strong><i class='bx bx-hash'></i> Codigo: </strong>${producto.codigo_barras}</span>
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
                    const signal = await mostrarProgreso('.pro-delete')
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
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al eliminar el producto',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-delete')
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
            <div class="relleno editar-producto">
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
                    const producto = document.querySelector('.editar-producto .producto').value.trim();
                    const gramos = document.querySelector('.editar-producto .gramaje').value.trim();
                    const stock = document.querySelector('.editar-producto .stock').value.trim();
                    const cantidadxgrupo = document.querySelector('.editar-producto .cantidad-grupo').value.trim();
                    const lista = document.querySelector('.editar-producto .lista').value.trim();
                    const codigo_barras = document.querySelector('.editar-producto .codigo-barras').value.trim();
                    const uSueltas = document.querySelector('.editar-producto .unidades-sueltas').value.trim();
                    const motivo = document.querySelector('.editar-producto .motivo').value.trim();
                    const alm_acopio_id = document.querySelector('.editar-producto .alm-acopio-producto').value;
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
                    const preciosInputs = document.querySelectorAll('.editar-producto .precio-input');
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
                    const imagenInput = document.querySelector('.editar-producto .imagen-producto');
                    if (imagenInput.files && imagenInput.files[0]) {
                        formData.append('imagen', imagenInput.files[0]);
                    }

                    const signal = await mostrarProgreso('.pro-edit')

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
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al actualizar el producto',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-edit')
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
        <div class="relleno nuevo-producto">
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
            const producto = document.querySelector('.nuevo-producto .producto').value.trim();
            const gramos = document.querySelector('.nuevo-producto .gramaje').value.trim();
            const stock = document.querySelector('.nuevo-producto .stock').value.trim();
            const cantidadxgrupo = document.querySelector('.nuevo-producto .cantidad-grupo').value.trim();
            const lista = document.querySelector('.nuevo-producto .lista').value.trim();
            const codigo_barras = document.querySelector('.nuevo-producto .codigo-barras').value.trim();
            const acopioSelect = document.querySelector('.nuevo-producto .alm-acopio-producto');

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
                const signal = await mostrarProgreso('.pro-new')
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
                if (error.message === 'cancelled') {
                    console.log('Operación cancelada por el usuario');
                    return;
                }
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al crear el producto',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarProgreso('.pro-new')
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
            <div class="relleno editar-produccion">
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
                    const signal = await mostrarProgreso('.pro-tag')
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
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    mostrarNotificacion({
                        message: error.message,
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-tag')
                }
            }
        });
        etiquetasActuales.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-quitar-etiqueta')) {
                try {
                    const signal = await mostrarProgreso('.pro-tag')
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
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    mostrarNotificacion({
                        message: error.message,
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-tag')
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
                const signal = await mostrarProgreso('.pro-price')
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
                if (error.message === 'cancelled') {
                    console.log('Operación cancelada por el usuario');
                    return;
                }
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al agregar el precio',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarProgreso('.pro-price')
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
                    const signal = await mostrarProgreso('.pro-price')
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
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    mostrarNotificacion({
                        message: error.message,
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-price')
                }
            });

        };
        contenido.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-eliminar-precio')) {
                const precioItem = e.target.closest('.precio-item');
                const precioId = precioItem.dataset.id;

                try {
                    const signal = await mostrarProgreso('.pro-price')
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
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al eliminar el precio',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-price')
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
                    const signal = await mostrarProgreso('.pro-price');
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
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    mostrarNotificacion({
                        message: error.message,
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-price');
                }
            });
        });

    }

    aplicarFiltros();
}

