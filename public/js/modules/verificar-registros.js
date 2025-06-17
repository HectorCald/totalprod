let registrosProduccion = [];
let productosGlobal = [];
let reglasProduccion = [];
let reglasBase = [];
let preciosBase = {
    etiquetado: 0.016,
    envasado: 0.048,
    sellado: 0.006,
    cernido: 0.08
};
let nombresUsuariosGlobal = [];
const DB_NAME = 'damabrava_db';
const DB_NAME_IMG ='damabrava_db_img'
const STORE_NAME = 'imagenes_cache';
const REGISTROS_STORE = 'registros_verificacion';
const REGISTROS_PRODUCCION_STORE = 'registros_produccion';


async function obtenerNombresUsuarios() {
    try {
        const response = await fetch('/obtener-nombres-usuarios');
        const data = await response.json();
        if (data.success) {
            nombresUsuariosGlobal = data.nombres;
            return true;
        }
        throw new Error('Error al obtener nombres de usuarios');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion({
            message: 'Error al obtener nombres de usuarios',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}


async function initDB() {
    return new Promise((resolve, reject) => {
        // Primero intentar obtener la versión actual de la base de datos
        const request = indexedDB.open(DB_NAME);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const currentVersion = db.version;
            db.close();
            
            // Abrir la base de datos con la versión actual + 1
            const upgradeRequest = indexedDB.open(DB_NAME, currentVersion + 1);
            
            upgradeRequest.onerror = () => reject(upgradeRequest.error);
            upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);
            
            upgradeRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(REGISTROS_STORE)) {
                    db.createObjectStore(REGISTROS_STORE, { keyPath: 'id' });
                }
            };
        };
    });
}
function initDB2() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME_IMG, 1);

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
        const db = await initDB2();

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
        const db = await initDB2();
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



async function obtenerReglasBase() {
    try {
        const response = await fetch('/obtener-reglas-base');
        const data = await response.json();

        if (data.success) {
            reglasBase = data.reglasBase
                .sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA;
                });

            // Actualizar preciosBase con valores del servidor si es necesario
            data.reglasBase.forEach(regla => {
                if (regla.nombre === 'Etiquetado') preciosBase.etiquetado = parseFloat(regla.precio);
                if (regla.nombre === 'Envasado') preciosBase.envasado = parseFloat(regla.precio);
                if (regla.nombre === 'Sellado') preciosBase.sellado = parseFloat(regla.precio);
                if (regla.nombre === 'Cernido') preciosBase.cernido = parseFloat(regla.precio);
            });

            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener reglas base',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener reglas base:', error);
        mostrarNotificacion({
            message: 'Error al obtener reglas base',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerReglas() {
    try {
        await obtenerReglasBase();
        const response = await fetch('/obtener-reglas');
        const data = await response.json();

        if (data.success) {
            // Filtrar registros por el email del usuario actual y ordenar de más reciente a más antiguo
            reglasProduccion = data.reglas
                .sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA; // Orden descendente por número de ID
                });

            return true;

        } else {
            mostrarNotificacion({
                message: 'Error la reglas',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error las reglas', error);
        mostrarNotificacion({
            message: 'Error las reglas',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerRegistrosProduccion() {
    try {
        const registrosCache = await obtenerRegistrosLocal();
        
        // Si hay registros en caché, actualizar la UI inmediatamente
        if (registrosCache.length > 0) {
            registrosProduccion = registrosCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            updateHTMLWithData();
        }

        const response = await fetch('/obtener-registros-produccion');
        const data = await response.json();

        if (data.success) {
            registrosProduccion = data.registros.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });

            // Verificar si hay diferencias entre el caché y los nuevos datos
            if (JSON.stringify(registrosCache) !== JSON.stringify(registrosProduccion)) {
                console.log('Diferencias encontradas, actualizando UI');
                updateHTMLWithData();
            }

            // Siempre actualizar el caché con los nuevos datos
            try {
                const db = await initDB();
                const tx = db.transaction(REGISTROS_STORE, 'readwrite');
                const store = tx.objectStore(REGISTROS_STORE);
                
                // Limpiar todos los registros existentes
                await store.clear();
                
                // Guardar los nuevos registros
                for (const registro of registrosProduccion) {
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

            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener registros de producción',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener registros:', error);
        mostrarNotificacion({
            message: 'Error al obtener registros de producción',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerProductos() {
    try {
        const response = await fetch('/obtener-productos');
        const data = await response.json();

        if (data.success) {
            // Guardar los productos en la variable global y ordenarlos por ID
            productosGlobal = data.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Orden descendente por número de ID
            });

            // Procesar y guardar todas las imágenes antes de retornar
            await Promise.all(productosGlobal.map(async producto => {
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


function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Registros producción</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
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
                        <input type="text" class="buscar-registro-verificacion" placeholder="">
                    </div>
                    <button class="btn-calendario"><i class='bx bx-calendar'></i></button>
                </div>
                <div class="acciones-grande">
                    <button class="exportar-excel btn orange"><i class='bx bx-download'></i> <span>Descargar</span></button>
                    ${usuarioInfo.rol === 'Administración' ? `<button class="nuevo-pago btn especial"><i class='bx bx-dollar-circle'></i> <span>Nuevo pago</span></button>` : ''} 
                </div>
            </div>
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro activado" data-user="Todos">Todos</button>
                ${Array(5).fill().map(() => `
                    <div class="skeleton skeleton-etiqueta"></div>
                `).join('')}
            </div>
            <div class="filtros-opciones estado">
                <button class="btn-filtro activado">Todos</button>
                <button class="btn-filtro">Pendientes</button>
                <button class="btn-filtro">Verificados</button>
                <button class="btn-filtro">Observados</button>
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
            <button class="exportar-excel btn orange"><i class='bx bx-download'></i> Descargar registros</button>
            ${usuarioInfo.rol === 'Administración' ? `<button class="nuevo-pago btn especial"><i class='bx bx-dollar-circle'></i> Nuevo pago</button>` : ''} 
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '80px';
}
export async function mostrarVerificacion() {
    renderInitialHTML();
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    // Primero cargar los nombres de usuarios
    const usuariosCargados = await obtenerNombresUsuarios();
    if (!usuariosCargados) {
        mostrarNotificacion({
            message: 'Error al cargar los nombres de usuarios',
            type: 'error',
            duration: 3500
        });
        return;
    }

    // Luego cargar el resto de datos
    const [registrosProduccion, productos, reglas] = await Promise.all([
        obtenerRegistrosProduccion(),
        obtenerProductos(),
        obtenerReglas()
    ]);
}
function updateHTMLWithData() {
    // 2. Obtener usuarios únicos de los registros
    const usuariosUnicos = [...new Set(registrosProduccion.map(registro => registro.user))];

    // 3. Mapear cada user a su nombre correspondiente
    const etiquetasFilter = document.querySelector('.etiquetas-filter');
    const etiquetasHTML = usuariosUnicos.map(user => {
        // Buscar el usuario en nombresUsuariosGlobal
        const usuario = nombresUsuariosGlobal.find(u => u.user === user);
        // Si no encontramos el usuario, intentar buscar por el nombre del registro
        if (!usuario) {
            const registro = registrosProduccion.find(r => r.user === user);
            if (registro) {
                return `<button class="btn-filtro" data-user="${user}">${registro.nombre}</button>`;
            }
        }
        // Extraer solo la primera palabra del nombre
        const primerNombre = usuario?.nombre?.split(' ')[0] || 'Sin nombre';
        return `<button class="btn-filtro" data-user="${user}">${primerNombre}</button>`;
    }).join('');

    // 4. Insertar en el DOM
    etiquetasFilter.innerHTML = `
        <button class="btn-filtro activado" data-user="Todos">Todos</button>
        ${etiquetasHTML}
    `;

    const productosContainer = document.querySelector('.productos-container');
    const registrosLimitados = registrosProduccion.slice(0, 200);
    const productosHTML = registrosLimitados.map(registro => `
        <div class="registro-item" data-id="${registro.id}">
            <div class="header">
                <i class='bx bx-file'></i>
                <div class="info-header">
                    <span class="id">${registro.nombre}<span class="valor ${registro.fecha_verificacion && registro.observaciones === 'Sin observaciones' ? 'verificado' : registro.observaciones !== 'Sin observaciones' && registro.fecha_verificacion ? 'observado' : 'pendiente'}">${registro.fecha_verificacion && registro.observaciones === 'Sin observaciones' ? 'Verificado' : registro.observaciones !== 'Sin observaciones' && registro.fecha_verificacion ? 'Observado' : 'Pendiente'}</span></span>
                    <span class="nombre"><strong>${registro.producto} - ${registro.gramos}gr.</strong></span>
                    <span class="fecha">${registro.fecha}</span>
                </div>
            </div>
        </div>
    `).join('');

    const showMoreButton = registrosProduccion.length > 250 ? `
        <div class="show-more-container" style="text-align: center; display: flex; gap: 10px; justify-content: center;align-items:center;width:100%;min-height:70px;height:100%">
            <button class="btn show-more" style="background-color: var(--primary-color); color: white; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;width:100%;height:100%">
                <i class='bx bx-show'></i> Mostrar +50
            </button>
            <button class="btn show-all" style="background-color: var(--primary-color); color: white; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;width:100%;height:100%">
                <i class='bx bx-list-ul'></i> Mostrar todos
            </button>
        </div>
    ` : '';

    productosContainer.innerHTML = productosHTML + showMoreButton;
    eventosVerificacion();
}


function eventosVerificacion() {
    const btnExcel = document.querySelectorAll('.exportar-excel');
    const btnNuevoPagoGenerico = document.querySelectorAll('.nuevo-pago');
    const registrosAExportar = registrosProduccion;

    const botonesNombre = document.querySelectorAll('.etiquetas-filter .btn-filtro');
    const botonesEstado = document.querySelectorAll('.filtros-opciones.estado .btn-filtro');

    const items = document.querySelectorAll('.registro-item');
    const inputBusqueda = document.querySelector('.buscar-registro-verificacion');
    const botonCalendario = document.querySelector('.btn-calendario');

    function cargarMasRegistros() {
        const productosContainer = document.querySelector('.productos-container');
        const currentItems = document.querySelectorAll('.registro-item').length;
        const nextBatch = registrosProduccion.slice(currentItems, currentItems + 50);
        
        if (nextBatch.length > 0) {
            const newItemsHTML = nextBatch.map(registro => `
                <div class="registro-item" data-id="${registro.id}">
                    <div class="header">
                        <i class='bx bx-file'></i>
                        <div class="info-header">
                            <span class="id">${registro.nombre}<span class="valor ${registro.fecha_verificacion && registro.observaciones === 'Sin observaciones' ? 'verificado' : registro.observaciones !== 'Sin observaciones' && registro.fecha_verificacion ? 'observado' : 'pendiente'}">${registro.fecha_verificacion && registro.observaciones === 'Sin observaciones' ? 'Verificado' : registro.observaciones !== 'Sin observaciones' && registro.fecha_verificacion ? 'Observado' : 'Pendiente'}</span></span>
                            <span class="nombre"><strong>${registro.producto} - ${registro.gramos}gr.</strong></span>
                            <span class="fecha">${registro.fecha}</span>
                        </div>
                    </div>
                </div>
            `).join('');

            // Remove the show more button
            const showMoreContainer = document.querySelector('.show-more-container');
            if (showMoreContainer) {
                showMoreContainer.remove();
            }

            // Add new items
            productosContainer.insertAdjacentHTML('beforeend', newItemsHTML);

            // Add show more button again if there are more records
            if (currentItems + nextBatch.length < registrosProduccion.length) {
                productosContainer.insertAdjacentHTML('beforeend', `
                    <div class="show-more-container" style="text-align: center; display: flex; gap: 10px; justify-content: center;width:100%">
                        <button class="btn show-more" style="background-color: var(--primary-color); color: white; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;width:100%;height:100%">
                            <i class='bx bx-show'></i> Mostrar +50
                        </button>
                        <button class="btn show-all" style="background-color: var(--primary-color); color: white; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;width:100%;height:100%">
                            <i class='bx bx-list-ul'></i> Mostrar todos
                        </button>
                    </div>
                `);

                // Reattach event listeners to the new buttons
                document.querySelector('.show-more').addEventListener('click', cargarMasRegistros);
                document.querySelector('.show-all').addEventListener('click', cargarTodosLosRegistros);
                aplicarFiltros();
            }

            // Reattach event listeners to new items
            const newItems = document.querySelectorAll('.registro-item');
            newItems.forEach(item => {
                item.addEventListener('click', function() {
                    const registroId = this.dataset.id;
                    window.info(registroId);
                });
            });
        }
    }
    function cargarTodosLosRegistros() {
        const productosContainer = document.querySelector('.productos-container');
        const currentItems = document.querySelectorAll('.registro-item').length;
        const remainingRecords = registrosProduccion.slice(currentItems);
        
        if (remainingRecords.length > 0) {
            const newItemsHTML = remainingRecords.map(registro => `
                <div class="registro-item" data-id="${registro.id}">
                    <div class="header">
                        <i class='bx bx-file'></i>
                        <div class="info-header">
                            <span class="id">${registro.nombre}<span class="valor ${registro.fecha_verificacion && registro.observaciones === 'Sin observaciones' ? 'verificado' : registro.observaciones !== 'Sin observaciones' && registro.fecha_verificacion ? 'observado' : 'pendiente'}">${registro.fecha_verificacion && registro.observaciones === 'Sin observaciones' ? 'Verificado' : registro.observaciones !== 'Sin observaciones' && registro.fecha_verificacion ? 'Observado' : 'Pendiente'}</span></span>
                            <span class="nombre"><strong>${registro.producto} - ${registro.gramos}gr.</strong></span>
                            <span class="fecha">${registro.fecha}</span>
                        </div>
                    </div>
                </div>
            `).join('');

            // Remove the buttons container
            const showMoreContainer = document.querySelector('.show-more-container');
            if (showMoreContainer) {
                showMoreContainer.remove();
            }

            // Add all remaining items
            productosContainer.insertAdjacentHTML('beforeend', newItemsHTML);
            aplicarFiltros();

            // Reattach event listeners to new items
            const newItems = document.querySelectorAll('.registro-item');
            newItems.forEach(item => {
                item.addEventListener('click', function() {
                    const registroId = this.dataset.id;
                    window.info(registroId);
                });
            });
        }
    }

    // Add event listeners to initial buttons
    const showMoreBtn = document.querySelector('.show-more');
    const showAllBtn = document.querySelector('.show-all');

    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', cargarMasRegistros);
    }

    if (showAllBtn) {
        showAllBtn.addEventListener('click', cargarTodosLosRegistros);
    }

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
    const cleanupPullToRefresh = window.initPullToRefresh(contenedor, async () => {
        await mostrarVerificacion();
    });


    let filtroFechaInstance = null;
    let filtroNombreActual = localStorage.getItem('filtroNombresProduccion') === 'undefined'? 'Todos':localStorage.getItem('filtroNombresProduccion') ;
    let filtroEstadoActual = 'Todos';

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
    function aplicarFiltros() {
        const fechasSeleccionadas = filtroFechaInstance?.selectedDates || [];
        const busqueda = normalizarTexto(inputBusqueda.value);
        const items = document.querySelectorAll('.registro-item');
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Primero, filtrar todos los registros
        const registrosFiltrados = Array.from(items).map(registro => {
            const registroData = registrosProduccion.find(r => r.id === registro.dataset.id);
            if (!registroData) return { elemento: registro, mostrar: false };

            let mostrar = true;

            // Lógica de filtrado existente
            if (filtroEstadoActual && filtroEstadoActual !== 'Todos') {
                if (filtroEstadoActual === 'Pendientes') {
                    mostrar = !registroData.fecha_verificacion;
                } else if (filtroEstadoActual === 'Verificados') {
                    mostrar = !!registroData.fecha_verificacion;
                } else if (filtroEstadoActual === 'Observados') {
                    mostrar = registroData.fecha_verificacion && registroData.observaciones !== 'Sin observaciones';
                }
            }
            
            if (mostrar && filtroNombreActual && filtroNombreActual !== 'Todos') {
                mostrar = registroData.user === filtroNombreActual;
            }
            if (mostrar && fechasSeleccionadas.length === 2) {
                const [dia, mes, anio] = registroData.fecha.split('/');
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
                    registroData.gramos?.toString(),
                    registroData.lote?.toString(),
                    registroData.fecha,
                    registroData.nombre,
                    registroData.proceso
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
        boton.classList.remove('activado');
        if(filtroNombreActual !== 'todos'){
            if (boton.dataset.user === filtroNombreActual) {
                boton.classList.add('activado');
            }
        }
        boton.addEventListener('click', () => {
            botonesNombre.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            filtroNombreActual = boton.dataset.user;
            aplicarFiltros();
            scrollToCenter(boton, boton.parentElement);
            localStorage.setItem('filtroNombresProduccion', filtroNombreActual);
        });
    });
    botonesEstado.forEach(boton => {
        if(boton.classList.contains('activado')){
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
    window.info = async function (registroId) {
        const registro = registrosProduccion.find(r => r.id === registroId);
        if (!registro) return;


        const producto = productosGlobal.find(p => p.id === registro.idProducto);
        const cantidadPorGrupo = producto ? producto.cantidadxgrupo : 1;
        const numeroADividir = registro.fecha_verificacion ? registro.c_real : registro.envases_terminados;
        const tirasCompletas = Math.floor(numeroADividir / cantidadPorGrupo);
        const unidadesSueltas = numeroADividir % cantidadPorGrupo;
        const unidadesTira = producto ? (cantidadPorGrupo <= 1 ? `${tirasCompletas} und.` : `${tirasCompletas} tiras`) : 'N/A';


        let imagenMostrar = '<i class=\'bx bx-package\'></i>';
        if (producto.imagen && producto.imagen.includes('https://res.cloudinary.com')) {
            const imagenCache = await obtenerImagenLocal(producto.id);
            if (imagenCache && !necesitaActualizacion(imagenCache, producto.imagen)) {
                imagenMostrar = `<img class="imagen" src="${imagenCache.data}" alt="${producto.producto}" 
                            onerror="this.parentElement.innerHTML='<i class=\\'bx bx-package\\'></i>'">`;
            }
        }

        const contenido = document.querySelector('.anuncio-second .contenido');
        const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">${registro.producto}</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <div class="imagen-producto-registro">
                ${imagenMostrar}
            </div>
            <p class="normal">Información del producto</p>
            <div class="campo-vertical">
                <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                <span class="valor"><strong><i class="ri-scales-line"></i> Gramaje: </strong>${registro.gramos}gr.</span>
                <span class="valor"><strong><i class='bx bx-package'></i> Envases: </strong>${registro.envases_terminados} Und.</span>
                <span class="valor"><strong><i class='bx bx-hash'></i> Vencimiento: </strong>${registro.fecha_vencimiento}</span>
            </div>

            <p class="normal">Información básica</p>
            <div class="campo-vertical">
                <span class="nombre"><strong><i class='bx bx-user'></i> Operador: </strong>${registro.nombre}</span>
                <span class="fecha"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
            </div>

            <p class="normal">Detalles de producción</p>
            <div class="campo-vertical">
                <span class="valor"><strong><i class='bx bx-cog'></i> Selección/Cernido: </strong>${registro.proceso}</span>
                <span class="valor"><strong><i class='bx bx-bowl-hot'></i> Microondas: </strong>${registro.microondas}</span>
                <span class="valor"><strong><i class='bx bx-check-shield'></i> Envases terminados: </strong>${registro.envases_terminados}</span>
                <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha de vencimiento: </strong>${registro.fecha_vencimiento}</span>
            </div>

            <p class="normal">Detalles de verificación</p>
            <div class="campo-vertical">
                <span><strong><i class='bx bx-transfer'></i> Verificado:</strong> ${registro.fecha_verificacion ? `${registro.c_real} Und.` : 'Pendiente'}</span>
                ${registro.fecha_verificacion ? `<span><strong><i class='bx bx-calendar-check'></i> Fecha verificación:</strong> ${registro.fecha_verificacion}</span>` : ''}
                ${registro.fecha_verificacion ? `<span><strong><i class='bx bx-box'></i> Cantidad</strong> ${unidadesTira}</span>` : ''}
                ${registro.fecha_verificacion ? `<span><strong><i class='bx bx-box'></i> Sueltos:</strong> ${unidadesSueltas} und.</span>` : ''}
                ${registro.observaciones ? `<span><strong><i class='bx bx-comment-detail'></i>Observaciones: </strong> ${registro.observaciones}</span>` : ''}
            </div>
            
            ${registro.fecha_verificacion && usuarioInfo.rol === 'Administración' ? `
                ${(() => {
                    const calculado = calcularTotal(registro);
                    return `
                <p class="normal">Detalles de pago</p>
                <div class="campo-vertical">
                    <span><strong><i class='bx bx-dollar'></i> Envasado:</strong> Bs.${calculado.envasado.toFixed(2)}</span>
                    <span><strong><i class='bx bx-dollar'></i> Etiquetado:</strong> Bs.${calculado.etiquetado.toFixed(2)}</span>
                    <span><strong><i class='bx bx-dollar'></i> Sellado:</strong> Bs.${calculado.sellado.toFixed(2)}</span>
                    <span><strong><i class='bx bx-dollar'></i> Cernido:</strong> Bs.${calculado.cernido.toFixed(2)}</span>
                    <span><strong><i class='bx bx-dollar'></i> Total:</strong> Bs.${calculado.total.toFixed(2)}</span>
                </div>`;
                })()}
            ` : ''}
            
        </div>
        <div class="anuncio-botones">
            ${tienePermiso('edicion') && !registro.fecha_verificacion ? `<button class="btn-editar btn blue" data-id="${registro.id}"><i class='bx bx-edit'></i>Editar</button>` : ''}
            ${tienePermiso('eliminacion') && !registro.fecha_verificacion ? `<button class="btn-eliminar btn red" data-id="${registro.id}"><i class="bx bx-trash"></i>Eliminar</button>` : ''}
            ${tienePermiso('anulacion') && registro.fecha_verificacion ? `<button class="btn-anular btn yellow" data-id="${registro.id}"><i class='bx bx-x-circle'></i>Anular</button>` : ''}
            ${!registro.fecha_verificacion ? `<button class="btn-verificar btn green" data-id="${registro.id}"><i class='bx bx-check-circle'></i>Verificar</button>` : ''}
            ${registro.observaciones !== 'Sin observaciones' && registro.observaciones !== '' && registro.fecha_verificacion ? `<button class="btn-arreglado btn orange" data-id="${registro.id}"><i class='bx bx-check-circle'></i>Arreglado</button>` : ''}
        </div>
        `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '10px';
        if (tienePermiso('edicion') || tienePermiso('eliminacion') && !registro.fecha_verificacion) {
            contenido.style.paddingBottom = '80px';
        }
        if (tienePermiso('anulacion') && registro.fecha_verificacion) {
            contenido.style.paddingBottom = '80px';
        }
        if (!registro.fecha_verificacion) {
            contenido.style.paddingBottom = '80px';
        }

        mostrarAnuncioSecond();

        const btnVerificar = contenido.querySelector('.btn-verificar');
        const btnArreglado = contenido.querySelector('.btn-arreglado');


        if (tienePermiso('edicion') && !registro.fecha_verificacion) {
            const btnEditar = contenido.querySelector('.btn-editar');
            btnEditar.addEventListener('click', () => editar(registro));
        }
        if (tienePermiso('eliminacion') && !registro.fecha_verificacion) {
            const btnEliminar = contenido.querySelector('.btn-eliminar');
            btnEliminar.addEventListener('click', () => eliminar(registro));
        }
        if (tienePermiso('anulacion') && registro.fecha_verificacion) {
            const btnAnular = contenido.querySelector('.btn-anular');
            btnAnular.addEventListener('click', () => anular(registro));
        }
        if (btnVerificar) {
            btnVerificar.addEventListener('click', () => verificar(registro));
        }
        if (btnArreglado) {
            btnArreglado.addEventListener('click', () => arreglado(registro));
        }


        function eliminar(registro) {

            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Eliminar registro</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <p class="normal">Información básica</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Producto: </strong>${registro.producto}</span>
                    <span class="valor"><strong><i class="ri-scales-line"></i> Gramaje: </strong>${registro.gramos}gr.</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Envases: </strong>${registro.envases_terminados} Und.</span>
                    <span class="valor"><strong><i class='bx bx-hash'></i> Vencimiento: </strong>${registro.fecha_vencimiento}</span>
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
            contenido.style.paddingBottom = '80px';
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
                    const signal = await mostrarProgreso('.pro-delete')
                    const response = await fetch(`/eliminar-registro-produccion/${registroId}`, {
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
                        await obtenerRegistrosProduccion();
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
                            usuarioInfo.nombre + ' elimino el registro de producción: ' + registro.producto + ' Id: ' + registro.id + ' su motivo fue: ' + motivo)
                        registrarNotificacion(
                            registro.user,
                            'Eliminación',
                            usuarioInfo.nombre + ' elimino tu registro de producción: ' + registro.producto + ' Id: ' + registro.id + ' su motivo fue: ' + motivo)
                    } else {
                        throw new Error(data.error || 'Error al eliminar el registro');
                    }
                } catch (error) {
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al eliminar el registro',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-delete')
                }
            }
        }
        function editar(registro) {

            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Editar registro</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer');"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno editar-produccion">
                <p class="normal">Información basica</p>
                    <div class="entrada">
                        <i class='bx bx-cube'></i>
                        <div class="input">
                            <p class="detalle">Producto</p>
                            <input class="producto" type="text" value="${registro.producto}" autocomplete="off" placeholder=" " required>
                        </div>
                    </div>
                    <div class="sugerencias" id="productos-list"></div>
                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class="ri-scales-line"></i>
                            <div class="input">
                                <p class="detalle">Gramaje</p>
                                <input class="gramaje" type="number" value="${registro.gramos}" autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-barcode'></i>
                            <div class="input">
                                <p class="detalle">Lote</p>
                                <input class="lote" type="number" autocomplete="off" value="${registro.lote}" placeholder=" " required>
                            </div>
                        </div>
                    </div>
                    
                <p class="normal">Información del proceso</p>
                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class='bx bx-cog'></i>
                            <div class="input">
                                <p class="detalle">Proceso</p>
                                <select class="select" required>
                                    <option value="${registro.proceso}" selected>${registro.proceso}</option>
                                    <option value="Seleccion">Selección</option>
                                    <option value="Cernido">Cernido</option>
                                    <option value="Ninguno">Ninguno</option>
                                </select>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-bowl-hot'></i>
                            <div class="input">
                                <p class="detalle">Microondas</p>
                                <input class="microondas" type="text" value="${registro.microondas}" autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                    </div>
                <p class="normal">Información del acabado</p>
                    <div class="entrada">
                        <i class='bx bx-check-shield'></i>
                        <div class="input">
                            <p class="detalle">Terminados</p>
                            <input class="terminados" type="number" value="${registro.envases_terminados}" autocomplete="off" placeholder=" " required>
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-calendar'></i>
                        <div class="input">
                            <p class="detalle">vencimiento</p>
                            <input class="vencimiento" type="month" value="${registro.fecha_vencimiento}" placeholder=" " required>
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
                            <p>Estás por editar un registro del sistema. Asegúrate de realizar los cambios correctamente, ya que podrían modificar información relacionada.</p>
                        </div>
                    </div>

            </div>
            <div class="anuncio-botones">
                <button class="btn-editar-registro btn blue"><i class="bx bx-save"></i> Guardar cambios</button>
            </div>
        `;
            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            const productoInput = document.querySelector('.entrada .producto');
            const sugerenciasList = document.querySelector('#productos-list');
            const gramajeInput = document.querySelector('.entrada .gramaje');

            function normalizarTexto(texto) {
                return texto
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
                    .replace(/[-\s]+/g, ""); // Eliminar guiones y espacios
            }
            productoInput.addEventListener('input', (e) => {
                const valor = normalizarTexto(e.target.value);

                sugerenciasList.innerHTML = '';

                if (valor) {
                    const sugerencias = productosGlobal.filter(p =>
                        normalizarTexto(p.producto).includes(valor)
                    ).slice(0, 5);

                    if (sugerencias.length) {
                        sugerenciasList.style.display = 'flex';
                        sugerencias.forEach(p => {
                            const div = document.createElement('div');
                            div.classList.add('item');
                            div.textContent = p.producto + ' ' + p.gramos + 'gr.';
                            div.onclick = () => {
                                productoInput.value = p.producto;
                                sugerenciasList.style.display = 'none';
                                gramajeInput.value = p.gramos;
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
            const btnEditar = contenido.querySelector('.btn-editar-registro');
            btnEditar.addEventListener('click', confirmarEdicion);

            async function confirmarEdicion() {
                const idProdducto = window.idPro;
                const producto = document.querySelector('.editar-produccion .producto').value;
                const gramos = document.querySelector('.editar-produccion .gramaje').value;
                const lote = document.querySelector('.editar-produccion .lote').value;
                const proceso = document.querySelector('.editar-produccion .select').value;
                const microondas = document.querySelector('.editar-produccion .microondas').value;
                const envases_terminados = document.querySelector('.editar-produccion .terminados').value;
                const fecha_vencimiento = document.querySelector('.editar-produccion .vencimiento').value;
                const motivo = document.querySelector('.editar-produccion .motivo').value;
                if (!motivo) { // Solo el campo "Motivo" es obligatorio
                    mostrarNotificacion({
                        message: 'Debe ingresar el motivo de la edición',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    const signal = await mostrarProgreso('.pro-edit')
                    const response = await fetch(`/editar-registro-produccion/${registroId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            idPro: idProdducto,
                            producto,
                            gramos,
                            lote,
                            proceso,
                            microondas,
                            envases_terminados,
                            fecha_vencimiento,
                            motivo
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        await obtenerRegistrosProduccion();
                        info(registroId);
                        updateHTMLWithData();
                        mostrarNotificacion({
                            message: 'Registro actualizado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Edición',
                            usuarioInfo.nombre + ' edito el registro de producción: ' + registro.producto + ' Id: ' + registro.id + ' su motivo fue: ' + motivo)
                        registrarNotificacion(
                            registro.user,
                            'Edición',
                            usuarioInfo.nombre + ' edito tu registro de producción: ' + registro.producto + ' Id: ' + registro.id + ' su motivo fue: ' + motivo)
                    } else {
                        throw new Error(data.error || 'Error al actualizar el registro');
                    }
                } catch (error) {
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al actualizar el registro',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-edit')
                }
            }
        }
        function verificar(registro) {

            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Verificar registro</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno verificar-registro">
               <p class="normal">Información básica</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Producto: </strong>${registro.producto}</span>
                    <span class="valor"><strong><i class="ri-scales-line"></i> Gramaje: </strong>${registro.gramos}gr.</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Envases: </strong>${registro.envases_terminados} Und.</span>
                    <span class="valor"><strong><i class='bx bx-hash'></i> Vencimiento: </strong>${registro.fecha_vencimiento}</span>
                </div>
                <p class="normal">Verificación</p>
                <div class="entrada">
                    <i class='bx bx-hash'></i>
                    <div class="input">
                        <p class="detalle">Cantidad real</p>
                        <input class="cantidad_real" type="number" autocomplete="off" placeholder=" " required>
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-comment-detail'></i>
                    <div class="input">
                        <p class="detalle">Observaciones</p>
                        <input class="observaciones" type="text" autocomplete="off" placeholder=" " required>
                    </div>
                </div>
                <div class="info-sistema">
                    <i class='bx bx-info-circle'></i>
                    <div class="detalle-info">
                        <p>Estás por verificar un registro del sistema. Esta acción restara el peso de la cantidad verificada por el gramaje de dicho producto en almacen acopio, asegurate de ingresar la cantidad correcta para evitar anulaciones posteriores.</p>
                    </div>
                </div>

            </div>
            <div class="anuncio-botones">
                <button class="btn-verificar-registro btn green"><i class='bx bx-check-circle'></i> Verificar y finalizar</button>
            </div>
            `;
            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            // Agregar evento al botón guardar
            const btnVerificar = contenido.querySelector('.btn-verificar-registro');
            btnVerificar.addEventListener('click', confirmarVerificacion);

            async function confirmarVerificacion() {
                const cantidadRealInput = document.querySelector('.verificar-registro .cantidad_real');
                const observacionesInput = document.querySelector('.verificar-registro .observaciones');

                if (!cantidadRealInput || !observacionesInput) {
                    mostrarNotificacion({
                        message: 'Error al acceder a los campos del formulario',
                        type: 'error',
                        duration: 3500
                    });
                    return;
                }

                const cantidadReal = cantidadRealInput.value.trim();
                const observaciones = observacionesInput.value.trim();

                if (!cantidadReal) {
                    mostrarNotificacion({
                        message: 'Debe ingresar la cantidad real verificada',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    const signal = await mostrarProgreso('.pro-verificado')
                    const registro = registrosProduccion.find(r => r.id === registroId);

                    const response = await fetch(`/verificar-registro-produccion/${registroId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            cantidad_real: cantidadReal,
                            observaciones: observaciones || 'Sin observaciones'
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        await obtenerRegistrosProduccion();
                        info(registroId);
                        updateHTMLWithData();
                        mostrarNotificacion({
                            message: 'Registro verificado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Verificación',
                            usuarioInfo.nombre + ' verifico el registro de producciòn: ' + registro.producto + ' Id: ' + registro.id + ' Observaciones: ' + observaciones)
                        registrarNotificacion(
                            registro.user,
                            'Verificación',
                            usuarioInfo.nombre + ' verifico tu registro de producción: ' + registro.producto + ' Id: ' + registro.id + ' Observaciones: ' + observaciones)
                    } else {
                        throw new Error(data.error || 'Error al verificar el registro');
                    }
                } catch (error) {
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al verificar el registro',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-verificado')
                }
            }
        }
        function anular(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">Anular verificación</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno verificar-registro">
            <p class="normal">Información del registro</p>
            <div class="campo-vertical">
                <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                <span class="nombre"><strong><i class='bx bx-id-card'></i> Producto: </strong>${registro.producto}</span>
                <span class="valor"><strong><i class="ri-scales-line"></i> Gramaje: </strong>${registro.gramos}gr.</span>
                <span class="valor"><strong><i class='bx bx-package'></i> Envases: </strong>${registro.envases_terminados} Und.</span>
                <span class="valor"><strong><i class='bx bx-hash'></i> Vencimiento: </strong>${registro.fecha_vencimiento}</span>
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
                    <p>Estás por anular verificación de un registro del sistema. Esta acción no lo eliminará, pero quitara la fecha y la cantidad verificada, esto prodria afectar al peso de dicho producto en almacen acopio.</p>
                </div>
            </div>

        </div>
        <div class="anuncio-botones">
            <button class="btn-anular-verificacion btn red"><i class='bx bx-x-circle'></i> Anular verificación</button>
        </div>
    `;
            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            const btnAnularVerificacion = contenido.querySelector('.btn-anular-verificacion');
            btnAnularVerificacion.addEventListener('click', confirmarAnulacion);

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
                    const signal = await mostrarProgreso('.pro-anulado')
                    const response = await fetch(`/anular-verificacion-produccion/${registro.id}`, {
                        method: 'PUT',
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
                        await obtenerRegistrosProduccion();
                        info(registroId);
                        updateHTMLWithData();
                        mostrarNotificacion({
                            message: 'Verificación anulada correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Información',
                            usuarioInfo.nombre + ' anulo el registro de producciòn: ' + registro.producto + ' Id: ' + registro.id + ' su motivo fue: ' + motivo)
                        registrarNotificacion(
                            registro.user,
                            'Información',
                            usuarioInfo.nombre + ' anulo tu registro de producción: ' + registro.producto + ' Id: ' + registro.id + ' su motivo fue: ' + motivo)

                    } else {
                        throw new Error(data.error || 'Error al anular la verificación');
                    }
                } catch (error) {
                    if (error.message === 'cancelled') {
                        console.log('Operación cancelada por el usuario');
                        return;
                    }
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al anular la verificación',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarProgreso('.pro-anulado')
                }
            }
        }
        async function arreglado(registro) {
            try {
                const signal = await mostrarProgreso('.pro-edit')
                const response = await fetch(`/actualizar-observaciones-registro/${registro.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        observaciones: 'Sin observaciones'
                    })
                });

                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }

                const data = await response.json();

                if (data.success) {
                    await obtenerRegistrosProduccion();
                    info(registroId);
                    updateHTMLWithData();
                    mostrarNotificacion({
                        message: 'Se marcó como arreglado correctamente',
                        type: 'success',
                        duration: 3000
                    });
                } else {
                    throw new Error(data.error || 'Error al marcar como arreglado');
                }
            } catch (error) {
                if (error.message === 'cancelled') {
                    console.log('Operación cancelada por el usuario');
                    return;
                }
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al marcar como arreglado',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarProgreso('.pro-edit')
            }
        }

    }

    btnExcel.forEach(btn => {
        btn.addEventListener('click', () => exportarArchivos('produccion', registrosAExportar));
    })
    btnNuevoPagoGenerico.forEach(btn => {
        btn.addEventListener('click', mostrarFormularioNuevoPago);
    })

    function calcularTotal(registro) {
        // Declarar todas las variables necesarias
        const normalizedNombre = normalizarTexto(registro.producto);
        const cantidad = parseFloat(registro.c_real) || 0;
        const gramaje = parseFloat(registro.gramos) || 0;
        const seleccion = registro.proceso || 'Ninguno';

        let multiplicadores = {
            etiquetado: '1',
            sellado: '1',
            envasado: '1',
            cernido: preciosBase.cernido
        };

        // Primero buscar reglas por gramaje
        const reglasGramaje = reglasProduccion?.filter(r => {
            if (r.producto.startsWith('Regla ') && r.producto.includes('gr-')) {
                const [minStr, maxStr] = r.producto
                    .replace('Regla ', '')
                    .replace('gr', '')
                    .split('-');

                const minGr = parseInt(minStr);
                const maxGr = parseInt(maxStr);
                return gramaje >= minGr && gramaje <= maxGr;
            }
            return false;
        }) || [];

        // Si encontramos reglas por gramaje, usamos la primera
        if (reglasGramaje.length > 0) {
            const reglaGramaje = reglasGramaje[0];
            multiplicadores = {
                etiquetado: reglaGramaje.etiq || '1',
                sellado: reglaGramaje.sell || '1',
                envasado: reglaGramaje.envs || '1',
                cernido: reglaGramaje.cern || preciosBase.cernido
            };
        } else {
            // Si no hay reglas por gramaje, buscar reglas por nombre
            const reglasPorProducto = reglasProduccion?.filter(r => {
                const nombreRegla = normalizarTexto(r.producto);
                return normalizedNombre === nombreRegla || normalizedNombre.includes(nombreRegla);
            }) || [];

            // Aplicar reglas por producto si existen
            if (reglasPorProducto.length > 0) {
                const regla = reglasPorProducto[0];
                multiplicadores = {
                    etiquetado: regla.etiq || '1',
                    sellado: regla.sell || '1',
                    envasado: regla.envs || '1',
                    cernido: regla.cern || preciosBase.cernido
                };
            }
        }

        // Calcular resultados usando preciosBase
        let resultado = cantidad * preciosBase.envasado * parseFloat(multiplicadores.envasado);
        let resultadoEtiquetado = cantidad * preciosBase.etiquetado * parseFloat(multiplicadores.etiquetado);
        let resultadoSellado = cantidad * preciosBase.sellado * parseFloat(multiplicadores.sellado);


        let resultadoSernido = 0;
        if (seleccion === 'Cernido') {
            const kilos = (cantidad * gramaje) / 1000;
            resultadoSernido = (kilos * parseFloat(multiplicadores.cernido)) * 5;
        }

        return {
            total: resultado + resultadoEtiquetado + resultadoSellado + resultadoSernido,
            envasado: resultado,
            etiquetado: resultadoEtiquetado,
            sellado: resultadoSellado,
            cernido: resultadoSernido
        };
    }
    window.calcularTotal = calcularTotal;
    async function mostrarFormularioNuevoPago() {
        const itemsVisibles = Array.from(document.querySelectorAll('.registro-item:not([style*="display: none"])'));
        const registrosFiltrados = itemsVisibles.map(item =>
            registrosProduccion.find(r => r.id === item.dataset.id)
        ).filter(r => r);

        // Usar la función global calcularTotal para generar la vista previa
        const vistaPrevia = registrosFiltrados.map(registro => {
            const calculado = calcularTotal(registro);
            return `
            <tr>
                <td>${registro.nombre}</td>
                <td>${registro.producto}</td>
                <td>${registro.gramos}</td>
                <td>${registro.c_real}</td>
                <td>${calculado.cernido.toFixed(2)}</td>
                <td>${calculado.envasado.toFixed(2)}</td>
                <td>${calculado.etiquetado.toFixed(2)}</td>
                <td>${calculado.sellado.toFixed(2)}</td>
                <td><strong>${calculado.total.toFixed(2)}</strong></td>
            </tr>
        `;
        }).join('');
        const totales = registrosFiltrados.reduce((acc, registro) => {
            const calculado = calcularTotal(registro);
            return {
                cernido: acc.cernido + calculado.cernido,
                envasado: acc.envasado + calculado.envasado,
                etiquetado: acc.etiquetado + calculado.etiquetado,
                sellado: acc.sellado + calculado.sellado,
                total: acc.total + calculado.total
            };
        }, { cernido: 0, envasado: 0, etiquetado: 0, sellado: 0, total: 0 });

        // Modificar la parte de la tabla para incluir los totales
        const tablaHTML = `
    <div class="tabla-responsive">
        <table>
            <thead>
                <tr>
                    <th>Operador</th>
                    <th>Producto</th>
                    <th>Gramaje</th>
                    <th>Cantidad verf.</th>
                    <th>Cernido</th>
                    <th>Envasado</th>
                    <th>Etiquetado</th>
                    <th>Sellado</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${vistaPrevia}
                <tr class="totales" style="background-color: rgba(0,0,0,0.1); font-weight: bold;">
                    <td colspan="4" style="text-align: right;">TOTALES:</td>
                    <td>${totales.cernido.toFixed(2)}</td>
                    <td>${totales.envasado.toFixed(2)}</td>
                    <td>${totales.etiquetado.toFixed(2)}</td>
                    <td>${totales.sellado.toFixed(2)}</td>
                    <td><strong>${totales.total.toFixed(2)}</strong></td>
                </tr>
                <tr class="totales-ajustados" style="background-color: rgba(0,0,0,0.15); font-weight: bold;">
                    <td colspan="4" style="text-align: right;">TOTAL AJUSTADO:</td>
                    <td colspan="4" style="text-align: right;">
                        Aumentos: +<span class="aumento-preview">0.00</span> | 
                        Descuentos: -<span class="descuento-preview">0.00</span>
                    </td>
                    <td><strong><span class="total-final-preview">${totales.total.toFixed(2)}</span></strong></td>
                </tr>
            </tbody>
        </table>
    </div>`;

        // Calcular el subtotal general usando la misma función
        const subtotalGeneral = registrosFiltrados.reduce((total, registro) => {
            const calculado = calcularTotal(registro);
            return total + calculado.total;
        }, 0);

        // Obtener nombres únicos para el select de beneficiarios
        const nombresUnicos = [...new Set(registrosFiltrados.map(r => r.nombre))];

        const contenido = document.querySelector('.anuncio-second .contenido');
        contenido.innerHTML = `
            <div class="encabezado">
                <h1 class="titulo">Nuevo Pago</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <p class="normal">Información general del pago</p>
                <div class="entrada">
                    <i class='bx bx-rename'></i>
                    <div class="input">
                        <p class="detalle">Nombre del pago</p>
                        <input type="text" name="nombre_pago" required>
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-user'></i>
                    <div class="input">
                        <p class="detalle">Beneficiario</p>
                        <select name="beneficiario" id="select-beneficiario">
                            <option value=""></option>
                            ${nombresUnicos.map(n => `<option value="${n}">${n}</option>`).join('')}
                        </select>
                        <input type="text" name="beneficiario_personalizado" id="beneficiario-personalizado" style="display:none;" placeholder="Nombre personalizado">
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-user-check'></i>
                    <div class="input">
                        <p class="detalle">Pagado por</p>
                        <input type="text" name="pagado_por" value="${usuarioInfo.nombre + ' ' + usuarioInfo.apellido}" readonly>
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-file'></i>
                    <div class="input">
                        <p class="detalle">Justificativos</p>
                        <input name="justificativos" rows="2" readonly value="${registrosFiltrados.map(r => r.id).join(', ')}">
                    </div>
                </div>
                <div class="campo-horizontal">
                    <div class="entrada">
                        <i class='bx bx-calculator'></i>
                        <div class="input">
                            <p class="detalle">Subtotal</p>
                            <input type="number" name="subtotal" required value="${subtotalGeneral.toFixed(2)}">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-minus-circle'></i>
                        <div class="input">
                            <p class="detalle">Descuento</p>
                            <input type="number" name="descuento" value="0">
                        </div>
                    </div>
                </div>
                <div class="campo-horizontal">
                    <div class="entrada">
                        <i class='bx bx-plus-circle'></i>
                        <div class="input">
                            <p class="detalle">Aumento</p>
                            <input type="number" name="aumento" value="0">
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-dollar-circle'></i>
                        <div class="input">
                            <p class="detalle">Total</p>
                            <input type="number" name="total" required value="${subtotalGeneral.toFixed(2)}">
                        </div>
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-comment-detail'></i>
                    <div class="input">
                        <p class="detalle">Observaciones</p>
                        <input type="text" name="observaciones">
                    </div>
                </div>
                <p class="normal">Vista previa de registros incluidos</p>
                ${tablaHTML}
            </div>
            <div class="anuncio-botones">
                <button type="submit" class="btn green"><i class='bx bx-save'></i> Guardar pago</button>
            </div>
        `;
        contenido.style.paddingBottom = '80px';

        mostrarAnuncioSecond();


        // Actualizar los eventos de los inputs para reflejar los cambios en tiempo real
        const actualizarTotalesPreview = () => {
            const descuento = parseFloat(document.querySelector('input[name="descuento"]').value) || 0;
            const aumento = parseFloat(document.querySelector('input[name="aumento"]').value) || 0;
            const totalFinal = totales.total + aumento - descuento;

            document.querySelector('.descuento-preview').textContent = descuento.toFixed(2);
            document.querySelector('.aumento-preview').textContent = aumento.toFixed(2);
            document.querySelector('.total-final-preview').textContent = totalFinal.toFixed(2);
            document.querySelector('input[name="total"]').value = totalFinal.toFixed(2);
        };

        // Agregar los event listeners después de mostrar la tabla
        const addEventListeners = () => {
            const inputs = contenido.querySelectorAll('input[name="descuento"], input[name="aumento"]');
            inputs.forEach(input => {
                input.addEventListener('input', actualizarTotalesPreview);
            });
        };
        addEventListeners();

        const selectBenef = contenido.querySelector('#select-beneficiario');
        const inputPersonalizado = contenido.querySelector('#beneficiario-personalizado');
        selectBenef.addEventListener('change', function () {
            if (this.value === 'otro') {
                inputPersonalizado.style.display = 'block';
                inputPersonalizado.required = true;
            } else {
                inputPersonalizado.style.display = 'none';
                inputPersonalizado.required = false;
            }
        });
        const inputs = contenido.querySelectorAll('input[name="subtotal"], input[name="descuento"], input[name="aumento"]');
        inputs.forEach(input => {
            input.addEventListener('input', calcularTotal);
        });

        const btnGuardar = contenido.querySelector('button[type="submit"]');
        btnGuardar.addEventListener('click', guardarPago);

        async function guardarPago(e) {
            e.preventDefault();

            // Obtener solo las filas de productos (excluir las filas de totales)
            const filasTabla = Array.from(document.querySelectorAll('table tbody tr'))
                .filter(fila => !fila.classList.contains('totales') && !fila.classList.contains('totales-ajustados'));

            const justificativosDetallados = filasTabla.map(fila => {
                try {
                    const producto = fila.cells[1].textContent; // Columna Producto
                    const gramaje = fila.cells[2].textContent; // Columna Gramaje
                    const cernido = fila.cells[4].textContent; // Columna Cernido
                    const envasado = fila.cells[5].textContent; // Columna Envasado
                    const etiquetado = fila.cells[6].textContent; // Columna Etiquetado
                    const sellado = fila.cells[7].textContent; // Columna Sellado

                    // Retornar string con producto y valores de la tabla
                    return `${producto} ${gramaje}gr(${envasado},${etiquetado},${sellado},${cernido})`;
                } catch (error) {
                    console.warn('Error procesando fila:', error);
                    return '';
                }
            }).filter(Boolean).join(';');

            const formData = {
                nombre_pago: contenido.querySelector('input[name="nombre_pago"]').value.trim(),
                beneficiario: selectBenef.value === 'otro' ?
                    inputPersonalizado.value.trim() :
                    selectBenef.value,
                id_beneficiario: registrosFiltrados[0].user,
                pagado_por: contenido.querySelector('input[name="pagado_por"]').value.trim(),
                justificativos_id: contenido.querySelector('input[name="justificativos"]').value,
                justificativosDetallados, // Usando los valores de la tabla
                subtotal: parseFloat(contenido.querySelector('input[name="subtotal"]').value),
                descuento: parseFloat(contenido.querySelector('input[name="descuento"]').value) || 0,
                aumento: parseFloat(contenido.querySelector('input[name="aumento"]').value) || 0,
                total: parseFloat(contenido.querySelector('input[name="total"]').value),
                observaciones: contenido.querySelector('input[name="observaciones"]').value.trim(),
                registros: registrosFiltrados.map(r => r.id),
                tipo: 'produccion'
            };

            // Validaciones
            if (!formData.nombre_pago || !formData.beneficiario) {
                mostrarNotificacion({
                    message: 'Por favor complete los campos obligatorios',
                    type: 'warning',
                    duration: 3500
                });
                return;
            }

            try {
                const signal = await mostrarProgreso('.pro-pago')
                const response = await fetch('/registrar-pago', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (data.success) {
                    cerrarAnuncioManual('anuncioSecond');
                    mostrarNotificacion({
                        message: 'Pago registrado correctamente',
                        type: 'success',
                        duration: 3000
                    });
                    registrarNotificacion(
                        'Administración',
                        'Información',
                        usuarioInfo.nombre + ' registro un nuevo pago pendiente de producción')
                } else {
                    throw new Error(data.error || 'Error al registrar el pago');
                }
            } catch (error) {
                if (error.message === 'cancelled') {
                    console.log('Operación cancelada por el usuario');
                    return;
                }
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al registrar el pago',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarProgreso('.pro-pago')
            }
        }
    }
    aplicarFiltros();
}


async function guardarRegistrosLocal(registros) {
    try {
        const db = await initDB();
        const tx = db.transaction(REGISTROS_STORE, 'readwrite');
        const store = tx.objectStore(REGISTROS_STORE);

        // Guardar cada registro individualmente
        for (const registro of registros) {
            await store.put({
                id: registro.id,
                data: registro,
                timestamp: Date.now()
            });
        }

        return true;
    } catch (error) {
        console.error('Error guardando registros en caché:', error);
        return false;
    }
}
async function obtenerRegistrosLocal() {
    try {
        const db = await initDB();
        const tx = db.transaction(REGISTROS_STORE, 'readonly');
        const store = tx.objectStore(REGISTROS_STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const registros = request.result.map(item => item.data);
                resolve(registros);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error obteniendo registros del caché:', error);
        return [];
    }
}