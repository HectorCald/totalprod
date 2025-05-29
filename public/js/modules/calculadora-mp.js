let registrosProduccion = [];
let usuarioInfo = recuperarUsuarioLocal();
let productosGlobal = [];
let calculosMP = [];

// Agregar la función para obtener los cálculos
async function obtenerCalculosMP() {
    try {
        const response = await fetch('/obtener-calculos-mp');
        const data = await response.json();

        if (data.success) {
            // Ordenar de más reciente a más antiguo por ID
            calculosMP = data.calculos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener cálculos de MP',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener cálculos:', error);
        mostrarNotificacion({
            message: 'Error al obtener cálculos de MP',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
let nombresUsuariosGlobal = []; // Agregar al inicio con las otras variables globales

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


function recuperarUsuarioLocal() {
    const usuarioGuardado = localStorage.getItem('damabrava_usuario');
    if (usuarioGuardado) {
        return JSON.parse(usuarioGuardado);
    }
    return null;
}
async function obtenerProductos() {
    try {
        const response = await fetch('/obtener-productos');
        const data = await response.json();

        if (data.success) {
            productosGlobal = data.productos;
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener productos',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener productos:', error);
        mostrarNotificacion({
            message: 'Error al obtener productos',
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
            <div class="entrada">
                <i class='bx bx-search'></i>
                <div class="input">
                    <p class="detalle">Buscar</p>
                    <input type="text" class="buscar-registro-verificacion" placeholder="">
                </div>
                <button class="btn-calendario"><i class='bx bx-calendar'></i></button>
            </div>
            <div class="filtros-opciones etiquetas-filter">
                <button class="btn-filtro activado">Todos</button>
                ${Array(5).fill().map(() => `
                    <div class="skeleton skeleton-etiqueta"></div>
                `).join('')}
            </div>
            <div class="filtros-opciones estado">
                <button class="btn-filtro activado">Todos</button>
                <button class="btn-filtro">Pendientes</button>
                <button class="btn-filtro">Finalizados</button>
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
            <button id="exportar-excel" class="btn orange"><i class='bx bx-download'></i>Descargar registros</button>
            <button id="nuevo-registro" class="btn especial"><i class='bx bx-file'></i>Nuevo registro</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '80px';
}
export async function mostrarCalcularMp() {
    mostrarAnuncio();
    renderInitialHTML();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    const [calculos, productos, nombres] = await Promise.all([
        obtenerCalculosMP(),
        obtenerProductos(),
        obtenerNombresUsuarios()
    ]);

    updateHTMLWithData();
    eventosVerificacion();
}
function updateHTMLWithData() {
    // Update etiquetas filter
    const nombresUnicos = [...new Set(calculosMP.map(registro => registro.nombre))];
    const etiquetasFilter = document.querySelector('.etiquetas-filter');
    const etiquetasHTML = nombresUnicos.map(etiqueta => `
        <button class="btn-filtro">${etiqueta}</button>
    `).join('');
    etiquetasFilter.innerHTML = `
        <button class="btn-filtro activado">Todos</button>
        ${etiquetasHTML}
    `;

    // Update productos
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = calculosMP.map(registro => `
        <div class="registro-item" data-id="${registro.id}">
            <div class="header">
                <i class='bx bx-file'></i>
                <div class="info-header">
                    <span class="id">${registro.id}<span class="valor ${registro.peso_final ? 'finalizado' : 'pendiente'}">${registro.peso_final ? 'Finalizado' : 'Pendiente'}</span></span>
                    <span class="nombre"><strong>${registro.nombre}</strong></span>
                    <span class="fecha">${registro.materia_prima}</span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
}


function eventosVerificacion() {
    const btnExcel = document.getElementById('exportar-excel');
    const registrosAExportar = registrosProduccion;

    const botonesNombre = document.querySelectorAll('.etiquetas-filter .btn-filtro');
    const botonesEstado = document.querySelectorAll('.filtros-opciones.estado .btn-filtro');


    const items = document.querySelectorAll('.registro-item');
    const inputBusqueda = document.querySelector('.buscar-registro-verificacion');
    const botonCalendario = document.querySelector('.btn-calendario');

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


    let filtroFechaInstance = null;
    let filtroNombreActual = 'Todos';
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
            const registroData = calculosMP.find(r => r.id === registro.dataset.id);
            if (!registroData) return { elemento: registro, mostrar: false };

            let mostrar = true;

            // Lógica de filtrado existente
            if (filtroEstadoActual && filtroEstadoActual !== 'Todos') {
                if (filtroEstadoActual === 'Pendientes') {
                    mostrar = registroData.peso_final === null || registroData.peso_final === '';
                } else if (filtroEstadoActual === 'Finalizados') {
                    mostrar = registroData.peso_final !== null && registroData.peso_final !== '';
                }
            }

            if (mostrar && filtroNombreActual && filtroNombreActual !== 'Todos') {
                mostrar = registroData.nombre === filtroNombreActual;
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
        boton.addEventListener('click', () => {
            botonesNombre.forEach(b => b.classList.remove('activado'));
            boton.classList.add('activado');
            filtroNombreActual = boton.textContent.trim();
            scrollToCenter(boton, boton.parentElement);
            aplicarFiltros();
        });
    });

    botonesEstado.forEach(boton => {
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
        const registro = calculosMP.find(r => r.id === registroId);
        if (!registro) return;

        // Separar datos de múltiples productos si existen
        const productos = {
            nombres: registro.materia_prima.split('-'),
            gramajes: registro.gramaje.split('-').map(Number),
            cantidades: registro.ctd_producida.toString().split('-').map(Number)
        };

        // Calcular datos para cada producto
        const productosCalculados = productos.nombres.map((nombre, index) => {
            const datosProducto = {
                nombre,
                gramaje: productos.gramajes[index],
                cantidadReal: productos.cantidades[index],
                pesoUsadoIdeal: ((productos.cantidades[index] * productos.gramajes[index]) / 1000).toFixed(2)
            };

            return {
                ...datosProducto,
                formatoCalculo: {
                    cantidadIdeal: {
                        formula: `(${registro.peso_inicial} kg × 1000) ÷ ${datosProducto.gramaje}g`,
                        resultado: `${((registro.peso_inicial * 1000) / datosProducto.gramaje).toFixed(2)} und.`
                    },
                    cantidadReal: {
                        formula: `Cantidad registrada en producción`,
                        resultado: `${datosProducto.ctd_producida} und.`
                    },
                    pesoUsadoIdeal: {
                        formula: `${datosProducto.cantidadReal} unidades × ${datosProducto.gramaje}g ÷ 1000`,
                        resultado: `${datosProducto.ctd_producida} kg`
                    }
                }
            };
        });

        // Calcular totales
        const pesoUsadoIdealTotal = productosCalculados.reduce((sum, prod) =>
            sum + parseFloat(prod.pesoUsadoIdeal), 0);
        const pesoFinalIdeal = (registro.peso_inicial - pesoUsadoIdealTotal).toFixed(2);
        const diferenciaPesoFinal = registro.peso_final ?
            (registro.pesoFinal - pesoFinalIdeal).toFixed(2) : 'Pendiente';

        const contenido = document.querySelector('.anuncio-second .contenido');
        // Dentro de la función info, actualizar la sección de detalles:
        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Detalles del Cálculo</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div class="relleno">
                <p class="normal">Información General</p>
                <div class="campo-vertical">
                    <span class="valor"><strong><i class='bx bx-id-card'></i> ID: </strong>${registro.id}</span>
                    <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                    <span class="valor"><strong><i class='bx bx-user'></i> Nombre: </strong>${registro.nombre}</span>
                    <span class="valor"><strong><i class='bx bx-user-check'></i> Responsable: </strong>${registro.responsable}</span>
                </div>
        
                <p class="normal">Datos Generales de Producción</p>
                <div class="campo-vertical">
                    <span class="valor"><strong><i class='bx bx-package'></i> Peso Inicial: </strong>${registro.peso_inicial} kg</span>
                    <span class="valor"><strong><i class='bx bx-package'></i> Peso Final: </strong>
                        <span class="${registro.peso_final ? 'con-peso' : 'pendiente'}">
                            ${registro.peso_final ? `${registro.peso_final} kg` : 'Pendiente'}
                        </span>
                    </span>
                </div>
        
                <p class="normal">Totales Calculados</p>
                <div class="campo-vertical">
                    <div class="calculo-item">
                        <div class="calculo-header">
                            <span class="valor"><strong><i class='bx bx-calculator'></i> Peso Usado Ideal Total: </strong>${pesoUsadoIdealTotal.toFixed(2)} kg<i class="btn-info" title="Ver proceso">
                                <i class="fas fa-info-circle"></i>
                            </i></span>
                        </div>
                        <div class="formula" style="display: none;">
                            ${productosCalculados.map(p => `${p.nombre}: ${p.pesoUsadoIdeal} kg`).join(' + ')}
                        </div>
                    </div>
        
                    <div class="calculo-item">
                        <div class="calculo-header">
                            <span class="valor"><strong><i class='bx bx-calculator'></i> Peso Final Ideal: </strong>${pesoFinalIdeal} kg<i class="btn-info" title="Ver proceso">
                                <i class="fas fa-info-circle"></i>
                            </i></span>
                        </div>
                        <div class="formula" style="display: none;">
                            ${registro.peso_inicial} kg - ${pesoUsadoIdealTotal.toFixed(2)} kg
                        </div>
                    </div>
        
                    ${registro.peso_final ? `
                        <div class="calculo-item">
                            <div class="calculo-header">
                                <span class="valor"><strong><i class='bx bx-calculator'></i> Diferencia en Peso Final: </strong>
                                    <span class="${parseFloat(diferenciaPesoFinal) > 0 ? 'positivo' : 'negativo'}">${diferenciaPesoFinal} kg</span>
                                    <i class="btn-info" title="Ver proceso">
                                    <i class="fas fa-info-circle"></i>
                                </i>
                                </span>
                            </div>
                            <div class="formula" style="display: none;">
                                ${registro.peso_final} kg - ${pesoFinalIdeal} kg
                            </div>
                        </div>
                    ` : ''}
                </div>
        
                ${productosCalculados.map((producto, index) => `
                    <p class="normal">Producto ${index + 1}: ${producto.nombre}</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-scatter-chart'></i> Gramaje: </strong>${producto.gramaje} g</span>
                        <span class="valor"><strong><i class='bx bx-box'></i> Cantidad Producida: </strong>${producto.cantidadReal} unidades</span>
                        
                        <div class="calculo-item">
                            <div class="calculo-header">
                                <span class="valor"><strong><i class='bx bx-calculator'></i> Peso Usado Ideal: </strong>${producto.pesoUsadoIdeal} kg<i class="btn-info" title="Ver proceso">
                                    <i class="fas fa-info-circle"></i>
                                </i></span>
                            </div>
                            <div class="formula" style="display: none;">
                                ${producto.formatoCalculo.pesoUsadoIdeal.formula}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="anuncio-botones">
                ${!registro.peso_final ? `
                    <button class="btn-agregar-peso btn green">
                        <i class="ri-scales-line"></i> Peso final
                    </button>
                ` : ''}
                <button class="btn-editar btn blue">
                    <i class="bx bx-edit"></i> Editar
                </button>
                <button class="btn-eliminar btn red">
                    <i class="bx bx-trash"></i> Eliminar
                </button>
            </div>
        `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '80px';
        mostrarAnuncioSecond();

        // Configurar los botones de información
        contenido.querySelectorAll('.btn-info').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Cambiar el selector para encontrar el elemento formula
                const calculo = e.target.closest('.calculo-item');
                const formula = calculo.querySelector('.formula');
                if (formula) {
                    formula.style.display = formula.style.display === 'none' ? 'block' : 'none';
                    formula.style.transition = 'all 0.3s ease';
                    formula.style.fontSize = '13px';
                }
            });
        });

        // Configurar los botones de acción
        const btnAgregarPeso = contenido.querySelector('.btn-agregar-peso');

        if (btnAgregarPeso) {
            btnAgregarPeso.addEventListener('click', () => agregarPesoFinal(registro));
        }


        const btnEditar = contenido.querySelector('.btn-editar');
        btnEditar.addEventListener('click', () => editar(registro));


        const btnEliminar = contenido.querySelector('.btn-eliminar');
        btnEliminar.addEventListener('click', () => eliminar(registro));



        function eliminar(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Eliminar Cálculo</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="relleno">
                    <p class="normal">Información General</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-id-card'></i> ID: </strong>${registro.id}</span>
                        <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                        <span class="valor"><strong><i class='bx bx-user'></i> Nombre: </strong>${registro.nombre}</span>
                    </div>
        
                    <p class="normal">Motivo de la eliminación</p>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Motivo</p>
                            <input class="motivo" type="text" required>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button class="btn-eliminar-registro btn red">
                        <i class="bx bx-trash"></i> Confirmar eliminación
                    </button>
                </div>
            `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            // Agregar evento al botón eliminar
            const btnEliminar = contenido.querySelector('.btn-eliminar-registro');
            btnEliminar.addEventListener('click', async () => {
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

                    const response = await fetch(`/eliminar-calculo-mp/${registro.id}`, {
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
                        mostrarNotificacion({
                            message: 'Cálculo eliminado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        cerrarAnuncioManual('anuncioTercer');
                        cerrarAnuncioManual('anuncioSecond');
                        await mostrarCalcularMp();
                    }

                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al eliminar el cálculo',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            });
        }
        function editar(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');

            // Procesar múltiples productos si existen
            const productosHTML = registro.materia_prima.split('-').map((producto, index) => {
                const gramaje = registro.gramaje.split('-')[index];
                const cantidad = registro.ctd_producida.split('-')[index];

                return `
                <div class="producto-item" style="display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid gray; padding-bottom: 10px;">
                    <div class="entrada">
                        <i class='bx bx-cube'></i>
                        <div class="input">
                            <p class="detalle">Producto</p>
                            <input class="producto" type="text" value="${producto}" readonly>
                        </div>
                    </div>
                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class="ri-scales-line"></i>
                            <div class="input">
                                <p class="detalle">Gramaje (g)</p>
                                <input class="gramaje" type="number" value="${gramaje}" required>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-box'></i>
                            <div class="input">
                                <p class="detalle">Cantidad</p>
                                <input class="cantidad" type="number" value="${cantidad}" required>
                            </div>
                        </div>
                    </div>
                    
                </div>`;
            }).join('');

            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Editar Cálculo</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="relleno">
                    <p class="normal">Información del Cálculo</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                        <span class="valor"><strong><i class='bx bx-user'></i> Nombre: </strong>${registro.nombre}</span>
                    </div>
        
                    <p class="normal">Pesos</p>
                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class='bx bx-package'></i>
                            <div class="input">
                                <p class="detalle">Peso Inicial</p>
                                <input class="peso-inicial" type="number" step="0.01" value="${registro.peso_inicial}" required>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-package'></i>
                            <div class="input">
                                <p class="detalle">Peso Final</p>
                                <input class="peso-final" type="number" step="0.01" value="${registro.peso_final || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-trash'></i>
                        <div class="input">
                            <p class="detalle">Peso Merma (kg)</p>
                            <input class="peso-merma" type="number" step="0.01" value="${registro.peso_merma || ''}">
                        </div>
                    </div>
        
                    <p class="normal">Productos</p>
                    <div class="productos-container" style="display: flex; flex-direction: column; gap: 10px;">
                        ${productosHTML}
                    </div>
        
                    <p class="normal">Observaciones</p>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones</p>
                            <input class="observaciones" type="text" value="${registro.observaciones || ''}">
                        </div>
                    </div>
        
                    <p class="normal">Motivo de la edición</p>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Motivo</p>
                            <input class="motivo" type="text" required>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button class="btn-editar-registro btn blue">
                        <i class="bx bx-save"></i> Guardar cambios
                    </button>
                </div>
            `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            // Agregar evento al botón guardar
            const btnEditar = contenido.querySelector('.btn-editar-registro');
            btnEditar.addEventListener('click', async () => {
                const motivo = document.querySelector('.motivo').value.trim();
                if (!motivo) {
                    mostrarNotificacion({
                        message: 'Debe ingresar el motivo de la edición',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga();

                    // Obtener datos de productos
                    const productos = Array.from(document.querySelectorAll('.producto-item')).map(item => ({
                        producto: item.querySelector('.producto').value,
                        gramaje: item.querySelector('.gramaje').value,
                        cantidad: item.querySelector('.cantidad').value
                    }));

                    // Obtener otros datos
                    const pesoInicial = document.querySelector('.peso-inicial').value;
                    const pesoFinal = document.querySelector('.peso-final').value;
                    const pesoMerma = document.querySelector('.peso-merma').value;
                    const observaciones = document.querySelector('.observaciones').value.trim();

                    const response = await fetch(`/editar-calculo-mp/${registro.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            productos,
                            peso_inicial: pesoInicial,
                            peso_final: pesoFinal || null,
                            peso_merma: pesoMerma || null,
                            observaciones,
                            motivo
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        mostrarNotificacion({
                            message: 'Registro actualizado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        ocultarCarga();
                        cerrarAnuncioManual('anuncioTercer');
                        cerrarAnuncioManual('anuncioSecond');
                        await mostrarCalcularMp();

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
            });
        }
        function agregarPesoFinal(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Agregar Peso Final</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="relleno">
                    <p class="normal">Información General</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-id-card'></i> ID: </strong>${registro.id}</span>
                        <span class="valor"><strong><i class='bx bx-user'></i> Operador: </strong>${registro.nombre}</span>
                        <span class="valor"><strong><i class='bx bx-package'></i> Peso Inicial: </strong>${registro.peso_inicial} kg</span>
                    </div>
        
                    <p class="normal">Agregar Peso Final</p>
                    <div class="entrada">
                        <i class='bx bx-package'></i>
                        <div class="input">
                            <p class="detalle">Peso Final (kg)</p>
                            <input type="number" class="peso-final" step="0.01" required>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button class="btn-agregar btn green">
                        <i class="fas fa-save"></i> Guardar Peso Final
                    </button>
                </div>
            `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            // Agregar evento al botón
            const btnAgregar = contenido.querySelector('.btn-agregar');
            btnAgregar.addEventListener('click', async () => {
                const pesoFinal = document.querySelector('.peso-final').value;

                if (!pesoFinal) {
                    mostrarNotificacion({
                        message: 'Debe ingresar el peso final',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga();
                    const response = await fetch(`/agregar-peso-final-mp/${registro.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ peso_final: pesoFinal })
                    });

                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        mostrarNotificacion({
                            message: 'Peso final agregado correctamente',
                            type: 'success',
                            duration: 3000
                        });

                        // Actualizar la vista
                        await obtenerCalculosMP();
                        cerrarAnuncioManual('anuncioTercer');
                        window.info(registro.id); // Recargar detalles
                    }

                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al agregar el peso final',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            });
        }

    }
    btnExcel.addEventListener('click', () => exportarArchivos('produccion', registrosAExportar));
    aplicarFiltros();

    document.addEventListener('click', async function (e) {
        if (e.target.closest('#nuevo-registro')) {
            mostrarFormularioNuevoRegistro();
        }
    });

    function mostrarFormularioNuevoRegistro() {
        const contenido = document.querySelector('.anuncio-tercer .contenido');

        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Nuevo Registro de Materia Prima</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div class="relleno">
                <p class="normal">Información General</p>
                <div class="campo-horizontal">
                    <div class="entrada">
                        <i class='bx bx-user'></i>
                        <div class="input">
                            <p class="detalle">Operador</p>
                            <select class="nombre-operador" required>
                                <option value=""></option>
                                ${nombresUsuariosGlobal.map(user => `
                                    <option value="${user.nombre}">${user.nombre}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-user-check'></i>
                        <div class="input">
                            <p class="detalle">Responsable</p>
                            <input class="responsable" value="${usuarioInfo.nombre}" type="text" readonly>
                        </div>
                    </div>
                </div>
                <div class="etiquetas-container">
                    <div class="etiquetas-actuales">
                        
                    </div>
                </div>
                <p class="normal">Productos</p>
                <div class="entrada">
                    <i class="ri-box-3-line"></i>
                    <div class="input">
                        <p class="detalle">Producto</p>
                        <input class="producto" type="text" autocomplete="off" placeholder=" " required>
                        <button type="button" class="btn-agregar-etiqueta-temp"><i class='bx bx-plus'></i></button>
                    </div>
                </div>
                <div class="sugerencias" id="productos-list"></div>
                <p class="normal">Peso Inicial</p>
                <div class="entrada">
                    <i class='bx bx-package'></i>
                    <div class="input">
                        <p class="detalle">Peso Inicial (kg)</p>
                        <input class="peso-inicial" type="number" step="0.01" required>
                    </div>
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-registrar btn blue">
                    <i class="bx bx-save"></i> Registrar
                </button>
            </div>
        `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '80px';
        mostrarAnuncioTercer();

        const productoInput = document.querySelector('.entrada .producto');
        const sugerenciasList = document.querySelector('#productos-list');
        const gramajeInput = document.querySelector('.entrada .gramaje');

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
                            productoInput.value = p.producto + ' ' + p.gramos + 'gr.';
                            sugerenciasList.style.display = 'none';
                            window.idPro = p.id;
                        };
                        sugerenciasList.appendChild(div);
                    });
                }
            } else {
                sugerenciasList.style.display = 'none';
            }
        });

        const btnAgregarEtiqueta = contenido.querySelector('.btn-agregar-etiqueta-temp');
        btnAgregarEtiqueta.addEventListener('click', () => {
            const productoSeleccionado = productoInput.value.trim();
            const productoId = window.idPro;

            if (!productoSeleccionado || !productoId) {
                mostrarNotificacion({
                    message: 'Debe seleccionar un producto de la lista',
                    type: 'warning',
                    duration: 3500
                });
                return;
            }

            const etiquetasActuales = contenido.querySelector('.etiquetas-actuales');
            const producto = productosGlobal.find(p => p.id === productoId);

            if (producto) {
                // Verificar si el producto ya está agregado
                const yaExiste = Array.from(etiquetasActuales.querySelectorAll('.etiqueta-item span'))
                    .some(span => span.textContent === `${producto.producto}-${producto.gramos}gr`);

                if (yaExiste) {
                    mostrarNotificacion({
                        message: 'Este producto ya está agregado',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                const nuevoProducto = document.createElement('div');
                nuevoProducto.className = 'etiqueta-item';
                nuevoProducto.innerHTML = `
                    <i class='bx bx-package'></i>
                    <span>${producto.producto}-${producto.gramos}gr</span>
                    <button type="button" class="btn-quitar-etiqueta"><i class='bx bx-x'></i></button>
                `;

                // Agregar evento para eliminar la etiqueta
                nuevoProducto.querySelector('.btn-quitar-etiqueta').addEventListener('click', () => {
                    nuevoProducto.remove();
                });

                etiquetasActuales.appendChild(nuevoProducto);
                productoInput.value = '';
                sugerenciasList.style.display = 'none';
                window.idPro = null;

                // Notificación de éxito
                mostrarNotificacion({
                    message: 'Producto agregado correctamente',
                    type: 'success',
                    duration: 2000
                });
            }
        });

        const btnRegistrar = contenido.querySelector('.btn-registrar');
        btnRegistrar.addEventListener('click', async () => {
            try {
                // Validar campos requeridos
                const nombreOperador = contenido.querySelector('.nombre-operador').value.trim();
                const responsable = contenido.querySelector('.responsable').value.trim();
                const pesoInicial = contenido.querySelector('.peso-inicial').value;
                const etiquetas = contenido.querySelectorAll('.etiqueta-item');

                if (!nombreOperador || !responsable || !pesoInicial) {
                    throw new Error('Debe completar todos los campos requeridos');
                }

                if (etiquetas.length === 0) {
                    throw new Error('Debe agregar al menos un producto');
                }

                // Obtener productos seleccionados
                const productos = Array.from(etiquetas).map(etiqueta => {
                    const texto = etiqueta.querySelector('span').textContent;
                    // Separar el texto en producto y gramaje usando split
                    const [productoCompleto, gramajeParte] = texto.split('-');
                    return {
                        nombre: productoCompleto, // El nombre completo del producto sin modificar
                        gramaje: parseInt(gramajeParte) // Convertir el gramaje a número
                    };
                });

                mostrarCarga();

                const response = await fetch('/registrar-calculo-mp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nombre_operador: nombreOperador,
                        responsable,
                        peso_inicial: pesoInicial,
                        productos
                    })
                });

                const data = await response.json();

                if (data.success) {
                    mostrarNotificacion({
                        message: 'Registro creado correctamente',
                        type: 'success',
                        duration: 3000
                    });
                    cerrarAnuncioManual('anuncioTercer');
                    await mostrarCalcularMp();
                } else {
                    throw new Error(data.error);
                }

            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al crear el registro',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarCarga();
            }
        });
    }

}
