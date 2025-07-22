let productos = [];
let etiquetasGlobal = [];
let precios = [];
let precioWebSeleccionado = '';
const DB_NAME = 'damabrava_db_img';
const DB_NAME_CACHE = 'damabrava_db';
const STORE_NAME = 'imagenes_cache';
const PRODUCTOS_STORE = 'productos_web_cache';
const ETIQUETAS_STORE = 'etiquetas_web_cache';

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
        const data = await (await fetch('/obtener-etiquetas-web')).json();
        if (data.success) {
            // El endpoint devuelve un array de strings
            etiquetasGlobal = (data.etiquetas || []).filter(Boolean);
            updateHTMLWithData();
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
        const signal = await mostrarProgreso('.pro-obtner')
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
    } finally {
        ocultarProgreso('.pro-obtner')
    }
}
async function obtenerAlmacenGeneral() {
    try {
        // Primero intentar obtener del caché local
        const productosCache = await obtenerProductosLocal();
        // Si hay productos en caché, filtrar solo los que tienen etiqueta "Web" y actualizar la UI inmediatamente
        if (productosCache.length > 0) {
            const productosFiltrados = productosCache.filter(producto => {
                const etiquetas = producto.etiquetas.split(';').map(e => e.trim());
                return etiquetas.includes('Web');
            });
            productos = productosFiltrados.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            updateHTMLWithData();
            return true;
        }
        // Si no hay caché, obtener del servidor
        const response = await fetch('/obtener-productos');
        const data = await response.json();
        if (data.success) {
            // Filtrar solo productos con etiqueta "Web"
            const productosConWeb = data.productos.filter(producto => {
                const etiquetas = producto.etiquetas.split(';').map(e => e.trim());
                return etiquetas.includes('Web');
            });
            const productosProcesados = productosConWeb.sort((a, b) => {
                // Robustez: si falta id o el split falla, van al final
                let idA = -1, idB = -1;
                if (a.id && typeof a.id === 'string' && a.id.includes('-')) {
                    const partesA = a.id.split('-');
                    idA = parseInt(partesA[1]) || -1;
                }
                if (b.id && typeof b.id === 'string' && b.id.includes('-')) {
                    const partesB = b.id.split('-');
                    idB = parseInt(partesB[1]) || -1;
                }
                return idB - idA;
            });
            productos = productosProcesados;
            // Comparar con caché antes de actualizar la UI
            if (JSON.stringify(productosCache) !== JSON.stringify(productosProcesados)) {
                updateHTMLWithData();
            }
            // Procesar y guardar imágenes
            await Promise.all(productosProcesados.map(async producto => {
                if (producto.imagen && producto.imagen.includes('https://res.cloudinary.com')) {
                    const imagenCache = await obtenerImagenLocal(producto.id);
                    if (!imagenCache || necesitaActualizacion(imagenCache, producto.imagen)) {
                        await guardarImagenLocal(producto.id, producto.imagen);
                    }
                }
            }));
            // Actualizar el caché en segundo plano
            (async () => {
                await guardarProductosLocal(productosProcesados);
            })();
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

// Función para cargar y renderizar etiquetas directamente desde la petición
async function cargarYRenderizarEtiquetas() {
    try {
        const response = await fetch('/obtener-etiquetas-web');
        const data = await response.json();
        if (data.success && Array.isArray(data.etiquetas)) {
            etiquetasGlobal = data.etiquetas.filter(Boolean);
        } else {
            etiquetasGlobal = [];
        }
    } catch (error) {
        etiquetasGlobal = [];
    }
    // Renderizar los botones de etiquetas
    const etiquetasFilter = document.querySelector('.etiquetas-filter');
    if (etiquetasFilter) {
        // Eliminar todos los botones menos el de "Todos"
        etiquetasFilter.querySelectorAll('.btn-filtro:not(.todos)').forEach(e => e.remove());
        // Insertar los nuevos botones
        etiquetasGlobal.forEach(etiqueta => {
            const btn = document.createElement('button');
            btn.className = 'btn-filtro';
            btn.textContent = etiqueta;
            btn.setAttribute('data-etiqueta', etiqueta);
            etiquetasFilter.appendChild(btn);
        });
    }
}

export async function mostrarPaginaWeb() {
    renderInitialHTML();
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);
    await cargarYRenderizarEtiquetas();
    // Obtener productos y precios del servidor
    const [productosResult, preciosResult] = await Promise.all([
        (async () => {
            const response = await fetch('/obtener-productos');
            const data = await response.json();
            if (data.success) {
                const productosConWeb = data.productos.filter(producto => {
                    const etiquetas = producto.etiquetas.split(';').map(e => e.trim());
                    return etiquetas.includes('Web');
                });
                const productosProcesados = productosConWeb.sort((a, b) => {
                    let idA = -1, idB = -1;
                    if (a.id && typeof a.id === 'string' && a.id.includes('-')) {
                        const partesA = a.id.split('-');
                        idA = parseInt(partesA[1]) || -1;
                    }
                    if (b.id && typeof b.id === 'string' && b.id.includes('-')) {
                        const partesB = b.id.split('-');
                        idB = parseInt(partesB[1]) || -1;
                    }
                    return idB - idA;
                });
                productos = productosProcesados;
            }
        })(),
        (async () => {
            const response = await fetch('/obtener-precios');
            const data = await response.json();
            if (data.success) {
                precios = data.precios;
            }
        })()
    ]);
    // Obtener el precio web seleccionado (nombre)
    await obtenerPrecioWebSeleccionado();
    // Renderizar productos con el precio correcto
    updateHTMLWithData();
}
function renderInitialHTML() {
    const contenido = document.querySelector('.anuncio .contenido');

    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Pagina Web</h1>
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
                    <button class="btn-etiquetas btn blue"><i class='bx bx-purchase-tag'></i>  <span>Etiquetas</span></button>
                    <button class="btn-precios btn yellow"><i class='bx bx-dollar'></i> <span>Precios</span></button>
                    <button class="btn-catalogo btn red"><i class='bx bxs-file-pdf'></i> <span>Catálogo</span></button>
                </div>
                ` : ''}
            </div>
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro todos activado">Todos</button>
                ${etiquetasGlobal && etiquetasGlobal.length > 0 ? etiquetasGlobal.map(etiqueta => `
                    <button class="btn-filtro" data-etiqueta="${etiqueta}">${etiqueta}</button>
                `).join('') : ''}
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
            <button class="btn-etiquetas btn blue"><i class='bx bx-purchase-tag'></i> Etiquetas</button>
            <button class="btn-precios btn yellow"><i class='bx bx-dollar'></i> Precios</button>
            <button class="btn-catalogo btn red"><i class='bx bxs-file-pdf'></i> Catálogo</button>
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

    if (etiquetasGlobal.length === 0) {
        try {
            const response = await fetch('/obtener-etiquetas-web');
            const data = await response.json();
            if (data.success && data.etiquetas.length > 0) {
                etiquetasGlobal = data.etiquetas;
            }
        } catch (error) {
            console.error('Error obteniendo etiquetas web:', error);
        }
    }

    // Update productos
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

        // Buscar el precio por nombre seleccionado
        let precioMostrar = 'Precio no disponible';
        if (producto.precios) {
            const preciosArr = producto.precios.split(';');
            const precioObj = preciosArr.find(p => p.split(',')[0] === precioWebSeleccionado);
            if (precioObj) {
                const precio = parseFloat(precioObj.split(',')[1]);
                precioMostrar = `Bs. ${(!isNaN(precio) ? precio.toFixed(2) : '0.00')}`;
            }
        }

        // Verificar si tiene promoción
        const tienePromocion = producto.promocion && producto.promocion.trim() !== '';
        const estrellaPromocion = tienePromocion ? '<i class="fa fa-star" style="color: #ffd700 !important; position: absolute; bottom: 10px; right: 10px; font-size: 15px; z-index: 10;"></i>' : '';
        const precioPromocional = tienePromocion && producto.precio_promocion ?
            `<span class="flotante-item green">Bs. ${(!isNaN(parseFloat(producto.precio_promocion)) ? parseFloat(producto.precio_promocion).toFixed(2) : '0.00')}</span>` : '';

        return `
            <div class="registro-item" data-id="${producto.id}" style="position: relative;">
                ${estrellaPromocion}
                <div class="header">
                    ${imagenMostrar}
                    <div class="info-header">
                        <div class="id-flotante"><span>${producto.id}</span>${precioPromocional || `<span class="flotante-item green">${precioMostrar}</span>`}</div>
                        <span class="detalle"><strong>${producto.producto} - ${producto.gramos}gr.</strong></span>
                        <span class="pie">${producto.etiquetas.split(';').join(' • ')}</span>
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

    const btnCrearProducto = document.querySelectorAll('.btn-crear-producto');
    const btnEtiquetas = document.querySelectorAll('.btn-etiquetas');
    const btnPrecios = document.querySelectorAll('.btn-precios');
    const btnCatalogo = document.querySelectorAll('.btn-catalogo');

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
            });

            // Filtrar y ordenar
            const productosFiltrados = Array.from(registros).filter(registro => {
                const producto = productos.find(p => p.id === registro.dataset.id);
                if (!producto) return false;

                const etiquetasProducto = producto.etiquetas.split(';').map(e => e.trim());
                let mostrar = true;

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

            // Reordenar DOM
            const contenedor = document.querySelector('.productos-container');
            productosFiltrados.forEach(registro => {
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


    items.forEach(item => {
        item.addEventListener('click', function () {
            const registroId = this.dataset.id;
            window.info(registroId);
        });
    });

    if (tienePermiso('creacion')) {
        btnEtiquetas.forEach(btn => {
            btn.addEventListener('click', gestionarEtiquetas);
        });
        btnPrecios.forEach(btn => {
            btn.addEventListener('click', gestionarPrecios);
        });
    }

    btnCatalogo.forEach(btn => {
        btn.addEventListener('click', async () => {
            mostrarModalCatalogo();
        });
    });

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

            <p class="normal">Etiquetas</p>
            <div class="campo-vertical">
                ${etiquetasFormateados}
            </div>

            ${producto.promocion ? `
            <p class="normal">Promoción</p>
            <div class="campo-vertical">
                <span class="valor"><strong><i class='bx bx-star'></i> Promoción: </strong>${producto.promocion}</span>
                <span class="valor"><strong><i class='bx bx-dollar'></i> Precio promocional: </strong>${producto.precio_promocion}</span>
            </div>
            ` : ''}
        </div>
        ${tienePermiso('edicion') || tienePermiso('eliminacion') ? `
        <div class="anuncio-botones">
            <button class="btn-promocionar btn orange" data-id="${producto.id}"><i class='bx bx-star'></i> Promocionar</button>
        </div>` : ''}
    `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '70px';
        mostrarAnuncioSecond();


        if (tienePermiso('edicion') || tienePermiso('eliminacion')) {
            const btnPromocionar = contenido.querySelector('.btn-promocionar');
            btnPromocionar.addEventListener('click', () => promocionar(producto));
        }
    }

    function gestionarEtiquetas() {
        // Obtener todas las etiquetas únicas de los productos con etiqueta "Web"
        const todasLasEtiquetas = [];
        productos.forEach(producto => {
            if (producto.etiquetas) {
                const etiquetasProducto = producto.etiquetas.split(';').map(e => e.trim()).filter(e => e && e !== 'Web');
                etiquetasProducto.forEach(etiqueta => {
                    if (!todasLasEtiquetas.includes(etiqueta)) {
                        todasLasEtiquetas.push(etiqueta);
                    }
                });
            }
        });

        // Obtener las etiquetas seleccionadas actualmente
        const etiquetasSeleccionadas = JSON.parse(localStorage.getItem('etiquetasWebSeleccionadas') || '[]');

        const contenido = document.querySelector('.anuncio-second .contenido');
        const etiquetasHTML = todasLasEtiquetas.map(etiqueta => `
            <label class="${etiqueta.toLowerCase().replace(/\s+/g, '-')}">
                <input type="checkbox" value="${etiqueta}" ${etiquetasSeleccionadas.includes(etiqueta) ? 'checked' : ''}>
                <span>${etiqueta}</span>
            </label>
        `).join('');

        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Selecciona las etiquetas web</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <p class="normal">Etiquetas disponibles (excluyendo "Web")</p>
                <div class="permisos-container">
                    ${etiquetasHTML}
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-guardar-etiquetas btn green"><i class='bx bx-save'></i> Guardar selección</button>
            </div>
        `;
        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '70px';
        mostrarAnuncioSecond();

        // Guardar selección
        const btnGuardar = contenido.querySelector('.btn-guardar-etiquetas');
        btnGuardar.addEventListener('click', async () => {
            try {
                const signal = await mostrarProgreso('.pro-tag')
                const checkboxes = contenido.querySelectorAll('input[type="checkbox"]:checked');
                const etiquetasSeleccionadas = Array.from(checkboxes).map(cb => cb.value);

                // Guardar en localStorage
                localStorage.setItem('etiquetasWebSeleccionadas', JSON.stringify(etiquetasSeleccionadas));

                // Guardar en la hoja
                const response = await fetch('/guardar-etiquetas-web', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ etiquetas: etiquetasSeleccionadas })
                });

                const data = await response.json();
                if (data.success) {
                    updateHTMLWithData();
                    mostrarNotificacion({ message: 'Etiquetas web guardadas correctamente', type: 'success', duration: 3000 });
                } else {
                    throw new Error(data.error || 'Error al guardar etiquetas');
                }
            } catch (error) {
                if (error.message === 'cancelled') {
                    console.log('Operación cancelada por el usuario');
                    return;
                }
                console.error('Error:', error);
                mostrarNotificacion({ message: error.message, type: 'error', duration: 3500 });
            } finally {
                ocultarProgreso('.pro-tag')
            }
        });
    }
    async function gestionarPrecios() {
        await obtenerPrecios();

        // Obtener todos los nombres de precios disponibles
        const nombresPrecios = precios.map(p => p.precio.split(';')[0].split(',')[0]);
        // Eliminar duplicados
        const nombresUnicos = [...new Set(nombresPrecios)];
        // Obtener el nombre seleccionado actualmente
        const precioSeleccionado = localStorage.getItem('precioWebSeleccionado') || nombresUnicos[0];

        const contenido = document.querySelector('.anuncio-second .contenido');
        const preciosHTML = nombresUnicos.map(nombre => `
            <label class="${nombre.toLowerCase().replace(/\s+/g, '-')}">
                <input type="radio" name="precio-web" value="${nombre}" ${nombre === precioSeleccionado ? 'checked' : ''}>
                <span>${nombre}</span>
            </label>
        `).join('');

        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Selecciona el precio web</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <div class="permisos-container">
                    ${preciosHTML}
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-guardar-precio btn green"><i class='bx bx-save'></i> Guardar selección</button>
            </div>
        `;
        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '70px';
        mostrarAnuncioSecond();


        // Guardar selección
        const btnGuardar = contenido.querySelector('.btn-guardar-precio');
        btnGuardar.addEventListener('click', async () => {
            try {
                const signal = await mostrarProgreso('.pro-price')
                const seleccionado = contenido.querySelector('input[name="precio-web"]:checked').value;

                // Guardar en localStorage
                localStorage.setItem('precioWebSeleccionado', seleccionado);

                // Guardar en la hoja
                const response = await fetch('/guardar-precio-web', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ precio: seleccionado })
                });

                const data = await response.json();
                if (data.success) {
                    updateHTMLWithData();
                    mostrarNotificacion({ message: 'Precio web guardado correctamente', type: 'success', duration: 3000 });
                } else {
                    throw new Error(data.error || 'Error al guardar precio');
                }
            } catch (error) {
                if (error.message === 'cancelled') {
                    console.log('Operación cancelada por el usuario');
                    return;
                }
                console.error('Error:', error);
                mostrarNotificacion({ message: error.message, type: 'error', duration: 3500 });
            } finally {
                ocultarProgreso('.pro-price')
            }
        });
    }

    aplicarFiltros();
}



async function obtenerProductosLocal() {
    try {
        const db = await initDBCache();
        const tx = db.transaction(PRODUCTOS_STORE, 'readonly');
        const store = tx.objectStore(PRODUCTOS_STORE);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const productos = request.result.map(item => item.data);
                resolve(productos);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error obteniendo productos del caché:', error);
        return [];
    }
}
async function guardarProductosLocal(productosData) {
    try {
        const db = await initDBCache();
        const tx = db.transaction(PRODUCTOS_STORE, 'readwrite');
        const store = tx.objectStore(PRODUCTOS_STORE);

        // Limpiar todos los productos existentes
        await store.clear();

        // Guardar los nuevos productos
        for (const producto of productosData) {
            await store.put({
                id: producto.id,
                data: producto,
                timestamp: Date.now()
            });
        }

        console.log('Caché de productos actualizado correctamente');
    } catch (error) {
        console.error('Error actualizando el caché de productos:', error);
    }
}

function promocionar(producto) {
    const contenido = document.querySelector('.anuncio-tercer .contenido');
    const registrationHTML = `
    <div class="encabezado">
        <h1 class="titulo">Promocionar producto</h1>
        <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer');"><i class="fas fa-arrow-right"></i></button>
    </div>
    <div class="relleno promocionar-producto">
        <div class="pro-promo" style="display:none"></div>
        <p class="normal">Información del producto</p>
        <div class="campo-vertical">
            <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${producto.id}</span>
            <span class="nombre"><strong><i class='bx bx-cube'></i> Producto: </strong>${producto.producto}</span>
            <span class="valor"><strong><i class="ri-scales-line"></i> Gramaje: </strong>${producto.gramos}gr.</span>
        </div>
        
        <p class="normal">Detalles de la promoción</p>
        <div class="entrada">
            <i class='bx bx-star'></i>
            <div class="input">
                <p class="detalle">Nombre de la promoción</p>
                <input class="nombre-promocion" type="text" value="${producto.promocion || ''}" autocomplete="off" placeholder=" " required>
            </div>
        </div>
        <div class="entrada">
            <i class='bx bx-dollar'></i>
            <div class="input">
                <p class="detalle">Precio promocional (Bs.)</p>
                <input class="precio-promocion" type="number" value="${producto.precio_promocion || ''}" step="0.01" min="0" autocomplete="off" placeholder=" " required>
            </div>
        </div>
        <div class="info-sistema">
            <i class='bx bx-info-circle'></i>
            <div class="detalle-info">
                <p>Al crear una promoción, el producto aparecerá con una estrella en la lista y mostrará el precio promocional. Deja los campos vacíos para quitar la promoción.</p>
            </div>
        </div>
    </div>
    <div class="anuncio-botones">
        <button class="btn-guardar-promocion btn green"><i class='bx bx-save'></i> Guardar promoción</button>
    </div>
`;
    contenido.innerHTML = registrationHTML;

    mostrarAnuncioTercer();
    contenido.style.paddingBottom = '70px';

    // Agregar evento al botón guardar
    const btnGuardarPromocion = contenido.querySelector('.btn-guardar-promocion');
    btnGuardarPromocion.addEventListener('click', confirmarPromocion);

    async function confirmarPromocion() {
        const nombrePromocion = document.querySelector('.nombre-promocion').value.trim();
        const precioPromocion = document.querySelector('.precio-promocion').value.trim();

        try {
            const signal = await mostrarProgreso('.pro-save')
            const response = await fetch(`/actualizar-promocion/${producto.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    promocion: nombrePromocion,
                    precio_promocion: precioPromocion
                })
            });

            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }

            const data = await response.json();

            if (data.success) {
                await mostrarPaginaWeb();
                updateHTMLWithData();
                info(producto.id);
                mostrarNotificacion({
                    message: nombrePromocion ? 'Promoción guardada correctamente' : 'Promoción eliminada correctamente',
                    type: 'success',
                    duration: 3000
                });
                registrarNotificacion(
                    'Administración',
                    'Creación',
                    usuarioInfo.nombre + (nombrePromocion ?
                        ` creó la promoción "${nombrePromocion}" para ${producto.producto}` :
                        ` eliminó la promoción de ${producto.producto}`)
                );
            } else {
                throw new Error(data.error || 'Error al guardar la promoción');
            }
        } catch (error) {
            if (error.message === 'cancelled') {
                console.log('Operación cancelada por el usuario');
                return;
            }
            console.error('Error:', error);
            mostrarNotificacion({
                message: error.message || 'Error al guardar la promoción',
                type: 'error',
                duration: 3500
            });
        } finally {
            ocultarProgreso('.pro-save')
        }
    }
}

// Después de obtener todos los precios, obtengo el precio web seleccionado
async function obtenerPrecioWebSeleccionado() {
    try {
        const response = await fetch('/obtener-precio-web');
        const data = await response.json();
        if (data.success && data.precio) {
            precioWebSeleccionado = data.precio;
        } else {
            precioWebSeleccionado = '';
        }
    } catch (error) {
        precioWebSeleccionado = '';
    }
}

async function mostrarModalCatalogo() {
    let urlCatalogo = null;
    console.log('[Catalogo] Intentando obtener catálogo PDF...');
    try {
        const signal = await mostrarProgreso('.pro-obtner');
        const res = await fetch('/obtener-catalogo');
        console.log('[Catalogo] Respuesta fetch:', res);
        const data = await res.json();
        console.log('[Catalogo] Data recibida:', data);
        if (data.success && data.url) urlCatalogo = data.url;
    } catch (err) {
        if (err.message === 'cancelled') {
            console.log('Operación cancelada por el usuario');
            return;
        }
        console.error('[Catalogo] Error al obtener catálogo:', err);
        mostrarNotificacion({
            message: err.message || 'Error al obtener catálogo',
            type: 'error',
            duration: 3500
        });
    }
    finally {
        ocultarProgreso('.pro-obtner');
    }
    const contenido = document.querySelector('.anuncio-second .contenido');
    const catalogoHTML = `
    <div class="encabezado">
        <h1 class="titulo">Catálogo PDF</h1>
        <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond');"><i class="fas fa-arrow-right"></i></button>
    </div>
    <div class="relleno">
        <div class="pdf-upload-container" id="drop-zone">
            <label for="catalogoPdf" class="pdf-upload-label" id="upload-label">
                <i class="fas fa-file-upload"></i>
                <span id="upload-text">Arrastra tu catálogo PDF o haz clic aquí</span>
                <input type="file" accept="application/pdf" class="input-catalogo-pdf" id="catalogoPdf">
            </label>
        </div>


         ${!urlCatalogo ? '<span style="color:#888">No hay catálogo subido</span>' : ''}
        <div class="info-sistema">
            <i class='bx bx-info-circle'></i>
            <div class="detalle-info">
                <p>Solo puede haber uno, al subir uno nuevo se reemplaza el anterior.</p>
            </div>
        </div>
    </div>
    <div class="anuncio-botones">
        <button class="btn subir-catalogo btn orange" style="margin-bottom:10px"><i class='bx bx-upload'></i> Actualizar catálogo</button>
        <button class="btn ver-catalogo btn green" style="margin-bottom:10px" ${!urlCatalogo ? 'disabled' : ''}><i class='bx bx-show'></i> Ver catálogo actual</button>
    </div>
    `;
    contenido.innerHTML = catalogoHTML;

    mostrarAnuncioSecond();
    contenido.style.paddingBottom = '70px';

    function inicializarCargaPDF({ dropZoneId, inputId, labelTextId }) {
        const dropZone = document.getElementById(dropZoneId);
        const fileInput = document.getElementById(inputId);
        const uploadText = document.getElementById(labelTextId);
    
        if (!dropZone || !fileInput || !uploadText) {
          console.warn('Elementos no encontrados para inicializar carga PDF');
          return;
        }
    
        // Evitar comportamiento por defecto
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
          dropZone.addEventListener(eventName, e => e.preventDefault());
        });
    
        dropZone.addEventListener('dragover', () => {
          dropZone.classList.add('dragover');
        });
    
        dropZone.addEventListener('dragleave', () => {
          dropZone.classList.remove('dragover');
        });
    
        dropZone.addEventListener('drop', (e) => {
          dropZone.classList.remove('dragover');
          const file = e.dataTransfer.files[0];
    
          if (file && file.type === "application/pdf") {
            fileInput.files = e.dataTransfer.files;
            uploadText.textContent = `Archivo: ${file.name}`;
          } else {
            uploadText.textContent = "Solo se permiten archivos PDF";
          }
        });
    
        fileInput.addEventListener('change', () => {
          if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            uploadText.textContent = `Archivo: ${file.name}`;
          }
        });
      }
    
      // Llamada de ejemplo (cuando se cargue la página)

        inicializarCargaPDF({
          dropZoneId: 'drop-zone',
          inputId: 'catalogoPdf',
          labelTextId: 'upload-text'
        });


    // Agregar eventos después de mostrar el modal
    const input = contenido.querySelector('.input-catalogo-pdf');
    const btnSubir = contenido.querySelector('.subir-catalogo');
    const btnVer = contenido.querySelector('.ver-catalogo');
    let archivo = null;

    if (input) {
        input.addEventListener('change', e => {
            archivo = e.target.files[0];
        });
    }

    if (btnSubir) {
        btnSubir.addEventListener('click', confirmarSubidaCatalogo);
    }

    if (btnVer && urlCatalogo) {
        btnVer.addEventListener('click', () => {
            // Cambiar la URL para visualización directa en lugar de descarga
            const urlVisualizacion = urlCatalogo.replace('&export=download', '&export=view');
            window.open(urlVisualizacion, '_blank');
        });
    }

    async function confirmarSubidaCatalogo() {
        if (!archivo) {
            mostrarNotificacion({
                message: 'Selecciona un archivo PDF',
                type: 'warning',
                duration: 3000
            });
            return;
        }

        try {
            const signal = await mostrarProgreso('.pro-save');
            const formData = new FormData();
            formData.append('catalogo', archivo);

            const res = await fetch('/subir-catalogo', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                throw new Error('Error en la respuesta del servidor');
            }

            const data = await res.json();

            if (data.success) {
                mostrarNotificacion({
                    message: 'Catálogo subido correctamente',
                    type: 'success',
                    duration: 3000
                });
                registrarNotificacion(
                    'Administración',
                    'Creación',
                    usuarioInfo.nombre + ' subió un nuevo catálogo PDF'
                );
                cerrarAnuncioManual('anuncioSecond');
            } else {
                throw new Error(data.error || 'Error al subir catálogo');
            }
        } catch (error) {
            if (error.message === 'cancelled') {
                console.log('Operación cancelada por el usuario');
                return;
            }
            console.error('Error:', error);
            mostrarNotificacion({
                message: error.message || 'Error al subir catálogo',
                type: 'error',
                duration: 3500
            });
        } finally {
            ocultarProgreso('.pro-save');
        }
    }
}