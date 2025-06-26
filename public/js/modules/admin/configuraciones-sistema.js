let configuracionesGlobal = null;
let cleanupPullToRefresh = null;

async function obtenerConfiguraciones() {
    try {
        mostrarCarga();
        const response = await fetch('/obtener-configuraciones');
        const data = await response.json();
        if (data.success) {
            configuracionesGlobal = data.configuraciones;
            return data.configuraciones;
        }
    } catch (error) {
        console.error('Error al obtener configuraciones:', error);
        mostrarNotificacion({
            message: 'Error al obtener las configuraciones',
            type: 'error',
            duration: 3500
        });
    } finally {
        ocultarCarga();
    }
}

export async function mostrarConfiguracionesSistema() {
    await obtenerConfiguraciones()
    const contenido = document.querySelector('.anuncio .contenido');

    const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">Configuraciones del Sistema</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')">
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>
        <div class="relleno">
            <p class="normal">Horario de Registro de Producción</p>
            <div class="campo-horizontal">
                <div class="entrada">
                    <i class='bx bx-time'></i>
                    <div class="input">
                        <p class="detalle">Hora Inicio</p>
                        <input type="time" class="hora-inicio" value="${configuracionesGlobal?.horario?.horaInicio || ''}">
                    </div>
                </div>
                <div class="entrada">
                    <i class='bx bx-time'></i>
                    <div class="input">
                        <p class="detalle">Hora Fin</p>
                        <input type="time" class="hora-fin" value="${configuracionesGlobal?.horario?.horaFin || ''}">
                    </div>
                </div>
            </div>
            <p class="normal">Estado del Sistema</p>
            <div class="estado-selector">
                <button class="btn-estado ${configuracionesGlobal?.sistema?.estado === 'Activo' ? 'active' : ''}" data-estado="Activo">
                    <i class='bx bx-check-circle'></i> Activo
                </button>
                <button class="btn-estado ${configuracionesGlobal?.sistema?.estado === 'Inactivo' ? 'active' : ''}" data-estado="Inactivo">
                    <i class='bx bx-x-circle'></i> Inactivo
                </button>
            </div>
            <div class="info-sistema">
                <i class='bx bx-info-circle'></i>
                <div class="detalle-info">
                    <p>Si has realizado cambios en la configuración. No olvides guardarlos para que se apliquen. los cambios pueden afectar a varios aspectos del sistema.</p>
                </div>
            </div>
            <div class="busqueda" >
                <div class="acciones-grande" style="min-width: 100%; display:flex; justify-content:center " >
                    <button class="btn-guardar-config btn blue">
                        <i class='bx bx-save'></i> Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
        <div class="anuncio-botones">
            <button class="btn-guardar-config btn blue">
                <i class='bx bx-save'></i> Guardar Cambios
            </button>
        </div>
    `;

    contenido.innerHTML = registrationHTML;
    contenido.style.paddingBottom = '70px';
    mostrarAnuncio();
    eventosConfiguraciones();
    setTimeout(() => {
        configuracionesEntrada();
    }, 100);
}

function eventosConfiguraciones() {
    const btnEstados = document.querySelectorAll('.btn-estado');
    const btnGuardar = document.querySelector('.btn-guardar-config');
    const contenedor = document.querySelector('.anuncio .relleno');
    if (cleanupPullToRefresh) cleanupPullToRefresh();
    cleanupPullToRefresh = window.initPullToRefresh(contenedor, async () => {
        await mostrarConfiguracionesSistema();
    });

    btnEstados.forEach(btn => {
        btn.addEventListener('click', () => {
            btnEstados.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    btnGuardar.addEventListener('click', async () => {
        const horaInicio = document.querySelector('.hora-inicio').value;
        const horaFin = document.querySelector('.hora-fin').value;
        const estado = document.querySelector('.btn-estado.active').dataset.estado;

        if (!horaInicio || !horaFin) {
            mostrarNotificacion({
                message: 'Debe completar todos los campos de horario',
                type: 'warning',
                duration: 3500
            });
            return;
        }

        try {
            mostrarCarga();
            const response = await fetch('/actualizar-configuraciones', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    horaInicio,
                    horaFin,
                    estado
                })
            });

            const data = await response.json();
            if (data.success) {
                ocultarCarga();
                mostrarNotificacion({
                    message: 'Configuraciones actualizadas correctamente',
                    type: 'success',
                    duration: 3000
                });
                registrarNotificacion(
                    'Administración',
                    'Información',
                    usuarioInfo.nombre + ' realizo cambios en los ajustes del sistema o aplciación')
                await obtenerConfiguraciones();
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion({
                message: 'Error al actualizar las configuraciones',
                type: 'error',
                duration: 3500
            });
        } finally {
            ocultarCarga();
        }
    });
}