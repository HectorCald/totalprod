/* ==================== COMPONENTES ==================== */
import { crearNotificacion, mostrarNotificacion } from './modules/componentes/componentes.js'
import { mostrarAnuncio, ocultarAnuncio, configuracionesEntrada, mostrarAnuncioSecond,mostrarAnuncioTercer, cerrarAnuncioManual } from './modules/componentes/componentes.js'
import { mostrarCarga, ocultarCarga, inicializarDashboard } from './modules/componentes/componentes.js'

window.cerrarAnuncioManual = cerrarAnuncioManual
window.crearNotificacion = crearNotificacion
window.mostrarNotificacion = mostrarNotificacion


window.ocultarAnuncio = ocultarAnuncio
window.mostrarAnuncio = mostrarAnuncio

window.mostrarCarga = mostrarCarga
window.ocultarCarga = ocultarCarga

/* ==================== FUNCITION DEL LOGIN ==================== */
function iniciarSesion() {
    const loginButton = document.getElementById('loginButton');

    if (loginButton) {
        loginButton.addEventListener('click', async () => {
            const email = document.querySelector('.email').value;
            const password = document.querySelector('.password').value;
            const rememberMe = document.querySelector('.checkbox input').checked;

            // Basic validation
            if (!email || !password) {
                mostrarNotificacion({
                    message: 'Por favor, complete todos los campos',
                    type: 'warning',
                    duration: 3500
                });
                return;
            }

            // Remove any spaces from email/username
            const cleanEmail = email.trim();

            try {
                mostrarCarga();
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: cleanEmail,
                        password
                    })
                });

                if (!response.ok) {
                    throw new Error('Error en la conexión');
                }

                const data = await response.json();

                if (data.success) {
                    ocultarCarga();
                    
                    if (rememberMe) {
                        localStorage.setItem('credentials', JSON.stringify({
                            email: cleanEmail,
                            password
                        }));
                    } else {
                        localStorage.removeItem('credentials');
                    }

                    mostrarNotificacion({
                        message: '¡Inicio de sesión exitoso!',
                        type: 'success',
                        duration: 2000
                    });

                    setTimeout(() => {
                        inicializarDashboard();
                        window.location.href = data.redirect;
                    }, 1000);
                } else {
                    // Verificar si es un mensaje de cuenta en proceso
                    if (data.status === 'pending') {
                        mostrarNotificacion({
                            message: data.error,
                            type: 'info',  // Cambiamos el tipo a info
                            duration: 5000  // Aumentamos la duración para este tipo de mensaje
                        });
                        ocultarCarga();
                    } else {

                        mostrarNotificacion({
                            message: data.error || 'Credenciales incorrectas',
                            type: 'error',
                            duration: 4000
                        });
                        ocultarCarga();
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion({
                    message: 'Error de conexión con el servidor',
                    type: 'error',
                    duration: 4000
                });
                ocultarCarga();
            }
        });

        // Add enter key support for login
        document.querySelectorAll('.email, .password').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    loginButton.click();
                }
            });
        });
    }
}
/* ==================== INICIALIZACIÓN DE LA APP ==================== */
function inicializarApp() {
    const registerLink = document.querySelector('.sin-cuenta span');
    const forgotPasswordLink = document.querySelector('.olvido');
    const moreInfoLink = document.querySelector('.registro.mas-info');

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            crearFormularioContraseña();
        });
    }
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            crearFormularioRegistro();
        });
    }

    if (moreInfoLink) {
        moreInfoLink.addEventListener('click', (e) => {
            e.preventDefault();
            crearFormularioInfo();
        });
    }

        const inputs = document.querySelectorAll('.entrada .input input');
    
        // Limpiar input de email
        const clearInputButton = document.querySelector('.clear-input');
        if (clearInputButton) {
            clearInputButton.addEventListener('click', (e) => {
                e.preventDefault();
                const emailInput = document.querySelector('.email');
                const label = emailInput.previousElementSibling;
                emailInput.value = '';
    
                // Forzar la actualización del label
                label.style.top = '50%';
                label.style.fontSize = 'var(--text-subtitulo)';
                label.style.color = 'var(--cero-color)';
                label.style.fontWeight = '400';
    
                // Disparar evento blur manualmente
                const blurEvent = new Event('blur');
                emailInput.dispatchEvent(blurEvent);
    
                // Disparar evento focus manualmente
                emailInput.focus();
                const focusEvent = new Event('focus');
                emailInput.dispatchEvent(focusEvent);
            });
        }
    
        // Mostrar/ocultar contraseña para el formulario de inicio de sesión
        document.querySelectorAll('.toggle-password').forEach(toggleButton => {
            toggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                const passwordInput = toggleButton.parentElement.querySelector('input[type="password"], input[type="text"]');
                const icon = toggleButton.querySelector('i');
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    
        const savedCredentials = JSON.parse(localStorage.getItem('credentials'));
        if (savedCredentials) {
            document.querySelector('.email').value = savedCredentials.email;
            document.querySelector('.password').value = savedCredentials.password;
        }
    
        inputs.forEach(input => {
            const label = input.previousElementSibling;
    
            // Verificar el estado inicial
            if (input.value.trim() !== '') {
                label.style.transform = 'translateY(-75%) scale(0.85)';
                label.style.color = 'var(--cuarto-color)';
                label.style.fontWeight = '600';
            }
    
            input.addEventListener('focus', () => {
                label.style.transform = 'translateY(-75%) scale(0.85)';
                label.style.color = 'var(--cuarto-color)';
                label.style.fontWeight = '600';
            });
    
            input.addEventListener('blur', () => {
                if (!input.value.trim()) {
                    label.style.transform = 'translateY(-50%)';
                    label.style.color = 'gray';
                    label.style.fontWeight = '400';
                }
            });
            // Para los select, también manejar el evento de cambio
            if (input.tagName.toLowerCase() === 'select') {
                input.addEventListener('change', () => {
                    if (input.value.trim()) {
                        label.style.transform = 'translateY(-75%) scale(0.85)';
                        label.style.color = 'var(--cuarto-color)';
                        label.style.fontWeight = '600';
                        label.style.zIndex = '5';
                    } else {
                        label.style.transform = 'translateY(-50%)';
                        label.style.color = 'gray';
                        label.style.fontWeight = '400';
                    }
                });
            }
        });


    iniciarSesion();
    crearNotificacion();
}

/* ==================== FORMULARIO DE REGISTRO ==================== */
function mostrarPaso1() {
    const contenido = document.querySelector('.anuncio .contenido');
    const paso1HTML = `
        <div class="encabezado">
            <h1 class="titulo">Crear cuenta - Paso 1</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Ingresa tu información personal</p>
            <div class="entrada">
                <i class='bx bx-user'></i>
                <div class="input">
                    <p class="detalle">Nombre</p>
                    <input class="nombre" type="text" placeholder=" " required>
                </div>
            </div>
            <div class="entrada">
                <i class='bx bx-user'></i>
                <div class="input">
                    <p class="detalle">Apellido</p>
                    <input class="apellido" type="text" placeholder=" " required>
                </div>
            </div>
            <div class="entrada">
                <i class='bx bx-phone'></i>
                <div class="input">
                    <p class="detalle">Teléfono</p>
                    <input class="telefono" type="tel" placeholder=" " required>
                </div>
            </div>
        </div>
        <div class="anuncio-botones">
            <button id="next-step" class="btn orange"><i class="bx bx-right-arrow-alt"></i> Siguiente</button>
        </div>
    `;

    contenido.innerHTML = paso1HTML;
    contenido.style.paddingBottom = '80px';
    mostrarAnuncio();
    configuracionesEntrada();
    setupPaso1();
}

function setupPaso1() {
    const nextButton = document.getElementById('next-step');
    const nombreInput = document.querySelector('.nombre');
    const apellidoInput = document.querySelector('.apellido');
    const telefonoInput = document.querySelector('.telefono');

    nextButton.addEventListener('click', () => {
        const nombre = nombreInput.value.trim();
        const apellido = apellidoInput.value.trim();
        const telefono = telefonoInput.value.trim();

        if (!nombre || !apellido || !telefono) {
            mostrarNotificacion({
                message: 'Por favor, complete todos los campos',
                type: 'warning',
                duration: 3500
            });
            return;
        }

        // Validar teléfono (8 dígitos para Bolivia)
        if (!/^[67]\d{7}$/.test(telefono)) {
            mostrarNotificacion({
                message: 'Ingrese un número válido de 8 dígitos (ej: 67644705)',
                type: 'warning',
                duration: 4000
            });
            return;
        }

        // Guardar datos temporalmente
        sessionStorage.setItem('registro_nombre', nombre);
        sessionStorage.setItem('registro_apellido', apellido);
        sessionStorage.setItem('registro_telefono', telefono);

        // Mostrar siguiente paso
        mostrarPaso2();
    });
}

function mostrarPaso2() {
    const contenido = document.querySelector('.anuncio-second .contenido');
    const paso2HTML = `
        <div class="encabezado">
            <h1 class="titulo">Crear cuenta - Paso 2</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond');"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Configura tu aplicación</p>
            <div class="entrada">
                <i class='bx bx-category'></i>
                <div class="input">
                    <p class="detalle">Tipo de aplicación</p>
                    <select class="tipo-app" required>
                        <option value=""></option>
                        <option value="ventas">Ventas</option>
                        <option value="personalizado">ID Personalizado</option>
                    </select>
                </div>
            </div>
            <div class="entrada empresa-container" style="display: none;">
                <i class='bx bx-building'></i>
                <div class="input">
                    <p class="detalle">ID de la Empresa</p>
                    <input class="empresa" type="number" inputmode="numeric" pattern="[0-9]*" placeholder=" " required>
                </div>
            </div>
        </div>
        <div class="anuncio-botones">
            <button id="next-step2" class="btn orange"><i class="bx bx-right-arrow-alt"></i> Siguiente</button>
        </div>
    `;

    contenido.innerHTML = paso2HTML;
    contenido.style.paddingBottom = '80px';
    mostrarAnuncioSecond();
    configuracionesEntrada();
    setupPaso2();
}

async function setupPaso2() {
    const nextButton = document.getElementById('next-step2');
    const tipoAppSelect = document.querySelector('.tipo-app');
    const empresaContainer = document.querySelector('.empresa-container');
    const empresaInput = document.querySelector('.empresa');

    tipoAppSelect.addEventListener('change', (e) => {
        if (e.target.value === 'personalizado') {
            empresaContainer.style.display = 'flex';
            empresaInput.required = true;
        } else {
            empresaContainer.style.display = 'none';
            empresaInput.required = false;
            empresaInput.value = '';
        }
    });

    nextButton.addEventListener('click', async () => {
        const tipoApp = tipoAppSelect.value;
        const empresa = empresaInput?.value;

        if (!tipoApp) {
            mostrarNotificacion({
                message: 'Por favor, seleccione el tipo de aplicación',
                type: 'warning',
                duration: 3500
            });
            return;
        }

        if (tipoApp === 'personalizado') {
            if (!empresa) {
                mostrarNotificacion({
                    message: 'Por favor, ingrese el ID de la empresa',
                    type: 'warning',
                    duration: 3500
                });
                return;
            }

            // Check if the company ID exists
            try {
                mostrarCarga();
                const response = await fetch('/check-company-id', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ empresaId: empresa })
                });

                const data = await response.json();
                if (!data.exists) {
                    mostrarNotificacion({
                        message: 'El ID de la empresa no existe',
                        type: 'warning',
                        duration: 3500
                    });
                    ocultarCarga();
                    return;
                }
            } catch (error) {
                console.error('Error al verificar ID de empresa:', error);
                mostrarNotificacion({
                    message: 'Error al verificar el ID de empresa',
                    type: 'error',
                    duration: 4000
                });
                ocultarCarga();
                return;
            } finally {
                ocultarCarga();
            }
        }

        // Save data temporarily
        sessionStorage.setItem('registro_tipo_app', tipoApp);
        if (empresa) sessionStorage.setItem('registro_empresa', empresa);

        // Show next step
        mostrarPaso3();
    });
}

function mostrarPaso3() {
    const contenido = document.querySelector('.anuncio-tercer .contenido');
    const paso3HTML = `
        <div class="encabezado">
            <h1 class="titulo">Crear cuenta - Paso 3</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioTercer');"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Configura tus credenciales</p>
            <div class="entrada">
                <i class='bx bx-envelope'></i>
                <div class="input">
                    <p class="detalle">Correo Electrónico</p>
                    <input class="email-registro" type="email" placeholder=" " required>
                </div>
            </div>
            <div class="entrada">
                <i class='bx bx-lock'></i>
                <div class="input">
                    <p class="detalle">Contraseña</p>
                    <input class="password-registro" type="password" placeholder=" " required>
                    <button class="toggle-password-nuevo"><i class="fas fa-eye"></i></button>
                </div>
            </div>
            <div class="password-requirements campo-vertical">
                <p>Requisitos de contraseña:</p>
                <p class="requirement invalid item">
                    <i class="fas fa-times"></i>
                    Mínimo 8 caracteres
                </p>
                <p class="requirement invalid item">
                    <i class="fas fa-times"></i>
                    Debe contener letras
                </p>
                <p class="requirement invalid item">
                    <i class="fas fa-times"></i>
                    Debe contener números
                </p>
            </div>
        </div>
        <div class="anuncio-botones">
            <button id="register-button" class="btn orange"><i class="bx bx-user-plus"></i> Registrarme</button>
        </div>
    `;

    contenido.innerHTML = paso3HTML;
    contenido.style.paddingBottom = '80px';
    mostrarAnuncioTercer();
    configuracionesEntrada();
    setupPaso3();
}

function setupPaso3() {
    const emailInput = document.querySelector('.email-registro');
    const passwordInput = document.querySelector('.password-registro');
    const registerButton = document.getElementById('register-button');

    // Password validation
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const requirements = {
            length: password.length >= 8,
            letters: /[a-zA-Z]/.test(password),
            numbers: /[0-9]/.test(password)
        };

        document.querySelectorAll('.requirement').forEach((elem, index) => {
            const isValid = Object.values(requirements)[index];
            elem.className = `requirement ${isValid ? 'valid' : 'invalid'} item`;
            elem.querySelector('i').className = `fas ${isValid ? 'fa-check' : 'fa-times'}`;
        });
    });

    // Toggle password visibility
    document.querySelectorAll('.toggle-password-nuevo').forEach(toggleButton => {
        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            const passwordInput = toggleButton.parentElement.querySelector('input[type="password"], input[type="text"]');
            const icon = toggleButton.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Final registration
    registerButton.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validations
        if (!email || !password) {
            mostrarNotificacion({
                message: 'Por favor, complete todos los campos',
                type: 'warning',
                duration: 3500
            });
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            mostrarNotificacion({
                message: 'Por favor, ingrese un correo válido',
                type: 'warning',
                duration: 3500
            });
            return;
        }

        // Password requirements validation
        const passwordRequirements = {
            length: password.length >= 8,
            letters: /[a-zA-Z]/.test(password),
            numbers: /[0-9]/.test(password)
        };

        if (!Object.values(passwordRequirements).every(Boolean)) {
            mostrarNotificacion({
                message: 'La contraseña debe cumplir con todos los requisitos',
                type: 'warning',
                duration: 4000
            });
            return;
        }

        try {
            mostrarCarga();

            // Check if email is unique
            const checkEmailResponse = await fetch('/check-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const emailData = await checkEmailResponse.json();
            if (emailData.exists) {
                mostrarNotificacion({
                    message: 'Este email ya esta registrado.',
                    type: 'warning',
                    duration: 3500
                });
                ocultarCarga();
                return;
            }

            // Proceed with registration if email is unique
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: `${sessionStorage.getItem('registro_nombre')} ${sessionStorage.getItem('registro_apellido')}`.trim(),
                    telefono: sessionStorage.getItem('registro_telefono'),
                    email: email,
                    password: password,
                    tipoApp: sessionStorage.getItem('registro_tipo_app'),
                    empresa: sessionStorage.getItem('registro_empresa') || null
                })
            });

            const data = await response.json();
            
            if (data.success) {
                mostrarNotificacion({
                    message: '¡Registro exitoso!',
                    type: 'success',
                    duration: 4000
                });
                
                // Clear temporary data
                sessionStorage.removeItem('registro_nombre');
                sessionStorage.removeItem('registro_apellido');
                sessionStorage.removeItem('registro_telefono');
                sessionStorage.removeItem('registro_tipo_app');
                sessionStorage.removeItem('registro_empresa');
                
                setTimeout(() => {
                    window.location.href = data.redirect || '/';
                }, 2000);
            } else {
                throw new Error(data.error || 'Error en el registro');
            }
        } catch (error) {
            mostrarNotificacion({
                message: error.message || 'Error al registrar usuario',
                type: 'error',
                duration: 4000
            });
        } finally {
            ocultarCarga();
        }
    });
}


function crearFormularioRegistro() {
    mostrarPaso1();
}


/* ==================== FORMULARIO DE OLVIDO DE CONTRASEÑA ==================== */
function crearFormularioContraseña() {
    const anuncio = document.querySelector('.anuncio .contenido');
    const forgotPasswordHTML = `
        <div class="encabezado">
            <h1 class="titulo">Recuperación de contraseña</h1>
            <button class="btn close" onclick="ocultarAnuncio();"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Ingresa tu correo electrónico</p>
            <div class="entrada">
                <i class='bx bx-envelope'></i>
                <div class="input">
                    <p class="detalle">Email</p>
                    <input class="email-recuperacion" type="email" placeholder=" " required>
                </div>
            </div>
        </div>
        <div class="anuncio-botones">
            <button id="send-code-button" class="btn orange"><i class="bx bx-envelope"></i> Enviar Código</button>
        </div>
    `;

    anuncio.innerHTML = forgotPasswordHTML;
    mostrarAnuncio();

    eventosFormularioContraseña();
    configuracionesEntrada();
}
function eventosFormularioContraseña() {
    const sendCodeButton = document.getElementById('send-code-button');
    const inputs = document.querySelectorAll('.entrada .input input');

    inputs.forEach(input => {
        const label = input.previousElementSibling;

        // Verificar el estado inicial
        if (input.value.trim() !== '') {
            label.style.transform = 'translateY(-100%) scale(0.85)';
            label.style.color = 'var(--tercer-color)';
            label.style.fontWeight = '600';
        }

        input.addEventListener('focus', () => {
            label.style.transform = 'translateY(-100%) scale(0.85)';
            label.style.color = 'var(--tercer-color)';
            label.style.fontWeight = '600';
        });

        input.addEventListener('blur', () => {
            if (!input.value.trim()) {
                label.style.transform = 'translateY(-50%)';
                label.style.color = 'var(--cero-color)';
                label.style.fontWeight = '400';
            }
        });
    });
    sendCodeButton.addEventListener('click', async () => {
        const email = document.querySelector('.email-recuperacion').value;

        try {
            mostrarCarga();
            const response = await fetch('/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (data.success) {
                renderVerificationCodeForm(email);
            } else {
                alert(data.error || 'Error al enviar el código');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al enviar el código');
        } finally {
            ocultarCarga();
        }
    });
}

/* ==================== FORMULARIO DE INGRESO DE CODIGO DE RESETEO ==================== */
function renderVerificationCodeForm(email) {
    const anuncio = document.querySelector('.anuncio');
    const verificationHTML = `
        <div class="contenido">
            <h2>Verificar Código</h2>
            <p class="subtitulo">Ingresa el código enviado a tu correo electrónico</p>
            <div class="entrada">
                <i class='bx bx-check-circle'></i>
                <div class="input">
                    <p class="detalle">Código de Verificación</p>
                    <input class="codigo-verificacion" type="text" placeholder=" " required>
                </div>
            </div>
            <button id="verify-code-button" class="btn orange">Verificar Código</button>
            <button id="cancel-verification" class="btn gray">Cancelar</button>
            <p class="resend">¿No recibiste el código? <span id="resend-code">Reenviar</span></p>
        </div>
    `;

    anuncio.innerHTML = verificationHTML;
    setupVerificationCodeListeners(email);
}
function setupVerificationCodeListeners(email) {
    const verifyButton = document.getElementById('verify-code-button');
    const resendButton = document.getElementById('resend-code');
    const inputs = document.querySelectorAll('.entrada .input input');

    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            const label = input.previousElementSibling;
            label.style.top = '0';
            label.style.fontSize = '12px';
            label.style.color = 'var(--tercer-color)';
            label.style.fontWeight = '600';
        });

        input.addEventListener('blur', () => {
            const label = input.previousElementSibling;
            if (!input.value) {
                label.style.top = '50%';
                label.style.fontSize = 'var(--text-subtitulo)';
                label.style.color = 'var(--cero-color)';
                label.style.fontWeight = '400';
            }
        });
    });

    verifyButton.addEventListener('click', async () => {
        const code = document.querySelector('.codigo-verificacion').value;

        try {
            mostrarCarga();
            const response = await fetch('/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();
            if (data.success) {
                alert('Código verificado correctamente');
                // Here you can redirect to password reset page or show password reset form
                ocultarAnuncio();
            } else {
                alert(data.error || 'Código inválido');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al verificar el código');
        } finally {
            ocultarCarga();
        }
    });

    resendButton.addEventListener('click', async () => {
        try {
            mostrarCarga();
            const response = await fetch('/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (data.success) {
                alert('Código reenviado correctamente');
            } else {
                alert(data.error || 'Error al reenviar el código');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al reenviar el código');
        } finally {
            ocultarCarga();
        }
    });

}


function crearFormularioInfo() {
    const anuncio = document.querySelector('.anuncio .contenido');
    const companyInfoHTML = `
         <div class="encabezado">
            <h1 class="titulo">Información</h1>
            <button class="btn close" onclick="ocultarAnuncio();"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p><i class='bx bx-chevron-right'></i>  Desarrollamos sistemas a medida para optimizar tus procesos.</p>
            <p><i class='bx bx-chevron-right'></i>  Quieres agregar tu empresa a la comunidad de Gestipro?</p>
            <p><i class='bx bx-chevron-right'></i>  Contactanos.</p>
            <button class="btn orange" onclick="window.open('https://wa.me/+59169713972?text=Más%20información%20sobre%20Gestipro%20por%20favor', '_blank')">Contactar por WhatsApp</button>
        </div>
    `;

    anuncio.innerHTML = companyInfoHTML;
    mostrarAnuncio();
}


function verificarTemaInicial() {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
        localStorage.setItem('theme', 'system');
    }
    setTheme(savedTheme || 'system');
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
document.addEventListener('DOMContentLoaded', async () => {
    // Precarga el dashboard
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.prefetch('/dashboard');
        });
    }
    await verificarTemaInicial();
    inicializarApp();
});
