
let usuarioInfo = recuperarUsuarioLocal();
let productosGlobal = [];
let tareasGlobal = [];
let listaTareasGlobal = [];

async function obtenerListaTareas() {
    try {
        const response = await fetch('/obtener-lista-tareas');
        const data = await response.json();

        if (data.success) {
            listaTareasGlobal = data.tareas;
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener lista de tareas',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener lista de tareas:', error);
        mostrarNotificacion({
            message: 'Error al obtener lista de tareas',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerTareas() {
    try {
        const response = await fetch('/obtener-tareas');
        const data = await response.json();

        if (data.success) {
            // Ordenar de más reciente a más antiguo por ID
            tareasGlobal = data.tareas.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener tareas',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        mostrarNotificacion({
            message: 'Error al obtener tareas',
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
        const response = await fetch('/obtener-productos-acopio');
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
                    <button class="exportar-excel btn orange"><i class='bx bx-download'></i><span>Descargar</span></button>
                    <button class="nuevo-registro btn especial"><i class='bx bx-file'></i><span>Iniciar</span></button>
                    <button class="btn-lista-tareas btn especial"><i class='bx bx-task'></i><span>Lista</span></button>
                </div>
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
            <button class="exportar-excel btn orange"><i class='bx bx-download'></i>Descargar</button>
            <button class="nuevo-registro btn especial"><i class='bx bx-file'></i>Nueva</button>
            <button class="btn-lista-tareas btn especial"><i class='bx bx-task'></i>Lista</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '80px';
}
export async function mostrarTareas() {
    renderInitialHTML();
    mostrarAnuncio();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    const [productos, tareas, registros] = await Promise.all([
        obtenerProductos(),
        obtenerListaTareas(),
        obtenerTareas(),
    ]);

    updateHTMLWithData();
    eventosTareas();
}
function updateHTMLWithData() {
    function convertirHoraAMinutos(hora) {
        let [h, m] = hora.split(":").map(Number);
        return h * 60 + m;
    }

    function restarHoras(horaInicio, horaFin) {
        let inicioMin = convertirHoraAMinutos(horaInicio);
        let finMin = convertirHoraAMinutos(horaFin);
        let diff = finMin - inicioMin;

        // Convertimos de nuevo a HH:mm
        let horas = Math.floor(diff / 60);
        let minutos = diff % 60;
        return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    }

    // Update productos
    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = tareasGlobal.map(registro => `
        <div class="registro-item" data-id="${registro.id}">
            <div class="header">
                <i class='bx bx-task'></i>
                <div class="info-header">
                    <span class="id">${registro.id}<span class="valor ${registro.hora_fin ? 'finalizado' : 'pendiente'}">${registro.hora_fin ? restarHoras(registro.hora_inicio, registro.hora_fin) : 'Pendiente'}</span></span>
                    <span class="nombre"><strong>${registro.producto}</strong></span>
                    <span class="fecha">${registro.operador}</span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
}


function eventosTareas() {
    const btnExcel = document.querySelectorAll('.exportar-excel');
    const btnNuevaTarea = document.querySelectorAll('.nuevo-registro');
    const btnListaTareas = document.querySelectorAll('.btn-lista-tareas');
    const registrosAExportar = tareasGlobal;

    const botonesEstado = document.querySelectorAll('.filtros-opciones.estado .btn-filtro');


    const items = document.querySelectorAll('.registro-item');
    const inputBusqueda = document.querySelector('.buscar-registro-verificacion');
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


    let filtroFechaInstance = null;
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
            const registroData = tareasGlobal.find(r => r.id === registro.dataset.id);
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
        const registro = tareasGlobal.find(r => r.id === registroId);
        if (!registro) return;

        function convertirHoraAMinutos(hora) {
            let [h, m] = hora.split(":").map(Number);
            return h * 60 + m;
        }

        function restarHoras(horaInicio, horaFin) {
            let inicioMin = convertirHoraAMinutos(horaInicio);
            let finMin = convertirHoraAMinutos(horaFin);
            let diff = finMin - inicioMin;

            // Convertimos de nuevo a HH:mm
            let horas = Math.floor(diff / 60);
            let minutos = diff % 60;
            return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        }

        const contenido = document.querySelector('.anuncio-second .contenido');
        const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">Detalles de la Tarea</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')">
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>
        <div class="relleno">
            <p class="normal">Información General</p>
            <div class="campo-vertical">
                <span class="valor"><strong><i class='bx bx-id-card'></i> ID: </strong>${registro.id}</span>
                <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                <span class="valor"><strong><i class='bx bx-package'></i> Producto: </strong>${registro.producto}</span>
            </div>

            <p class="normal">Horario</p>
            <div class="campo-horizontal">
                <div class="campo-vertical">
                    <span class="valor"><strong><i class='bx bx-time'></i> Hora Inicio: </strong>${registro.hora_inicio}</span>
                    <span class="valor"><strong><i class='bx bx-time'></i> Hora Fin: </strong>${registro.hora_fin || 'Pendiente'}</span>
                    ${registro.hora_fin ? `
                        <span class="valor"><strong><i class='bx bx-timer'></i> Tiempo Total: </strong>
                            ${restarHoras(registro.hora_inicio, registro.hora_fin)}
                        </span>
                    ` : ''}
                </div>
            </div>

            <p class="normal">Procedimientos</p>
            <div class="campo-vertical procedimientos">
                ${registro.procedimientos.split(',').map(proc => `
                    <span class="valor"><strong><i class='bx bx-check-circle'></i> ${proc.trim()}</strong></span>
                `).join('')}
            </div>

            <p class="normal">Personal y Observaciones</p>
            <div class="campo-vertical">
                <span class="valor"><strong><i class='bx bx-user'></i> Operador: </strong>${registro.operador}</span>
                <span class="valor"><strong><i class='bx bx-comment-detail'></i> Observaciones: </strong>${registro.observaciones || 'Sin observaciones'}</span>
            </div>
        </div>
        <div class="anuncio-botones">
            ${!registro.hora_fin ? `
                <button class="btn-finalizar btn green">
                    <i class='bx bx-check-circle'></i> Finalizar
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


        const btnFinalizar = contenido.querySelector('.btn-finalizar');
        if (btnFinalizar) {
            btnFinalizar.addEventListener('click', () => finalizarTarea(registro));
        }


        const btnEditar = contenido.querySelector('.btn-editar');
        btnEditar.addEventListener('click', () => editar(registro));


        const btnEliminar = contenido.querySelector('.btn-eliminar');
        btnEliminar.addEventListener('click', () => eliminar(registro));



        function eliminar(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Eliminar Tarea</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="relleno">
                    <p class="normal">Información General</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-id-card'></i> ID: </strong>${registro.id}</span>
                        <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                        <span class="valor"><strong><i class='bx bx-package'></i> Producto: </strong>${registro.producto}</span>
                        <span class="valor"><strong><i class='bx bx-time'></i> Hora Inicio: </strong>${registro.hora_inicio}</span>
                        <span class="valor"><strong><i class='bx bx-user'></i> Operador: </strong>${registro.operador}</span>
                    </div>
        
                    <p class="normal">Motivo de la eliminación</p>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Motivo</p>
                            <input class="motivo" type="text" required>
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

                    const response = await fetch(`/eliminar-tarea/${registro.id}`, {
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
                            message: 'Tarea eliminada correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        cerrarAnuncioManual('anuncioTercer');
                        cerrarAnuncioManual('anuncioSecond');
                        await mostrarTareas();
                    }

                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al eliminar la tarea',
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
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Editar Tarea</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="relleno">
                    <p class="normal">Información General</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-id-card'></i> ID: </strong>${registro.id}</span>
                        <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                        <span class="valor"><strong><i class='bx bx-package'></i> Producto: </strong>${registro.producto}</span>
                        <span class="valor"><strong><i class='bx bx-time'></i> Hora Inicio: </strong>${registro.hora_inicio}</span>
                        <span class="valor"><strong><i class='bx bx-user'></i> Operador: </strong>${registro.operador}</span>
                    </div>
        
                    <div class="etiquetas-container">
                        <div class="etiquetas-actuales">
                            ${registro.procedimientos.split(',').map(proc => `
                                <div class="etiqueta-item">
                                    <i class='bx bx-list-check'></i>
                                    <span>${proc.trim()}</span>
                                    <button type="button" class="btn-quitar-etiqueta"><i class='bx bx-x'></i></button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
        
                    <p class="normal">Agregar Procedimientos</p>
                    <div class="entrada">
                        <i class='bx bx-task'></i>
                        <div class="input">
                            <p class="detalle">Tareas</p>
                            <input class="tarea" type="text" autocomplete="off" placeholder=" " required>
                            <button type="button" class="btn-agregar-tarea-temp"><i class='bx bx-plus'></i></button>
                        </div>
                    </div>
                    <div class="sugerencias" id="tareas-list"></div>
        
                    <p class="normal">Observaciones</p>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones</p>
                            <input type="text" class="observaciones" value="${registro.observaciones || ''}">
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
                    <div class="info-sistema">
                        <i class='bx bx-info-circle'></i>
                        <div class="detalle-info">
                            <p>Estás por editar un registro del sistema. Asegúrate de realizar los cambios correctamente, ya que podrían modificar información relacionada.</p>
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

            // Configurar eventos para agregar tareas
            const productoInput = document.querySelector('.entrada .tarea');
            const sugerenciasList = document.querySelector('#tareas-list');

            productoInput.addEventListener('input', (e) => {
                const valor = normalizarTexto(e.target.value);
                sugerenciasList.innerHTML = '';

                if (valor) {
                    const sugerencias = listaTareasGlobal.filter(p =>
                        normalizarTexto(p.tarea).includes(valor)
                    ).slice(0, 5);

                    if (sugerencias.length) {
                        sugerenciasList.style.display = 'flex';
                        sugerencias.forEach(p => {
                            const div = document.createElement('div');
                            div.classList.add('item');
                            div.textContent = p.tarea;
                            div.onclick = () => {
                                productoInput.value = p.tarea;
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

            // Configurar eventos para quitar etiquetas existentes
            document.querySelectorAll('.btn-quitar-etiqueta').forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.closest('.etiqueta-item').remove();
                });
            });

            // Configurar evento para agregar nuevas tareas
            const btnAgregarEtiqueta = contenido.querySelector('.btn-agregar-tarea-temp');
            btnAgregarEtiqueta.addEventListener('click', () => {
                const productoSeleccionado = productoInput.value.trim();
                const productoId = window.idPro;

                if (!productoSeleccionado || !productoId) {
                    mostrarNotificacion({
                        message: 'Debe seleccionar una tarea de la lista',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                const etiquetasActuales = contenido.querySelector('.etiquetas-actuales');
                const producto = listaTareasGlobal.find(p => p.id === productoId);

                if (producto) {
                    // Verificar si la tarea ya está agregada
                    const yaExiste = Array.from(etiquetasActuales.querySelectorAll('.etiqueta-item span'))
                        .some(span => span.textContent === producto.tarea);

                    if (yaExiste) {
                        mostrarNotificacion({
                            message: 'Esta tarea ya está agregada',
                            type: 'warning',
                            duration: 3500
                        });
                        return;
                    }

                    const nuevoProducto = document.createElement('div');
                    nuevoProducto.className = 'etiqueta-item';
                    nuevoProducto.innerHTML = `
                        <i class='bx bx-list-check'></i>
                        <span>${producto.tarea}</span>
                        <button type="button" class="btn-quitar-etiqueta"><i class='bx bx-x'></i></button>
                    `;

                    nuevoProducto.querySelector('.btn-quitar-etiqueta').addEventListener('click', () => {
                        nuevoProducto.remove();
                    });

                    etiquetasActuales.appendChild(nuevoProducto);
                    productoInput.value = '';
                    sugerenciasList.style.display = 'none';
                    window.idPro = null;

                    mostrarNotificacion({
                        message: 'Tarea agregada correctamente',
                        type: 'success',
                        duration: 2000
                    });
                }
            });

            // Configurar evento para guardar cambios
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

                    // Obtener procedimientos actualizados
                    const procedimientos = Array.from(
                        contenido.querySelectorAll('.etiquetas-actuales .etiqueta-item span')
                    ).map(span => span.textContent.trim());

                    if (procedimientos.length === 0) {
                        throw new Error('Debe tener al menos un procedimiento');
                    }

                    const observaciones = contenido.querySelector('.observaciones').value.trim();

                    const response = await fetch(`/editar-tarea/${registro.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            procedimientos: procedimientos.join(','),
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
                            message: 'Tarea actualizada correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        cerrarAnuncioManual('anuncioTercer');
                        cerrarAnuncioManual('anuncioSecond');
                        await mostrarTareas();
                    }

                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al actualizar la tarea',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            });
        }
        function finalizarTarea(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Finalizar Tarea</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="relleno">
                    <p class="normal">Información General</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-id-card'></i> ID: </strong>${registro.id}</span>
                        <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${registro.fecha}</span>
                        <span class="valor"><strong><i class='bx bx-package'></i> Producto: </strong>${registro.producto}</span>
                        <span class="valor"><strong><i class='bx bx-time'></i> Hora Inicio: </strong>${registro.hora_inicio}</span>
                    </div>
                    <div class="etiquetas-container">
                        <div class="etiquetas-actuales">
                            
                        </div>
                    </div>
                    <p class="normal">Productos</p>
                    <div class="entrada">
                        <i class='bx bx-task'></i>
                        <div class="input">
                            <p class="detalle">Tareas</p>
                            <input class="tarea" type="text" autocomplete="off" placeholder=" " required>
                            <button type="button" class="btn-agregar-tarea-temp"><i class='bx bx-plus'></i></button>
                        </div>
                    </div>
                    <div class="sugerencias" id="tareas-list"></div>
        
                    <p class="normal">Observaciones</p>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones</p>
                            <input type="text" class="observaciones">
                        </div>
                    </div>
                    <div class="info-sistema">
                        <i class='bx bx-info-circle'></i>
                        <div class="detalle-info">
                            <p>Estás por finalizar una tarea. Asegúrate de llenar los campos necesarios y con la información correcta, ya que esta accion no se puede deshacer.</p>
                        </div>
                    </div>

                </div>
                <div class="anuncio-botones">
                    <button class="btn-finalizar-tarea btn green">
                        <i class='bx bx-check-circle'></i> Finalizar Tarea
                    </button>
                </div>
            `;

            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '80px';
            mostrarAnuncioTercer();

            const productoInput = document.querySelector('.entrada .tarea');
            const sugerenciasList = document.querySelector('#tareas-list');
            const btnFinalizar = document.querySelector('.btn-finalizar-tarea');
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
                    const sugerencias = listaTareasGlobal.filter(p =>
                        normalizarTexto(p.tarea).includes(valor)
                    ).slice(0, 5);

                    if (sugerencias.length) {
                        sugerenciasList.style.display = 'flex';
                        sugerencias.forEach(p => {
                            const div = document.createElement('div');
                            div.classList.add('item');
                            div.textContent = p.tarea;
                            div.onclick = () => {
                                productoInput.value = p.tarea;
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
            const btnAgregarEtiqueta = contenido.querySelector('.btn-agregar-tarea-temp');
            btnAgregarEtiqueta.addEventListener('click', () => {

                const productoSeleccionado = productoInput.value.trim();
                const productoId = window.idPro;

                if (!productoSeleccionado || !productoId) {
                    mostrarNotificacion({
                        message: 'Debe seleccionar una tarea de la lista',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                const etiquetasActuales = contenido.querySelector('.etiquetas-actuales');
                const producto = listaTareasGlobal.find(p => p.id === productoId);

                if (producto) {
                    // Verificar si el producto ya está agregado
                    const yaExiste = Array.from(etiquetasActuales.querySelectorAll('.etiqueta-item span'))
                        .some(span => span.textContent === producto.tarea);

                    if (yaExiste) {
                        mostrarNotificacion({
                            message: 'Esta tarea ya está agregado',
                            type: 'warning',
                            duration: 3500
                        });
                        return;
                    }

                    const nuevoProducto = document.createElement('div');
                    nuevoProducto.className = 'etiqueta-item';
                    nuevoProducto.innerHTML = `
                    <i class='bx bx-list-check'></i>
                    <span>${producto.tarea}</span>
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
                        message: 'Tarea agregada correctamente',
                        type: 'success',
                        duration: 2000
                    });
                }
            });
            btnFinalizar.addEventListener('click', async () => {
                try {
                    const observaciones = contenido.querySelector('.observaciones').value;

                    // Obtener todas las tareas seleccionadas
                    const tareasSeleccionadas = Array.from(
                        contenido.querySelectorAll('.etiquetas-actuales .etiqueta-item span')
                    ).map(span => span.textContent.trim());

                    if (tareasSeleccionadas.length === 0) {
                        mostrarNotificacion({
                            message: 'Debe seleccionar al menos una tarea',
                            type: 'warning',
                            duration: 3500
                        });
                        return;
                    }

                    mostrarCarga();

                    const response = await fetch(`/finalizar-tarea/${registro.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            procedimientos: tareasSeleccionadas.join(','),
                            observaciones: observaciones || ''
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        mostrarNotificacion({
                            message: 'Tarea finalizada correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        cerrarAnuncioManual('anuncioTercer');
                        cerrarAnuncioManual('anuncioSecond');
                        await mostrarTareas();
                    }

                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al finalizar la tarea',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            });
        }

    }
    btnNuevaTarea.forEach(btn => {
        btn.addEventListener('click',  mostrarFormularioNuevoRegistro);
    })
    btnListaTareas.forEach(btn => {
        btn.addEventListener('click',  mostrarListaTareas);
    })

    async function mostrarListaTareas() {
        const contenido = document.querySelector('.anuncio-tercer .contenido');
        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Lista de Tareas</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div class="relleno">
                <p class="normal">Administrar Tareas</p>
                <div class="entrada">
                    <i class='bx bx-task'></i>
                    <div class="input">
                        <p class="detalle">Nueva Tarea</p>
                        <input class="nueva-tarea" type="text" autocomplete="off" placeholder=" " required>
                        <button class="btn-agregar-tarea"><i class='bx bx-plus'></i></button>
                    </div>
                </div>
                <p class="normal">Lista de Tareas</p>
                <div class="lista-tareas-container">
                    ${listaTareasGlobal.map(tarea => `
                        <div class="tarea-item" data-id="${tarea.id}">
                            <span class="tarea-texto">${tarea.tarea}</span>
                            <button class="btn-eliminar-tarea" data-id="${tarea.id}">
                                <i class='bx bx-trash'></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '10px';
        mostrarAnuncioTercer();

        // Evento para agregar nueva tarea
        const btnAgregar = contenido.querySelector('.btn-agregar-tarea');
        const inputTarea = contenido.querySelector('.nueva-tarea');

        btnAgregar.addEventListener('click', async () => {
            const tarea = inputTarea.value.trim();
            if (!tarea) {
                mostrarNotificacion({
                    message: 'Ingrese una tarea',
                    type: 'warning',
                    duration: 3500
                });
                return;
            }

            try {
                mostrarCarga();
                const response = await fetch('/agregar-tarea-lista', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tarea })
                });

                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }

                const data = await response.json();

                if (data.success) {
                    mostrarNotificacion({
                        message: 'Tarea agregada correctamente',
                        type: 'success',
                        duration: 3000
                    });
                    await obtenerListaTareas();
                    mostrarListaTareas();
                }

            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al agregar la tarea',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarCarga();
            }
        });

        // Eventos para eliminar tareas
        const btnsEliminar = contenido.querySelectorAll('.btn-eliminar-tarea');
        btnsEliminar.forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                try {
                    mostrarCarga();
                    const response = await fetch(`/eliminar-tarea-lista/${id}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }

                    const data = await response.json();

                    if (data.success) {
                        mostrarNotificacion({
                            message: 'Tarea eliminada correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        await obtenerListaTareas();
                        mostrarListaTareas();
                    }

                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al eliminar la tarea',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            });
        });
    }

    function mostrarFormularioNuevoRegistro() {
        const contenido = document.querySelector('.anuncio-tercer .contenido');
        const ahora = new Date();
        const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;

        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Nueva Tarea</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div class="relleno">
                <p class="normal">Seleccionar Producto</p>
                <div class="entrada">
                    <i class="bx bx-package"></i>
                    <div class="input">
                        <p class="detalle">Producto</p>
                        <input class="producto" type="text" autocomplete="off" placeholder=" " required>
                    </div>
                </div>
                <div class="sugerencias" id="productos-list"></div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-registrar btn green">
                    <i class="bx bx-play-circle"></i> Iniciar Tarea
                </button>
            </div>
        `;

        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '80px';
        mostrarAnuncioTercer();

        const productoInput = document.querySelector('.entrada .producto');
        const sugerenciasList = document.querySelector('#productos-list');

        function normalizarTexto(texto) {
            return texto
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[-\s]+/g, "");
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
                        div.textContent = p.producto;
                        div.onclick = () => {
                            productoInput.value = p.producto;
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

        const btnRegistrar = contenido.querySelector('.btn-registrar');
        btnRegistrar.addEventListener('click', async () => {
            try {
                const productoSeleccionado = productoInput.value.trim();

                if (!productoSeleccionado) {
                    mostrarNotificacion({
                        message: 'Debe seleccionar un producto',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                mostrarCarga();

                const response = await fetch('/registrar-tarea', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        producto: productoSeleccionado,
                        hora_inicio: horaActual,
                        operador: usuarioInfo.nombre
                    })
                });

                const data = await response.json();

                if (data.success) {
                    mostrarNotificacion({
                        message: 'Tarea iniciada correctamente',
                        type: 'success',
                        duration: 3000
                    });
                    cerrarAnuncioManual('anuncioTercer');
                    await mostrarTareas();
                } else {
                    throw new Error(data.error);
                }

            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al crear la tarea',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarCarga();
            }
        });
    }
    btnExcel.forEach(btn => {
        btn.addEventListener('click', () => exportarArchivos('tareas', registrosAExportar));
    })
    aplicarFiltros();

}
