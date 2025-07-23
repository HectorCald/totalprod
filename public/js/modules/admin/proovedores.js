let proveedores = [];

const DB_NAME = 'damabrava_db';
const PROVEEDOR_DB = 'proveedores';

async function obtenerProveedores() {
    console.log('obteniendo proovedores')
    try {

        const proveedoresCache = await obtenerLocal(PROVEEDOR_DB, DB_NAME);

        if (proveedoresCache.length > 0) {
            proveedores = proveedoresCache.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            updateHTMLWithData();
            console.log('actulizando desde el cache')
        }

            try {

                const response = await fetch('/obtener-proovedores');
                const data = await response.json();

                if (data.success) {
                    proveedores = data.proovedores.sort((a, b) => {
                        const idA = parseInt(a.id.split('-')[1]);
                        const idB = parseInt(b.id.split('-')[1]);
                        return idB - idA;
                    });

                    if (JSON.stringify(proveedoresCache) !== JSON.stringify(proveedores)) {
                        console.log('Diferencias encontradas, actualizando UI');
                        updateHTMLWithData();

                        (async () => {
                        try {
                            const db = await initDB(PROVEEDOR_DB, DB_NAME);
                            const tx = db.transaction(PROVEEDOR_DB, 'readwrite');
                            const store = tx.objectStore(PROVEEDOR_DB);

                            // Limpiar todos los registros existentes
                            await store.clear();

                            // Guardar los nuevos registros
                            for (const item of proveedores) {
                                await store.put({
                                    id: item.id,
                                    data: item,
                                    timestamp: Date.now()
                                });
                            }

                            console.log('Caché actualizado correctamente');
                        } catch (error) {
                            console.error('Error actualizando el caché:', error);
                        }  })();
                    }
                    else {
                        console.log('no son diferentes')
                    }

                    return true;
                } else {
                    return false;
                }
            } catch (error) {
                throw error;
            }

    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        return false;
    }
}


function renderInitialHTML() {

    const contenido = document.querySelector('.anuncio .contenido');
    const initialHTML = `  
        <div class="encabezado">
            <h1 class="titulo">Proveedores</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
        <div class="busqueda">
            <div class="entrada">
                <i class='bx bx-search'></i>
                <div class="input">
                    <p class="detalle">Buscar</p>
                    <input type="text" class="search" placeholder="">
                </div>
            </div>
            <div class="acciones-grande">
                <button class="btn-crear-proovedor btn orange"> <i class='bx bx-plus'></i> <span>Crear nuevo proveedor</span></button>
            </div>
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
                <i class='bx bx-id-card' style="font-size: 50px;opacity:0.5"></i>
                <p style="text-align: center; color: #555;">¡Ups!, No se encontraron proveedores segun tu busqueda o filtrado.</p>
            </div>
        </div>
        <div class="anuncio-botones">
            <button class="btn-crear-proovedor btn orange"> <i class='bx bx-plus'></i> Crear nuevo proveedor</button>
        </div>
    `;
    contenido.innerHTML = initialHTML;
    contenido.style.paddingBottom = '70px';
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);
}
export async function mostrarProovedores() {
    renderInitialHTML();
    mostrarAnuncio();
    const [proovedor] = await Promise.all([
        await obtenerProveedores()
    ]);
}
function updateHTMLWithData() {

    const productosContainer = document.querySelector('.productos-container');
    const productosHTML = proveedores.map(proovedor => `
        <div class="registro-item" data-id="${proovedor.id}">
            <div class="header">
                <i class='bx bx-id-card'></i>
                <div class="info-header">
                    <span class="id-flotante"><span>${proovedor.id}</span><span class="flotante-item blue">${proovedor.ciudad ? proovedor.ciudad: 'No tiene ciudad'}</span></span>
                    <span class="detalle">${proovedor.nombre}</span>
                    <span class="pie">${proovedor.telefono}-${proovedor.direccion ? proovedor.direccion: 'No tiene dirección'}</span>
                </div>
            </div>
        </div>
    `).join('');
    productosContainer.innerHTML = productosHTML;
    eventosProovedores();
}


function eventosProovedores() {
    const inputBusqueda = document.querySelector('.search');
    const btnNuevoCliente = document.querySelectorAll('.btn-crear-proovedor');
    const items = document.querySelectorAll('.registro-item');
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
            const proovedorId = this.dataset.id;
            window.info(proovedorId);
        });
    });
    inputBusqueda.addEventListener('input', (e) => {
        aplicarFiltros();
    });
    inputBusqueda.addEventListener('focus', function () {
        this.select();
    });
    function aplicarFiltros() {
        const busqueda = normalizarTexto(inputBusqueda.value);
        const mensajeNoEncontrado = document.querySelector('.no-encontrado');

        // Animación de ocultar todos
        items.forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(-20px)';
            item.style.transition = 'all 0.3s ease';
        });

        setTimeout(() => {
            let hayResultados = false;

            items.forEach(item => {
                const proovedor = proveedores.find(c => c.id === item.dataset.id);
                const coincide = proovedor && (
                    normalizarTexto(proovedor.nombre).includes(busqueda) ||
                    normalizarTexto(proovedor.telefono).includes(busqueda) ||
                    normalizarTexto(proovedor.direccion).includes(busqueda) ||
                    normalizarTexto(proovedor.ciudad).includes(busqueda)
                );

                item.style.display = coincide ? 'flex' : 'none';
                if (coincide) hayResultados = true;
            });

            // Animación escalonada para los resultados
            document.querySelectorAll('.registro-item[style*="display: flex"]').forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });

            // Control del mensaje "no encontrado"
            mensajeNoEncontrado.style.display = hayResultados ? 'none' : 'block';
        }, 300);
    }


    window.info = function (proovedorId) {
        const proovedor = proveedores.find(r => r.id === proovedorId);
        if (!proovedor) return;

        const contenido = document.querySelector('.anuncio-second .contenido');
        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Información</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno verificar-registro">
                <p class="normal">Información</p>
                <div class="campo-vertical">
                    <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${proovedor.id}</span>
                    <span class="nombre"><strong><i class='bx bx-user'></i> Nombre: </strong>${proovedor.nombre}</span>
                    <span class="nombre"><strong><i class='bx bx-phone'></i> Teléfono: </strong>${proovedor.telefono || 'No registrado'}</span>
                    <span class="nombre"><strong><i class='bx bx-map'></i> Dirección: </strong>${proovedor.direccion || 'No registrada'}</span>
                    <span class="nombre"><strong><i class='bx bxs-city'></i> Ciudad: </strong>${proovedor.ciudad || 'No registrada'}</span>
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-editar btn blue" data-id="${proovedor.id}"><i class='bx bx-edit'></i>Editar</button>
                <button class="btn-eliminar btn red" data-id="${proovedor.id}"><i class="bx bx-trash"></i>Eliminar</button>
            </div>
        `;
        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '70px';
        mostrarAnuncioSecond();

        const btnEditar = contenido.querySelector('.btn-editar');
        const btnEliminar = contenido.querySelector('.btn-eliminar');

        btnEditar.addEventListener('click', () => editar(proovedor));
        btnEliminar.addEventListener('click', () => eliminar(proovedor));

        async function eliminar(proovedor) {

            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
                <div class="encabezado">
                    <h1 class="titulo">Eliminar proveedor</h1>
                    <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer')"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="relleno">
                    <p class="normal">Información</p>
                    <div class="campo-vertical">
                        <span class="nombre"><strong><i class='bx bx-id-card'></i> Id: </strong>${proovedor.id}</span>
                        <span class="nombre"><strong><i class='bx bx-user'></i> Nombre: </strong>${proovedor.nombre}</span>
                        <span class="nombre"><strong><i class='bx bx-phone'></i> Teléfono: </strong>${proovedor.telefono || 'No registrado'}</span>
                        <span class="nombre"><strong><i class='bx bx-map'></i> Dirección: </strong>${proovedor.direccion || 'No registrada'}</span>
                        <span class="nombre"><strong><i class='bx bxs-city'></i> Ciudad: </strong>${proovedor.ciudad || 'No registrada'}</span>
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
                            <p>Vas a eliminar un proveedor del sistema. Esta acción no se puede deshacer y podría afectar a varios registros relacionados. Asegúrate de que deseas continuar.</p>
                        </div>
                    </div>

                </div>
                <div class="anuncio-botones">
                    <button class="btn-eliminar-proovedor-confirmar btn red"><i class="bx bx-trash"></i> Eliminar</button>
                </div>
            `;
            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '70px';
            mostrarAnuncioTercer();

            const btnEliminarProovedor = contenido.querySelector('.btn-eliminar-proovedor-confirmar');
            btnEliminarProovedor.addEventListener('click', async () => {
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
                    mostrarCarga('.carga-procesar');
                    const response = await fetch(`/eliminar-proovedor/${proovedorId}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();
                    if (data.success) {
                        await obtenerProovedores();
                        cerrarAnuncioManual('anuncioSecond');
                        mostrarNotificacion({
                            message: 'Proveedor eliminado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Eliminación',
                            usuarioInfo.nombre + ' elimino al proveedor: ' + proovedor.nombre + ' con el id: ' + proovedor.id + ' por el motivo de: ' + motivo)
                    } else {
                        throw new Error('Error al eliminar el proveedor');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al eliminar el proveedor',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar');
                }
            });
        }
        async function editar(proovedor) {

            const contenido = document.querySelector('.anuncio-tercer .contenido');
            const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Editar proveedor</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer');"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <p class="normal">Información</p>
                <div class="entrada">
                    <i class='bx bx-user'></i>
                    <div class="input">
                        <p class="detalle">Nombre</p>
                        <input class="editar-nombre" type="text" value="${proovedor.nombre}" required>
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-phone'></i>
                    <div class="input">
                        <p class="detalle">Teléfono</p>
                        <input class="editar-telefono" type="text" value="${proovedor.telefono || ''}">
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-map'></i>
                    <div class="input">
                        <p class="detalle">Dirección</p>
                        <input class="editar-direccion" type="text" value="${proovedor.direccion || ''}">
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bxs-city'></i>
                    <div class="input">
                        <p class="detalle">Ciudad</p>
                        <input class="editar-ciudad" type="text" value="${proovedor.ciudad || ''}">
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
                        <p>Estás por editar un proveedor del sistema. Asegúrate de realizar los cambios correctamente, ya que podrían modificar información relacionada.</p>
                    </div>
                </div>

            </div>
            <div class="anuncio-botones">
                <button class="btn-guardar-proovedor btn blue"><i class="bx bx-save"></i> Guardar cambios</button>
            </div>
        `;
            contenido.innerHTML = registrationHTML;
            contenido.style.paddingBottom = '70px';
            mostrarAnuncioTercer();

            const btnGuardarProveedor = contenido.querySelector('.btn-guardar-proovedor');
            btnGuardarProveedor.addEventListener('click', async () => {
                const nombre = document.querySelector('.editar-nombre').value.trim();
                const telefono = document.querySelector('.editar-telefono').value.trim();
                const direccion = document.querySelector('.editar-direccion').value.trim();
                const ciudad = document.querySelector('.editar-ciudad').value.trim();
                const motivo = document.querySelector('.motivo').value.trim();

                if (!nombre) {
                    mostrarNotificacion({
                        message: 'El nombre es obligatorio',
                        type: 'warning',
                        duration: 3500
                    });
                    return;
                }

                try {
                    mostrarCarga('.carga-procesar');
                    const response = await fetch(`/editar-proovedor/${proovedorId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ nombre, telefono, direccion, ciudad, motivo })
                    });
                    const data = await response.json();
                    if (data.success) {
                        await obtenerProovedores();
                        info(proovedorId);
                        mostrarNotificacion({
                            message: 'Proveedor actualizado correctamente',
                            type: 'success',
                            duration: 3000
                        });
                        registrarNotificacion(
                            'Administración',
                            'Edición',
                            usuarioInfo.nombre + ' edito al proovedor: ' + proovedor.nombre + ' con el id: ' + proovedor.id + ' por el motivo: ' + motivo)
                    } else {
                        throw new Error('Error al actualizar el proveedor');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarNotificacion({
                        message: error.message || 'Error al actualizar el proveedor',
                        type: 'error',
                        duration: 3500
                    });
                } finally {
                    ocultarCarga('.carga-procesar');
                }
            });
        }
    }

    btnNuevoCliente.forEach(btn => {
        btn.addEventListener('click',  crearCliente);
    })
    async function crearCliente() {
        const contenido = document.querySelector('.anuncio-second .contenido');
        const registrationHTML = `
            <div class="encabezado">
                <h1 class="titulo">Crear nuevo proveedor</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="relleno">
                <p class="normal">Información</p>
                <div class="entrada">
                    <i class='bx bx-user'></i>
                    <div class="input">
                        <p class="detalle">Nombre</p>
                        <input class="nuevo-nombre" type="text" required>
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-phone'></i>
                    <div class="input">
                        <p class="detalle">Teléfono</p>
                        <input class="nuevo-telefono" type="text">
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-map'></i>
                    <div class="input">
                        <p class="detalle">Dirección</p>
                        <input class="nuevo-direccion" type="text">
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bxs-city'></i>
                    <div class="input">
                        <p class="detalle">Ciudad</p>
                        <input class="nuevo-ciudad" type="text">
                    </div>
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-guardar-nuevo-proveedor btn orange"><i class="bx bx-save"></i> Guardar proveedor</button>
            </div>
        `;
        contenido.innerHTML = registrationHTML;
        contenido.style.paddingBottom = '70px';
        mostrarAnuncioSecond();

        const btnGuardarNuevoProveedor = contenido.querySelector('.btn-guardar-nuevo-proveedor');
        btnGuardarNuevoProveedor.addEventListener('click', async () => {
            const nombre = document.querySelector('.nuevo-nombre').value.trim();
            const telefono = document.querySelector('.nuevo-telefono').value.trim();
            const direccion = document.querySelector('.nuevo-direccion').value.trim();
            const ciudad = document.querySelector('.nuevo-ciudad').value.trim();

            if (!nombre) {
                mostrarNotificacion({
                    message: 'El nombre es obligatorio',
                    type: 'warning',
                    duration: 3500
                });
                return;
            }

            try {
                mostrarCarga('.carga-procesar');
                const response = await fetch('/agregar-proovedor', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ nombre, telefono, direccion, ciudad })
                });
                const data = await response.json();
                if (data.success) {
                    await obtenerProovedores();
                    info(data.id);
                    mostrarNotificacion({
                        message: 'Proveedor creado correctamente',
                        type: 'success',
                        duration: 3000
                    });
                } else {
                    throw new Error('Error al crear el proveedor');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al crear el proveedor',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarCarga('.carga-procesar');
            }
        });
    }

    aplicarFiltros();
}