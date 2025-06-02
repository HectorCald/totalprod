let productos = [];
let productosAcopio = [];
let etiquetas = [];
let precios = [];
let usuarioInfo = recuperarUsuarioLocal();
function recuperarUsuarioLocal() {
    const usuarioGuardado = localStorage.getItem('damabrava_usuario');
    if (usuarioGuardado) {
        return JSON.parse(usuarioGuardado);
    }
    return null;
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
        const response = await fetch('/obtener-productos');
        const data = await response.json();

        if (data.success) {
            // Guardar los productos en la variable global y ordenarlos por ID
            productos = data.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Orden descendente por número de ID
            });
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
    } finally {
        ocultarCarga();
    }
}



export async function mostrarAlmacenGeneral() {
    mostrarAnuncio();
    renderInitialHTML(); // Render initial HTML immediately
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    // Load data in parallel
    const [almacenGeneral, etiquetasResult, preciosResult, almacenAcopio] = await Promise.all([
        obtenerAlmacenGeneral(),
        obtenerEtiquetas(),
        obtenerPrecios(),
        obtenerAlmacenAcopio()
    ]);

    updateHTMLWithData(); // Update HTML once data is loaded
    eventosAlmacenGeneral();

}
function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');

    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Almacén General</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio');"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="entrada">
                <i class='bx bx-search'></i>
                <div class="input">
                    <p class="detalle">Buscar</p>
                    <input type="text" class="buscar-producto" placeholder="">
                </div>
            </div>
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro activado">Todos</button>
                ${Array(5).fill().map(() => `
                    <div class="skeleton skeleton-etiqueta"></div>
                `).join('')}
            </div>
            <div class="filtros-opciones cantidad-filter">
                <button class="btn-filtro"><i class='bx bx-sort-down'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-up'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-a-z'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-z-a'></i></button>
                <button class="btn-filtro">Sueltas</button>
                <select class="precios-select" style="width:100%">
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
            <button class="btn-crear-producto btn orange"> <i class='bx bx-plus'></i> Crear</button>
            <button class="btn-etiquetas btn especial"><i class='bx bx-purchase-tag'></i>  Etiquetas</button>
            <button class="btn-precios btn especial"><i class='bx bx-dollar'></i> Precios</button>
        </div>
        ` : ''}
    `;
    contenido.innerHTML = initialHTML;
    if (tienePermiso('creacion')) {
        contenido.style.paddingBottom = '80px';
    }
}
function updateHTMLWithData() {
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
    const productosHTML = productos.map(producto => `
        <div class="registro-item" data-id="${producto.id}">
            <div class="header">
                ${producto.imagen && producto.imagen.startsWith('data:image') ?
            `<img class="imagen" src="${producto.imagen}">` :
            `<i class='bx bx-package'></i>`}
                <div class="info-header">
                    <div class="id">${producto.id}
                        <div class="precio-cantidad">
                            <span class="valor stock">${producto.stock} Und.</span>
                            <span class="valor precio">Bs/.${producto.precios.split(';')[0].split(',')[1]}</span>
                        </div>
                    </div>
                    <span class="nombre"><strong>${producto.producto} - ${producto.gramos}gr.</strong></span>
                    <span class="etiquetas">${producto.etiquetas.split(';').join(' • ')}</span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
}


function eventosAlmacenGeneral() {
    const botonesEtiquetas = document.querySelectorAll('.filtros-opciones.etiquetas-filter .btn-filtro');
    const botonesCantidad = document.querySelectorAll('.filtros-opciones.cantidad-filter .btn-filtro');
    const selectPrecios = document.querySelector('.precios-select');

    const btnCrearProducto = document.querySelector('.btn-crear-producto');
    const btnEtiquetas = document.querySelector('.btn-etiquetas');
    const btnPrecios = document.querySelector('.btn-precios');

    const items = document.querySelectorAll('.registro-item');

    const inputBusqueda = document.querySelector('.buscar-producto');
    const contenedor = document.querySelector('.relleno');
    contenedor.addEventListener('scroll', () => {
        const yaExiste = contenedor.querySelector('.scroll-top');

        if (contenedor.scrollTop > 100) {
            if (!yaExiste) {
                const boton = document.createElement('button');
                boton.className = 'scroll-top';
                boton.innerHTML = '<i class="fas fa-arrow-up"></i>';
                boton.onclick = () => scrollToTop('.relleno');
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
        const precioSeleccionado = selectPrecios.options[selectPrecios.selectedIndex].text;
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
                if (stockSpan) {
                    stockSpan.textContent = mostrarSueltas ?
                        `${producto.uSueltas || 0} Sueltas` :
                        `${producto.stock} Und.`;
                }
            });

            // Filtrar y ordenar
            const productosFiltrados = Array.from(registros).filter(registro => {
                const producto = productos.find(p => p.id === registro.dataset.id);
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
                        normalizarTexto(producto.codigo_barras).includes(busqueda)
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
                            const valA = mostrarSueltas ?
                                (productos.find(p => p.id === a.dataset.id).uSueltas || 0) :
                                parseInt(a.querySelector('.stock').textContent);
                            const valB = mostrarSueltas ?
                                (productos.find(p => p.id === b.dataset.id).uSueltas || 0) :
                                parseInt(b.querySelector('.stock').textContent);
                            return valB - valA;
                        });
                        break;
                    case 1:
                        productosFiltrados.sort((a, b) => {
                            const valA = mostrarSueltas ?
                                (productos.find(p => p.id === a.dataset.id).uSueltas || 0) :
                                parseInt(a.querySelector('.stock').textContent);
                            const valB = mostrarSueltas ?
                                (productos.find(p => p.id === b.dataset.id).uSueltas || 0) :
                                parseInt(b.querySelector('.stock').textContent);
                            return valA - valB;
                        });
                        break;
                    case 2:
                        productosFiltrados.sort((a, b) =>
                            a.querySelector('.nombre strong').textContent.localeCompare(b.querySelector('.nombre strong').textContent)
                        );
                        break;
                    case 3:
                        productosFiltrados.sort((a, b) =>
                            b.querySelector('.nombre strong').textContent.localeCompare(a.querySelector('.nombre strong').textContent)
                        );
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
                if (precioSeleccionado) {
                    const preciosProducto = producto.precios.split(';');
                    const precioFiltrado = preciosProducto.find(p => p.split(',')[0] === precioSeleccionado);
                    if (precioFiltrado) {
                        const precio = parseFloat(precioFiltrado.split(',')[1]);
                        registro.querySelector('.precio').textContent = `Bs/.${precio.toFixed(2)}`;
                    }
                }
                contenedor.appendChild(registro);
            });

            // Mensaje vacío
            mensajeNoEncontrado.style.display = productosFiltrados.length === 0 ? 'block' : 'none';
        }, 200);
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
            if (boton.textContent.trim() === 'Sueltas') {
                // Toggle para el botón de Sueltas
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
        btnCrearProducto.addEventListener('click', crearProducto);
        btnEtiquetas.addEventListener('click', gestionarEtiquetas);
        btnPrecios.addEventListener('click', gestionarPrecios);
    }


    window.info = function (registroId) {
        const producto = productos.find(r => r.id === registroId);
        if (!producto) return;

        // Procesar los precios
        const preciosFormateados = producto.precios.split(';')
            .filter(precio => precio.trim()) // Eliminar elementos vacíos
            .map(precio => {
                const [ciudad, valor] = precio.split(',');
                return `<span class="valor"><strong><i class='bx bx-store'></i> ${ciudad}: </strong>Bs/.${valor}</span>`;
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
        <div class="relleno verificar-registro">
        <p class="normal">Información general</p>
            <div class="campo-horizontal">
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${producto.id}</span>
                    <span class="valor"><strong><i class="ri-scales-line"></i> Gramaje: </strong>${producto.gramos}gr.</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Stock: </strong>${producto.stock} Und.</span>
                    <span class="valor"><strong><i class='bx bx-hash'></i> Codigo: </strong>${producto.codigo_barras}</span>
                </div>
                <div class="imagen-producto">
                ${producto.imagen && producto.imagen.startsWith('data:image') ?
                `<img class="imagen" src="${producto.imagen}">` :
                `<i class='bx bx-package'></i>`}
                </div>
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
        mostrarAnuncioSecond();
        if (tienePermiso('edicion') || tienePermiso('eliminacion')) {
            contenido.style.paddingBottom = '80px';
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
                <div class="campo-horizontal">
                    <div class="campo-vertical">
                        <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${producto.id}</span>
                        <span class="valor"><strong><i class="ri-scales-line"></i> Gramaje: </strong>${producto.gramos}gr.</span>
                        <span class="valor"><strong><i class='bx bx-package'></i> Stock: </strong>${producto.stock} Und.</span>
                        <span class="valor"><strong><i class='bx bx-hash'></i> Codigo: </strong>${producto.codigo_barras}</span>
                    </div>
                    <div class="imagen-producto">
                    ${producto.imagen && producto.imagen.startsWith('data:image') ?
                    `<img class="imagen" src="${producto.imagen}">` :
                    `<i class='bx bx-package'></i>`}
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
                    mostrarCarga();

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
                        ocultarCarga();
                        mostrarNotificacion({
                            message: 'Producto eliminado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Eliminación',
                            usuarioInfo.nombre + ' elimino el producto ' + producto.producto + ' Id: ' + producto.id + ' su motivo fue: ' + motivo)
                        ocultarAnuncioSecond();
                        await mostrarAlmacenGeneral();
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
                    ocultarCarga();
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
                            <p>Estás por editar un registro del sistema. Asegúrate de realizar los cambios correctamente, ya que podrían modificar información relacionada.</p>
                        </div>
                    </div>

            </div>
            <div class="anuncio-botones">
                <button class="btn-editar-producto btn blue"><i class="bx bx-save"></i> Guardar cambios</button>
            </div>
        `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';

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

            async function procesarImagen(file) {
                return new Promise((resolve, reject) => {
                    if (!file || !file.type.startsWith('image/')) {
                        reject(new Error('Solo se permiten archivos de imagen'));
                        return;
                    }

                    const img = new Image();
                    const reader = new FileReader();

                    reader.onload = function (e) {
                        img.src = e.target.result;
                    };

                    img.onload = function () {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        const MAX_SIZE = 500;
                        if (width > height && width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        } else if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const calidad = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 0.5 : 0.7;
                        const imagenBase64 = canvas.toDataURL('image/jpeg', calidad);

                        if (imagenBase64.length > 2000000) {
                            reject(new Error('La imagen es demasiado grande, intenta con una más pequeña'));
                            return;
                        }

                        resolve(imagenBase64);
                    };

                    reader.readAsDataURL(file);
                });
            }

            async function confirmarEdicionProducto() {
                try {
                    // Validar campos requeridos
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


                    // Obtener etiquetas seleccionadas
                    const etiquetasSeleccionadas = Array.from(document.querySelectorAll('.etiquetas-actuales .etiqueta-item'))
                        .map(item => item.dataset.valor)
                        .join(';');

                    // Obtener precios
                    const preciosInputs = document.querySelectorAll('.editar-producto .precio-input');
                    const preciosActualizados = Array.from(preciosInputs)
                        .map(input => `${input.dataset.ciudad},${input.value}`)
                        .join(';');

                    // Validar campos obligatorios
                    if (!motivo) {
                        mostrarNotificacion({
                            message: 'Debe ingresar el motivo de la edición',
                            type: 'warning',
                            duration: 3500
                        });
                        return;
                    }
                    // Procesar imagen si existe
                    const imagenInput = document.querySelector('.editar-producto .imagen-producto');
                    let imagenBase64 = null;
                    if (imagenInput.files && imagenInput.files[0]) {
                        imagenBase64 = await procesarImagen(imagenInput.files[0]);
                    }

                    // Preparar datos para enviar
                    const productoActual = productos.find(p => p.id === registroId);

                    // Prepare data for update
                    const datosActualizados = {
                        producto,
                        gramos: parseInt(gramos),
                        stock: parseInt(stock),
                        cantidadxgrupo: parseInt(cantidadxgrupo),
                        lista,
                        codigo_barras,
                        etiquetas: etiquetasSeleccionadas,
                        precios: preciosActualizados,
                        uSueltas: parseInt(uSueltas),
                        alm_acopio_id: alm_acopio_id,  // Aseguramos que sea cadena vacía si no hay selección
                        alm_acopio_producto: alm_acopio_producto,
                        motivo,
                        imagen: imagenBase64 || productoActual.imagen
                    };
                    console.log(alm_acopio_id)

                    mostrarCarga();

                    const response = await fetch(`/actualizar-producto/${registroId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(datosActualizados)
                    });


                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        ocultarCarga();
                        mostrarNotificacion({
                            message: 'Producto actualizado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Edición',
                            usuarioInfo.nombre + ' edito el producto ' + producto + ' su motivo fue: ' + motivo)

                        ocultarAnuncioTercer();
                        ocultarAnuncioSecond();
                        await mostrarAlmacenGeneral();
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
                    ocultarCarga();
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
        contenido.style.paddingBottom = '80px'

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
                mostrarCarga();
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
                    ocultarCarga();
                    mostrarNotificacion({
                        message: 'Producto creado correctamente',
                        type: 'success',
                        duration: 3000
                    });
                    registrarNotificacion(
                        'Administración',
                        'Creación',
                        usuarioInfo.nombre + ' creo un nuevo producto: ' + producto+' '+gramos+'gr.')
                    ocultarAnuncioSecond();
                    await mostrarAlmacenGeneral();
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
                ocultarCarga();
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
                    mostrarCarga();
                    const response = await fetch('/agregar-etiqueta', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ etiqueta: nuevaEtiqueta })
                    });

                    if (!response.ok) throw new Error('Error al agregar etiqueta');

                    const data = await response.json();
                    if (data.success) {
                        await obtenerEtiquetas();
                        await mostrarAlmacenGeneral();
                        document.querySelector('.nueva-etiqueta').value = '';
                        mostrarNotificacion({
                            message: 'Etiqueta agregada correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        gestionarEtiquetas(); // Refresh the view

                    }
                } catch (error) {
                    mostrarNotificacion({
                        message: error.message,
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            }
        });
        etiquetasActuales.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-quitar-etiqueta')) {
                try {
                    const etiquetaItem = e.target.closest('.etiqueta-item');
                    const etiquetaId = etiquetaItem.dataset.id;

                    mostrarCarga();
                    const response = await fetch(`/eliminar-etiqueta/${etiquetaId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) throw new Error('Error al eliminar etiqueta');

                    const data = await response.json();
                    if (data.success) {
                        await mostrarAlmacenGeneral();
                        await obtenerEtiquetas();
                        mostrarNotificacion({
                            message: 'Etiqueta eliminada correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        gestionarEtiquetas(); // Refresh the view

                    }
                } catch (error) {
                    mostrarNotificacion({
                        message: error.message,
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
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
                mostrarCarga();
                const response = await fetch('/agregar-precio', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ precio: nuevoPrecio })
                });

                const data = await response.json();

                if (data.success) {
                    await mostrarAlmacenGeneral();
                    await obtenerPrecios();
                    nuevoPrecioInput.value = '';
                    const preciosActualesDiv = document.querySelector('.precios-actuales');
                    preciosActualesDiv.innerHTML = precios.map(precio => `
                    <div class="precio-item" data-id="${precio.id}">
                        <i class='bx bx-tag'></i>
                        <span>${precio.precio}</span>
                        <button class="btn-eliminar-precio"><i class='bx bx-x'></i></button>
                    </div>
                `).join('');

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
                ocultarCarga();
            }
        });

        contenido.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-eliminar-precio')) {
                const precioItem = e.target.closest('.precio-item');
                const precioId = precioItem.dataset.id;

                try {
                    mostrarCarga();
                    const response = await fetch(`/eliminar-precio/${precioId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        throw new Error('Error al eliminar el precio');
                    }

                    const data = await response.json();

                    if (data.success) {
                        await mostrarAlmacenGeneral();
                        await obtenerPrecios();
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
                    ocultarCarga();
                }
            }
        });
    }

    aplicarFiltros();
}