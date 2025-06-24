let productos = [];
let etiquetas = [];
let precios = [];
let clientes = [];
let carritoSalidas = new Map(JSON.parse(localStorage.getItem('damabrava_carrito') || '[]'));
const DB_NAME = 'damabrava_db_img';
const STORE_NAME = 'imagenes_cache';

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
            etiquetas = data.etiquetas.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
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
async function obtenerClientes() {
    try {
        const response = await fetch('/obtener-clientes');
        const data = await response.json();

        if (data.success) {
            clientes = data.clientes.sort((a, b) => {
                const nombreA = a.nombre.toLowerCase();
                const nombreB = b.nombre.toLowerCase();
                return nombreA.localeCompare(nombreB);
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener clientes',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        mostrarNotificacion({
            message: 'Error al obtener clientes',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerAlmacenGeneral() {
    try {
        const response = await fetch('/obtener-productos');
        const data = await response.json();

        if (data.success) {
            // Guardar los productos en la variable global y ordenarlos por ID
            productos = data.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Orden descendente por número de ID
            });

            // Procesar y guardar todas las imágenes antes de retornar
            await Promise.all(productos.map(async producto => {
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


export async function mostrarSalidas() {
    renderInitialHTML();
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    // Load data in parallel
    const [almacenGeneral, etiquetas, precios, proovedores] = await Promise.all([
        obtenerAlmacenGeneral(),
        obtenerEtiquetas(),
        obtenerPrecios(),
        obtenerClientes(),
    ]);
    const carritoBasico = new Map(JSON.parse(localStorage.getItem('damabrava_carrito') || '[]'));

    await updateHTMLWithData();

    // Actualizar carrito con datos actuales
    carritoSalidas = new Map();
    const selectPrecios = document.querySelector('.precios-select');
    const ciudadSeleccionada = selectPrecios.options[selectPrecios.selectedIndex].text;

    carritoBasico.forEach((item, id) => {
        const productoActual = productos.find(p => p.id === id);
        if (productoActual) {
            // Obtener el precio según la ciudad seleccionada
            const preciosProducto = productoActual.precios.split(';');
            const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
            const precioActual = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;

            carritoSalidas.set(id, {
                ...productoActual,
                cantidad: item.cantidad,
                subtotal: precioActual // Usar el precio según la ciudad seleccionada
            });

            // Actualizar UI
            const headerItem = document.querySelector(`.registro-item[data-id="${id}"]`);
            if (headerItem) {
                const stockSpan = headerItem.querySelector('.stock');
                if (stockSpan) stockSpan.textContent = `${productoActual.stock - item.cantidad} Und.`;
                const cantidadSpan = headerItem.querySelector('.carrito-cantidad');
                if (cantidadSpan) cantidadSpan.textContent = item.cantidad;
            }
        }
    });

    localStorage.setItem('damabrava_carrito', JSON.stringify(Array.from(carritoSalidas.entries())));
    eventosSalidas();
}
function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Salidas</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="buscador-filtros">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="buscar-producto" placeholder="">
                    </div>
                </div>
                <div class="filtros-opciones cantidad-filter" style="overflow:hidden">
                    <button class="btn-filtro"><i class='bx bx-sort-down'></i></button>
                    <button class="btn-filtro"><i class='bx bx-sort-up'></i></button>
                    <button class="btn-filtro activado"><i class='bx bx-sort-a-z'></i></button>
                    <button class="btn-filtro"><i class='bx bx-sort-z-a'></i></button>
                    <select class="precios-select" style="width:100%">
                        <option class="skeleton skeleton-etiqueta" value="">Precios</option>
                    </select>
                </div>
            </div>
            
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro activado">Todos</button>
                ${Array(5).fill().map(() => `
                    <div class="skeleton skeleton-etiqueta"></div>
                `).join('')}
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
}
async function updateHTMLWithData() {
    // Update etiquetas filter
    const etiquetasUnicas = [...new Set(etiquetas.map(etiqueta => etiqueta.etiqueta))];
    const etiquetasFilter = document.querySelector('.etiquetas-filter');
    const etiquetasHTML = etiquetasUnicas.map(etiqueta => `
        <button class="btn-filtro">${etiqueta}</button>
    `).join('');
    etiquetasFilter.innerHTML = `
        <button class="btn-filtro activado">Todos</button>
        ${etiquetasHTML}
    `;

    // Update precios select
    const preciosSelect = document.querySelector('.precios-select');
    const preciosOpciones = precios.map((precio, index) => {
        const primerPrecio = precio.precio.split(';')[0].split(',')[0];
        return `<option value="${precio.id}" ${index === 1 ? 'selected' : ''}>${primerPrecio}</option>`;
    }).join('');
    preciosSelect.innerHTML = preciosOpciones;

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

        const itemCarrito = carritoSalidas.get(producto.id);
        const cantidadEnCarrito = itemCarrito ? itemCarrito.cantidad : '';

        return `

        <div class="registro-item" data-id="${producto.id}">
            <div class="header">
                 ${imagenMostrar}
                <div class="info-header">
                    <span class="id">${producto.id}
                        <div class="precio-cantidad">
                            <span class="valor stock">${producto.stock} Und.</span>
                            <span class="valor precio">Bs. ${producto.precios.split(';')[0].split(',')[1]}</span>
                            <span class="carrito-cantidad">${cantidadEnCarrito}</span>
                        </div>
                    </span>
                    <span class="nombre"><strong>${producto.producto} - ${producto.gramos}gr.</strong></span>
                    <span class="etiquetas">${producto.etiquetas.split(';').join(' • ')}</span>
                </div>
            </div>
        </div>
    `}));

    // Renderizar HTML
    productosContainer.innerHTML = productosHTML.join('');
}

function eventosSalidas() {
    const botonesEtiquetas = document.querySelectorAll('.filtros-opciones.etiquetas-filter .btn-filtro');
    const botonesCantidad = document.querySelectorAll('.filtros-opciones.cantidad-filter .btn-filtro');
    const selectPrecios = document.querySelector('.precios-select');

    const inputBusqueda = document.querySelector('.buscar-producto');

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

    let filtroNombreActual = 'Todos';


    botonFlotante.className = 'btn-flotante-salidas';
    botonFlotante.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(botonFlotante);
    selectPrecios.addEventListener('change', () => {
        const ciudadSeleccionada = selectPrecios.options[selectPrecios.selectedIndex].text;

        // Actualizar precios en el carrito y en los items mostrados
        carritoSalidas.forEach((item, id) => {
            const preciosProducto = item.precios.split(';');
            const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
            item.subtotal = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;
        });

        // Actualizar precios mostrados en los items
        document.querySelectorAll('.registro-item').forEach(registro => {
            const id = registro.dataset.id;
            const producto = productos.find(p => p.id === id);
            if (producto) {
                const preciosProducto = producto.precios.split(';');
                const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
                const precio = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;
                const precioSpan = registro.querySelector('.precio');
                if (precioSpan) {
                    precioSpan.textContent = `Bs. ${precio.toFixed(2)}`;
                }
            }
        });

        actualizarCarritoUI();
    });
    actualizarBotonFlotante();
    botonFlotante.addEventListener('click', mostrarCarritoSalidas);
    const items = document.querySelectorAll('.registro-item');
    items.forEach(item => {
        item.addEventListener('click', () => agregarAlCarrito(item.dataset.id));
    });


    function aplicarFiltros() {
        const registros = document.querySelectorAll('.registro-item');
        const busqueda = normalizarTexto(inputBusqueda.value);
        const precioSeleccionado = selectPrecios.options[selectPrecios.selectedIndex].text;
        const botonCantidadActivo = document.querySelector('.filtros-opciones.cantidad-filter .btn-filtro.activado');
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Animación de ocultamiento
        registros.forEach(registro => {
            registro.style.opacity = '0';
            registro.style.transform = 'translateY(-20px)';
        });

        setTimeout(() => {
            // Ocultar elementos y procesar filtros
            registros.forEach(registro => registro.style.display = 'none');

            // Filtrar y ordenar
            const productosFiltrados = Array.from(registros).filter(registro => {
                const producto = productos.find(p => p.id === registro.dataset.id);
                const etiquetasProducto = producto.etiquetas.split(';').map(e => e.trim());
                let mostrar = true;

                // Filtro de etiquetas
                if (filtroNombreActual !== 'Todos') {
                    mostrar = mostrar && etiquetasProducto.includes(filtroNombreActual);
                }

                // Filtro de búsqueda
                if (mostrar && busqueda) {
                    mostrar = mostrar && (
                        normalizarTexto(producto.producto).includes(busqueda) ||
                        normalizarTexto(producto.gramos.toString()).includes(busqueda) ||
                        normalizarTexto(producto.codigo_barras).includes(busqueda)
                    );
                }

                return mostrar;
            });

            // Ordenamiento
            if (botonCantidadActivo) {
                const index = Array.from(botonesCantidad).indexOf(botonCantidadActivo);
                switch (index) {
                    case 0: productosFiltrados.sort((a, b) => parseInt(b.querySelector('.stock').textContent) - parseInt(a.querySelector('.stock').textContent)); break;
                    case 1: productosFiltrados.sort((a, b) => parseInt(a.querySelector('.stock').textContent) - parseInt(b.querySelector('.stock').textContent)); break;
                    case 2: productosFiltrados.sort((a, b) => a.querySelector('.nombre strong').textContent.localeCompare(b.querySelector('.nombre strong').textContent)); break;
                    case 3: productosFiltrados.sort((a, b) => b.querySelector('.nombre strong').textContent.localeCompare(a.querySelector('.nombre strong').textContent)); break;
                }
            }

            // Mostrar elementos filtrados con animación
            productosFiltrados.forEach((registro, index) => {
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
                if (precioSeleccionado) {
                    const preciosProducto = producto.precios.split(';');
                    const precioFiltrado = preciosProducto.find(p => p.split(',')[0] === precioSeleccionado);
                    if (precioFiltrado) {
                        const precio = parseFloat(precioFiltrado.split(',')[1]);
                        registro.querySelector('.precio').textContent = `Bs. ${precio.toFixed(2)}`;
                    }
                }
                contenedor.appendChild(registro);
            });

            // Mensaje vacío
            mensajeNoEncontrado.style.display = productosFiltrados.length === 0 ? 'block' : 'none';

        }, 200);
    }
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
    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });
    inputBusqueda.addEventListener('input', (e) => {
        aplicarFiltros();
    });
    botonesEtiquetas.forEach(boton => {
        boton.addEventListener('click', () => {
            botonesEtiquetas.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            filtroNombreActual = boton.textContent.trim();
            aplicarFiltros();
            scrollToCenter(boton, boton.parentElement);
        });
    });
    botonesCantidad.forEach(boton => {
        boton.addEventListener('click', () => {
            botonesCantidad.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            aplicarFiltros();
        });
    });
    selectPrecios.addEventListener('change', aplicarFiltros);


    function agregarAlCarrito(productoId) {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;
        if (producto.stock <= 0) {
            mostrarNotificacion({
                message: 'Este producto no tiene stock disponible en este momento.',
                type: 'warning',
                duration: 2000
            });
            return;
        }

        // Obtener el precio según la ciudad seleccionada actualmente
        const selectPrecios = document.querySelector('.precios-select');
        const ciudadSeleccionada = selectPrecios.options[selectPrecios.selectedIndex].text;
        const preciosProducto = producto.precios.split(';');
        const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
        const precioActual = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;

        // Vibrar el dispositivo si es compatible
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        // Agregar efecto visual al item
        const item = document.querySelector(`.registro-item[data-id="${productoId}"]`);
        if (item) {
            item.classList.add('agregado-al-carrito');
            setTimeout(() => {
                item.classList.remove('agregado-al-carrito');
            }, 500);
        }

        if (carritoSalidas.has(productoId)) {
            const itemCarrito = carritoSalidas.get(productoId);
            if (itemCarrito.cantidad < producto.stock) {
                itemCarrito.cantidad += 1;
                itemCarrito.subtotal = precioActual; // Actualizar el precio al actual

                if (item) {
                    const cantidadSpan = item.querySelector('.carrito-cantidad');
                    const stockSpan = item.querySelector('.stock');
                    if (cantidadSpan) cantidadSpan.textContent = itemCarrito.cantidad;
                    if (stockSpan) stockSpan.textContent = `${producto.stock - itemCarrito.cantidad} Und.`;
                }
            }
        } else {
            carritoSalidas.set(productoId, {
                ...producto,
                cantidad: 1,
                subtotal: precioActual // Usar el precio actual
            });

            if (item) {
                const cantidadSpan = item.querySelector('.carrito-cantidad');
                const stockSpan = item.querySelector('.stock');
                if (cantidadSpan) cantidadSpan.textContent = '1';
                if (stockSpan) stockSpan.textContent = `${producto.stock - 1} Und.`;
            }
        }

        actualizarCarritoLocal();
        actualizarBotonFlotante();
        actualizarCarritoUI();
        // Mostrar el carrito automáticamente si la pantalla es grande
        if (window.innerWidth >= 1024) {
            mostrarCarritoSalidas();
            setTimeout(() => {
                const inputCantidad = document.querySelector(`.carrito-item[data-id='${productoId}'] input[type='number']`);
                if (inputCantidad) inputCantidad.focus();
            }, 100);
        }
    }
    window.eliminarDelCarrito = (id) => {
        const itemToRemove = document.querySelector(`.carrito-item[data-id="${id}"]`);
        const item = carritoSalidas.get(id);

        // Actualizar contador y stock en el header
        const headerItem = document.querySelector(`.registro-item[data-id="${id}"]`);
        if (headerItem && item) {
            const cantidadSpan = headerItem.querySelector('.carrito-cantidad');
            const stockSpan = headerItem.querySelector('.stock');
            if (cantidadSpan) cantidadSpan.textContent = '';
            if (stockSpan) stockSpan.textContent = `${item.stock} Und.`;
        }

        if (itemToRemove) {
            itemToRemove.style.height = `${itemToRemove.offsetHeight}px`;
            itemToRemove.classList.add('eliminar-item');

            setTimeout(() => {
                itemToRemove.style.height = '0';
                itemToRemove.style.margin = '0';
                itemToRemove.style.padding = '0';

                setTimeout(() => {
                    carritoSalidas.delete(id);
                    actualizarCarritoLocal();
                    actualizarBotonFlotante();
                    itemToRemove.remove();

                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }

                    if (carritoSalidas.size === 0) {
                        ocultarAnuncioSecond();
                        mostrarNotificacion({
                            message: 'Carrito vacío',
                            type: 'info',
                            duration: 2000
                        });
                        return;
                    }

                    // Actualizar totales
                    const subtotal = Array.from(carritoSalidas.values())
                        .reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0);
                    const totalElement = document.querySelector('.total-final');
                    const subtotalElement = document.querySelector('.campo-vertical span:first-child');

                    if (subtotalElement && totalElement) {
                        subtotalElement.innerHTML = `<strong>Subtotal: </strong>Bs/.${subtotal.toFixed(2)}`;
                        totalElement.innerHTML = `<strong>Total Final: </strong>Bs/.${subtotal.toFixed(2)}`;

                        const descuentoInput = document.querySelector('.descuento');
                        const aumentoInput = document.querySelector('.aumento');
                        if (descuentoInput && aumentoInput) {
                            const descuentoValor = parseFloat(descuentoInput.value) || 0;
                            const aumentoValor = parseFloat(aumentoInput.value) || 0;
                            const totalCalculado = subtotal - descuentoValor + aumentoValor;
                            totalElement.innerHTML = `<strong>Total Final: </strong>Bs/.${totalCalculado.toFixed(2)}`;
                        }
                    }
                }, 300);
            }, 0);
        }
    };
    function actualizarBotonFlotante() {
        const botonFlotante = document.querySelector('.btn-flotante-salidas');
        if (!botonFlotante) return;

        botonFlotante.style.display = carritoSalidas.size > 0 ? 'flex' : 'none';
        botonFlotante.innerHTML = `
            <i class="bx bx-cart"></i>
            <span class="cantidad">${carritoSalidas.size}</span>
        `;
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
                                    <input type="number" value="${item.cantidad}" min="1" max="${item.stock}"
                                        onfocus="this.select()"
                                        onchange="actualizarCantidad('${item.id}', this.value)">
                                    <button class="btn-cantidad"style="color:var(--success)" onclick="ajustarCantidad('${item.id}', 1)">+</button>
                                </div>
                            </div>
                            <div class="subtotal-delete">
                                <div class="info-valores">
                                    <p class="stock-disponible">${item.stock - item.cantidad} Und.</p>
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
                                <input class="nombre-movimiento" type="text" autocomplete="off" placeholder=" " required>
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
                                            <option value="${cliente.nombre}(${cliente.id})">${cliente.nombre}</option>
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
    anuncioSecond.style.paddingBottom='70px'                            
    mostrarAnuncioSecond();

    const inputDescuento = anuncioSecond.querySelector('.descuento');
    const inputAumento = anuncioSecond.querySelector('.aumento');
    const totalFinal = anuncioSecond.querySelector('.total-final');

    function actualizarTotal() {
        const descuentoValor = parseFloat(inputDescuento.value) || 0;
        const aumentoValor = parseFloat(inputAumento.value) || 0;
        const totalCalculado = subtotal - descuentoValor + aumentoValor;

        totalFinal.innerHTML = `<strong>Total Final: </strong>Bs. ${totalCalculado.toFixed(2)}`;
    }

    inputDescuento.addEventListener('input', actualizarTotal);
    inputAumento.addEventListener('input', actualizarTotal);

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
        actualizarCarritoLocal();
        actualizarBotonFlotante();
        ocultarAnuncioSecond();
        mostrarNotificacion({
            message: 'Carrito limpiado exitosamente',
            type: 'success',
            duration: 2000
        });
        document.querySelector('.btn-flotante-saldias').style.display = 'none';
    });
}
    window.ajustarCantidad = (id, delta) => {
        const item = carritoSalidas.get(id);
        if (!item) return;

        const nuevaCantidad = item.cantidad + delta;
        if (nuevaCantidad > 0 && nuevaCantidad <= item.stock) {
            item.cantidad = nuevaCantidad;
            // Actualizar contador y stock en el header
            const headerItem = document.querySelector(`.registro-item[data-id="${id}"]`);
            if (headerItem) {
                const cantidadSpan = headerItem.querySelector('.carrito-cantidad');
                const stockSpan = headerItem.querySelector('.stock');
                if (cantidadSpan) cantidadSpan.textContent = nuevaCantidad;
                if (stockSpan) stockSpan.textContent = `${item.stock - nuevaCantidad} Und.`;
            }
            actualizarCarritoLocal();
            actualizarCarritoUI();
        }
    };
    window.actualizarCantidad = (id, valor) => {
        const item = carritoSalidas.get(id);
        if (!item) return;

        const cantidad = parseInt(valor);
        if (cantidad > 0 && cantidad <= item.stock) {
            item.cantidad = cantidad;
            // Actualizar contador en el header
            const headerCounter = document.querySelector(`.registro-item[data-id="${id}"] .carrito-cantidad`);
            if (headerCounter) {
                headerCounter.textContent = cantidad;
            }
            actualizarCarritoLocal();
            actualizarCarritoUI();
        }
    };
    function actualizarCarritoUI() {
        if (carritoSalidas.size === 0) {
            ocultarAnuncioSecond();
            document.querySelector('.btn-flotante-salidas').style.display = 'none';
            return;
        }

        // Actualiza solo la lista de items del carrito si el modal está abierto
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (anuncioSecond && anuncioSecond.querySelector('.carrito-items')) {
            // Vuelve a renderizar SOLO los items del carrito
            const carritoItemsDiv = anuncioSecond.querySelector('.carrito-items');
            // Guardar el HTML de los campos extra (carrito-total)
            const carritoTotalDiv = anuncioSecond.querySelector('.carrito-total');
            // Recalcular subtotal y total
            const subtotal = Array.from(carritoSalidas.values()).reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0);
            // Mantener los valores actuales de descuento y aumento si existen
            let descuentoValor = 0, aumentoValor = 0;
            if (carritoTotalDiv) {
                const descuentoInput = carritoTotalDiv.querySelector('.descuento');
                const aumentoInput = carritoTotalDiv.querySelector('.aumento');
                descuentoValor = descuentoInput ? parseFloat(descuentoInput.value) || 0 : 0;
                aumentoValor = aumentoInput ? parseFloat(aumentoInput.value) || 0 : 0;
            }
            const totalCalculado = subtotal - descuentoValor + aumentoValor;
            // Renderizar solo los productos y los campos extra actualizados
            carritoItemsDiv.innerHTML = `
                ${Array.from(carritoSalidas.values()).map(item => `
                    <div class="carrito-item" data-id="${item.id}">
                        <div class="item-info">
                            <h3>${item.producto} - ${item.gramos}gr</h3>
                            <div class="cantidad-control">
                                <button class="btn-cantidad" style="color:var(--error)" onclick="ajustarCantidad('${item.id}', -1)">-</button>
                                <input type="number" value="${item.cantidad}" min="1" max="${item.stock}"
                                    onfocus="this.select()"
                                    onchange="actualizarCantidad('${item.id}', this.value)">
                                <button class="btn-cantidad"style="color:var(--success)" onclick="ajustarCantidad('${item.id}', 1)">+</button>
                            </div>
                        </div>
                        <div class="subtotal-delete">
                            <div class="info-valores">
                                <p class="stock-disponible">${item.stock - item.cantidad} Und.</p>
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
                        <span class="total-final"><strong>Total Final: </strong>Bs. ${totalCalculado.toFixed(2)}</span>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-label'></i>
                        <div class="input">
                            <p class="detalle">Nombre del movimiento</p>
                            <input class="nombre-movimiento" type="text" autocomplete="off" placeholder=" " required>
                        </div>
                    </div>
                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class='bx bx-purchase-tag-alt'></i>
                            <div class="input">
                                <p class="detalle">Descuento</p>
                                <input class="descuento" type="number" autocomplete="off" placeholder=" " required value="${descuentoValor}">
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-plus'></i>
                            <div class="input">
                                <p class="detalle">Aumento</p>
                                <input class="aumento" type="number" autocomplete="off" placeholder=" " required value="${aumentoValor}">
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
                                        <option value="${cliente.nombre}(${cliente.id})">${cliente.nombre}</option>
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
            `;
            // Volver a enlazar eventos de descuento y aumento
            const inputDescuento = carritoItemsDiv.querySelector('.descuento');
            const inputAumento = carritoItemsDiv.querySelector('.aumento');
            const totalFinal = carritoItemsDiv.querySelector('.total-final');
            function actualizarTotal() {
                const descuentoValor = parseFloat(inputDescuento.value) || 0;
                const aumentoValor = parseFloat(inputAumento.value) || 0;
                const totalCalculado = subtotal - descuentoValor + aumentoValor;
                totalFinal.innerHTML = `<strong>Total Final: </strong>Bs. ${totalCalculado.toFixed(2)}`;
            }
            if (inputDescuento && inputAumento && totalFinal) {
                inputDescuento.addEventListener('input', actualizarTotal);
                inputAumento.addEventListener('input', actualizarTotal);
            }
            configuracionesEntrada();
        }
    }
    function actualizarCarritoLocal() {
        localStorage.setItem('damabrava_carrito', JSON.stringify(Array.from(carritoSalidas.entries())));
    }


    async function registrarSalida() {
        const clienteSelect = document.querySelector('.select-cliente');
        const nombreMovimiento = document.querySelector('.nombre-movimiento');
        const estadoSelect = document.querySelector('.select');  // Nuevo

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
        const registroSalida = {
            fechaHora: fecha,
            tipo: 'Salida',
            idProductos: Array.from(carritoSalidas.values()).map(item => item.id).join(';'),  // Nuevo
            productos: Array.from(carritoSalidas.values()).map(item => `${item.producto} - ${item.gramos}gr`).join(';'),
            cantidades: Array.from(carritoSalidas.values()).map(item => item.cantidad).join(';'),
            operario: `${usuarioInfo.nombre} ${usuarioInfo.apellido}`,
            clienteId: clienteSelect.value,
            nombre_movimiento: nombreMovimiento.value,
            subtotal: Array.from(carritoSalidas.values()).reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0),
            descuento: parseFloat(document.querySelector('.descuento').value) || 0,
            aumento: parseFloat(document.querySelector('.aumento').value) || 0,
            total: 0,
            observaciones: document.querySelector('.observaciones').value || 'Ninguna',
            precios_unitarios: Array.from(carritoSalidas.values())
                .map(item => parseFloat(item.subtotal).toFixed(2))
                .join(';'),
            estado: estadoSelect.value  // Nuevo
        };

        registroSalida.total = registroSalida.subtotal - registroSalida.descuento + registroSalida.aumento;

        try {
            const signal = await mostrarProgreso('.pro-salida')
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

            // Actualizar el stock en Almacen general
            const actualizacionesStock = Array.from(carritoSalidas.values()).map(item => ({
                id: item.id,
                cantidad: item.cantidad
            }));

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
            localStorage.removeItem('damabrava_carrito');
            document.querySelector('.btn-flotante-salidas').style.display = 'none';

            ocultarProgreso('.pro-salida')
            mostrarNotificacion({
                message: 'Salida registrada exitosamente',
                type: 'success',
                duration: 3000
            });
            registrarNotificacion(
                'Administración',
                'Creación',
                usuarioInfo.nombre + 'registro una salida de almacen' + ' para: ' + clienteSelect.value)

            await mostrarSalidas();
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
            ocultarProgreso('.pro-salida')
        }
    }
    window.registrarSalida = registrarSalida;

    aplicarFiltros();
}