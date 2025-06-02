let productos = [];
let etiquetas = [];
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
async function obtenerAlmacenGeneral() {
    try {
        const response = await fetch('/obtener-productos');
        const data = await response.json();

        if (data.success) {
            productos = data.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
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
    }
}


export async function mostrarConteo() {
    mostrarAnuncio();
    renderInitialHTML(); // Render initial HTML immediately
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    // Load data in parallel
    const [almacenGeneral, etiquetasResult] = await Promise.all([
        obtenerAlmacenGeneral(),
        obtenerEtiquetas(),
    ]);

    updateHTMLWithData(); // Update HTML once data is loaded
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
            <button id="vista-previa" class="btn orange"><i class='bx bx-show'></i> Vista previa</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '80px';
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

    // Update productos
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = productos.map(producto => `
        <div class="registro-item" data-id="${producto.id}">
            <div class="header">
                <i class='bx bx-package'></i>
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
    `).join('');
    productosContainer.innerHTML = productosHTML;
}


function eventosConteo() {
    const botonesEtiquetas = document.querySelectorAll('.filtros-opciones.etiquetas-filter .btn-filtro');
    const botonesCantidad = document.querySelectorAll('.filtros-opciones.cantidad-filter .btn-filtro');

    const inputBusqueda = document.querySelector('.buscar-producto');

    const vistaPrevia = document.getElementById('vista-previa');

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
        });
    });

    vistaPrevia.addEventListener('click', vistaPreviaConteo);
    function vistaPreviaConteo() {
        const stockFisico = JSON.parse(localStorage.getItem('damabrava_stock_fisico') || '{}');
        const contenido = document.querySelector('.anuncio-second .contenido');

        const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">Vista Previa del Conteo</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal"><i class='bx bx-chevron-right'></i>Resumen del conteo</p>
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
        mostrarAnuncioSecond();

        // Agregar evento al botón de registrar
        // Modificar la función del botón registrar en vistaPreviaConteo
        document.getElementById('registrar-conteo').addEventListener('click', async () => {
            try {
                mostrarCarga();
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
                    ocultarCarga();
                    mostrarNotificacion({
                        message: 'Conteo registrado correctamente',
                        type: 'success',
                        duration: 3000
                    });
                    registrarNotificacion(
                        'Administración',
                        'Creación',
                        usuarioInfo.nombre + ' hizo un nuevo registro de conteo fisico con el nombre de '+nombre+' observaciones: '+observaciones)

                    // Limpiar el localStorage y cerrar la vista previa
                    localStorage.removeItem('damabrava_stock_fisico');
                    ocultarAnuncioSecond();
                } else {
                    throw new Error(data.error || 'Error al registrar el conteo');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion({
                    message: 'Error al registrar el conteo',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarCarga();
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
            ocultarAnuncioSecond();
        }
    }

    aplicarFiltros();

}
