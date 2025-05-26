let registrosConteos = [];


async function obtenerRegistrosConteo() {
    try {
        const response = await fetch('/obtener-registros-conteo');
        const data = await response.json();

        if (data.success) {
            registrosConteos = data.registros.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener registros de conteo',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener registros:', error);
        mostrarNotificacion({
            message: 'Error al obtener registros de conteo',
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
            <h1 class="titulo">Registros conteo</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno almacen-general">
            <div class="entrada">
                <i class='bx bx-search'></i>
                <div class="input">
                    <p class="detalle">Buscar</p>
                    <input type="text" class="buscar-registro" placeholder="">
                </div>
                <button class="btn-calendario"><i class='bx bx-calendar'></i></button>
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
            <button id="exportar-excel" class="btn orange"><i class='bx bx-download'></i> Descargar registros</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '80px';
}
export async function registrosConteoAlmacen() {
    mostrarAnuncio();
    renderInitialHTML();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);

    const [obtnerRegistros] = await Promise.all([
        obtenerRegistrosConteo(),
    ]);

    updateHTMLWithData();
    eventosRegistrosConteo();
}
function updateHTMLWithData() {

    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = registrosConteos.map(registro => `
        <div class="registro-item" data-id="${registro.id}">
            <div class="header">
                <i class='bx bx-package'></i>
                <div class="info-header">
                    <span class="id">${registro.id}</span>
                    <span class="nombre">${registro.nombre}</span>
                    <span class="fecha">${registro.fecha}</span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
}


function eventosRegistrosConteo() {
    const btnExcel = document.getElementById('exportar-excel');
    const registrosAExportar = registrosConteos;
    const items = document.querySelectorAll('.registro-item');
    const inputBusqueda = document.querySelector('.buscar-registro');
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

    items.forEach(item => {
        item.addEventListener('click', function () {
            const registroId = this.dataset.id;
            window.info(registroId);
        });
    });
    function normalizarTexto(texto) {
        return texto.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '');
    }
    function aplicarFiltros() {

        const fechasSeleccionadas = filtroFechaInstance?.selectedDates || [];
        const busqueda = normalizarTexto(inputBusqueda.value);
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Primero, filtrar todos los registros
        const registrosFiltrados = Array.from(items).map(registro => {
            const registroData = registrosConteos.find(r => r.id === registro.dataset.id);
            if (!registroData) return { elemento: registro, mostrar: false };
            let mostrar = true;

            // Filtro de fechas
            if (mostrar && fechasSeleccionadas.length === 2) {
                const [fechaPart] = registroData.fecha.split(','); // Dividir por coma primero
                const [dia, mes, anio] = fechaPart.trim().split('/'); // Quitar espacios y dividir
                const fechaRegistro = new Date(anio, mes - 1, dia);
                const fechaInicio = fechasSeleccionadas[0];
                const fechaFin = fechasSeleccionadas[1];
                mostrar = fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin;
            }

            // Filtro de búsqueda
            if (mostrar && busqueda) {
                const textoRegistro = [
                    registroData.id,
                    registroData.nombre,
                    registroData.fecha,
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


    inputBusqueda.addEventListener('input', () => {
        aplicarFiltros();
    });
    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });

    window.info = function (registroId) {
        const registro = registrosConteos.find(r => r.id === registroId);
        if (!registro) return;

        const productos = registro.productos.split(';');
        const sistema = registro.sistema.split(';');
        const fisico = registro.fisico.split(';');
        const diferencias = registro.diferencia.split(';');

        const contenido = document.querySelector('.anuncio-second .contenido');
        const infoHTML = `
        <div class="encabezado">
            <h1 class="titulo">Detalles del conteo</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno verificar-registro">
            <p class="normal">Información básica</p>
            <div class="campo-vertical">
                <span><strong><i class='bx bx-hash'></i> ID:</strong> ${registro.id}</span>
                <span><strong><i class='bx bx-label'></i> Nombre:</strong> ${registro.nombre || 'Sin nombre'}</span>
                <span><strong><i class='bx bx-calendar'></i> Fecha:</strong> ${registro.fecha}</span>
                <span><strong><i class='bx bx-comment-detail'></i> Observaciones:</strong> ${registro.observaciones || 'Sin observaciones'}</span>
            </div>
            <p class="normal">Productos contados</p>
            ${productos.map((producto, index) => {
            const diferencia = parseInt(diferencias[index]);
            const colorDiferencia = diferencia > 0 ? '#4CAF50' : diferencia < 0 ? '#f44336' : '#2196F3';
            return `
                    <div class="campo-vertical">
                        <span><strong><i class='bx bx-package'></i> Producto:</strong> ${producto}</span>
                        <div style="display: flex; justify-content: space-between; margin-top: 5px; gap:5px">
                            <span><strong><i class='bx bx-box'></i> Sistema: ${sistema[index]}</strong></span>
                            <span><strong><i class='bx bx-calculator'></i> Físico: ${fisico[index]}</strong></span>
                            <span style="color: ${colorDiferencia}"><strong><i class='bx bx-transfer'></i> Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia}</strong></span>
                        </div>
                    </div>
                `;
        }).join('')}
        </div>
        <div class="anuncio-botones">
            <button class="btn-editar btn blue" data-id="${registro.id}"><i class='bx bx-edit'></i></button>
            <button class="btn-eliminar btn red" data-id="${registro.id}"><i class="bx bx-trash"></i></button>
            <button class="btn-sobre-escribir btn yellow" data-id="${registro.id}"><i class='bx bx-revision'></i></button>
        </div>
    `;

        contenido.innerHTML = infoHTML;
        mostrarAnuncioSecond();

        const btnEditar = contenido.querySelector('.btn-editar');
        const btnEliminar = contenido.querySelector('.btn-eliminar');
        const btnSobre = contenido.querySelector('.btn-sobre-escribir');

        btnEditar.addEventListener('click', () => editar(registro));
        btnEliminar.addEventListener('click', () => eliminar(registro));
        btnSobre.addEventListener('click', () => sobreescribir(registro));


        function eliminar(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const eliminarHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Eliminar Conteo</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno">
                    <p class="normal">Información del conteo a eliminar</p>
                    <div class="campo-vertical">
                        <span><strong><i class='bx bx-hash'></i> ID:</strong> ${registro.id}</span>
                        <span><strong><i class='bx bx-label'></i> Nombre:</strong> ${registro.nombre || 'Sin nombre'}</span>
                        <span><strong><i class='bx bx-calendar'></i> Fecha:</strong> ${registro.fecha}</span>
                        <span><strong><i class='bx bx-comment-detail'></i> Observaciones:</strong> ${registro.observaciones || 'Sin observaciones'}</span>
                    </div>
                    <p class="normal">Ingresa el motivo de la eliminación</p>
                    <div class="entrada">
                        <i class='bx bx-message-square-detail'></i>
                        <div class="input">
                            <p class="detalle">Motivo de eliminación</p>
                            <input type="text" class="motivo-eliminacion" placeholder=" " required>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button id="confirmar-eliminacion" class="btn red"><i class='bx bx-trash'></i> Confirmar eliminación</button>
                </div>
            `;

            contenido.innerHTML = eliminarHTML;
            mostrarAnuncioTercer();

            document.getElementById('confirmar-eliminacion').addEventListener('click', async () => {
                const motivo = document.querySelector('.motivo-eliminacion').value.trim();
                if (!motivo) {
                    mostrarNotificacion({
                        message: 'Por favor, ingresa el motivo de eliminación',
                        type: 'warning',
                        duration: 3000
                    });
                    return;
                }

                try {
                    mostrarCarga();
                    const response = await fetch(`/eliminar-conteo/${registro.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ motivo })
                    });

                    const data = await response.json();

                    if (data.success) {
                        mostrarNotificacion({
                            message: 'Registro eliminado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        ocultarCarga();
                        ocultarAnuncioSecond();
                        await registrosConteoAlmacen();
                    } else {
                        throw new Error(data.error || 'Error al eliminar el registro');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: 'Error al eliminar el registro',
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
            const editarHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Editar Conteo</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno">
                    <p class="normal">Información basica</p>
                    <div class="campo-vertical">
                        <span><strong><i class='bx bx-hash'></i> ID:</strong> ${registro.id}</span>
                        <span><strong><i class='bx bx-calendar'></i> Fecha:</strong> ${registro.fecha}</span>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-label'></i>
                        <div class="input">
                            <p class="detalle">Nombre del conteo</p>
                            <input class="nombre-conteo" type="text" value="${registro.nombre || ''}" required>
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones</p>
                            <input class="observaciones" type="text" value="${registro.observaciones || ''}" required>
                        </div>
                    </div>
                    <p class="normal">Igresa el motivo de la edición</p>
                    <div class="entrada">
                        <i class='bx bx-message-square-detail'></i>
                        <div class="input">
                            <p class="detalle">Motivo de edición</p>
                            <input type="text" class="motivo-edicion" placeholder=" " required>
                        </div>
                    </div>
                </div>
                <div class="anuncio-botones">
                    <button id="guardar-edicion" class="btn blue"><i class='bx bx-save'></i> Guardar cambios</button>
                </div>
            `;

            contenido.innerHTML = editarHTML;
            mostrarAnuncioTercer();

            document.getElementById('guardar-edicion').addEventListener('click', async () => {
                const motivo = document.querySelector('.motivo-edicion').value.trim();
                const nombreEditado = document.querySelector('.nombre-conteo').value.trim();
                const observacionesEditadas = document.querySelector('.observaciones').value.trim();

                if (!motivo) {
                    mostrarNotificacion({
                        message: 'Por favor, ingresa el motivo de edición',
                        type: 'warning',
                        duration: 3000
                    });
                    return;
                }

                if (!nombreEditado) {
                    mostrarNotificacion({
                        message: 'Por favor, ingresa el nombre del conteo',
                        type: 'warning',
                        duration: 3000
                    });
                    return;
                }

                try {
                    mostrarCarga();
                    const response = await fetch(`/editar-conteo/${registro.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            nombre: nombreEditado,
                            observaciones: observacionesEditadas,
                            motivo
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        mostrarNotificacion({
                            message: 'Registro actualizado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        ocultarCarga();
                        ocultarAnuncioSecond();
                        await registrosConteoAlmacen();
                    } else {
                        throw new Error(data.error || 'Error al actualizar el conteo');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: 'Error al actualizar el conteo',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            });
        }
        async function sobreescribir(registro) {
            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const [fecha, hora] = registro.fecha.split(',').map(item => item.trim());

            const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">Sobreescribir inventario</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Información del conteo</p>
            <div class="campo-horizontal">
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${registro.id}</span>
                    <span class="valor"><strong><i class='bx bx-calendar'></i> Fecha: </strong>${fecha}</span>
                    <span class="valor"><strong><i class='bx bx-time'></i> Hora: </strong>${hora}</span>
                    <span class="valor"><strong><i class='bx bx-user'></i> Operario: </strong>${registro.operario}</span>
                </div>
            </div>

            <p class="normal">Motivo de la sobreescritura</p>
            <div class="entrada">
                <i class='bx bx-comment-detail'></i>
                <div class="input">
                    <p class="detalle">Motivo</p>
                    <input class="motivo-sobreescritura" type="text" autocomplete="off" placeholder=" " required>
                </div>
            </div>
        </div>
        <div class="anuncio-botones">
            <button class="btn-confirmar-sobreescritura btn red"><i class='bx bx-edit'></i> Confirmar sobreescritura</button>
        </div>
    `;

            contenido.innerHTML = registrationHTML;
            mostrarAnuncioTercer();

            const btnConfirmarSobreescritura = contenido.querySelector('.btn-confirmar-sobreescritura');
            btnConfirmarSobreescritura.addEventListener('click', async () => {
                const motivo = document.querySelector('.motivo-sobreescritura').value.trim();

                if (!motivo) {
                    mostrarNotificacion({
                        message: 'Debe ingresar el motivo de la sobreescritura',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga();
                    const response = await fetch(`/sobreescribir-inventario/${registro.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ motivo })
                    });

                    const data = await response.json();

                    if (data.success) {
                        mostrarNotificacion({
                            message: 'Inventario actualizado correctamente',
                            type: 'success',
                            duration: 3000
                        });

                        ocultarCarga();
                        cerrarAnuncioManual('anuncioTercer');
                        cerrarAnuncioManual('anuncioSecond');
                        await registrosConteoAlmacen();
                    } else {
                        throw new Error(data.error);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al sobreescribir el inventario',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga();
                }
            });
        }
    };

    btnExcel.addEventListener('click', () => exportarArchivos('conteo', registrosAExportar));
    aplicarFiltros();
}