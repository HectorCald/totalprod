let productos = [];
let etiquetasAcopio = [];
let usuarioInfo = recuperarUsuarioLocal();
let carritoIngresosAcopio = new Map(JSON.parse(localStorage.getItem('damabrava_ingreso_acopio') || '[]'));

function recuperarUsuarioLocal() {
    const usuarioGuardado = localStorage.getItem('damabrava_usuario');
    if (usuarioGuardado) {
        return JSON.parse(usuarioGuardado);
    }
    return null;
}
async function obtenerEtiquetasAcopio() {
    try {
        const response = await fetch('/obtener-etiquetas-acopio');
        const data = await response.json();

        if (data.success) {
            etiquetasAcopio = data.etiquetas.sort((a, b) => {
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
async function obtenerAlmacenAcopio() {
    try {
        await obtenerEtiquetasAcopio();
        const response = await fetch('/obtener-productos-acopio');
        const data = await response.json();

        if (data.success) {
            productos = data.productos.map(producto => {
                return {
                    id: producto.id,
                    producto: producto.producto,
                    bruto: producto.bruto || '0-1',
                    prima: producto.prima || '0-1',
                    etiquetas: producto.etiquetas || ''
                };
            }).sort((a, b) => {
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


export async function mostrarSalidasAcopio() {
    renderInitialHTML(); // Render initial HTML immediately
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    // Load data in parallel
    const [almacenGeneral, etiquetasResult] = await Promise.all([
        obtenerAlmacenAcopio(),
        obtenerEtiquetasAcopio(),
    ]);

    updateHTMLWithData(); // Update HTML once data is loaded
    eventosPedidos();

}
function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Salidas acopio</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="buscador-filtros">
                <div class="entrada">
                    <i class='bx bx-search'></i>
                    <div class="input">
                        <p class="detalle">Buscar</p>
                        <input type="text" class="buscar-producto-acopio" placeholder="">
                    </div>
                </div>
                <div class="filtros-opciones cantidad-filter" style="overflow:hidden">
                    <button class="btn-filtro" title="Mayor a menor"><i class='bx bx-sort-down'></i></button>
                    <button class="btn-filtro" title="Menor a mayor"><i class='bx bx-sort-up'></i></button>
                    <button class="btn-filtro"><i class='bx bx-sort-a-z'></i></button>
                    <button class="btn-filtro"><i class='bx bx-sort-z-a'></i></button>
                    <button class="btn-filtro" title="Bruto">Bruto</button>
                    <button class="btn-filtro" title="Prima">Prima</button>
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
function updateHTMLWithData() {
    // Update etiquetas filter
    const etiquetasFilter = document.querySelector('.etiquetas-filter');
    const etiquetasHTML = etiquetasAcopio.map(etiqueta => `
        <button class="btn-filtro">${etiqueta.etiqueta}</button>
    `).join('');
    etiquetasFilter.innerHTML = `
        <button class="btn-filtro activado">Todos</button>
        ${etiquetasHTML}
    `;

    // Update productos
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = productos.map(producto => {
        // Calcular totales de bruto y prima
        const totalBruto = producto.bruto.split(';')
            .reduce((sum, lote) => sum + parseFloat(lote.split('-')[0]), 0);
        const totalPrima = producto.prima.split(';')
            .reduce((sum, lote) => sum + parseFloat(lote.split('-')[0]), 0);

        return `
            <div class="registro-item" data-id="${producto.id}">
                <div class="header">
                    <i class='bx bx-package'></i>
                    <div class="info-header">
                        <span class="id">${producto.id}
                            <div class="precio-cantidad">
                                <span class="valor stock">${totalBruto.toFixed(2)} Kg.</span>
                            </div>
                        </span>
                        <span class="nombre"><strong>${producto.producto}</strong></span>
                        <span class="etiquetas">${producto.etiquetas.split(';').join(' • ')}</span>
                    </div>
                </div>
                <div class="registro-acciones">
                    <button class="btn-pedido btn-icon green" data-id="${producto.id}">
                        <i class='bx bx-cart-add'></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    productosContainer.innerHTML = productosHTML;
}


function eventosPedidos() {
    const botonesEtiquetas = document.querySelectorAll('.filtros-opciones.etiquetas-filter .btn-filtro');
    const botonesCantidad = document.querySelectorAll('.filtros-opciones.cantidad-filter .btn-filtro');
    const inputBusqueda = document.querySelector('.buscar-producto-acopio');
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

    let pesoMostrado = 'bruto';
    let filtroNombreActual = 'Todos';

    const items = document.querySelectorAll('.registro-item');
    items.forEach(item => {
        item.addEventListener('click', () => agregarAlCarrito(item.dataset.id));
    });

    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });
    inputBusqueda.addEventListener('input', (e) => {
        aplicarFiltros();
    });

    function normalizarTexto(texto) {
        return texto.toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[-_\s]+/g, '');
    }
    function aplicarFiltros() {
        const registros = document.querySelectorAll('.registro-item');
        const busqueda = normalizarTexto(inputBusqueda.value);
        const botonCantidadActivo = document.querySelector('.filtros-opciones.cantidad-filter .btn-filtro.activado');

        // Ocultar todos con animación
        registros.forEach(registro => {
            registro.style.opacity = '0';
            registro.style.transform = 'translateY(-20px)';
        });

        setTimeout(() => {
            registros.forEach(registro => registro.style.display = 'none');

            // Filtrar y ordenar
            const productosFiltrados = Array.from(registros).filter(registro => {
                const producto = productos.find(p => p.id === registro.dataset.id);
                if (!producto) return false;

                const etiquetasProducto = producto.etiquetas ? producto.etiquetas.split(';').map(e => e.trim()) : [];
                let mostrar = true;

                if (filtroNombreActual !== 'Todos') {
                    mostrar = etiquetasProducto.includes(filtroNombreActual);
                }

                if (busqueda) {
                    mostrar = mostrar && (
                        normalizarTexto(producto.producto).includes(busqueda) ||
                        normalizarTexto(producto.id).includes(busqueda) ||
                        normalizarTexto(producto.etiquetas || '').includes(busqueda)
                    );
                }

                return mostrar;
            });

            // Ordenamiento
            if (botonCantidadActivo) {
                const index = Array.from(botonesCantidad).indexOf(botonCantidadActivo);
                switch (index) {
                    case 0: // Mayor a menor
                        productosFiltrados.sort((a, b) => parseFloat(b.querySelector('.stock').textContent) - parseFloat(a.querySelector('.stock').textContent));
                        break;
                    case 1: // Menor a mayor
                        productosFiltrados.sort((a, b) => parseFloat(a.querySelector('.stock').textContent) - parseFloat(b.querySelector('.stock').textContent));
                        break;
                    case 2: // A-Z
                        productosFiltrados.sort((a, b) => a.querySelector('.nombre strong').textContent.localeCompare(b.querySelector('.nombre strong').textContent));
                        break;
                    case 3: // Z-A
                        productosFiltrados.sort((a, b) => b.querySelector('.nombre strong').textContent.localeCompare(a.querySelector('.nombre strong').textContent));
                        break;
                }
            }

            const contenedor = document.querySelector('.productos-container');
            productosFiltrados.forEach(registro => {
                registro.style.display = 'flex';
                contenedor.appendChild(registro);
                setTimeout(() => {
                    registro.style.opacity = '1';
                    registro.style.transform = 'translateY(0)';
                }, 50);
            });

            // Mensaje de no encontrado
            const mensajeNoEncontrado = document.querySelector('.no-encontrado');
            mensajeNoEncontrado.style.display = productosFiltrados.length === 0 ? 'block' : 'none';
        }, 200);
    }
    function scrollToCenter(boton, contenedorPadre) {
        const scrollLeft = boton.offsetLeft - (contenedorPadre.offsetWidth / 2) + (boton.offsetWidth / 2);
        contenedorPadre.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    }
    botonesCantidad.forEach((boton, index) => {
        boton.addEventListener('click', () => {
            // Si es botón de peso (Bruto/Prima)
            if (index === 4 || index === 5) {
                // Desactivar solo los botones de peso
                botonesCantidad[4].classList.remove('activado');
                botonesCantidad[5].classList.remove('activado');
                boton.classList.add('activado');

                pesoMostrado = index === 4 ? 'bruto' : 'prima';
                actualizarPesoMostrado();
            } else {
                // Para botones de ordenamiento (0-3)
                const botonesOrdenamiento = Array.from(botonesCantidad).slice(0, 4);
                botonesOrdenamiento.forEach(b => b.classList.remove('activado'));
                boton.classList.add('activado');
            }

            aplicarFiltros();
        });
    });
    function actualizarPesoMostrado() {
        const registros = document.querySelectorAll('.registro-item');
        registros.forEach(registro => {
            const producto = productos.find(p => p.id === registro.dataset.id);
            if (producto) {
                const total = pesoMostrado === 'bruto'
                    ? producto.bruto.split(';').reduce((sum, lote) => sum + parseFloat(lote.split('-')[0]), 0)
                    : producto.prima.split(';').reduce((sum, lote) => sum + parseFloat(lote.split('-')[0]), 0);

                const stockSpan = registro.querySelector('.valor.stock');
                if (stockSpan) {
                    stockSpan.textContent = `${total.toFixed(2)} Kg.`;
                }
            }
        });
    }
    botonesEtiquetas.forEach(boton => {
        boton.addEventListener('click', () => {
            botonesEtiquetas.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            filtroNombreActual = boton.textContent.trim();
            aplicarFiltros();
            scrollToCenter(boton, boton.parentElement);
        });
    });


    function mostrarCarritoPedidos() {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (!anuncioSecond) return;

        const [id, item] = Array.from(carritoIngresosAcopio.entries())[0];

        const obtenerLotesDisponibles = (tipo) => {
            const lotes = tipo === 'bruto' ?
                item.bruto.split(';').filter(lote => lote.trim() !== '') :
                item.prima.split(';').filter(lote => lote.trim() !== '');

            return lotes.map(lote => {
                const [peso, numero] = lote.split('-');
                return { peso: parseFloat(peso), numero: parseInt(numero) };
            });
        };

        const generarOpcionesLote = (tipo) => {
            const lotes = obtenerLotesDisponibles(tipo);
            return lotes.map(lote =>
                `<option value="${lote.numero}" data-peso="${lote.peso}">
                    Lote ${lote.numero} - ${lote.peso} Kg
                </option>`
            ).join('');
        };

        anuncioSecond.innerHTML = `
            <div class="encabezado">
            <h1 class="titulo">${item.producto}</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Detalles de salida</p>
            <div class="entrada">
                <i class='bx bx-leaf'></i>
                <div class="input">
                    <p class="detalle">Tipo de materia</p>
                    <select class="tipo-materia">
                        <option value="bruto">Materia Bruta</option>
                        <option value="prima">Materia Prima</option>
                    </select>
                </div>
            </div>
            <div class="entrada">
                <i class='bx bx-receipt'></i>
                <div class="input">
                    <p class="detalle">Lote disponible</p>
                    <select class="numero-lote" required>
                        <option value=""></option>
                        ${generarOpcionesLote('bruto')}
                    </select>
                </div>
            </div>
            <div class="entrada">
                <i class="ri-scales-line"></i>
                <div class="input">
                    <p class="detalle">Peso disponible</p>
                    <input type="number" class="peso-kg" step="0.01" min="0">
                </div>
            </div>
            <p class="normal">Nombre del ingreso</p>
            <div class="entrada">
                <i class='bx bx-comment-detail'></i>
                <div class="input">
                    <p class="detalle">Nombre del movimeinto</p>
                    <input class="nombre-movimiento" type="text" autocomplete="off" placeholder=" " required>
                </div>
            </div>
            
            <p class="normal">Razon/motivo/observaciones</p>
            <div class="entrada">
                <i class='bx bx-comment-detail'></i>
                <div class="input">
                    <p class="detalle">Razon o motivo del ingreso</p>
                    <input class="razon-ingreso" type="text" autocomplete="off" placeholder=" " required>
                </div>
            </div>
        </div>
        <div class="anuncio-botones">
            <button class="btn-procesar-ingreso btn green">
                <i class='bx bx-check'></i> Procesar salida
            </button>
        </div>
    `;

        mostrarAnuncioSecond();
        anuncioSecond.style.paddingBottom = '80px';

        // Eventos para manejar los cambios
        const tipoMateriaSelect = anuncioSecond.querySelector('.tipo-materia');
        const numeroLoteSelect = anuncioSecond.querySelector('.numero-lote');
        const pesoInput = anuncioSecond.querySelector('.peso-kg');

        // Actualizar lotes cuando cambie el tipo de materia
        tipoMateriaSelect.addEventListener('change', (e) => {
            const tipo = e.target.value;
            numeroLoteSelect.innerHTML = `
            <option value=""></option>
            ${generarOpcionesLote(tipo)}
        `;
            pesoInput.value = ''; // Limpiar el peso cuando cambie el tipo
        });

        // Actualizar peso cuando se seleccione un lote
        numeroLoteSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            if (selectedOption.value) {
                pesoInput.value = selectedOption.dataset.peso || '';
                pesoInput.focus();
            } else {
                pesoInput.value = '';
            }
        });

        // Inicializar con los lotes de materia bruta
        numeroLoteSelect.innerHTML = `
        <option value=""></option>
        ${generarOpcionesLote('bruto')}
    `;

        // Evento para procesar la salida
        const btnProcesar = anuncioSecond.querySelector('.btn-procesar-ingreso');
        btnProcesar.addEventListener('click', procesarSalida);
    }
    async function procesarSalida() {
        try {
            mostrarCarga();
            const [id, item] = Array.from(carritoIngresosAcopio.entries())[0];

            const tipoMateria = document.querySelector('.tipo-materia').value;
            const numeroLote = document.querySelector('.numero-lote').value;
            const pesoKg = parseFloat(document.querySelector('.peso-kg').value);
            const nombreMovimiento = document.querySelector('.nombre-movimiento').value;
            const razonSalida = document.querySelector('.razon-ingreso').value;

            if (!numeroLote || !pesoKg || !nombreMovimiento || !razonSalida) {
                throw new Error('Por favor complete todos los campos');
            }

            // Obtener los lotes actuales según el tipo de materia
            const lotes = tipoMateria === 'bruto' ?
                item.bruto.split(';').filter(l => l && l !== '0-1') :
                item.prima.split(';').filter(l => l && l !== '0-1');

            // Encontrar y actualizar el lote específico
            const lotesActualizados = lotes.map(lote => {
                const [pesoLote, numLote] = lote.split('-');
                if (parseInt(numLote) === parseInt(numeroLote)) {
                    const nuevoPeso = Math.max(0, parseFloat(pesoLote) - pesoKg);
                    return nuevoPeso > 0 ? `${nuevoPeso.toFixed(2)}-${numLote}` : null;
                }
                return lote;
            }).filter(Boolean);

            // Preparar el objeto de actualización
            const updateData = {};
            updateData[tipoMateria] = lotesActualizados.length > 0 ? lotesActualizados.join(';') : '0-1';

            // Actualizar el producto
            const updateResponse = await fetch(`/actualizar-producto-acopio-salida/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) throw new Error('Error al actualizar producto');

            const fecha = new Date().toLocaleString('es-ES', {
                timeZone: 'America/La_Paz' // Puedes cambiar esto según tu país o ciudad
            });
            const movimientoResponse = await fetch('/registrar-movimiento-acopio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha_hora: fecha,
                    idProducto: id,
                    nombreProducto: item.producto,
                    peso: pesoKg,
                    tipo: `Salida ${tipoMateria}`,
                    nombreMovimiento: nombreMovimiento,
                    observaciones: razonSalida,
                    numeroLote: numeroLote
                })
            });

            if (!movimientoResponse.ok) throw new Error('Error al registrar movimiento');
            ocultarCarga();
            mostrarNotificacion({
                message: 'Salida registrada correctamente',
                type: 'success',
                duration: 3000
            });
            registrarNotificacion(
                'Administración',
                'Creación',
                usuarioInfo.nombre + 'registro una salida de almacen acopio de: ' + nombreProducto)

            carritoIngresosAcopio.clear();
            localStorage.setItem('damabrava_ingreso_acopio', '[]');

            ocultarAnuncioSecond();
            await mostrarSalidasAcopio();

        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion({
                message: error.message || 'Error al procesar la salida',
                type: 'error',
                duration: 3500
            });
        } finally {
            ocultarCarga();
        }
    }
    function agregarAlCarrito(productoId) {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;

        // Limpiar carrito anterior si existe
        carritoIngresosAcopio.clear();

        // Agregar nuevo producto
        carritoIngresosAcopio.set(productoId, producto);

        // Mostrar formulario inmediatamente
        mostrarCarritoPedidos();
    }
    aplicarFiltros();
}
