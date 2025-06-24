import {
    crearNotificacion, mostrarNotificacion,
    mostrarAnuncio, ocultarAnuncio, mostrarCarga,
    ocultarCarga, configuracionesEntrada,
    mostrarAnuncioSecond, ocultarAnuncioSecond,
    exportarArchivos, cerrarAnuncioManual,
    mostrarAnuncioTercer, ocultarAnuncioTercer,
    scrollToTop, tienePermiso, actualizarPermisos,
    inicializarDashboard, limpiarProteccionNavegacion,
    usuarioInfo, mostrarProgreso,
    ocultarProgreso, initPullToRefresh,
    registrarNotificacion, exportarArchivosPDF
} from './modules/componentes/componentes.js'

import { crearNav } from './modules/main/nav.js'
import { crearHome, mostrarHome } from './modules/main/home.js';
import { crearPerfil } from './modules/main/perfil.js';
import { crearNotificaciones } from './modules/main/notificaciones.js';
import { flotante } from './modules/main/flotante.js';

import { mostrarFormularioProduccion } from './modules/produccion/formulario-produccion.js'
import { mostrarMisRegistros } from './modules/produccion/registros-produccion.js'
import { mostrarReglas } from './modules/produccion/reglas.js'

import { mostrarVerificacion } from './modules/almacen/verificar-registros.js'
import { mostrarAlmacenGeneral } from './modules/almacen/almacen-general.js'
import { mostrarSalidas } from './modules/almacen/salidas-almacen-general.js';
import { mostrarIngresos } from './modules/almacen/ingresos-almacen-general.js';
import { mostrarConteo } from './modules/almacen/conteo-almacen.js';
import { registrosConteoAlmacen } from './modules/almacen/registros-conteos.js';
import { mostrarMovimientosAlmacen } from './modules/almacen/registros-almacen.js';

import { mostrarHacerPedido } from './modules/acopio/hacer-pedido.js';
import { mostrarAlmacenAcopio } from './modules/acopio/almacen-acopio.js';
import { mostrarPedidos } from './modules/acopio/registros-pedidos-acopio.js';
import { mostrarIngresosAcopio } from './modules/acopio/ingresos-acopio.js';
import { mostrarSalidasAcopio } from './modules/acopio/salidas-acopio.js';
import { mostrarRegistrosAcopio } from './modules/acopio/registros-acopio.js';

import { mostrarClientes } from './modules/admin/clientes.js';
import { mostrarProovedores } from './modules/admin/proovedores.js';
import { mostrarPagos } from './modules/admin/pagos.js';
import { mostrarPersonal } from './modules/admin/personal.js';
import { mostrarConfiguracionesSistema } from './modules/admin/configuraciones-sistema.js';
import { mostrarDescargaCatalogo } from './modules/admin/descargas.js';
import { mostrarReportes } from './modules/admin/reportes.js';

import { mostrarTareas } from './modules/plugins/tareas-acopio.js';
import { mostrarCalcularMp } from './modules/plugins/calculadora-mp.js';

window.usuarioInfo = usuarioInfo

window.crearHome = crearHome
window.mostrarHome = mostrarHome
window.crearNav = crearNav
window.crearNotificacion = crearNotificacion
window.mostrarNotificacion = mostrarNotificacion
window.crearPerfil = crearPerfil
window.crearNotificaciones = crearNotificaciones

window.ocultarAnuncio = ocultarAnuncio
window.mostrarAnuncio = mostrarAnuncio
window.mostrarAnuncioSecond = mostrarAnuncioSecond
window.ocultarAnuncioSecond = ocultarAnuncioSecond
window.cerrarAnuncioManual = cerrarAnuncioManual
window.mostrarAnuncioTercer = mostrarAnuncioTercer
window.ocultarAnuncioTercer = ocultarAnuncioTercer
window.scrollToTop = scrollToTop
window.tienePermiso = tienePermiso
window.actualizarPermisos = actualizarPermisos
window.mostrarCarga = mostrarCarga
window.ocultarCarga = ocultarCarga
window.configuracionesEntrada = configuracionesEntrada
window.exportarArchivos = exportarArchivos
window.exportarArchivosPDF = exportarArchivosPDF
window.registrarNotificacion = registrarNotificacion
window.inicializarDashboard = inicializarDashboard
window.limpiarProteccionNavegacion = limpiarProteccionNavegacion
window.mostrarProgreso = mostrarProgreso
window.ocultarProgreso = ocultarProgreso
window.initPullToRefresh = initPullToRefresh


window.mostrarFormularioProduccion = mostrarFormularioProduccion
window.mostrarMisRegistros = mostrarMisRegistros
window.mostrarReglas = mostrarReglas

window.mostrarVerificacion = mostrarVerificacion
window.mostrarAlmacenGeneral = mostrarAlmacenGeneral
window.mostrarSalidas = mostrarSalidas
window.mostrarIngresos = mostrarIngresos
window.mostrarMovimientosAlmacen = mostrarMovimientosAlmacen
window.mostrarConteo = mostrarConteo
window.registrosConteoAlmacen = registrosConteoAlmacen

window.mostrarHacerPedido = mostrarHacerPedido
window.mostrarAlmacenAcopio = mostrarAlmacenAcopio
window.mostrarPedidos = mostrarPedidos
window.mostrarIngresosAcopio = mostrarIngresosAcopio
window.mostrarSalidasAcopio = mostrarSalidasAcopio
window.mostrarRegistrosAcopio = mostrarRegistrosAcopio

window.mostrarClientes = mostrarClientes
window.mostrarProovedores = mostrarProovedores
window.mostrarPagos = mostrarPagos
window.mostrarPersonal = mostrarPersonal
window.mostrarConfiguracionesSistema = mostrarConfiguracionesSistema
window.mostrarDescargaCatalogo = mostrarDescargaCatalogo
window.mostrarReportes = mostrarReportes

window.mostrarCalcularMp = mostrarCalcularMp
window.mostrarTareas = mostrarTareas


document.addEventListener('DOMContentLoaded', async () => {
    await inicializarDashboard();
    flotante();
    await crearHome();
});