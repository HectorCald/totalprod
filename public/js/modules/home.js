let usuarioInfo = {
    id: '',
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    foto: '',
    rol: '',
    estado: '',
    plugins: ''
};
let registrosProduccion = [];
let registrosMovimientos = [];
let movimientosAcopio = [];

async function obtenerUsuario() {
    try {
        mostrarCarga();
        // Primero intentamos obtener del servidor
        const response = await fetch('/obtener-usuario-actual');
        const data = await response.json();

        if (data.success) {
            const nombreCompleto = data.usuario.nombre.split(' ');
            usuarioInfo = {
                id: data.usuario.id,
                nombre: nombreCompleto[0] || '',
                apellido: nombreCompleto[1] || '',
                telefono: data.usuario.telefono,
                email: data.usuario.email,
                rol: data.usuario.rol,
                estado: data.usuario.estado,
                plugins: data.usuario.plugins
            };

            // Procesar la foto
            if (!data.usuario.foto || data.usuario.foto === './icons/icon.png') {
                usuarioInfo.foto = './icons/icon.png';
            } else if (data.usuario.foto.startsWith('data:image')) {
                usuarioInfo.foto = data.usuario.foto;
            } else {
                try {
                    const imgResponse = await fetch(data.usuario.foto);
                    if (!imgResponse.ok) throw new Error('Error al cargar la imagen');
                    const blob = await imgResponse.blob();
                    usuarioInfo.foto = URL.createObjectURL(blob);
                } catch (error) {
                    console.error('Error al cargar imagen:', error);
                    usuarioInfo.foto = './icons/icon.png';
                }
            }

            // Guardar en localStorage después de obtener del servidor
            localStorage.setItem('damabrava_usuario', JSON.stringify(usuarioInfo));
            return true;
        } else {
            // Si falla el servidor, intentar recuperar del localStorage
            const usuarioGuardado = localStorage.getItem('damabrava_usuario');
            if (usuarioGuardado) {
                usuarioInfo = JSON.parse(usuarioGuardado);
                return true;
            }

            mostrarNotificacion({
                message: 'Error al obtener datos del usuario',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        mostrarNotificacion({
            message: 'Error al obtener datos del usuario',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerMisRegistros() {
    try {
        const response = await fetch('/obtener-registros-produccion');
        const data = await response.json();

        if (data.success) {
            // Filtrar registros por el email del usuario actual y ordenar de más reciente a más antiguo
            registrosProduccion = data.registros
                .filter(registro => registro.user === usuarioInfo.email)
                .sort((a, b) => {
                    const idA = parseInt(a.id.split('-')[1]);
                    const idB = parseInt(b.id.split('-')[1]);
                    return idB - idA; // Orden descendente por número de ID
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
async function obtenerMovimientosAlmacen() {
    try {
        const response = await fetch('/obtener-movimientos-almacen');
        const data = await response.json();

        if (data.success) {
            // Store movements in global variable and sort by date (most recent first)
            registrosMovimientos = data.movimientos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA; // Orden descendente por número de ID
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener movimientos de almacén',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        mostrarNotificacion({
            message: 'Error al obtener movimientos de almacén',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
async function obtenerMovimientosAcopio() {
    try {
        const response = await fetch('/obtener-movimientos-acopio');
        const data = await response.json();

        if (data.success) {
            movimientosAcopio = data.movimientos.map(movimiento => {
                return {
                    id: movimiento.id,
                    fecha: movimiento.fecha,
                    tipo: movimiento.tipo,
                    idProducto: movimiento.idProducto,
                    producto: movimiento.producto,
                    peso: movimiento.peso,
                    operario: movimiento.operario,
                    nombreMovimiento: movimiento.nombreMovimiento,
                    caracteristicas: movimiento.caracteristicas,
                    observaciones: movimiento.observaciones
                };
            }).sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });
            return true;
        } else {
            mostrarNotificacion({
                message: 'Error al obtener movimientos',
                type: 'error',
                duration: 3500
            });
            return false;
        }
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        mostrarNotificacion({
            message: 'Error al obtener movimientos',
            type: 'error',
            duration: 3500
        });
        return false;
    }
}
function obtenerFunciones() {
    const atajosPorRol = {
        'Producción': [
            {
                clase: 'opcion-btn',
                vista: 'formProduccion-view',
                icono: 'fa-clipboard-list',
                texto: 'Formulario',
                detalle: 'Nueva producción.',
                onclick: 'onclick="mostrarFormularioProduccion()"'
            },
            {
                clase: 'opcion-btn',
                vista: 'cuentasProduccion-view',
                icono: 'fa-history',
                texto: 'Registros',
                detalle: 'Ver mis registros.',
                onclick: 'onclick="mostrarMisRegistros()"'
            },
            {
                clase: 'opcion-btn',
                vista: 'gestionPro-view',
                icono: 'fa-chart-line',
                texto: 'Estadisticas',
                detalle: 'Ver mis estadisticas.',
                onclick: 'onclick="document.querySelector(\'.seccion3 .normal\').scrollIntoView({behavior: \'smooth\', block: \'start\'})"'
            }
        ],
        'Acopio': [
            {
                clase: 'opcion-btn',
                vista: 'almAcopio-view',
                icono: 'fa-shopping-cart',
                texto: 'Pedido',
                detalle: 'Hacer nuevo pedido',
                onclick: 'onclick="mostrarHacerPedido()"'
            },
            {
                clase: 'opcion-btn',
                vista: 'almacen-view',
                icono: 'fa-arrow-down',
                texto: 'Ingresos',
                detalle: 'Ingresos de tu almacen.',
                onclick: 'onclick="mostrarIngresosAcopio()"'
            },
            {
                clase: 'opcion-btn',
                vista: 'regAlmacen-view',
                icono: 'fa-arrow-up',
                texto: 'Salidas',
                detalle: 'Salidas de tu almacen.',
                onclick: 'onclick="mostrarSalidasAcopio()"'
            }
        ],
        'Almacen': [
            {
                clase: 'opcion-btn',
                vista: 'verificarRegistros-view',
                icono: 'fa-check-double',
                texto: 'Verificar',
                detalle: 'Verifica registros.',
                onclick: 'onclick="mostrarVerificacion()"'
            },
            {
                clase: 'opcion-btn',
                vista: 'almacen-view',
                icono: 'fa-arrow-down',
                texto: 'Ingresos',
                detalle: 'Ingresos de tu almacen.',
                onclick: 'onclick="mostrarIngresos()"'
            },
            {
                clase: 'opcion-btn',
                vista: 'regAlmacen-view',
                icono: 'fa-arrow-up',
                texto: 'Salidas',
                detalle: 'Salidas de tu almacen.',
                onclick: 'onclick="mostrarSalidas()"'
            }
        ],
        'Administración': [
            {
                clase: 'opcion-btn',
                vista: 'regAcopio-view',
                icono: 'fa-search',
                texto: 'Registros Acopio',
                detalle: 'Aqui puedes gestionar todos los registros de Acopio. (Eliminar, Editar, Movimientos)',
                onclick: 'onclick="cargarRegistrosAcopio()"'
            },
            {
                clase: 'opcion-btn',
                vista: 'regAlmacen-view',
                icono: 'fa-search',
                texto: 'Registros Almacen',
                detalle: 'Aqui puedes gestionar todos los registros de Almacen. (Eliminar, Editar, Movimientos)',
                onclick: 'onclick="cargarRegistrosAlmacenGral()"'
            },
            {
                clase: 'opcion-btn',
                vista: 'verificarRegistros-view',
                icono: 'fa-search',
                texto: 'Registros Producción',
                detalle: 'Aqui puedes gestionar todos los registros de producción. (Eliminar, Editar, Pagar, Calcular pagos)',
                onclick: 'onclick="cargarRegistros()"'
            }
        ]
    };

    // Collect all shortcuts for user's roles
    const rol = usuarioInfo.rol;
    let atajosUsuario = [];

    const atajosRol = atajosPorRol[rol];
    if (atajosRol) {
        atajosUsuario = [...atajosRol];
    }
    return atajosUsuario.slice(0, 3);
}


export async function crearHome() {

    const view = document.querySelector('.home-view');
    view.style.opacity = '0';  // Start with opacity 0

    await obtenerUsuario();
    crearNav(usuarioInfo.rol);
    crearPerfil();
    const promesas = [
        usuarioInfo.rol === 'Producción' ? obtenerMisRegistros() : null,
        usuarioInfo.rol === 'Almacen' ? obtenerMovimientosAlmacen() : null,
        usuarioInfo.rol === 'Acopio' ? obtenerMovimientosAcopio() : null
    ].filter(Boolean); // Filtramos los null

    Promise.all(promesas).then(() => {
        mostrarHome(view);
        requestAnimationFrame(() => {
            view.style.opacity = '1';
        });
    });

}
export function mostrarHome(view) {
    const funcionesUsuario = obtenerFunciones();
    const funcionesHTML = funcionesUsuario.map(funcion => `
        <div class="funcion" ${funcion.onclick}>
            <i class='fas ${funcion.icono}'></i>
            <p class="nombre">${funcion.texto}</p>
            <p class="detalle">${funcion.detalle} </p>
        </div>
    `).join('');

    // Determinar qué registros mostrar según el rol
    let registrosFiltrados = [];
    let tipoRegistro = '';

    switch (usuarioInfo.rol) {
        case 'Producción':
            registrosFiltrados = registrosProduccion;
            tipoRegistro = 'producción';
            break;
        case 'Almacen':
            registrosFiltrados = registrosMovimientos;
            tipoRegistro = 'almacén';
            break;
        case 'Acopio':
            registrosFiltrados = movimientosAcopio;
            tipoRegistro = 'almacén';
            break;
    }

    // Calcular los destacados según el rol
    let destacados = {};
    if (usuarioInfo.rol === 'Producción') {
        const totalRegistros = registrosFiltrados.length;
        const verificados = registrosFiltrados.filter(registro => registro.fecha_verificacion).length;
        destacados = {
            total: totalRegistros,
            verificados: verificados,
            noVerificados: totalRegistros - verificados
        };
    } else if (usuarioInfo.rol === 'Almacen') {
        const entradas = registrosFiltrados.filter(registro => registro.tipo === 'Ingreso').length;
        const salidas = registrosFiltrados.filter(registro => registro.tipo === 'Salida').length;
        destacados = {
            total: registrosFiltrados.length,
            entradas: entradas,
            salidas: salidas
        };
    }
    else if (usuarioInfo.rol === 'Acopio') {
        const entradas = registrosFiltrados.filter(registro =>
            registro.tipo === 'Ingreso bruto' || registro.tipo === 'Ingreso prima'
        ).length;

        const salidas = registrosFiltrados.filter(registro =>
            registro.tipo === 'Salida bruto' || registro.tipo === 'Salida prima'
        ).length;

        destacados = {
            total: registrosFiltrados.length,
            entradas: entradas,
            salidas: salidas
        };
    }

    const home = `
        <h1 class="titulo"><i class='bx bx-home'></i> Inicio</h1>
        <div class="seccion1">
            <h2 class="normal">Tus atajos</h2>
            <div class="funciones-rol">
                ${funcionesHTML}
            </div>
        </div>
        <div class="seccion3">
            <h2 class="normal">Tus destacados</h2>
            <div class="destacados">
                ${usuarioInfo.rol === 'Producción' ? `
                    <div class="destacado">
                        <p class="cantidad blue">${destacados.total}</p>
                        <p class="tipo">Registros</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad green">${destacados.verificados}</p>
                        <p class="tipo">Verificados</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad yellow">${destacados.noVerificados}</p>
                        <p class="tipo">No verificados</p>
                    </div>
                ` : `
                    <div class="destacado">
                        <p class="cantidad blue">${destacados.total}</p>
                        <p class="tipo">Registros</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad green">${destacados.entradas}</p>
                        <p class="tipo">Ingresos</p>
                    </div>
                    <div class="destacado">
                        <p class="cantidad yellow">${destacados.salidas}</p>
                        <p class="tipo">Salidas</p>
                    </div>
                `}
            </div>
        </div>
        <div class="seccion2">
            <h2 class="normal nota">Actividad de los últimos 7 días</h2>
            <canvas id="graficoVelas"></canvas>
        </div>
    `;

    view.innerHTML = home;
    const nota = document.querySelector('.nota');
    if (usuarioInfo.rol === 'Producción') {
        crearGraficoVelas();
    } else if (usuarioInfo.rol === 'Almacen') {
        crearGraficoAlmacen();
    }
    else if (usuarioInfo.rol === 'Acopio') {
        crearGraficoAcopio();
    }
    ocultarCarga();
}
function crearGraficoVelas() {
    if (!registrosProduccion || registrosProduccion.length === 0) {
        console.warn('No hay registros de producción para mostrar en el gráfico');
        return;
    }

    // Procesar datos para los últimos 7 días
    const ultimos7Dias = Array(7).fill().map((_, i) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        return fecha.toLocaleDateString('es-ES'); // Formato DD/MM/YYYY
    }).reverse();

    // Contar registros por día
    const datosPorDia = ultimos7Dias.map(fecha => {
        const registrosDia = registrosProduccion.filter(registro => {
            if (!registro.fecha) {
                console.warn('Registro sin fecha:', registro);
                return false;
            }
            return registro.fecha === fecha;
        });

        return registrosDia.length;
    });

    // Determinar colores según comparación con día anterior
    const colores = datosPorDia.map((cantidad, index) => {
        if (index === 0) return 'rgba(54, 162, 235, 0.5)'; // Azul para el primer día

        const cantidadAyer = datosPorDia[index - 1];
        if (cantidad > cantidadAyer) {
            return 'rgba(40, 167, 69, 0.5)'; // Verde si hay más registros
        } else if (cantidad < cantidadAyer) {
            return 'rgba(220, 53, 69, 0.5)'; // Rojo si hay menos registros
        } else {
            return 'rgba(255, 193, 7, 0.5)'; // Amarillo si es igual
        }
    });

    const canvas = document.getElementById('graficoVelas');
    if (!canvas) {
        console.error('No se encontró el elemento canvas con ID "graficoVelas"');
        return;
    }

    try {
        const ctx = canvas.getContext('2d');

        // Configuración de estilos modernos
        const estilos = {
            fuente: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            colorTexto: 'gray',
            colorFondo: 'none',
            colorGrid: 'rgba(0, 0, 0, 0.03)',
            colores: {
                aumento: '#4CAF50', // Verde moderno
                disminucion: '#F44336', // Rojo moderno
                igual: '#FFC107', // Amarillo moderno
                neutro: '#2196F3' // Azul moderno
            }
        };

        // Reemplazar colores básicos con la paleta moderna
        const coloresModernos = colores.map(color => {
            if (color.includes('40, 167, 69')) return estilos.colores.aumento;
            if (color.includes('220, 53, 69')) return estilos.colores.disminucion;
            if (color.includes('255, 193, 7')) return estilos.colores.igual;
            return estilos.colores.neutro;
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ultimos7Dias.map(fecha => fecha.split('/')[0] + '/' + fecha.split('/')[1]),
                datasets: [{
                    label: '',
                    data: datosPorDia,
                    backgroundColor: coloresModernos,
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: {
                        topLeft: 6,
                        topRight: 6,
                        bottomLeft: 0,
                        bottomRight: 0
                    },
                    barThickness: 20,
                    maxBarThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        right: 15,
                        bottom: 10,
                        left: 15
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#ffffff',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#e0e0e0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        bodyFont: {
                            family: estilos.fuente,
                            size: 13
                        },
                        titleFont: {
                            family: estilos.fuente,
                            size: 14,
                            weight: 'bold'
                        },
                        callbacks: {
                            label: function (context) {
                                return `${context.raw} registros`;
                            },
                            title: function (context) {
                                return `Día ${context[0].label}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: estilos.colorGrid,
                            drawBorder: false,
                            drawTicks: false
                        },
                        ticks: {
                            color: estilos.colorTexto,
                            font: {
                                family: estilos.fuente,
                                size: 12
                            },
                            padding: 8
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: estilos.colorTexto,
                            font: {
                                family: estilos.fuente,
                                size: 12
                            }
                        }
                    }
                }
            }
        });

        // Aplicar estilo al canvas
        canvas.style.background = estilos.colorFondo;
        canvas.style.borderRadius = '12px';
        canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
    } catch (error) {
        console.error('Error al crear el gráfico:', error);
    }
}
function crearGraficoAlmacen() {

    if (!registrosMovimientos || registrosMovimientos.length === 0) {
        console.warn('No hay registros de movimientos para mostrar en el gráfico');
        return;
    }

    // Procesar datos para los últimos 7 días
    const ultimos7Dias = Array(7).fill().map((_, i) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        return fecha.toLocaleDateString('es-ES'); // Formato DD/MM/YYYY
    }).reverse();

    // Sumar totales por día y contar movimientos
    const datosPorDia = ultimos7Dias.map(fecha => {
        const registrosDia = registrosMovimientos.filter(registro => {
            if (!registro.fecha_hora) {
                return false;
            }
            // Extraer solo la parte de la fecha (DD/MM/YYYY)
            const registroFecha = registro.fecha_hora.split(',')[0].trim();
            return registroFecha === fecha;
        });

        // Sumar los totales de todos los registros del día
        const totalDia = registrosDia.reduce((sum, registro) => {
            return sum + (parseFloat(registro.total) || 0);
        }, 0);

        return totalDia;
    });

    // Determinar colores según comparación con día anterior
    const colores = datosPorDia.map((total, index) => {
        if (index === 0) return '#2196F3'; // Azul para el primer día

        const totalAyer = datosPorDia[index - 1];
        if (total > totalAyer) {
            return '#4CAF50'; // Verde si hay más ingresos
        } else if (total < totalAyer) {
            return '#F44336'; // Rojo si hay menos ingresos
        } else {
            return '#FFC107'; // Amarillo si es igual
        }
    });

    const canvas = document.getElementById('graficoVelas');
    if (!canvas) {
        return;
    }

    try {
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ultimos7Dias.map(fecha => fecha.split('/')[0] + '/' + fecha.split('/')[1]),
                datasets: [{
                    label: 'Total movimientos $',
                    data: datosPorDia,
                    backgroundColor: colores,
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: {
                        topLeft: 6,
                        topRight: 6,
                        bottomLeft: 0,
                        bottomRight: 0
                    },
                    barThickness: 20,
                    maxBarThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        right: 15,
                        bottom: 10,
                        left: 15
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#ffffff',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#e0e0e0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        bodyFont: {
                            family: "'Inter', -apple-system, sans-serif",
                            size: 13
                        },
                        titleFont: {
                            family: "'Inter', -apple-system, sans-serif",
                            size: 14,
                            weight: 'bold'
                        },
                        callbacks: {
                            label: function (context) {
                                return `Total: $${context.raw.toFixed(2)}`;
                            },
                            title: function (context) {
                                return `Día ${context[0].label}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.03)',
                            drawBorder: false,
                            drawTicks: false
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                family: "'Inter', -apple-system, sans-serif",
                                size: 12
                            },
                            padding: 8,
                            callback: function (value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                family: "'Inter', -apple-system, sans-serif",
                                size: 12
                            }
                        }
                    }
                }
            }
        });

        // Aplicar estilo al canvas
        canvas.style.background = 'none';
        canvas.style.borderRadius = '12px';
        canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';

    } catch (error) {
        console.error('Error al crear el gráfico de almacén:', error);
    }
}
function crearGraficoAcopio() {
    if (!movimientosAcopio || movimientosAcopio.length === 0) {
        console.warn('No hay registros de movimientos de acopio para mostrar en el gráfico');
        return;
    }

    // Add debug logging
    console.log('Movimientos Acopio:', movimientosAcopio);

    const ultimos7Dias = Array(7).fill().map((_, i) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        return fecha.toLocaleDateString('es-ES');
    }).reverse();

        // Process data for each day with debug logging
    const datos = ultimos7Dias.map(fecha => {
        const movimientosDia = movimientosAcopio.filter(mov => {
            // Extract only the date part from the movement's fecha_hora
            const movFecha = mov.fecha.split(',')[0].trim();
            return movFecha === fecha;
        });

        const ingresoBruto = movimientosDia
            .filter(mov => mov.tipo === 'Ingreso bruto')
            .reduce((sum, mov) => sum + (parseFloat(mov.peso) || 0), 0);

        const ingresoPrima = movimientosDia
            .filter(mov => mov.tipo === 'Ingreso prima')
            .reduce((sum, mov) => sum + (parseFloat(mov.peso) || 0), 0);

        const salidaBruto = movimientosDia
            .filter(mov => mov.tipo === 'Salida bruto')
            .reduce((sum, mov) => sum + (parseFloat(mov.peso) || 0), 0);

        const salidaPrima = movimientosDia
            .filter(mov => mov.tipo === 'Salida prima')
            .reduce((sum, mov) => sum + (parseFloat(mov.peso) || 0), 0);

        return {
            ingresoBruto,
            ingresoPrima,
            salidaBruto,
            salidaPrima
        };
    });


    const canvas = document.getElementById('graficoVelas');
    if (!canvas) return;

    try {
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ultimos7Dias.map(fecha => fecha.split('/')[0] + '/' + fecha.split('/')[1]),
                datasets: [
                    {
                        label: 'Ingresos Bruto',
                        data: datos.map(d => d.ingresoBruto),
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Ingresos Prima',
                        data: datos.map(d => d.ingresoPrima),
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Salidas Bruto',
                        data: datos.map(d => d.salidaBruto),
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Salidas Prima',
                        data: datos.map(d => d.salidaPrima),
                        borderColor: '#FFC107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#fff',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#e0e0e0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        bodyFont: {
                            family: "'Inter', sans-serif"
                        },
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.raw.toFixed(2)} Kg`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.03)'
                        },
                        ticks: {
                            callback: value => `${value} Kg`,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        }
                    }
                }
            }
        });

        canvas.style.background = 'none';
        canvas.style.borderRadius = '12px';
        canvas.style.padding = '20px';
    } catch (error) {
        console.error('Error al crear el gráfico de acopio:', error);
    }
}