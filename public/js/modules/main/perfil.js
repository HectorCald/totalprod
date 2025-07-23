import { borrarFCMToken } from './notificaciones.js';

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
    } finally {
        ocultarCarga();
    }
}


export async function crearPerfil(usuario) {
    const view = document.querySelector('.perfil-view');
    mostrarPerfil(view);
}
function mostrarPerfil(view) {
    const version = localStorage.getItem('app_version') || 'No disponible';
    const perfil = `
        <h1 class="titulo"><i class='bx bx-user'></i> Perfil</h1>
        <div class="info">
            <div class="detalles">
                <p class="subtitulo">Hola!</p>
                <p class="titulo nombre">${usuarioInfo.nombre} ${usuarioInfo.apellido}</p>
                <p class="correo-usuario">${usuarioInfo.email}</p>
                <p class="perfil-rol">${usuarioInfo.rol}</p>
            </div>
            <div class="foto">
                <img src="${usuarioInfo.foto}" alt="Foto de perfil" class="foto-perfil-img" onerror="this.src='./icons/icon.png'">
            </div>
        </div>
        <button class="apartado cuenta"><i class='bx bx-user'></i> Cuenta</button>
        <button class="apartado configuraciones"><i class='bx bx-cog'></i> Configuraciones</button>
        <button class="cerrar-sesion"><i class='bx bx-log-out'></i> Cerrar Sesión</button>
        <button class="soporte-tecnico">Soporte técnico</button>
        <p class="version">Versión ${version}</p>
    `;
    view.innerHTML = perfil;

    // Configurar event listeners
    const btnCuenta = document.querySelector('.apartado.cuenta');
    const btnConfiguraciones = document.querySelector('.apartado.configuraciones');
    const btnCerrarSesion = document.querySelector('.cerrar-sesion');

    btnCuenta.addEventListener('click', () => {
        mostrarCuenta(usuarioInfo.nombre, usuarioInfo.apellido, usuarioInfo.email, usuarioInfo.foto, usuarioInfo.telefono);
    });

    btnConfiguraciones.addEventListener('click', () => {
        mostrarConfiguraciones();
    });

    btnCerrarSesion.addEventListener('click', async () => {
        try {
            await borrarFCMToken(usuarioInfo.email);
            const response = await fetch('/cerrar-sesion', { method: 'POST' });
            if (response.ok) {
                limpiarProteccionNavegacion();
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            mostrarNotificacion({
                message: 'Error al cerrar sesión',
                type: 'error',
                duration: 3500
            });
        } 
    });
}


function mostrarCuenta(nombre, apellido, email, foto, telefono) {
    const contenido = document.querySelector('.anuncio .contenido');
    const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">Tu cuenta</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <div class="foto-perfil">
                <div class="preview-container">
                    <img src="${foto}" alt="Vista previa" id="preview-foto">
                    <label for="input-foto" class="upload-overlay">
                        <i class='bx bx-upload'></i>
                    </label>
                </div>
                <input type="file" id="input-foto" accept="image/*" style="display: none;">
            </div>
            <p class="normal">Información personal</p>
            <div class="entrada">
                <i class='bx bx-user'></i>
                <div class="input">
                    <p class="detalle">Nombre</p>
                    <input class="nombre" type="text" value="${nombre}" placeholder=" " required>
                </div>
            </div>
            <div class="entrada">
                <i class='bx bx-user'></i>
                <div class="input">
                    <p class="detalle">Apellido</p>
                    <input class="nombre" type="text" value="${apellido}" placeholder=" " required>
                </div>
            </div>
            <div class="entrada">
                <i class='bx bx-phone'></i>
                <div class="input">
                    <p class="detalle">Teléfono</p>
                    <input class="telefono" type="tel" value="${telefono}" placeholder=" " required>
                </div>
            </div>
            <div class="entrada">
                <i class='bx bx-lock-alt'></i>
                <div class="input">
                    <p class="detalle">Contraseña Actual</p>
                    <input class="password-actual" type="password" placeholder=" "autocomplete="new-password" required>
                    <button class="toggle-password"><i class="fas fa-eye"></i></button>
                </div>
            </div>
            <div class="entrada">
                <i class='bx bx-lock-alt'></i>
                <div class="input">
                    <p class="detalle">Nueva Contraseña</p>
                    <input class="password-nueva" type="password" placeholder=" " autocomplete="new-password" required>
                    <button class="toggle-password"><i class="fas fa-eye"></i></button>
                </div>
            </div>
            ${usuarioInfo.rol !== 'Administración' ? `
            <p class="normal">Permisos concedidos</p>
            <div class="permisos-container">
                <div class="campo-horizontal">
                    ${usuarioInfo.permisos.includes('eliminacion') ? '<label class="eliminacion"><span>Eliminación</span></label>' : '<label class="nulo"><span>Eliminación</span></label>'}
                    ${usuarioInfo.permisos.includes('edicion') ? '<label class="edicion"><span>Edición</span></label>' : '<label class="nulo"><span>Edición</span></label>'}
                </div>
                <div class="campo-horizontal">
                    ${usuarioInfo.permisos.includes('anulacion') ? '<label class="anulacion"><span>Anulación</span></label>' : '<label class="nulo"><span>Anulación</span></label>'}
                    ${usuarioInfo.permisos.includes('creacion') ? '<label class="creacion"><span>Creación</span></label>' : '<label class="nulo"><span>Creación</span></label>'}
                </div>
            </div>
            <p class="normal">Plugins habilitados</p>
            <div class="plugins-container">
                ${usuarioInfo.plugins.includes('calcularmp') ? '<label class="plugin"><span>Calculadora materia prima</span></label>' : '<label class="nulo"><span>Calculadora materia prima</span></label>'}
            </div>
            <div class="plugins-container">
                ${usuarioInfo.plugins.includes('tareasAc') ? '<label class="plugin"><span>Calculadora de tiempo en tareas</span></label>' : '<label class="nulo"><span>Calculadora de tiempo en tareas</span></label>'}
            </div>`: ''}
            <div class="busqueda">
                <div class="acciones-grande" style="min-width:100%">
                    <button class="btn-guardar btn orange" style="min-width:100%"><i class="bx bx-save"></i> Guardar cambios</button>
                </div>
            </div>
        </div>
        
        <div class="anuncio-botones">
            <button class="btn-guardar btn orange"><i class="bx bx-save"></i> Guardar cambios</button>
        </div>
    `;

    contenido.innerHTML = registrationHTML;
    contenido.style.paddingBottom = '80px';
    // Ajustar el padding para evitar que el botón quede oculto
    mostrarAnuncio();
    contenido.style.maxWidth = '450px';
    evetosCuenta();
    configuracionesEntrada();
}
function evetosCuenta() {
    const inputFoto = document.querySelector('#input-foto');
    const previewFoto = document.querySelector('#preview-foto');
    const btnGuardar = document.querySelectorAll('.btn-guardar');
    const telefonoInput = document.querySelector('.telefono');
    let fotoBase64 = null;
    let fotoModificada = false;



    // Initialize current photo
    const currentPhoto = previewFoto.src;
    if (currentPhoto.startsWith('data:image')) {
        fotoBase64 = currentPhoto;
    } else if (currentPhoto.startsWith('http') || currentPhoto.startsWith('./')) {
        fetch(currentPhoto)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    fotoBase64 = reader.result;
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error('Error loading current photo:', error);
                fotoBase64 = null;
            });
    }



    inputFoto.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                mostrarNotificacion({
                    message: 'Solo se permiten archivos de imagen',
                    type: 'error',
                    duration: 3500
                });
                return;
            }

            try {
                mostrarCarga();
                const img = new Image();
                const reader = new FileReader();

                reader.onload = function (e) {
                    img.src = e.target.result;
                };

                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Reducir más el tamaño máximo para móviles
                    const MAX_SIZE = 500; // Reducido de 800 a 500
                    if (width > height && width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    } else if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Aumentar la compresión para móviles
                    const calidad = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 0.5 : 0.7;
                    fotoBase64 = canvas.toDataURL('image/jpeg', calidad);

                    // Verificar el tamaño de la cadena base64
                    if (fotoBase64.length > 2000000) { // Si es mayor a 2MB
                        mostrarNotificacion({
                            message: 'La imagen es demasiado grande, intenta con una más pequeña',
                            type: 'error',
                            duration: 3500
                        });
                        return;
                    }

                    previewFoto.src = fotoBase64;
                    fotoModificada = true;
                };

                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Error al procesar la imagen:', error);
                mostrarNotificacion({
                    message: 'Error al procesar la imagen',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarCarga();
            }
        }
    });
    btnGuardar.forEach(btn => {
        btn.addEventListener('click', async () => {
            const nombre = document.querySelector('input.nombre').value.trim();
            const telefono = document.querySelector('input.telefono').value.trim();
            const apellido = document.querySelectorAll('input.nombre')[1].value.trim();
            const passwordActual = document.querySelector('input.password-actual')?.value;
            const passwordNueva = document.querySelector('input.password-nueva')?.value;

            // Validaciones básicas
            if (!nombre || !apellido || !telefono) {
                mostrarNotificacion({
                    message: 'Nombre, apellido son requeridos y telefono son requeridos',
                    type: 'error',
                    duration: 3500
                });
                return;
            }

            if (!/^[67]\d{7}$/.test(telefono)) {
                mostrarNotificacion({
                    message: 'Ingrese un número válido de 8 dígitos (ej: 67644705)',
                    type: 'warning',
                    duration: 4000
                });
                return;
            }


            // Validación de contraseña nueva
            if (passwordNueva && passwordNueva.length < 8) {
                mostrarNotificacion({
                    message: 'La nueva contraseña debe tener al menos 8 caracteres',
                    type: 'error',
                    duration: 3500
                });
                return;
            }

            // Validar que ambas contraseñas estén presentes si se está cambiando
            if ((passwordActual && !passwordNueva) || (!passwordActual && passwordNueva)) {
                mostrarNotificacion({
                    message: 'Debe ingresar ambas contraseñas para cambiarla',
                    type: 'error',
                    duration: 3500
                });
                return;
            }

            try {
                const signal= await mostrarProgreso('.pro-save')
                const response = await fetch('/actualizar-usuario', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nombre,
                        apellido,
                        foto: fotoModificada ? fotoBase64 : undefined,
                        passwordActual: passwordActual || undefined,
                        passwordNueva: passwordNueva || undefined,
                        telefono
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al actualizar el perfil');
                }

                await obtenerUsuario();
                mostrarPerfil(document.querySelector('.perfil-view'));
                ocultarAnuncio();
                mostrarNotificacion({
                    message: 'Perfil actualizado con éxito',
                    type: 'success',
                    duration: 3500
                });

            } catch (error) {
                if (error.message === 'cancelled') {
                    console.log('Operación cancelada por el usuario');
                    return;
                }
                console.error('Error:', error);
                mostrarNotificacion({
                    message: error.message || 'Error al actualizar el perfil',
                    type: 'error',
                    duration: 3500
                });
            } finally {
                ocultarProgreso('.pro-save')
            }
        });
    })
}


async function mostrarConfiguraciones() {
    const contenido = document.querySelector('.anuncio .contenido');
    const currentTheme = localStorage.getItem('theme') || 'system';
    const botonesCancelacion = localStorage.getItem('botonesCancelacion') === 'true';

    const registrationHTML = `
        <div class="encabezado">
            <h1 class="titulo">Tus configuraciones</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Tema de la aplicación</p>
            <div class="tema-selector">
                <button class="btn-tema ${currentTheme === 'light' ? 'active' : ''} dia" data-theme="light">
                    <i class='bx bx-sun'></i> Claro
                </button>
                <button class="btn-tema ${currentTheme === 'dark' ? 'active' : ''} noche" data-theme="dark">
                    <i class='bx bx-moon'></i> Oscuro
                </button>
                <button class="btn-tema ${currentTheme === 'system' ? 'active' : ''} sistema" data-theme="system">
                    <i class='bx bx-desktop'></i> Sistema
                </button>
            </div>

            <p class="normal">Opciones de operaciones</p>
            <div class="entrada">
                <i class='bx bx-exit-fullscreen'></i>
                <div class="input">
                    <p class="detalle">Botones de cancelación</p>
                    <label class="switch">
                        <input type="checkbox" class="botones-cancelacion" ${botonesCancelacion ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>

            <p class="normal">Almacenamiento</p>
            <div class="entrada">
                <i class='bx bx-hdd'></i>
                <div class="input">
                    <p class="detalle">Espacio utilizado</p>
                    <p class="storage-info" style="font-weight:900; margin-left:auto;padding-right:10px">Calculando...</p>
                </div>
            </div>
            <div class="entrada">
                <i class='bx bx-trash'></i>
                <div class="input">
                    <p class="detalle">Eliminar datos almacenados</p>
                    <button class="btn-limpiar btn" style="margin-left:auto; padding-right:10px;min-width:60px; text-align:right; color:red !important">Limpiar</button>
                </div>
            </div>
        </div>
    `;

    contenido.innerHTML = registrationHTML;
    mostrarAnuncio();
    contenido.style.maxWidth = '450px';
    eventosConfiguraciones();

    // Calcular el almacenamiento después de mostrar las configuraciones
    const storageInfo = document.querySelector('.storage-info');
    const storageUsed = await calculateStorageUsed();
    storageInfo.textContent = storageUsed;
}

async function openDB(dbName) {
    return new Promise((resolve, reject) => {
        try {
            // Primero intentar obtener la versión actual de la base de datos
            const request = indexedDB.open(dbName);

            request.onerror = () => reject(request.error);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const currentVersion = db.version;
                db.close();

                // Abrir la base de datos con la versión actual + 1
                const upgradeRequest = indexedDB.open(dbName, currentVersion + 1);

                upgradeRequest.onerror = () => reject(upgradeRequest.error);
                upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);

                upgradeRequest.onupgradeneeded = (event) => {
                    const db = event.target.result;
                };
            };
        } catch (error) {
            console.error('Error al intentar abrir la base de datos:', error);
            reject(error);
        }
    });
}
async function openDB2(dbName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}



async function calculateStorageUsed() {
    try {
        let totalSize = 0;
        const storageInfo = document.querySelector('.storage-info');
        storageInfo.textContent = 'Calculando...';

        // Función auxiliar para obtener datos de un store
        const getStoreData = (db, storeName) => {
            return new Promise((resolve, reject) => {
                try {
                    const transaction = db.transaction(storeName, 'readonly');
                    const store = transaction.objectStore(storeName);
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => {
                        console.warn(`Error al obtener datos del store ${storeName}:`, request.error);
                        resolve([]); // Si hay error, retornamos array vacío
                    };
                } catch (error) {
                    console.warn(`Error al acceder al store ${storeName}:`, error);
                    resolve([]); // Si el store no existe, retornamos array vacío
                }
            });
        };

        // Calcular tamaño de damabrava_db
        const db = await openDB('damabrava_db');
        const storeNames = Array.from(db.objectStoreNames);
        console.log('Stores encontrados en damabrava_db:', storeNames);

        for (const storeName of storeNames) {
            const data = await getStoreData(db, storeName);
            totalSize += JSON.stringify(data).length;
        }

        // Calcular tamaño de damabrava_db_img
        const dbImg = await openDB2('damabrava_db_img');
        const storeNamesImg = Array.from(dbImg.objectStoreNames);
        console.log('Stores encontrados en damabrava_db_img:', storeNamesImg);

        for (const storeName of storeNamesImg) {
            const data = await getStoreData(dbImg, storeName);
            totalSize += JSON.stringify(data).length;
        }

        // Calcular tamaño del localStorage usando tu función
        function calcularLocalStorageSize() {
            let totalBytes = 0;
        
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
        
                // Cada carácter en UTF-16 ocupa 2 bytes
                const bytes = (key.length + value.length) * 2;
                totalBytes += bytes;
            }
        
            const totalKB = (totalBytes / 1024).toFixed(2);
        
            console.log(`📦 Tamaño del localStorage: ${totalBytes} bytes (${totalKB} KB)`);
            return { bytes: totalBytes, kilobytes: totalKB };
        }

        // Obtener tamaño del localStorage
        const localStorageSize = calcularLocalStorageSize();
        totalSize += localStorageSize.bytes;

        // Calcular tamaño del cache storage
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    const cache = await caches.open(cacheName);
                    const requests = await cache.keys();
                    for (const request of requests) {
                        const response = await cache.match(request);
                        if (response) {
                            const blob = await response.blob();
                            totalSize += blob.size;
                        }
                    }
                }
            } catch (error) {
                console.warn('Error al calcular tamaño del cache:', error);
            }
        }

        // Convertir a MB con 3 decimales
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
        storageInfo.textContent = `${sizeInMB} MB`;
        return `${sizeInMB} MB`;
    } catch (error) {
        console.error('Error al calcular almacenamiento:', error);
        storageInfo.textContent = '0 MB';
        return '0 MB';
    }
}

async function eventosConfiguraciones() {
    const btnsTheme = document.querySelectorAll('.btn-tema');
    const botonesCancelacion = document.querySelector('.botones-cancelacion');
    const btnLimpiar = document.querySelector('.btn-limpiar');

    // Detector de cambios en el tema del sistema
    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Función para manejar cambios en el tema del sistema
    const handleSystemThemeChange = (e) => {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'system') {
            setTheme('system');
        }
    };

    // Remover listener anterior si existe
    systemThemeQuery.removeEventListener('change', handleSystemThemeChange);
    // Agregar nuevo listener
    systemThemeQuery.addEventListener('change', handleSystemThemeChange);

    btnsTheme.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);

            // Update active state
            document.querySelectorAll('.btn-tema').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Manejar cambios en la opción de botones de cancelación
    if (botonesCancelacion) {
        botonesCancelacion.addEventListener('change', (e) => {
            localStorage.setItem('botonesCancelacion', e.target.checked);
            mostrarNotificacion({
                message: `Botones de cancelación ${e.target.checked ? 'habilitados' : 'deshabilitados'}`,
                type: 'success',
                duration: 3000
            });
        });
    }

    // Manejar limpieza de almacenamiento
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', async () => {
            const contenido = document.querySelector('.anuncio .contenido');
            const relleno = contenido.querySelector('.relleno');

            // Guardar el contenido original
            const contenidoOriginal = relleno.innerHTML;

            // Actualizar el contenido completo
            contenido.innerHTML = `
            <div class="encabezado">
                <h1 class="titulo">Eliminar datos almacenados</h1>
                <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
            </div>    
            <div class="relleno">
                    <p class="normal">Se eliminará del dispositivo</p>
                    <div class="campo-vertical">
                        <span class="valor"><strong><i class='bx bx-data'></i>Registros</strong>Todos los registros guardados</span>
                        <span class="valor"><strong><i class='bx bx-image'></i>Imágenes: </strong>Fotos y documentos guardados</span>
                        <span class="valor"><strong><i class='bx bx-refresh'></i>Actualizaciones: </strong>Historial de actualizaciones</span>
                        <span class="valor"><strong><i class='bx bx-log-in'></i>Sesión: </strong>Datos de inicio de sesión</span>
                        <span class="valor"><strong><i class='bx bx-cog'></i>Configuraciones: </strong>Preferencias guardadas</span>
                    </div>
                    <div class="info-sistema">
                        <i class='bx bx-info-circle'></i>
                        <div class="detalle-info">
                            <p>Esta acción no se puede deshacer, asegúrate de que deseas continuar.</p>
                        </div>
                    </div>
                    <div class="busqueda">
                        <div class="acciones-grande" style="width:100%;">
                            <button class="btn-volver btn blue" ><i class='bx bx-arrow-back'></i></i> Volver</button>
                            <button class="btn-confirmar btn red"><i class='bx bx-trash'></i> Eliminar datos</button>
                        </div>
                    </div>
                    
                </div>
                <div class="anuncio-botones">
                    <button class="btn-volver btn blue"><i class='bx bx-arrow-back'></i> Volver</button>
                    <button class="btn-confirmar btn red"><i class='bx bx-trash'></i> Eliminar datos</button>
                </div>
            `;
            contenido.style.paddingBottom = "70px"

            // Event listeners para los botones
            const btnVolver = contenido.querySelectorAll('.btn-volver');
            const btnConfirmar = contenido.querySelectorAll('.btn-confirmar');


            btnVolver.forEach(btn => {
                btn.addEventListener('click', () => {
                    mostrarConfiguraciones();
                });
            });

            btnConfirmar.forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        const signal = await mostrarProgreso('.pro-data')

                        // Primero limpiar localStorage
                        localStorage.clear();

                        // Luego eliminar las bases de datos
                        await new Promise((resolve, reject) => {
                            const request = indexedDB.deleteDatabase('damabrava_db');
                            request.onerror = () => reject(request.error);
                            request.onsuccess = () => resolve();
                        });

                        await new Promise((resolve, reject) => {
                            const request = indexedDB.deleteDatabase('damabrava_db_img');
                            request.onerror = () => reject(request.error);
                            request.onsuccess = () => resolve();
                        });

                        // Limpiar service workers
                        if ('serviceWorker' in navigator) {
                            const registrations = await navigator.serviceWorker.getRegistrations();
                            for (const registration of registrations) {
                                await registration.unregister();
                            }
                        }

                        // Actualizar la vista
                        mostrarConfiguraciones();

                        mostrarNotificacion({
                            message: 'Datos eliminados correctamente',
                            type: 'success',
                            duration: 3500
                        });

                        // Recargar la página después de un breve delay

                        try {
                            const response = await fetch('/cerrar-sesion', { method: 'POST' });
                            if (response.ok) {
                                limpiarProteccionNavegacion();
                                window.location.href = '/';
                            }
                        } catch (error) {
                            console.error('Error al cerrar sesión:', error);
                            mostrarNotificacion({
                                message: 'Error al cerrar sesión',
                                type: 'error',
                                duration: 3500
                            });
                        }
                    } catch (error) {
                        if (error.message === 'cancelled') {
                            console.log('Operación cancelada por el usuario');
                            return;
                        }
                        console.error('Error al eliminar datos:', error);
                        mostrarNotificacion({
                            message: 'Error al eliminar los datos',
                            type: 'error',
                            duration: 3500
                        });
                    } finally {
                        ocultarProgreso('.pro-data')
                    }
                });
            });
        });
    }
}


function setTheme(theme) {
    const root = document.documentElement;
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        root.setAttribute('data-theme', theme);
    }
}
