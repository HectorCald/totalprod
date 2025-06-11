let registrosProduccion = [];
let usuarioInfo;
let productosGlobal = [];

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


async function obtenerMisRegistros() {
    try {
        const response = await fetch('/obtener-mis-registros-produccion');
        const data = await response.json();

        if (data.success) {
            registrosProduccion = data.registros.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
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
function recuperarUsuarioLocal() {
    const usuarioGuardado = localStorage.getItem('damabrava_usuario');
    if (usuarioGuardado) {
        return JSON.parse(usuarioGuardado);
    }
    return null;
}


function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Mis registros</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="busqueda">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="buscar-registro-produccion" placeholder="">
                    </div>
                    <button class="btn-calendario"><i class='bx bx-calendar'></i></button>
                </div>
                <div class="acciones-grande">
                    <button class="exportar-excel btn orange"><i class='bx bx-download'></i> <span>Descargar registros</span></button>
                </div>
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
            <button class="exportar-excel btn orange" style="margin-bottom:10px"><i class='bx bx-download'></i> Descargar registros</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '80px';
}
export async function mostrarMisRegistros() {
    usuarioInfo = recuperarUsuarioLocal();
    renderInitialHTML();
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    const [registrosProduccion, productos] = await Promise.all([
        obtenerMisRegistros(),
        obtenerProductos()
    ]);

    updateHTMLWithData();
    eventosMisRegistros();

}
function updateHTMLWithData() {
    // Update productos
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = registrosProduccion.map(registro => `
        <div class="registro-item" data-id="${registro.id}">
            <div class="header">
                <i class='bx bx-file'></i>
                <div class="info-header">
                    <span class="id">${registro.id}<span class="valor ${registro.fecha_verificacion && registro.observaciones === 'Sin observaciones' ? 'verificado' : registro.observaciones !== 'Sin observaciones' && registro.fecha_verificacion ? 'observado' : 'pendiente'}">${registro.fecha_verificacion && registro.observaciones === 'Sin observaciones' ? 'Verificado' : registro.observaciones !== 'Sin observaciones' && registro.fecha_verificacion ? 'Observado' : 'Pendiente'}</span></span>
                    <span class="nombre"><strong>${registro.producto} - ${registro.gramos}gr.</strong></span>
                    <span class="fecha">${registro.fecha}</span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
}


function eventosMisRegistros() {
    const btnExcel = document.querySelectorAll('.exportar-excel');
    const registrosAExportar = registrosProduccion;
    const botonesEstado = document.querySelectorAll('.filtros-opciones.estado .btn-filtro');
    const items = document.querySelectorAll('.registro-item');
    const inputBusqueda = document.querySelector('.buscar-registro-produccion');
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


    items.forEach(item => {
        item.addEventListener('click', function () {
            const registroId = this.dataset.id;
            window.info(registroId);
        });
    });

    let filtroNombreActual = 'todos';
    let filtroFechaInstance = null;


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
    botonesEstado.forEach(boton => {
        boton.addEventListener('click', async () => {
            botonesEstado.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');

            const tipoFiltro = boton.textContent.trim().toLowerCase();

            if (tipoFiltro === 'pendientes') {
                filtroNombreActual = 'pendiente';
            }
            else if (tipoFiltro === 'verificados') {
                filtroNombreActual = 'verificado';
            }
            else if (tipoFiltro === 'todos') {
                filtroNombreActual = 'todos';
            }
            else if (tipoFiltro === 'observados') {
                filtroNombreActual = 'observado';
            }

            aplicarFiltros();
            await scrollToCenter(boton, boton.parentElement);
        });
    });
    function aplicarFiltros() {
        const filtroTipo = filtroNombreActual;
        const fechasSeleccionadas = filtroFechaInstance?.selectedDates || [];
        const busqueda = normalizarTexto(inputBusqueda.value);
        const items = document.querySelectorAll('.registro-item');
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Primero, filtrar todos los registros
        const registrosFiltrados = Array.from(items).map(registro => {
            const registroData = registrosProduccion.find(r => r.id === registro.dataset.id);
            if (!registroData) return { elemento: registro, mostrar: false };

            let mostrar = true;

            // Aplicar todos los filtros
            if (filtroTipo && filtroTipo !== 'todos') {
                if (filtroTipo === 'pendiente') {
                    mostrar = !registroData.fecha_verificacion;
                } else if (filtroTipo === 'verificado') {
                    mostrar = registroData.fecha_verificacion;
                } else if (filtroTipo === 'observado') {
                    mostrar = registroData.fecha_verificacion && registroData.observaciones !== 'Sin observaciones';
                }
            }

            if (mostrar && fechasSeleccionadas.length === 2) {
                const [dia, mes, anio] = registroData.fecha.split('/');
                const fechaRegistro = new Date(anio, mes - 1, dia);
                const fechaInicio = fechasSeleccionadas[0];
                const fechaFin = fechasSeleccionadas[1];
                mostrar = fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin;
            }


            if (mostrar && busqueda) {
                const textoRegistro = [
                    registroData.id,
                    registroData.producto,
                    registroData.gramos?.toString(),
                    registroData.lote?.toString(),
                    registroData.fecha
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
            <h1 class="titulo">Información del registro</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno verificar-registro">
        <p class="normal-center">${registro.producto}</p>
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
                <span class="valor"><strong><i class='bx bx-receipt'></i> Lote: </strong>${registro.lote} Und.</span>
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
        </div>
        ${tienePermiso('edicion') || tienePermiso('eliminacion') || tienePermiso('anulacion') ? `
        <div class="anuncio-botones">
            ${tienePermiso('edicion') && !registro.fecha_verificacion ? `<button class="btn-editar btn blue" data-id="${registro.id}"><i class='bx bx-edit'></i>Editar</button>` : ''}
            ${tienePermiso('eliminacion') && !registro.fecha_verificacion ? `<button class="btn-eliminar btn red" data-id="${registro.id}"><i class="bx bx-trash"></i>Eliminar</button>` : ''}
            ${registro.fecha_verificacion && tienePermiso('anulacion') ? `<button class="btn-anular btn yellow" data-id="${registro.id}"><i class='bx bx-x-circle'></i>Anular</button>` : ''}
        </div>` : ''}
        `;


        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '10px';
        if (tienePermiso('edicion') || tienePermiso('eliminacion') || tienePermiso('anulacion')) {
            contenido.style.paddingBottom = '80px';
        }
        mostrarAnuncioSecond();
        if (tienePermiso('anulacion') && registro.fecha_verificacion) {
            const btnAnular = contenido.querySelector('.btn-anular');
            btnAnular.addEventListener('click', () => anular(registro));
        }

        if (tienePermiso('edicion') && !registro.fecha_verificacion) {
            const btnEditar = contenido.querySelector('.btn-editar');
            btnEditar.addEventListener('click', () => editar(registro));
        }
        if (tienePermiso('eliminacion') && !registro.fecha_verificacion) {
            const btnEliminar = contenido.querySelector('.btn-eliminar');
            btnEliminar.addEventListener('click', () => eliminar(registro));
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
                    mostrarCarga();

                    // Aseguramos que la URL sea correcta
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
                        ocultarCarga();
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

                        ocultarAnuncioSecond();
                        await mostrarMisRegistros();
                    } else {
                        throw new Error(data.error || 'Error al eliminar el registro');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al eliminar el registro',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
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
                        <p class="normal">Información de verificación</p>
                            <div class="entrada">
                                <i class='bx bx-hash'></i>
                                <div class="input">
                                    <p class="detalle">Cantidad real</p>
                                    <input class="cantidad_real" type="number" value="${registro.c_real}" autocomplete="off" placeholder=" " readonly>
                                </div>
                            </div>
                            <div class="entrada">
                                <i class='bx bx-comment-detail'></i>
                                <div class="input">
                                    <p class="detalle">Observaciones</p>
                                    <input class="observaciones" type="text" value="${registro.observaciones}" autocomplete="off" placeholder=" " required>
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
                const producto = document.querySelector('.editar-produccion .producto').value;
                const gramos = document.querySelector('.editar-produccion .gramaje').value;
                const lote = document.querySelector('.editar-produccion .lote').value;
                const proceso = document.querySelector('.editar-produccion .select').value;
                const microondas = document.querySelector('.editar-produccion .microondas').value;
                const envases_terminados = document.querySelector('.editar-produccion .terminados').value;
                const fecha_vencimiento = document.querySelector('.editar-produccion .vencimiento').value;
                const verificado = document.querySelector('.editar-produccion .cantidad_real').value;
                const observaciones = document.querySelector('.editar-produccion .observaciones').value;
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
                    mostrarCarga();

                    const response = await fetch(`/editar-registro-produccion/${registroId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            producto,
                            gramos,
                            lote,
                            proceso,
                            microondas,
                            envases_terminados,
                            fecha_vencimiento,
                            verificado,
                            observaciones,
                            motivo
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        ocultarCarga();
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

                        ocultarAnuncioSecond();
                        await mostrarMisRegistros();
                    } else {
                        throw new Error(data.error || 'Error al actualizar el registro');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al actualizar el registro',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
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
                    <p>Estás por anular un registro del sistema. Esta acción no lo eliminará, pero eliminar la fecha y la cantidad en la verificación, esto podria afectar a los pesos en almacen acopio.</p>
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
                    mostrarCarga();
                    const response = await fetch(`/anular-verificacion-produccion/${registroId}`, {
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
                        ocultarCarga();
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
                        ocultarAnuncioSecond();
                        await mostrarMisRegistros();
                    } else {
                        throw new Error(data.error || 'Error al anular la verificación');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al anular la verificación',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            }
        }
    }
    btnExcel.forEach(btn => {
        btn.addEventListener('click', () => exportarArchivos('produccion', registrosAExportar));
    });
    aplicarFiltros();
}