import { crearNotificacion, mostrarNotificacion, mostrarAnuncio, ocultarAnuncio, mostrarCarga, ocultarCarga, configuracionesEntrada, mostrarAnuncioSecond, ocultarAnuncioSecond, registrarHistorial, exportarArchivos, cerrarAnuncioManual, mostrarAnuncioTercer, ocultarAnuncioTercer, scrollToTop } from './modules/componentes.js'
import { crearNav } from './modules/nav.js'
import { crearHome, mostrarHome } from './modules/home.js';
import { crearPerfil } from './modules/perfil.js';
import { crearNotificaciones } from './modules/notificaciones.js'
import { flotante } from './modules/flotante.js';
import { mostrarFormularioProduccion } from './modules/formulario-produccion.js'
import { mostrarVerificacion } from './modules/verificar-registros.js'
import { mostrarAlmacenGeneral } from './modules/almacen-general.js'
import { mostrarSalidas } from './modules/salidas-almacen-general.js';
import { mostrarIngresos } from './modules/ingresos-almacen-general.js';
import { mostrarClientes } from './modules/clientes.js';
import { mostrarProovedores } from './modules/proovedores.js';
import { mostrarHacerPedido } from './modules/hacer-pedido.js';
import { mostrarAlmacenAcopio } from './modules/almacen-acopio.js';
import { mostrarMovimientosAlmacen } from './modules/registros-almacen.js';
import { mostrarMisRegistros } from './modules/registros-produccion.js';
import { mostrarConteo } from './modules/conteo-almacen.js';
import { registrosConteoAlmacen } from './modules/registros-conteos.js';
import { mostrarPedidos } from './modules/registros-pedidos-acopio.js';
import { mostrarProovedoresAcopio } from './modules/proovedores-acopio.js';
import { mostrarIngresosAcopio} from './modules/ingresos-acopio.js';
import { mostrarSalidasAcopio } from './modules/salidas-acopio.js';
import { mostrarRegistrosAcopio } from './modules/registros-acopio.js';


window.crearHome = crearHome
window.mostrarHome = mostrarHome

window.crearNav = crearNav


window.crearNotificacion = crearNotificacion
window.mostrarNotificacion = mostrarNotificacion


window.ocultarAnuncio = ocultarAnuncio
window.mostrarAnuncio = mostrarAnuncio
window.mostrarAnuncioSecond = mostrarAnuncioSecond
window.ocultarAnuncioSecond = ocultarAnuncioSecond
window.cerrarAnuncioManual = cerrarAnuncioManual
window.mostrarAnuncioTercer = mostrarAnuncioTercer
window.ocultarAnuncioTercer = ocultarAnuncioTercer
window.scrollToTop = scrollToTop


window.mostrarCarga = mostrarCarga
window.ocultarCarga = ocultarCarga
window.configuracionesEntrada = configuracionesEntrada
window.registrarHistorial = registrarHistorial
window.crearNotificaciones = crearNotificaciones
window.exportarArchivos = exportarArchivos


window.mostrarFormularioProduccion = mostrarFormularioProduccion
window.mostrarVerificacion = mostrarVerificacion
window.mostrarMisRegistros = mostrarMisRegistros


window.mostrarAlmacenGeneral = mostrarAlmacenGeneral
window.mostrarSalidas = mostrarSalidas
window.mostrarIngresos = mostrarIngresos
window.mostrarMovimientosAlmacen = mostrarMovimientosAlmacen
window.mostrarClientes = mostrarClientes
window.mostrarProovedores = mostrarProovedores
window.mostrarConteo = mostrarConteo
window.registrosConteoAlmacen = registrosConteoAlmacen


window.mostrarHacerPedido = mostrarHacerPedido
window.mostrarAlmacenAcopio = mostrarAlmacenAcopio
window.mostrarPedidos = mostrarPedidos
window.mostrarProovedoresAcopio = mostrarProovedoresAcopio
window.mostrarIngresosAcopio = mostrarIngresosAcopio
window.mostrarSalidasAcopio = mostrarSalidasAcopio
window.mostrarRegistrosAcopio = mostrarRegistrosAcopio

window.crearPerfil = crearPerfil


document.addEventListener('DOMContentLoaded', async () => {
    flotante();
    await crearHome();
    crearNotificaciones();
});