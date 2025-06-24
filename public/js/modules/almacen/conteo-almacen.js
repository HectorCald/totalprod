let productos = [];
let etiquetas = [];


const DB_NAME = 'damabrava_db';
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
async function limpiarCacheImagenes() {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        console.log('🧹 Cache limpiado completamente');
    } catch (error) {
        console.error('Error limpiando cache:', error);
    }
}
async function limpiarImagenesAntiguas() {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const unDia = 24 * 60 * 60 * 1000;
        const ahora = Date.now();

        store.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (ahora - cursor.value.timestamp > unDia) {
                    store.delete(cursor.key);
                    console.log(`🗑️ Eliminada imagen antigua: ${cursor.key}`);
                }
                cursor.continue();
            }
        };
    } catch (error) {
        console.error('Error limpiando imágenes antiguas:', error);
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

export async function mostrarConteo() {
    renderInitialHTML(); // Render initial HTML immediately
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    // Load data in parallel
    const [almacenGeneral, etiquetasResult] = await Promise.all([
        obtenerAlmacenGeneral(),
        obtenerEtiquetas(),
    ]);

    await updateHTMLWithData(); // Update HTML once data is loaded
    eventosConteo();
    

}
function renderInitialHTML() {
    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Conteo fisico</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="busqueda">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="buscar-producto" placeholder="">
                    </div>
                </div>
                <div class="acciones-grande">
                    <button class="vista-previa btn orange"><i class='bx bx-show'></i> <span>Vista previa</span></button>
                </div>
            </div>
            
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro activado">Todos</button>
                ${Array(5).fill().map(() => `
                    <div class="skeleton skeleton-etiqueta"></div>
                `).join('')}
            </div>
            <div class="filtros-opciones cantidad-filter">
                <button class="btn-filtro"><i class='bx bx-sort-down'></i> Descendente</button>
                <button class="btn-filtro"><i class='bx bx-sort-up'></i> Ascendente</button>
                <button class="btn-filtro"><i class='bx bx-sort-a-z'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-z-a'></i></button>
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
        <div class="anuncio-botones">
            <button class="vista-previa btn orange"><i class='bx bx-show'></i> Vista previa</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '70px';
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
        return `
            <div class="registro-item" data-id="${producto.id}">
                <div class="header">
                    ${imagenMostrar}
                    <div class="info-header">
                        <span class="id">${producto.id}
                            <div class="precio-cantidad">
                                <span class="valor stock" style="display:none">${producto.stock} Und.</span>
                                <input type="number" class="stock-fisico" value="${producto.stock}" min="0">
                            </div>
                        </span>
                        <span class="nombre"><strong>${producto.producto} - ${producto.gramos}gr.</strong></span>
                        <span class="etiquetas">${producto.etiquetas.split(';').join(' • ')}</span>
                    </div>
                </div>
            </div>
        `;
    }));
    
    productosContainer.innerHTML = productosHTML.join('');
}


function eventosConteo() {
    const botonesEtiquetas = document.querySelectorAll('.filtros-opciones.etiquetas-filter .btn-filtro');
    const botonesCantidad = document.querySelectorAll('.filtros-opciones.cantidad-filter .btn-filtro');

    const inputBusqueda = document.querySelector('.buscar-producto');

    const vistaPrevia = document.querySelectorAll('.vista-previa');

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


    function aplicarFiltros() {
        const registros = document.querySelectorAll('.registro-item');
        const busqueda = normalizarTexto(inputBusqueda.value);
        const botonCantidadActivo = document.querySelector('.filtros-opciones.cantidad-filter .btn-filtro.activado');
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Animación de ocultamiento
        registros.forEach(registro => {
            registro.style.opacity = '0';
            registro.style.transform = 'translateY(-20px)';
        });

        setTimeout(() => {
            registros.forEach(registro => registro.style.display = 'none');

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

            // ORDENAMIENTO CORREGIDO
            if (botonCantidadActivo) {
                const index = Array.from(botonesCantidad).indexOf(botonCantidadActivo);
                switch (index) {
                    case 0: productosFiltrados.sort((a, b) => parseInt(b.querySelector('.stock').textContent) - parseInt(a.querySelector('.stock').textContent)); break;
                    case 1: productosFiltrados.sort((a, b) => parseInt(a.querySelector('.stock').textContent) - parseInt(b.querySelector('.stock').textContent)); break;
                    case 2: productosFiltrados.sort((a, b) => a.querySelector('.nombre strong').textContent.localeCompare(b.querySelector('.nombre strong').textContent)); break;
                    case 3: productosFiltrados.sort((a, b) => b.querySelector('.nombre strong').textContent.localeCompare(a.querySelector('.nombre strong').textContent)); break;
                }
            }

            const contenedor = document.querySelector('.productos-container');
            productosFiltrados.forEach(registro => {
                contenedor.appendChild(registro);
            });

            // Mostrar elementos filtrados con animación
            productosFiltrados.forEach((registro, index) => {
                registro.style.display = 'flex';
                registro.style.opacity = '0';
                registro.style.transform = 'translateY(20px)';

                setTimeout(() => {
                    registro.style.opacity = '1';
                    registro.style.transform = 'translateY(0)';
                }, 20);
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
            scrollToCenter(boton, boton.parentElement);
        });
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
            ${productos.map(producto => {
            const stockActual = parseInt(producto.stock);
            const stockContado = parseInt(stockFisico[producto.id] || producto.stock);
            const diferencia = stockContado - stockActual;
            const colorDiferencia = diferencia > 0 ? '#4CAF50' : diferencia < 0 ? '#f44336' : '#2196F3';

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
        }).join('')}
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
                const signal = await mostrarProgreso('.pro-registro');
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
                ocultarProgreso('.pro-registro');
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

    aplicarFiltros();

}
