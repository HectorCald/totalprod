let productos = [];
let etiquetasAcopio = [];
let usuarioInfo = recuperarUsuarioLocal();
let carritoIngresosAcopio = new Map(JSON.parse(localStorage.getItem('damabrava_ingreso_acopio') || '[]'));
let mensajeIngresos = localStorage.getItem('damabrava_mensaje_ingresos') || 'Se ingreso:\n• Sin ingresos registrados';

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


export async function mostrarIngresosAcopio(producto = '', pedido = '') {
    mostrarAnuncio();
    renderInitialHTML(); // Render initial HTML immediately
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    // Load data in parallel
    const [almacenGeneral, etiquetasResult] = await Promise.all([
        obtenerAlmacenAcopio(),
        obtenerEtiquetasAcopio(),
    ]);

    updateHTMLWithData(); // Update HTML once data is loaded
    eventosPedidos(producto, pedido);
}
function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Ingresos acopio</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
            <button class="btn filtros" onclick="mostrarFormatoIngresos()"><i class='bx bx-comment-detail'></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="entrada">
                <i class='bx bx-search'></i>
                <div class="input">
                    <p class="detalle">Buscar</p>
                    <input type="text" class="buscar-producto-acopio" placeholder="">
                </div>
            </div>
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro activado">Todos</button>
                ${Array(5).fill().map(() => `
                    <div class="skeleton skeleton-etiqueta"></div>
                `).join('')}
            </div>
            <div class="filtros-opciones cantidad-filter" style="overflow:hidden">
                <button class="btn-filtro" title="Mayor a menor"><i class='bx bx-sort-down'></i></button>
                <button class="btn-filtro" title="Menor a mayor"><i class='bx bx-sort-up'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-a-z'></i></button>
                <button class="btn-filtro"><i class='bx bx-sort-z-a'></i></button>
                <button class="btn-filtro" title="Bruto">Bruto</button>
                <button class="btn-filtro" title="Prima">Prima</button>
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


function eventosPedidos(producto, pedido) {
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
    if (producto) {
        agregarAlCarrito(producto);
        mostrarCarritoIngresosAcopio();
        ocultarCarga();
    }

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




    function agregarAlCarrito(productoId) {

        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;

        // Limpiar carrito anterior si existe
        carritoIngresosAcopio.clear();

        // Agregar nuevo producto
        carritoIngresosAcopio.set(productoId, producto);


        // Mostrar formulario inmediatamente
        mostrarCarritoIngresosAcopio();
    }
    function mostrarCarritoIngresosAcopio() {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (!anuncioSecond) return;

        const [id, item] = Array.from(carritoIngresosAcopio.entries())[0];

        const actualizarLoteSegunTipo = (tipo) => {
            const lotes = tipo === 'bruto' ?
                item.bruto.split(';').map(lote => {
                    const [peso, numero] = lote.split('-');
                    return { peso: parseFloat(peso), numero: parseInt(numero) };
                }) :
                item.prima.split(';').map(lote => {
                    const [peso, numero] = lote.split('-');
                    return { peso: parseFloat(peso), numero: parseInt(numero) };
                });

            const ultimoLote = lotes.length > 0 ? Math.max(...lotes.map(l => l.numero)) : 0;
            const inputLote = document.querySelector('.numero-lote');
            if (inputLote) {
                inputLote.value = ultimoLote + 1;
            }
        };

        // Obtener el último lote inicial (materia bruta por defecto)
        const lotesBruto = item.bruto.split(';').map(lote => {
            const [peso, numero] = lote.split('-');
            return { peso: parseFloat(peso), numero: parseInt(numero) };
        });
        const ultimoLote = lotesBruto.length > 0 ? Math.max(...lotesBruto.map(l => l.numero)) : 0;

        anuncioSecond.innerHTML = `
        <div class="encabezado">
            <h1 class="titulo">${item.producto}</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
        <p class="normal">Detalles de ingreso</p>
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
            
            <div class="campo-horizontal">
                <div class="entrada">
                    <i class="ri-scales-line"></i>
                    <div class="input">
                        <p class="detalle">Peso (Kg.)</p>
                        <input type="number" class="peso-kg" step="0.01" min="0" required>
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-receipt'></i>
                    <div class="input">
                        <p class="detalle">Lote</p>
                        <input type="number" class="numero-lote" value="${ultimoLote + 1}" min="1">
                    </div>
                </div>
            </div>
            <p class="normal">Carcateristicas organolépticas</p>
            <div class="campo-horizontal">
                <div class="entrada">
                    <i class='bx bx-palette'></i>
                    <div class="input">
                        <p class="detalle">Color</p>
                        <select class="color" required>
                            <option value=""></option>
                            <option value="Malo">Malo</option>
                            <option value="Bueno">Bueno</option>
                        </select>
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-wind'></i>
                    <div class="input">
                        <p class="detalle">Olor</p>
                        <select class="olor" required>
                            <option value=""></option>
                            <option value="Malo">Malo</option>
                            <option value="Bueno">Bueno</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="campo-horizontal">
                <div class="entrada">
                    <i class='bx bx-face'></i>
                    <div class="input">
                        <p class="detalle">Sabor</p>
                        <select class="sabor" required>
                            <option value=""></option>
                            <option value="Malo">Malo</option>
                            <option value="Bueno">Bueno</option>
                        </select>
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-shape-square'></i>
                    <div class="input">
                        <p class="detalle">Textura</p>
                        <select class="textura" required>
                            <option value=""></option>
                            <option value="Malo">Malo</option>
                            <option value="Bueno">Bueno</option>
                        </select>
                    </div>
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
                <i class='bx bx-check'></i> Registrar Ingreso
            </button>
        </div>
    `;

        mostrarAnuncioSecond();

        // Agregar evento para actualizar lote cuando cambie el tipo de materia
        const tipoMateriaSelect = anuncioSecond.querySelector('.tipo-materia');
        tipoMateriaSelect.addEventListener('change', (e) => {
            actualizarLoteSegunTipo(e.target.value);
        });

        // Inicializar con el tipo de materia actual
        actualizarLoteSegunTipo('bruto');

        // Evento para procesar el ingreso
        const btnProcesar = anuncioSecond.querySelector('.btn-procesar-ingreso');
        btnProcesar.addEventListener('click', procesarIngreso);

        async function procesarIngreso() {
            try {
                mostrarCarga();
                const [id, item] = Array.from(carritoIngresosAcopio.entries())[0];
                const nombreMovimiento = document.querySelector('.nombre-movimiento').value;
                const tipoMateria = document.querySelector('.tipo-materia').value;
                const pesoKg = document.querySelector('.peso-kg').value;
                const numeroLote = document.querySelector('.numero-lote').value;
                const color = document.querySelector('.color').value;
                const olor = document.querySelector('.olor').value;
                const sabor = document.querySelector('.sabor').value;
                const textura = document.querySelector('.textura').value;
                const razonIngreso = document.querySelector('.razon-ingreso').value;

                if (!pesoKg || !numeroLote || !color || !olor || !razonIngreso) {
                    throw new Error('Por favor complete todos los campos');
                }

                // Preparar datos para la actualización
                const caracteristicas = `Olor:${olor}; Color:${color}; Sabor:${sabor}; Textura:${textura}`;


                const movimientoResponse = await fetch('/registrar-movimiento-acopio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fecha_hora: new Date().toLocaleString(),
                        idProducto: id,
                        nombreProducto: item.producto,
                        peso: pesoKg,
                        tipo: `Ingreso ${tipoMateria}`,
                        nombreMovimiento: nombreMovimiento,
                        caracteristicas: caracteristicas,
                        observaciones: razonIngreso,
                        pedidoId: pedido // ← Añadir esta línea
                    })
                });


                if (!movimientoResponse.ok) throw new Error('Error al registrar movimiento');

                // Actualizar el producto en el almacén
                const updateResponse = await fetch(`/actualizar-producto-acopio/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tipoMateria,
                        pesoKg,
                        numeroLote
                    })
                });

                if (!updateResponse.ok) throw new Error('Error al actualizar producto');

                // Format message properly
                if (mensajeIngresos === 'Se ingreso:\n• Sin ingresos registrados') {
                    mensajeIngresos = 'Se ingreso:\n';
                }
                mensajeIngresos = mensajeIngresos
                    .replace(/\n\nSe ingreso en la App de TotalProd.$/, '')
                    .replace(/\n$/, '');
                mensajeIngresos += `\n• ${item.producto} - ${pesoKg} Kg.`;
                mensajeIngresos += '\n\nSe ingreso en la App de TotalProd.';

                localStorage.setItem('damabrava_mensaje_ingresos', mensajeIngresos);
                carritoIngresosAcopio.clear();
                localStorage.setItem('damabrava_ingreso_acopio', '[]');

                mostrarNotificacion({
                    message: 'Ingreso registrado correctamente',
                    type: 'success',
                    duration: 3000
                });
                if(pedido){
                    ocultarCarga();
                    ocultarAnuncioSecond();
                    await mostrarPedidos();
                }
                else{
                    ocultarCarga();
                    ocultarAnuncioSecond();
                    await mostrarIngresosAcopio();
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al procesar el ingreso',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarCarga();
            }
        }
    }


    function mostrarMensajeIngresos() {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        const formatoHTML = `
        <div class="encabezado">
            <h1 class="titulo">Ingresos Registrados</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')">
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>
        <div class="relleno">
            <div class="formato-pedido">
                <div contenteditable="true" style="min-height: fit-content; white-space: pre-wrap; font-family: Arial, sans-serif; text-align: left; padding: 15px;">${mensajeIngresos}</div>
            </div>
        </div>
        <div class="anuncio-botones" style="display: flex; gap: 10px;">
            <button class="btn blue" onclick="limpiarFormatoIngresos()">
                <i class="fas fa-broom"></i> Limpiar
            </button>
            <button class="btn green" onclick="compartirFormatoIngresos()">
                <i class="fas fa-share-alt"></i> Compartir
            </button>
        </div>
    `;

        anuncioSecond.innerHTML = formatoHTML;
        mostrarAnuncioSecond();
    }
    window.limpiarFormatoIngresos = function () {
        mensajeIngresos = 'Se ingreso:\n• Sin ingresos registrados';
        localStorage.setItem('damabrava_mensaje_ingresos', mensajeIngresos);
        const formatoDiv = document.querySelector('.formato-pedido div[contenteditable]');
        if (formatoDiv) {
            formatoDiv.innerHTML = mensajeIngresos;
        }
    };
    window.compartirFormatoIngresos = async function () {
        const formatoDiv = document.querySelector('.formato-pedido div[contenteditable]');
        if (!formatoDiv) return;

        const texto = encodeURIComponent(formatoDiv.innerText);
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    };
    window.mostrarFormatoIngresos = function () {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (!anuncioSecond) return;
        mostrarMensajeIngresos();
    };


    aplicarFiltros();
}


