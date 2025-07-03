/* ==================== IMPORTACIONES==================== */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import xlsx from 'xlsx';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import admin from 'firebase-admin';
import fs from 'fs';

/* ==================== CONFIGURACIÓN INICIAL ==================== */
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = 'secret-totalprod-hcco';
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        console.log('[Multer] Verificando archivo:', file.originalname, 'MIME type:', file.mimetype);
        if (file.mimetype.includes('spreadsheet') ||
            file.mimetype.includes('excel') ||
            file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            console.error('[Multer] Formato no soportado:', file.mimetype);
            cb(new Error('Formato no soportado. Solo se permiten archivos PDF, Excel o Google Sheets'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo
    }
});

/* ==================== CONFIGURACIÓN DE GOOGLE SHEETS ==================== */
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'damabrava@producciondb.iam.gserviceaccount.com',
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    },
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
});

/* ==================== CONFIGURACIÓN DE CLOUDINARY ==================== */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'damabrava',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    }
});
const uploadImage = multer({
    storage: cloudinaryStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'));
        }
    }
});

/* ==================== CONFIGURACIÓN DE FIREBASE ==================== */
const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

/* ==================== MIDDLEWARES Y CONFIGURACIÓN DE APP ==================== */
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        // Cabecera para evitar caché
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.json')) {
            if (path.includes('assetlinks.json')) {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
            } else {
                res.setHeader('Content-Type', 'application/manifest+json');
            }
        }
    }
}));
app.use('/.well-known', express.static(join(__dirname, 'public/.well-known')));
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

/* ==================== FUNCIONES DE UTILIDAD ==================== */
function requireAuth(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.redirect('/');
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}
async function enviarNotificacion(token, titulo, mensaje) {
    if (!titulo || !mensaje) {
        console.error('Título o mensaje indefinidos');
        return false;
    }

    try {
        const mensajeNotificacion = {
            token: token,
            // NO ENVIAR 'notification' para evitar notificación push por defecto
            data: {
                title: titulo,
                body: mensaje
            }
        };

        const response = await admin.messaging().send(mensajeNotificacion);
        return true;
    } catch (error) {
        console.error('Error al enviar notificación:', error);
        // Propagar el error para que el código que llama pueda manejarlo
        throw error;
    }
}

/* ==================== RUTAS DE VISTAS ==================== */
app.get('/', (req, res) => {
    const token = req.cookies.token;

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // Determine dashboard URL based on spreadsheet ID from token
            const dashboardUrl = decoded.spreadsheetId === process.env.SPREADSHEET_ID_1
                ? '/dashboard'
                : '/dashboard_otro';
            return res.redirect(dashboardUrl);
        } catch (error) {
            // Token inválido, continuar al login
        }
    }

    res.render('login');
});
app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard')
});
app.get('/dashboard_otro', requireAuth, (req, res) => {
    res.render('dashboard_otro')
});

/* ==================== RUTAS DE API - NOTIFICACIONES ==================== */
app.post('/register-fcm-token', requireAuth, async (req, res) => {
    try {
        const { token } = req.body;
        const { spreadsheetId, email } = req.user; // Ahora sí tendremos acceso a req.user

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token FCM requerido'
            });
        }

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener tokens existentes
        const tokensResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'FCMTokens!A:C' // Agregamos columna C para email
        });

        const tokensExistentes = tokensResponse.data.values || [];

        // Verificar si el token ya existe
        const tokenExistente = tokensExistentes.find(row => row[1] === token);
        if (tokenExistente) {
            return res.json({
                success: true,
                message: 'Token FCM ya registrado'
            });
        }

        // Limpiar tokens antiguos del mismo usuario (si tenemos email)
        if (email) {
            const tokensDelUsuario = tokensExistentes.filter(row => row[2] === email);
            if (tokensDelUsuario.length > 0) {
                // Eliminar tokens antiguos del usuario
                const tokensSinUsuario = tokensExistentes.filter(row => row[2] !== email);

                // Limpiar y reescribir sin los tokens del usuario
                await sheets.spreadsheets.values.clear({
                    spreadsheetId,
                    range: 'FCMTokens!A:C'
                });

                if (tokensSinUsuario.length > 0) {
                    await sheets.spreadsheets.values.append({
                        spreadsheetId,
                        range: 'FCMTokens!A:C',
                        valueInputOption: 'RAW',
                        resource: {
                            values: tokensSinUsuario
                        }
                    });
                }
            }
        }

        // Agregar nuevo token
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'FCMTokens!A:C',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[new Date().toISOString(), token, email || '']]
            }
        });

        // Enviar notificación de prueba
        try {
            const resultado = await enviarNotificacion(
                token,
                'Bienvenido a Damabrava',
                'Las notificaciones se han activado correctamente'
            );

            if (!resultado) {
                console.log('No se pudo enviar notificación de prueba, pero el token se registró');
            }
        } catch (error) {
            console.log('Error al enviar notificación de prueba:', error.message);
            // No fallar el registro si la notificación de prueba falla
        }

        res.json({
            success: true,
            message: 'Token FCM registrado correctamente'
        });

    } catch (error) {
        console.error('Error al registrar token FCM:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar token FCM: ' + error.message
        });
    }
});
app.post('/eliminar-fcm-token', requireAuth, async (req, res) => {
    try {
        const { email } = req.body;
        const { spreadsheetId } = req.user;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email requerido' });
        }
        const sheets = google.sheets({ version: 'v4', auth });
        // Obtener todos los tokens
        const tokensResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'FCMTokens!A:C'
        });
        const tokens = tokensResponse.data.values || [];
        // Filtrar filas que NO son del email
        const tokensFiltrados = tokens.filter(row => row[2] !== email);
        // Limpiar la hoja
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'FCMTokens!A:C'
        });
        // Reescribir solo los que no son del email
        if (tokensFiltrados.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'FCMTokens!A:C',
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: tokensFiltrados }
            });
        }
        res.json({ success: true, message: 'Tokens eliminados correctamente para el email' });
    } catch (error) {
        console.error('Error al eliminar token FCM:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar el token FCM' });
    }
});

/* ==================== RUTAS DE AUTENTICACION ==================== */
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const spreadsheetIds = [
        process.env.SPREADSHEET_ID_1,
        process.env.SPREADSHEET_ID_2
    ];
    try {
        const sheets = google.sheets({ version: 'v4', auth });

        for (const spreadsheetId of spreadsheetIds) {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: spreadsheetId,
                    range: 'Usuarios!A2:I'
                });

                const rows = response.data.values || [];

                const usuario = rows.find(row => {
                    if (row && row.length >= 8) {
                        return row[8] === password && row[7] === email;
                    }
                    return false;
                });

                if (usuario) {
                    if (usuario[3] === 'Activo') {
                        const token = jwt.sign(
                            {
                                email: usuario[7], // Ensure correct email index
                                nombre: usuario[1],
                                spreadsheetId
                            },
                            JWT_SECRET,
                            { expiresIn: '89280h' }
                        );

                        res.cookie('token', token, {
                            httpOnly: true,
                            secure: true,
                            maxAge: 10 * 365 * 24 * 60 * 60 * 1000 // 10 años en milisegundos
                        });

                        // Determine dashboard URL based on spreadsheet ID
                        const dashboardUrl = spreadsheetId === process.env.SPREADSHEET_ID_1 ? '/dashboard' : '/dashboard_otro';

                        return res.json({
                            success: true,
                            redirect: dashboardUrl,
                            user: {
                                nombre: usuario[1],
                                email: usuario[7] // Ensure correct email index
                            }
                        });
                    } else {
                        return res.json({
                            success: false,
                            error: 'Su cuenta está siendo procesada.',
                            status: 'pending'
                        });
                    }
                }
            } catch (sheetError) {
                console.error(`Error accessing spreadsheet ${spreadsheetId}:`, sheetError);
            }
        }

        return res.json({
            success: false,
            error: 'Contraseña o usuario incorrectos'
        });

    } catch (error) {
        console.error('Error en el login:', error);
        return res.status(500).json({
            success: false,
            error: 'Error en el servidor'
        });
    }
});
app.post('/check-email', async (req, res) => {
    const { email } = req.body;

    // List of all spreadsheet IDs
    const spreadsheetIds = [
        process.env.SPREADSHEET_ID_1,
        process.env.SPREADSHEET_ID_2
    ];

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        for (const spreadsheetId of spreadsheetIds) {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: spreadsheetId,
                    range: 'Usuarios!H2:H'
                });

                const emails = response.data.values || [];
                const exists = emails.some(row => row[0]?.toLowerCase() === email.toLowerCase());

                if (exists) {
                    return res.json({ exists: true });
                }
            } catch (sheetError) {
                console.error(`Error accessing spreadsheet ${spreadsheetId}:`, sheetError);
            }
        }

        return res.json({ exists: false });

    } catch (error) {
        console.error('Error al verificar email:', error);
        return res.status(500).json({
            error: 'Error al verificar el email',
            exists: false
        });
    }
});
app.post('/register', async (req, res) => {
    try {
        const { nombre, telefono, email, password, tipoApp, empresa } = req.body;

        // Validate required fields
        if (!nombre || !telefono || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos'
            });
        }

        // Determine spreadsheetId based on empresa
        let spreadsheetId;
        if (tipoApp === 'personalizado' && empresa) {
            // For custom company ID
            const companies = {
                'A3$w9@zK!dPq&7Lx#1Tf': process.env.SPREADSHEET_ID_1,
                '6789': process.env.SPREADSHEET_ID_2
            };
            spreadsheetId = companies[empresa];
        } else {
            // Default to first spreadsheet for regular users
            spreadsheetId = process.env.SPREADSHEET_ID_1;
        }

        if (!spreadsheetId) {
            return res.status(400).json({
                success: false,
                error: 'ID de empresa inválido'
            });
        }

        const sheets = google.sheets({ version: 'v4', auth });

        // Check if email already exists
        const emailCheck = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Usuarios!H2:H' // Email column
        });

        const existingEmails = emailCheck.data.values || [];
        if (existingEmails.some(row => row[0]?.toLowerCase() === email.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'El email ya está registrado'
            });
        }

        // Get last user ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Usuarios!A2:A'
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            Math.max(...rows.map(row => parseInt(row[0].split('-')[1]) || 0)) : 0;
        const newId = `USERTP-${(lastId + 1).toString().padStart(3, '0')}`;

        // Create new user row
        const nuevoUsuario = [
            newId,              // ID
            nombre,            // Nombre
            telefono,          // Teléfono
            'Pendiente',       // Estado
            'Sin rol',         // Rol
            './icons/default-user.png', // Foto
            '',               // Plugins
            email,            // Email
            password          // Contraseña
        ];

        // Add user to spreadsheet
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Usuarios!A2:I',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [nuevoUsuario]
            }
        });

        res.json({
            success: true,
            message: 'Usuario registrado exitosamente',
            redirect: '/'
        });

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar el usuario: ' + error.message
        });
    }
});
app.post('/cerrar-sesion', (req, res) => {
    res.clearCookie('token');
    res.json({ mensaje: 'Sesión cerrada correctamente' });
});
app.post('/check-company-id', async (req, res) => {
    const { empresaId } = req.body;

    // Predefined list of companies and their spreadsheet IDs
    const companies = {
        'A3$w9@zK!dPq&7Lx#1Tf': process.env.SPREADSHEET_ID_1,
        '6789': process.env.SPREADSHEET_ID_2
    };

    // Check if the company ID exists in the predefined list
    const exists = Object.keys(companies).includes(empresaId);

    return res.json({ exists });
});

/* ==================== RUTAS DE HISTORIAL ==================== */
app.get('/obtener-mis-notificaciones', requireAuth, async (req, res) => {
    const { spreadsheetId, email, rol } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Historial!A2:E'
        });

        const rows = response.data.values || [];

        // Mapear todas las notificaciones
        const notificaciones = rows
            .map(row => ({
                id: row[0] || '',
                fecha: row[1] || '',
                destino: row[2] || '',
                suceso: row[3] || '',
                detalle: row[4] || ''
            }))
            .reverse(); // Más recientes primero

        res.json({
            success: true,
            notificaciones
        });

    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las notificaciones'
        });
    }
});
app.post('/registrar-notificacion', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId, email: senderEmail } = req.user;
        const { destino, suceso, detalle } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener último ID para generar el nuevo
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Historial!A2:A'
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            Math.max(...rows.map(row => parseInt(row[0].split('-')[1]) || 0)) : 0;
        const newId = `HI-${(lastId + 1).toString().padStart(3, '0')}`;

        // Fecha actual en formato dd/mm/yyyy
        const fecha = new Date().toLocaleString('es-ES', {
            timeZone: 'America/La_Paz',
            hour: '2-digit',
            minute: '2-digit',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });

        // Crear nuevo registro
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Historial!A2:E',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[
                    newId,       // ID
                    fecha,       // FECHA
                    destino,     // DESTINO
                    suceso,      // SUCESO
                    detalle      // DETALLE
                ]]
            }
        });

        // ENVIAR NOTIFICACIÓN PUSH SEGÚN EL DESTINO
        try {
            // Obtener todos los usuarios y sus tokens
            const usuariosResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'Usuarios!A2:H' // ID, NOMBRE, TELEFONO, ESTADO, ROL, FOTO, PLUGINS, EMAIL
            });

            const tokensResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'FCMTokens!A:C' // FECHA, TOKEN, EMAIL
            });

            const usuarios = usuariosResponse.data.values || [];
            const tokens = tokensResponse.data.values || [];
            let exitosos = 0;
            let destinatarios = [];

            // Determinar destinatarios según el tipo de destino
            if (destino === 'Todos') {
                // Enviar a todos excepto al remitente
                destinatarios = usuarios
                    .filter(user => user[7] !== senderEmail) // Excluir al remitente
                    .map(user => user[7]); // Solo emails
            } else if (destino.includes('@')) {
                // Es un email específico
                destinatarios = [destino];
            } else {
                // Es un rol (ej: "Almacen", "Administración", etc.)
                destinatarios = usuarios
                    .filter(user => user[4] === destino) // Filtrar por rol
                    .map(user => user[7]); // Solo emails
            }

            // Enviar notificación solo a los destinatarios
            for (const emailDestinatario of destinatarios) {
                // Buscar tokens del destinatario
                const tokensDestinatario = tokens.filter(token => token[2] === emailDestinatario);

                for (const token of tokensDestinatario) {
                    try {
                        await enviarNotificacion(
                            token[1], // El token FCM
                            suceso,   // Título de la notificación
                            detalle   // Mensaje de la notificación
                        );
                        exitosos++;
                    } catch (error) {
                        console.error(`Error al enviar notificación a ${emailDestinatario}:`, error.message);
                    }
                }
            }

            console.log(`✅ Notificaciones push enviadas: ${exitosos} exitosas a ${destinatarios.length} destinatarios`);

        } catch (pushError) {
            console.error('❌ Error al enviar notificaciones push:', pushError);
        }

        res.json({
            success: true,
            message: 'Notificación registrada correctamente'
        });

    } catch (error) {
        console.error('Error al registrar notificación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar la notificación'
        });
    }
});

/* ==================== OBTENER USARIO ACTUAL Y ACTULIZAR USARIO ACTUAL ==================== */
app.get('/obtener-usuario-actual', requireAuth, async (req, res) => {
    const { email, spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Usuarios!A2:J'  // Make sure we're getting all columns including the photo
        });

        const rows = response.data.values || [];
        const usuario = rows.find(row => row[7] === email); // Asegúrate de que el índice del email sea correcto

        if (usuario) {
            // Ensure all fields are properly handled
            const userInfo = {
                id: usuario[0] || '',
                nombre: usuario[1] || '',
                telefono: usuario[2] || '',
                estado: usuario[3] || '',
                rol: usuario[4] || '',
                foto: usuario[5] || './icons/icon.png',
                plugins: usuario[6] || '',
                email: usuario[7] || '',
                permisos: usuario[9] || '',
            };

            res.json({
                success: true,
                usuario: userInfo
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
    } catch (error) {
        console.error('Error al obtener información del usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos del usuario'
        });
    }
});
app.post('/actualizar-usuario', requireAuth, async (req, res) => {
    const { email, spreadsheetId } = req.user;
    const { nombre, apellido, passwordActual, passwordNueva, foto, telefono } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener fila actual
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Usuarios!A2:I',
        });

        const rows = response.data.values || [];
        const userRow = rows.find(row => row[7] === email); // Email está en columna F (índice 5)

        if (!userRow) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        // Validar contraseña actual si se está cambiando
        if (passwordNueva) {
            if (passwordActual !== userRow[0]) {
                return res.status(400).json({
                    success: false,
                    error: 'Contraseña actual incorrecta'
                });
            }

            if (passwordNueva.length < 8) {
                return res.status(400).json({
                    success: false,
                    error: 'La nueva contraseña debe tener al menos 8 caracteres'
                });
            }
        }

        // Actualizar datos
        const updateData = [
            userRow[0], // Columna A: Mantener ID
            `${nombre} ${apellido}`.trim(), // Columna B: Nombre completo
            telefono,
            userRow[3], // Columna D: Mantener estado
            userRow[4], // Columna C: Mantener rol
            foto || userRow[5], // Columna G: Foto
            userRow[6], // Columna E: Mantener plugins
            email, // Columna F: Email
            passwordNueva || userRow[8], // Columna A: Contraseña
        ];

        const rowIndex = rows.findIndex(row => row[7] === email) + 2; // +2 porque la hoja empieza en fila 2

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Usuarios!A${rowIndex}:I${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [updateData] }
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});
app.get('/obtener-usuarios-produccion', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Usuarios!A2:F' // Get all relevant user columns
        });

        const rows = response.data.values || [];

        // Filter users with "Producción" role and map to desired format
        const usuarios = rows
            .filter(row => row[2] === 'Producción') // Column C contains the role
            .map(row => ({
                id: row[0] || '',        // Password/ID
                nombre: row[1] || '',     // Name
                rol: row[2] || '',        // Role
                estado: row[3] || '',     // Status
                plugins: row[4] || '',    // Plugins
                email: row[5] || ''       // Email
            }));

        res.json({
            success: true,
            usuarios
        });

    } catch (error) {
        console.error('Error al obtener usuarios de producción:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los usuarios de producción'
        });
    }
});
app.get('/obtener-nombres-usuarios', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Usuarios!A2:H' // Solo ID y NOMBRE
        });

        const rows = response.data.values || [];
        const nombres = rows.map(row => ({
            id: row[0] || '',
            nombre: row[1] || '',
            rol: row[4] || '',
            user: row[7] || ''
        }));

        res.json({
            success: true,
            nombres
        });

    } catch (error) {
        console.error('Error al obtener nombres:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los nombres'
        });
    }
});

/* ==================== RUTAS DE PRODUCCIÓN ==================== */
app.get('/obtener-registros-produccion', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Produccion!A2:O' // Columnas desde A hasta N (14 columnas)
        });

        const rows = response.data.values || [];

        // Mapear los datos a un formato más legible
        const registros = rows.map(row => ({
            id: row[0] || '',
            fecha: row[1] || '',
            idProducto: row[2] || '',
            producto: row[3] || '',
            lote: row[4] || '',
            gramos: row[5] || '',
            proceso: row[6] || '',
            microondas: row[7] || '',
            envases_terminados: row[8] || '',
            fecha_vencimiento: row[9] || '',
            nombre: row[10] || '',
            user: row[11] || '',
            c_real: row[12] || '',
            fecha_verificacion: row[13] || '',
            observaciones: row[14] || '',
            pagado: row[15] || '',
        }));

        res.json({
            success: true,
            registros
        });

    } catch (error) {
        console.error('Error al obtener registros de producción:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los registros de producción'
        });
    }
});
app.post('/registrar-produccion', requireAuth, async (req, res) => {
    const { spreadsheetId, email, nombre } = req.user;
    const { producto, idProducto, lote, gramos, proceso, microondas, tiempo, envasados, vencimiento } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Validate required fields
        if (!producto || !lote || !gramos || !proceso || !envasados || !vencimiento) {
            console.log('Error: Campos requeridos faltantes');
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos'
            });
        }

        const lastIdResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Produccion!A2:A'
        }).catch(error => {
            console.error('Error al obtener último ID:', error);
            throw new Error('Error al acceder a la hoja de cálculo');
        });

        const lastId = lastIdResponse.data.values ?
            Math.max(...lastIdResponse.data.values.map(row => parseInt(row[0].split('-')[1]) || 0)) : 0;
        const newId = `RP-${(lastId + 1).toString().padStart(3, '0')}`;

        const currentDate = new Date().toLocaleDateString('es-ES');
        const microondasValue = microondas === 'Si' ? tiempo : 'No';

        const newRow = [
            newId,              // ID
            currentDate,        // FECHA
            idProducto,                 // ID
            producto,           // PRODUCTO
            lote,              // LOTE
            gramos,            // GR.
            proceso,           // PROCESO
            microondasValue,   // MICR.
            envasados,         // ENVS. TERM.
            vencimiento,       // FECHA VENC.
            nombre,            // NOMBRE
            email              // USER
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Produccion!A:L',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [newRow]
            }
        }).catch(error => {
            console.error('Error al insertar datos:', error);
            throw new Error('Error al insertar datos en la hoja de cálculo');
        });

        res.json({
            success: true,
            message: 'Producción registrada correctamente',
            data: {
                id: newId,
                fecha: currentDate
            }
        });

    } catch (error) {
        console.error('Error detallado al registrar producción:', {
            error: error.message,
            stack: error.stack,
            spreadsheetId,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({
            success: false,
            error: 'Error al registrar la producción: ' + error.message
        });
    }
});
app.get('/obtener-mis-registros-produccion', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const userEmail = req.user.email;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Produccion!A2:O'
        });

        const rows = response.data.values || [];

        // Filtrar solo los registros del usuario actual
        const misRegistros = rows
            .filter(row => row[11] === userEmail) // La columna C (índice 2) contiene el email del usuario
            .map(row => ({
                id: row[0] || '',
                fecha: row[1] || '',
                idProducto: row[2] || '',
                producto: row[3] || '',
                lote: row[4] || '',
                gramos: row[5] || '',
                proceso: row[6] || '',
                microondas: row[7] || '',
                envases_terminados: row[8] || '',
                fecha_vencimiento: row[9] || '',
                nombre: row[10] || '',
                user: row[11] || '',
                c_real: row[12] || '',
                fecha_verificacion: row[13] || '',
                observaciones: row[14] || '',
                pagado: row[15] || '',
            }));

        res.json({
            success: true,
            registros: misRegistros
        });

    } catch (error) {
        console.error('Error al obtener registros:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los registros'
        });
    }
});
app.get('/obtener-productos-form', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Almacen general!A2:E' // Ahora incluye la columna L para la imagen
        });

        const rows = response.data.values || [];

        // Mapear los datos al formato especificado
        const productos = rows.map(row => ({
            id: row[0] || '',
            producto: row[1] || '',
            gramos: row[2] || '',
            stock: row[3] || '',
            cantidadxgrupo: row[4] || '',
        }));

        res.json({
            success: true,
            productos
        });

    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los productos'
        });
    }
});

/* ==================== RUTAS DE AlMACEN ==================== */
app.delete('/eliminar-registro-produccion/:id', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { id } = req.params;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los registros
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Produccion!A2:O'
        });

        const rows = response.data.values || [];
        // Buscar el índice exacto del registro por su ID completo
        const rowIndex = rows.findIndex(row => row[0] && row[0].toString() === id.toString());

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        // Obtener el ID de la hoja
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const produccionSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Produccion'
        );

        if (!produccionSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de Producción no encontrada'
            });
        }

        // Eliminar la fila
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: produccionSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 por el encabezado
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Registro eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar registro:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el registro'
        });
    }
});
app.put('/editar-registro-produccion/:id', requireAuth, async (req, res) => {

    const { spreadsheetId } = req.user;
    const { id } = req.params;
    const { idPro, producto, gramos, lote, proceso, microondas, envases_terminados, fecha_vencimiento } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los registros
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Produccion!A2:O'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] && row[0].toString() === id.toString());

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        // Mantener los valores existentes que no se actualizan
        const existingRow = rows[rowIndex];
        const updatedRow = [
            id,                             // ID
            existingRow[1],                 // FECHA
            idPro,                      // ID PRODUCTO
            producto,                       // PRODUCTO
            lote,                 // LOTE
            gramos,                         // GRAMOS
            proceso,                        // PROCESO
            microondas,                     // MICROONDAS
            envases_terminados,             // ENVASES TERMINADOS
            fecha_vencimiento,              // FECHA VENCIMIENTO
            existingRow[10],                 // NOMBRE
            existingRow[11],
            existingRow[12],                // C_REAL
            existingRow[13],                // FECHA_VERIFICACION
            existingRow[14],                // OBSERVACIONES
        ];

        // Actualizar la fila
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Produccion!A${rowIndex + 2}:O${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [updatedRow]
            }
        });

        res.json({
            success: true,
            message: 'Registro actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar registro:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el registro'
        });
    }
});
app.put('/verificar-registro-produccion/:id', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { id } = req.params;
    const { cantidad_real, observaciones } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Get production record
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Produccion!A2:O'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] && row[0].toString() === id.toString());

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        const registro = rows[rowIndex];
        const idProducto = registro[2];
        const gramos = registro[5];

        // Get product from general warehouse and its acopio ID
        const almacenResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:J'
        });

        const productoAlmacen = almacenResponse.data.values.find(row => row[0] === idProducto);
        if (!productoAlmacen) {
            throw new Error('Producto no encontrado en almacén general');
        }

        const idAcopio = productoAlmacen[9]; // Column J contains Acopio ID

        // Get and update acopio stock
        const acopioResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen acopio!A2:D'
        });

        const productoAcopio = acopioResponse.data.values.find(row => row[0] === idAcopio);
        if (!productoAcopio) {
            throw new Error('Producto no encontrado en acopio');
        }

        // Calculate required amount in kilos using cantidad_real
        const cantidadNecesaria = (parseFloat(cantidad_real) * parseFloat(gramos)) / 1000;

        // Process lots
        const lotesString = productoAcopio[3];
        const lotes = lotesString.split(';').map(l => {
            const [peso, numLote] = l.split('-');
            return { peso: parseFloat(peso), lote: numLote };
        });

        let cantidadRestante = cantidadNecesaria;
        const lotesActualizados = [];

        // Consume from lots
        for (let lote of lotes) {
            if (cantidadRestante <= 0) {
                lotesActualizados.push(`${lote.peso.toFixed(2)}-${lote.lote}`);
                continue;
            }

            if (lote.peso >= cantidadRestante) {
                lote.peso -= cantidadRestante;
                cantidadRestante = 0;
            } else {
                cantidadRestante -= lote.peso;
                lote.peso = 0;
            }

            if (lote.peso > 0) {
                lotesActualizados.push(`${lote.peso.toFixed(2)}-${lote.lote}`);
            }
        }

        if (cantidadRestante > 0) {
            throw new Error('No hay suficiente stock en los lotes de acopio');
        }

        // Update acopio stock
        const acopioRowIndex = acopioResponse.data.values.findIndex(row => row[0] === idAcopio) + 2;
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Almacen acopio!D${acopioRowIndex}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[lotesActualizados.join(';')]]
            }
        });

        // Update production record with verification data
        const currentDate = new Date().toLocaleDateString('es-ES');
        const updatedRow = [
            ...registro.slice(0, 12),    // Keep existing data
            cantidad_real,               // Real quantity
            currentDate,                 // Verification date
            observaciones               // Observations
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Produccion!A${rowIndex + 2}:O${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [updatedRow]
            }
        });

        res.json({
            success: true,
            message: 'Registro verificado y stock actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al verificar registro:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al verificar el registro'
        });
    }
});
app.put('/anular-verificacion-produccion/:id', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { id } = req.params;
    const { motivo } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Get the production record
        const prodResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Produccion!A2:O'
        });

        const rows = prodResponse.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);
        if (rowIndex === -1) {
            throw new Error('Registro no encontrado');
        }

        const registro = rows[rowIndex];
        const idProducto = registro[2];
        const gramos = parseFloat(registro[5]);
        const cantidadVerificada = parseFloat(registro[12]); // c_real column

        // 2. Get product from general warehouse and its acopio ID
        const almacenResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:J'
        });

        const productoAlmacen = almacenResponse.data.values.find(row => row[0] === idProducto);
        if (!productoAlmacen) {
            throw new Error('Producto no encontrado en almacén general');
        }

        const idAcopio = productoAlmacen[9];

        // 3. Get acopio stock
        const acopioResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen acopio!A2:D'
        });

        const productoAcopio = acopioResponse.data.values.find(row => row[0] === idAcopio);
        if (!productoAcopio) {
            throw new Error('Producto no encontrado en acopio');
        }

        // 4. Calculate amount to return to stock (in kilos)
        const cantidadADevolver = (cantidadVerificada * gramos) / 1000;

        // 5. Update acopio stock (add back the amount)
        const lotesActuales = productoAcopio[3].split(';');
        if (lotesActuales.length > 0) {
            const [peso, lote] = lotesActuales[0].split('-');
            const nuevoPeso = (parseFloat(peso) + cantidadADevolver).toFixed(2);
            lotesActuales[0] = `${nuevoPeso}-${lote}`;
        }

        const acopioRowIndex = acopioResponse.data.values.findIndex(row => row[0] === idAcopio) + 2;
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Almacen acopio!D${acopioRowIndex}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[lotesActuales.join(';')]]
            }
        });

        // 6. Update production record (remove verification data)
        const updatedRow = [
            ...registro.slice(0, 12), // Keep original data
            '', // Clear c_real
            '', // Clear fecha_verificacion
            motivo // Add anulación motivo
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Produccion!A${rowIndex + 2}:O${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [updatedRow]
            }
        });

        res.json({
            success: true,
            message: 'Verificación anulada correctamente'
        });

    } catch (error) {
        console.error('Error al anular verificación:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al anular la verificación'
        });
    }
});
app.get('/obtener-productos', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Almacen general!A2:O' // Ahora incluye la columna L para la imagen
        });

        const rows = response.data.values || [];

        // Mapear los datos al formato especificado
        const productos = rows.map(row => ({
            id: row[0] || '',
            producto: row[1] || '',
            gramos: row[2] || '',
            stock: row[3] || '',
            cantidadxgrupo: row[4] || '',
            lista: row[5] || '',
            codigo_barras: row[6] || '',
            precios: row[7] || '',
            etiquetas: row[8] || '',
            acopio_id: row[9] || '',
            alm_acopio_producto: row[10] || '',
            imagen: row[11] || '', // Valor por defecto si no hay imagen
            uSueltas: row[12] || '',
            promocion: row[13] || '',
            precio_promocion: row[14] || '',
        }));

        res.json({
            success: true,
            productos
        });

    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los productos'
        });
    }
});
app.post('/crear-producto', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { producto, gramos, stock, cantidadxgrupo, lista, codigo_barras, precios, etiquetas, acopio_id, alm_acopio_producto } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Validar campos requeridos
        if (!producto || !gramos || !stock || !cantidadxgrupo || !lista) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos obligatorios deben ser completados'
            });
        }

        // Get last ID to generate new one
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:A'
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            Math.max(...rows.map(row => parseInt(row[0].split('-')[1]) || 0)) : 0;
        const newId = `PG-${(lastId + 1).toString().padStart(3, '0')}`;

        const newRow = [
            newId,                  // ID
            producto,               // PRODUCTO
            gramos,                 // GR.
            stock,                  // STOCK
            cantidadxgrupo,         // GRUP
            lista,                  // LISTA
            codigo_barras || 'no definido', // C. BARRAS
            precios,                // PRECIOS
            etiquetas,              // ETIQUETAS
            acopio_id || '',        // ACOPIO ID
            alm_acopio_producto || 'No hay índice seleccionado', // ALM-ACOPIO NOMBRE
            './icons/default-product.png'  // Imagen por defecto
        ];


        // Append the new row at the end
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Almacen general!A2:L',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [newRow] }
        });

        res.json({
            success: true,
            message: 'Producto creado correctamente',
            id: newId,
        });

    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el producto'
        });
    }
});
app.delete('/eliminar-producto/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get spreadsheet info
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const almacenSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Almacen general'
        );

        if (!almacenSheet) {
            throw new Error('Hoja de Almacén general no encontrada');
        }

        // Get current products
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:L'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        }

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: almacenSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 for header row
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({ success: true, message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar el producto' });
    }
});
app.put('/actualizar-producto/:id', requireAuth, uploadImage.single('imagen'), async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const {
            producto, gramos, stock, cantidadxgrupo, lista,
            codigo_barras, etiquetas, precios, uSueltas,
            alm_acopio_id, alm_acopio_producto, motivo
        } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener datos actuales del producto
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:M'
        });

        const productos = response.data.values || [];
        const rowIndex = productos.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        }

        // Manejar la imagen
        let imagenUrl = productos[rowIndex][11]; // Mantener la imagen actual por defecto

        if (req.file) {
            // Si hay una nueva imagen, subir a Cloudinary
            imagenUrl = req.file.path; // Cloudinary ya nos da la URL

            // Si había una imagen anterior y es de Cloudinary, eliminarla
            const oldImageUrl = productos[rowIndex][6];
            if (oldImageUrl && oldImageUrl.includes('cloudinary')) {
                const publicId = oldImageUrl.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
        }

        // Actualizar el producto
        const updatedValues = [
            [
                id,
                producto,
                gramos,
                stock,
                cantidadxgrupo,
                lista,
                codigo_barras,
                precios,
                etiquetas,
                alm_acopio_id || '',
                alm_acopio_producto,
                imagenUrl, // URL de Cloudinary o la imagen anterior
                uSueltas || '0'
            ]
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Almacen general!A${rowIndex + 2}:M${rowIndex + 2}`,
            valueInputOption: 'RAW',
            resource: { values: updatedValues }
        });

        res.json({
            success: true,
            message: 'Producto actualizado correctamente',
            imagenUrl: imagenUrl
        });

    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar el producto'
        });
    }
});
app.post('/actualizar-stock', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;  // Obtener el ID del usuario autenticado
        const { actualizaciones, tipo } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener datos actuales de Almacen general
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,  // Usar el spreadsheetId del usuario
            range: 'Almacen general!A:D'
        });

        const rows = response.data.values || [];
        const updates = [];

        // Procesar cada actualización
        for (const actualizacion of actualizaciones) {
            const rowIndex = rows.findIndex(row => row[0] === actualizacion.id);
            if (rowIndex !== -1) {
                const stockActual = parseInt(rows[rowIndex][3]) || 0;
                const nuevoStock = tipo === 'salida'
                    ? stockActual - actualizacion.cantidad
                    : stockActual + actualizacion.cantidad;

                updates.push({
                    range: `Almacen general!D${rowIndex + 1}`,
                    values: [[nuevoStock.toString()]]
                });
            }
        }

        // Actualizar el stock en la hoja
        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId,  // Usar el spreadsheetId del usuario
                resource: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar stock:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
app.put('/actualizar-observaciones-registro/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { observaciones } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener el registro actual
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Produccion!A2:O'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        // Actualizar solo la columna de observaciones (O)
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Produccion!O${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[observaciones]]
            }
        });

        res.json({
            success: true,
            message: 'Observaciones actualizadas correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar observaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar las observaciones'
        });
    }
});

app.put('/actualizar-promocion/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { promocion, precio_promocion } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener datos actuales del producto
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:O'
        });

        const productos = response.data.values || [];
        const rowIndex = productos.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        }

        // Actualizar solo las columnas de promoción (N y O)
        const promocionValue = promocion || '';
        const precioPromocionValue = precio_promocion || '';

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Almacen general!N${rowIndex + 2}:O${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[promocionValue, precioPromocionValue]]
            }
        });

        res.json({ success: true, message: 'Promoción actualizada correctamente' });
    } catch (error) {
        console.error('Error al actualizar promoción:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar la promoción' });
    }
});

/* ==================== RUTAS DE CONTEOS DE AlMACEN ==================== */
app.post('/registrar-conteo', requireAuth, async (req, res) => {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = req.user.spreadsheetId;

        // Obtener el último ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Conteo!A2:A'
        });

        const rows = response.data.values || [];
        let lastId = 0;

        if (rows.length > 0) {
            const lastRow = rows[rows.length - 1][0];
            lastId = parseInt(lastRow.split('-')[1]) || 0;
        }

        const newId = `CONT-${lastId + 1}`;
        const fecha = new Date().toLocaleString('es-ES', {
            timeZone: 'America/La_Paz' // Puedes cambiar esto según tu país o ciudad
        });
        const { nombre, productos, sistema, fisico, diferencia, observaciones, idProductos } = req.body;

        const values = [[
            newId,
            fecha,
            nombre,
            idProductos,
            productos,
            sistema,
            fisico,
            diferencia,
            observaciones || ''
        ]];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Conteo!A2:I',
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });

        res.json({ success: true, message: 'Conteo registrado correctamente' });
    } catch (error) {
        console.error('Error al registrar conteo:', error);
        res.status(500).json({ success: false, error: 'Error al registrar el conteo' });
    }
});
app.get('/obtener-registros-conteo', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Conteo!A2:I' // Columnas A hasta G
        });

        const rows = response.data.values || [];

        // Mapear los datos a un formato más legible
        const registros = rows.map(row => ({
            id: row[0] || '',
            fecha: row[1] || '',
            nombre: row[2] || '',
            idProductos: row[3] || '',
            productos: row[4] || '',
            sistema: row[5] || '',
            fisico: row[6] || '',
            diferencia: row[7] || '',
            observaciones: row[8] || ''
        }));

        res.json({
            success: true,
            registros
        });

    } catch (error) {
        console.error('Error al obtener registros de conteo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los registros de conteo'
        });
    }
});
app.delete('/eliminar-conteo/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { motivo } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener datos actuales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Conteo!A2:A'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Conteo no encontrado' });
        }

        // Obtener información del sheet
        const almacenSheet = await sheets.spreadsheets.get({
            spreadsheetId,
            ranges: ['Conteo']
        });

        // Eliminar la fila
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: almacenSheet.data.sheets[0].properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 por el encabezado
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({ success: true, message: 'Conteo eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar conteo:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar el conteo' });
    }
});
app.put('/editar-conteo/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { nombre, observaciones, motivo } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener datos actuales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Conteo!A2:I'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Conteo no encontrado' });
        }

        // Actualizar solo el nombre y observaciones
        const updatedRow = [
            id,                     // ID
            rows[rowIndex][1],      // Fecha (mantener)
            nombre,                 // Nombre actualizado
            rows[rowIndex][3],      // ID de productos (mantener)
            rows[rowIndex][4],      // Productos (mantener)
            rows[rowIndex][5],      // Sistema (mantener)
            rows[rowIndex][6],      // Físico (mantener)
            rows[rowIndex][7],      // Diferencia (mantener)
            observaciones           // Observaciones actualizadas
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Conteo!A${rowIndex + 2}:H${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [updatedRow] }
        });

        res.json({ success: true, message: 'Conteo actualizado correctamente' });
    } catch (error) {
        console.error('Error al editar conteo:', error);
        res.status(500).json({ success: false, error: 'Error al editar el conteo' });
    }
});
app.put('/sobreescribir-inventario/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { motivo } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Get the count record
        const conteoResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Conteo!A2:I'
        });

        const registros = conteoResponse.data.values || [];
        const registro = registros.find(row => row[0] === id);

        if (!registro) {
            throw new Error('Registro de conteo no encontrado');
        }

        // 2. Extract product IDs and quantities
        const productIds = registro[3].split(';'); // Column I contains product IDs
        const quantities = registro[6].split(';').map(Number); // Column J contains quantities

        if (productIds.length !== quantities.length) {
            throw new Error('Datos de conteo inconsistentes');
        }

        // 3. Get current inventory
        const almacenResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:E'
        });

        const productos = almacenResponse.data.values || [];

        // 4. Update each product's quantity
        const updates = productIds.map((productId, index) => {
            const productoIndex = productos.findIndex(row => row[0] === productId);
            if (productoIndex === -1) {
                throw new Error(`Producto ${productId} no encontrado en almacén`);
            }

            return {
                range: `Almacen general!D${productoIndex + 2}`,
                values: [[quantities[index].toString()]]
            };
        });

        // 5. Batch update all products
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: {
                valueInputOption: 'RAW',
                data: updates
            }
        });

        // 6. Mark the count record as applied
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Conteo!I${registros.indexOf(registro) + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[motivo]]
            }
        });

        res.json({
            success: true,
            message: 'Inventario actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al sobreescribir inventario:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al sobreescribir el inventario'
        });
    }
});

/* ==================== RUTAS DE MOVIMIENTOS DE AlMACEN ==================== */
app.get('/obtener-movimientos-almacen', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Movimientos alm-gral!A2:P' // Columns A through H
        });

        const rows = response.data.values || [];

        // Map the data to a more readable format
        const movimientos = rows.map(row => ({
            id: row[0] || '',
            fecha_hora: row[1] || '',
            tipo: row[2] || '',
            idProductos: row[3] || '',
            productos: row[4] || '',
            cantidades: row[5] || '',
            operario: row[6] || '',
            cliente_proovedor: row[7] || '',
            nombre_movimiento: row[8] || '',
            subtotal: row[9] || '',
            descuento: row[10] || '',
            aumento: row[11] || '',
            total: row[12] || '',
            observaciones: row[13] || '',
            precios_unitarios: row[14] || '',
            estado: row[15] || ''
        }));

        res.json({
            success: true,
            movimientos
        });

    } catch (error) {
        console.error('Error al obtener movimientos de almacén:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los movimientos de almacén'
        });
    }
});
app.post('/registrar-movimiento', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const movimiento = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get current movements to calculate next ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Movimientos alm-gral!A2:P'  // Actualizado para incluir la nueva columna
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            Math.max(...rows.map(row => parseInt(row[0].split('-')[1]))) : 0;
        const newId = `MAG-${(lastId + 1).toString().padStart(3, '0')}`;

        // Prepare new movement row
        const newMovimiento = [
            newId,                    // ID
            movimiento.fechaHora,     // FECHA-HORA
            movimiento.tipo,          // TIPO
            movimiento.idProductos,   // ID-PRODUCTOS (Nuevo)
            movimiento.productos,     // PRODUCTOS
            movimiento.cantidades,    // CANTIDADES
            movimiento.operario,      // OPERARIO
            movimiento.clienteId,     // CLIENTE/PROOVEDOR
            movimiento.nombre_movimiento, // NOMBRE DEL MOVIMIENTO
            movimiento.subtotal,      // SUBTOTAL
            movimiento.descuento,     // DESCUENTO
            movimiento.aumento,       // AUMENTO
            movimiento.total,         // TOTAL
            movimiento.observaciones, // OBSERVACIONES
            movimiento.precios_unitarios, // PRECIOS-UNITARIOS
            movimiento.estado         // ESTADO (Nuevo)
        ];

        // Add new movement
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Movimientos alm-gral!A2:P',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [newMovimiento]
            }
        });

        res.json({
            success: true,
            message: 'Movimiento registrado correctamente',
            id: newId
        });
    } catch (error) {
        console.error('Error al registrar movimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar el movimiento'
        });
    }
});
app.delete('/eliminar-registro-almacen/:id', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { id } = req.params;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los registros
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Movimientos alm-gral!A2:M'
        });

        const rows = response.data.values || [];
        // Buscar el índice exacto del registro por su ID completo
        const rowIndex = rows.findIndex(row => row[0] && row[0].toString() === id.toString());

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        // Obtener el ID de la hoja
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const produccionSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Movimientos alm-gral'
        );

        if (!produccionSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de Movimeintos no encontrada'
            });
        }

        // Eliminar la fila
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: produccionSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 por el encabezado
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Registro eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar registro:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el registro'
        });
    }
});
app.put('/anular-movimiento/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { motivo } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener el registro a anular
        const responseMovimiento = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Movimientos alm-gral!A2:P'
        });

        const movimientos = responseMovimiento.data.values || [];
        const movimientoIndex = movimientos.findIndex(row => row[0] === id);

        if (movimientoIndex === -1) {
            throw new Error('Registro no encontrado');
        }

        const movimiento = movimientos[movimientoIndex];
        const tipo = movimiento[2];
        const idProductos = movimiento[3].split(';');
        const cantidades = movimiento[5].split(';');

        // Obtener stock actual
        const responseStock = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:D'
        });

        const productos = responseStock.data.values || [];

        // Actualizar stock
        for (let i = 0; i < idProductos.length; i++) {
            const idProducto = idProductos[i];
            const cantidad = parseInt(cantidades[i]);
            const productoIndex = productos.findIndex(row => row[0] === idProducto);

            if (productoIndex !== -1) {
                const stockActual = parseInt(productos[productoIndex][3]);
                const nuevoStock = tipo.toLowerCase() === 'ingreso' ?
                    stockActual - cantidad :
                    stockActual + cantidad;

                // Actualizar stock en la hoja
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `Almacen general!D${productoIndex + 2}`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [[nuevoStock.toString()]]
                    }
                });
            }
        }

        // Actualizar estado del movimiento a "Anulado"
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Movimientos alm-gral!C${movimientoIndex + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [['Anulado']]
            }
        });

        // Agregar el motivo en las observaciones
        const observacionesActuales = movimiento[13] || '';
        const nuevasObservaciones = `${observacionesActuales} [ANULADO: ${motivo}]`;
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Movimientos alm-gral!N${movimientoIndex + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[nuevasObservaciones]]
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error al anular movimiento:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al anular el movimiento'
        });
    }
});

/* ==================== RUTAS ETIQUETAS DE AlMACEN ==================== */
app.get('/obtener-etiquetas', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Etiquetas!A2:B' // Columnas A y B para ID y ETIQUETA
        });

        const rows = response.data.values || [];

        const etiquetas = rows.map(row => ({
            id: row[0] || '',
            etiqueta: row[1] || ''
        }));

        res.json({
            success: true,
            etiquetas
        });

    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las etiquetas'
        });
    }
});
app.post('/agregar-etiqueta', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { etiqueta } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get existing tags to calculate next ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Etiquetas!A2:B'
        });

        const rows = response.data.values || [];
        const nextId = rows.length > 0 ?
            parseInt(rows[rows.length - 1][0].split('-')[1]) + 1 : 1;

        const newTag = [`ET-${nextId.toString().padStart(3, '0')}`, etiqueta];

        // Append the new tag
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Etiquetas!A2:B',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [newTag] }
        });

        res.json({ success: true, id: newTag[0], etiqueta });
    } catch (error) {
        console.error('Error al agregar etiqueta:', error);
        res.status(500).json({ success: false, error: 'Error al agregar etiqueta' });
    }
});
app.delete('/eliminar-etiqueta/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get current tags
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Etiquetas!A2:B'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Etiqueta no encontrada' });
        }

        // Clear the specific row
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `Etiquetas!A${rowIndex + 2}:B${rowIndex + 2}`
        });

        // Get remaining tags and reorder them
        const remainingTags = rows.filter((_, index) => index !== rowIndex);
        if (remainingTags.length > 0) {
            await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: 'Etiquetas!A2:B'
            });

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Etiquetas!A2',
                valueInputOption: 'RAW',
                resource: { values: remainingTags }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar etiqueta:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar etiqueta' });
    }
});


/* ==================== RUTAS PRECIOS DE AlMACEN ==================== */
app.get('/obtener-precios', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Precios!A2:B' // Columnas A y B para ID y PRECIO
        });

        const rows = response.data.values || [];

        const precios = rows.map(row => ({
            id: row[0] || '',
            precio: row[1] || ''
        }));

        res.json({
            success: true,
            precios
        });

    } catch (error) {
        console.error('Error al obtener precios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los precios'
        });
    }
});
app.post('/agregar-precio', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { precio } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Agregar nuevo precio a la hoja de Precios
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Precios!A2:B'
        });

        const rows = response.data.values || [];
        const nextId = rows.length > 0 ?
            parseInt(rows[rows.length - 1][0].split('-')[1]) + 1 : 1;

        const newPrice = [`PR-${nextId.toString().padStart(3, '0')}`, precio];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Precios!A2:B',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [newPrice] }
        });

        // Actualizar todos los productos en Almacen general
        const productosResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:L'
        });

        const productos = productosResponse.data.values || [];
        const actualizaciones = productos.map((producto, index) => {
            const preciosActuales = producto[7] || '';
            const nuevosPrecios = preciosActuales ?
                `${preciosActuales};${precio},0` :
                `${precio},0`;

            return {
                range: `Almacen general!H${index + 2}`,
                values: [[nuevosPrecios]]
            };
        });

        if (actualizaciones.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId,
                resource: {
                    valueInputOption: 'RAW',
                    data: actualizaciones
                }
            });
        }

        res.json({ success: true, id: newPrice[0], precio });
    } catch (error) {
        console.error('Error al agregar precio:', error);
        res.status(500).json({ success: false, error: 'Error al agregar precio' });
    }
});
app.delete('/eliminar-precio/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener precios actuales
        const preciosResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Precios!A2:B'
        });

        const precios = preciosResponse.data.values || [];
        const precioIndex = precios.findIndex(row => row[0] === id);

        if (precioIndex === -1) {
            return res.status(404).json({ success: false, error: 'Precio no encontrado' });
        }

        // Eliminar el precio de la hoja
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `Precios!A${precioIndex + 2}:B${precioIndex + 2}`
        });

        // Actualizar productos en Almacen general
        const productosResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:L'
        });

        const productos = productosResponse.data.values || [];
        const actualizaciones = productos.map((producto, index) => {
            const preciosActuales = producto[7] || '';
            const preciosArray = preciosActuales.split(';').filter(p => !p.startsWith(precios[precioIndex][1] + ','));
            const nuevosPrecios = preciosArray.join(';');

            return {
                range: `Almacen general!H${index + 2}`,
                values: [[nuevosPrecios]]
            };
        });

        if (actualizaciones.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId,
                resource: {
                    valueInputOption: 'RAW',
                    data: actualizaciones
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar precio:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar precio' });
    }
});
app.post('/actualizar-precios-planilla', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { spreadsheetId, nombre } = req.user;
        const { motivo } = req.body;
        const excelBuffer = req.file.buffer;

        // Leer el archivo Excel
        const workbook = xlsx.read(excelBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet);

        // Obtener headers del Excel (primera fila)
        const headers = Object.keys(data[0]);
        // Filtrar cabeceras excluyendo 'ID' y 'Producto'
        const cabeceras = headers.filter(header => !['ID', 'Producto'].includes(header));

        const sheets = google.sheets({ version: 'v4', auth });

        // Primero limpiamos la hoja de precios actual
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Precios!A2:B'
        });

        // Registrar los nuevos precios
        const nuevosPrecios = cabeceras.map((nombrePrecio, index) => {
            const id = `PR-${(index + 1).toString().padStart(3, '0')}`;
            return [id, nombrePrecio];
        });

        // Agregar nuevos precios
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Precios!A2:B',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: nuevosPrecios
            }
        });

        // Obtener TODOS los productos del almacén
        const productosResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:H'
        });

        const productos = productosResponse.data.values || [];

        // Crear un mapa de los productos en el Excel para búsqueda rápida
        const productosExcel = new Map(data.map(row => [row['ID'], row]));

        // Procesar todos los productos del almacén
        const actualizaciones = productos.map((producto, index) => {
            const id = producto[0];
            const productoExcel = productosExcel.get(id);

            // Construir string de precios para todos los productos
            let preciosActualizados = cabeceras.map(nombrePrecio => {
                // Si el producto está en el Excel, usar su valor, si no, usar 0
                const valor = productoExcel ? (productoExcel[nombrePrecio] || '0') : '0';
                return `${nombrePrecio},${valor}`;
            }).join(';');

            return {
                range: `Almacen general!H${index + 2}`,
                values: [[preciosActualizados]]
            };
        });

        // Actualizar todos los productos en batch
        if (actualizaciones.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId,
                resource: {
                    valueInputOption: 'RAW',
                    data: actualizaciones
                }
            });
        }

        res.json({
            success: true,
            message: 'Precios actualizados correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar precios:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar los precios'
        });
    }
});
app.post('/actualizar-precios-hoja-vinculada', requireAuth, async (req, res) => {
    try {
        const { motivo } = req.body;
        const spreadsheetIdCatalogo = process.env.SPREADSHEET_ID_1_PRECIOS;
        const spreadsheetId = req.user.spreadsheetId;
        if (!spreadsheetIdCatalogo) {
            return res.status(400).json({ success: false, error: 'No se ha configurado el ID de la hoja vinculada' });
        }
        const sheets = google.sheets({ version: 'v4', auth });

        // Leer la hoja CATALOGO del spreadsheet de catálogo, pidiendo valores calculados
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetIdCatalogo,
            range: 'CATALOGO!A1:Z',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const rows = response.data.values || [];
        if (rows.length < 2) {
            console.log('No hay suficientes filas en la hoja CATALOGO:', rows);
            return res.status(400).json({ success: false, error: 'La hoja vinculada no tiene datos suficientes' });
        }
        // Convertir a formato de objetos igual que xlsx.utils.sheet_to_json
        const headers = rows[0];
        const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, idx) => obj[h] = row[idx]);
            return obj;
        });
        // Filtrar cabeceras excluyendo 'ID' y 'Producto'
        const cabeceras = headers.filter(header => !['ID', 'Producto'].includes(header));
        // Primero limpiamos la hoja de precios actual
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Precios!A2:B'
        });

        // Registrar los nuevos precios
        const nuevosPrecios = cabeceras.map((nombrePrecio, index) => {
            const id = `PR-${(index + 1).toString().padStart(3, '0')}`;
            return [id, nombrePrecio];
        });

        // Agregar nuevos precios
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Precios!A2:B',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: nuevosPrecios
            }
        });

        // Obtener TODOS los productos del almacén
        const productosResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:H'
        });
        const productos = productosResponse.data.values || [];

        // Crear un mapa de los productos en la hoja de catálogo para búsqueda rápida
        const productosCatalogo = new Map(data.map(row => [row['ID'], row]));

        // Procesar todos los productos del almacén
        const actualizaciones = productos.map((producto, index) => {
            const id = producto[0];
            const productoCatalogo = productosCatalogo.get(id);
            // Construir string de precios para todos los productos
            let preciosActualizados = cabeceras.map(nombrePrecio => {
                // Si el producto está en el catálogo, usar su valor, si no, usar 0
                let valor = productoCatalogo ? productoCatalogo[nombrePrecio] : undefined;
                if (valor === undefined || valor === null || valor === '') valor = '0';
                return `${nombrePrecio},${valor}`;
            }).join(';');
            if (index < 5) {
                console.log(`Producto ${id} - preciosActualizados:`, preciosActualizados);
            }
            return {
                range: `Almacen general!H${index + 2}`,
                values: [[preciosActualizados]]
            };
        });

        // Actualizar todos los productos en batch
        if (actualizaciones.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId,
                resource: {
                    valueInputOption: 'RAW',
                    data: actualizaciones
                }
            });
        }

        res.json({
            success: true,
            message: 'Precios actualizados correctamente desde hoja vinculada'
        });

    } catch (error) {
        console.error('Error al actualizar precios desde hoja vinculada:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar los precios desde hoja vinculada'
        });
    }
});

/* ==================== RUTAS CLIENTES DE AlMACEN ==================== */
app.get('/obtener-clientes', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Clientes!A2:F'
        });

        const rows = response.data.values || [];
        const clientes = rows.map(row => ({
            id: row[0] || '',
            nombre: row[1] || '',
            telefono: row[2] || '',
            direccion: row[3] || '',
            zona: row[4] || '',
            pedidos_id: row[5] || '',
        }));

        res.json({
            success: true,
            clientes
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener clientes'
        });
    }
});
app.post('/agregar-cliente', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { nombre, telefono, direccion, zona } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener clientes actuales para calcular el siguiente ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Clientes!A2:E'
        });

        const rows = response.data.values || [];
        const nextId = rows.length > 0 ?
            parseInt(rows[rows.length - 1][0].split('-')[1]) + 1 : 1;

        const newClient = [
            `CL-${nextId.toString().padStart(3, '0')}`,
            nombre,
            telefono || '',
            direccion || '',
            zona || ''
        ];

        // Agregar el nuevo cliente
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Clientes!A2:E',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [newClient] }
        });

        res.json({
            success: true,
            id: newClient[0],
        });
    } catch (error) {
        console.error('Error al agregar cliente:', error);
        res.status(500).json({ success: false, error: 'Error al agregar cliente' });
    }
});
app.delete('/eliminar-cliente/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener información de la hoja
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const clientesSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Clientes'
        );

        if (!clientesSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de Clientes no encontrada'
            });
        }

        // Obtener clientes actuales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Clientes!A2:E'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Cliente no encontrado'
            });
        }

        // Eliminar la fila
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: clientesSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 por el encabezado
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar cliente'
        });
    }
});
app.put('/editar-cliente/:id', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { id } = req.params;
    const { nombre, telefono, direccion, zona, motivo } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los clientes
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Clientes!A2:E'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Cliente no encontrado'
            });
        }

        // Actualizar la fila con los nuevos datos
        const updatedRow = [
            id,         // ID
            nombre,     // Nombre
            telefono,   // Teléfono
            direccion,  // Dirección
            zona        // Zona
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Clientes!A${rowIndex + 2}:E${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [updatedRow]
            }
        });

        res.json({
            success: true,
            message: 'Cliente actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el cliente'
        });
    }
});

/* ==================== RUTAS PROOVEDORES DE AlMACEN ==================== */
app.get('/obtener-proovedores', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Proovedores!A2:E'
        });

        const rows = response.data.values || [];
        const proovedores = rows.map(row => ({
            id: row[0] || '',
            nombre: row[1] || '',
            telefono: row[2] || '',
            direccion: row[3] || '',
            zona: row[4] || ''
        }));

        res.json({
            success: true,
            proovedores
        });
    } catch (error) {
        console.error('Error al obtener proovedores:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener proovedores'
        });
    }
});
app.post('/agregar-proovedor', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { nombre, telefono, direccion, zona } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener clientes actuales para calcular el siguiente ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Proovedores!A2:E'
        });

        const rows = response.data.values || [];
        const nextId = rows.length > 0 ?
            parseInt(rows[rows.length - 1][0].split('-')[1]) + 1 : 1;

        const newProv = [
            `PRV-${nextId.toString().padStart(3, '0')}`,
            nombre,
            telefono || '',
            direccion || '',
            zona || ''
        ];

        // Agregar el nuevo cliente
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Proovedores!A2:E',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [newProv] }
        });

        res.json({
            success: true,
            id: newProv[0],

        });
    } catch (error) {
        console.error('Error al agregar proovedor:', error);
        res.status(500).json({ success: false, error: 'Error al agregar proovedor' });
    }
});
app.delete('/eliminar-proovedor/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener información de la hoja
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const clientesSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Proovedores'
        );

        if (!clientesSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de Clientes no encontrada'
            });
        }

        // Obtener clientes actuales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Proovedores!A2:E'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Proovedor no encontrado'
            });
        }

        // Eliminar la fila
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: clientesSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 por el encabezado
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar proovedor:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar proovedor'
        });
    }
});
app.put('/editar-proovedor/:id', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { id } = req.params;
    const { nombre, telefono, direccion, zona, motivo } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los clientes
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Proovedores!A2:E'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Proovedor no encontrado'
            });
        }

        // Actualizar la fila con los nuevos datos
        const updatedRow = [
            id,         // ID
            nombre,     // Nombre
            telefono,   // Teléfono
            direccion,  // Dirección
            zona        // Zona
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Proovedores!A${rowIndex + 2}:E${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [updatedRow]
            }
        });

        console.log(`Proovedor ${id} actualizado con motivo: ${motivo}`);

        res.json({
            success: true,
            message: 'Proovedor actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar proovedor:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el proovedor'
        });
    }
});

/* ==================== RUTAS DE ACOPIO ALMACEN ==================== */
app.get('/obtener-productos-acopio', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Almacen acopio!A2:E'
        });

        const rows = response.data.values || [];

        const productos = rows.map(row => ({
            id: row[0] || '',
            producto: row[1] || '',
            bruto: row[2] || '0-1',  // Default value if empty
            prima: row[3] || '0-1',   // Default value if empty
            etiquetas: row[4] || ''
        }));

        res.json({
            success: true,
            productos
        });

    } catch (error) {
        console.error('Error al obtener productos de acopio:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los productos de acopio'
        });
    }
});
app.post('/crear-producto-acopio', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const sheets = google.sheets({ version: 'v4', auth });
        const { producto, pesoBruto, loteBruto, pesoPrima, lotePrima, etiquetas } = req.body;

        // Get current products to determine next ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen acopio!A2:E'  // Fixed sheet name
        });

        const values = response.data.values || [];
        const lastId = values.length > 0 ?
            Math.max(...values.map(row => parseInt(row[0].split('-')[1]))) : 0;
        const newId = `PB-${(lastId + 1).toString().padStart(3, '0')}`;

        // Format weights with their lots
        const brutoFormatted = `${pesoBruto}-${loteBruto}`;
        const primaFormatted = `${pesoPrima}-${lotePrima}`;

        // Add new product
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Almacen acopio!A2:E',  // Fixed sheet name
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[newId, producto, brutoFormatted, primaFormatted, etiquetas]]
            }
        });

        res.json({ success: true, id: newId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Error al crear el producto' });
    }
});
app.delete('/eliminar-producto-acopio/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get spreadsheet info
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const almacenSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Almacen acopio'
        );

        if (!almacenSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de Almacén acopio no encontrada'
            });
        }

        // Get current products
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen acopio!A2:E'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: almacenSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1,
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Producto eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el producto'
        });
    }
});
app.put('/editar-producto-acopio/:id', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { id } = req.params;
    const { producto, bruto, prima, etiquetas, motivo } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Get current products
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen acopio!A2:E'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        // Update the row (columns: A=ID, B=Producto, C=Bruto, D=Prima, E=Etiquetas)
        const updatedRow = [id, producto, bruto, prima, etiquetas];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Almacen acopio!A${rowIndex + 2}:E${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [updatedRow] }
        });

        res.json({
            success: true,
            message: 'Producto actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el producto'
        });
    }
});

/* ==================== RUTAS DE ACOPIO ETIQUETAS==================== */
app.get('/obtener-etiquetas-acopio', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Etiquetas acopio!A2:B' // Columnas A y B para ID y ETIQUETA
        });

        const rows = response.data.values || [];

        const etiquetas = rows.map(row => ({
            id: row[0] || '',
            etiqueta: row[1] || ''
        }));

        res.json({
            success: true,
            etiquetas
        });

    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las etiquetas'
        });
    }
});
app.post('/agregar-etiqueta-acopio', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { etiqueta } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get existing tags to calculate next ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Etiquetas acopio!A2:B'
        });

        const rows = response.data.values || [];
        const nextId = rows.length > 0 ?
            parseInt(rows[rows.length - 1][0].split('-')[1]) + 1 : 1;

        const newTag = [`ETA-${nextId.toString().padStart(3, '0')}`, etiqueta];

        // Append the new tag
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Etiquetas acopio!A2:B',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [newTag] }
        });

        res.json({ success: true, id: newTag[0], etiqueta });
    } catch (error) {
        console.error('Error al agregar etiqueta:', error);
        res.status(500).json({ success: false, error: 'Error al agregar etiqueta' });
    }
});
app.delete('/eliminar-etiqueta-acopio/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get current tags
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Etiquetas acopio!A2:B'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Etiqueta no encontrada' });
        }

        // Clear the specific row
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `Etiquetas acopio!A${rowIndex + 2}:B${rowIndex + 2}`
        });

        // Get remaining tags and reorder them
        const remainingTags = rows.filter((_, index) => index !== rowIndex);
        if (remainingTags.length > 0) {
            await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: 'Etiquetas acopio!A2:B'
            });

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Etiquetas acopio!A2',
                valueInputOption: 'RAW',
                resource: { values: remainingTags }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar etiqueta:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar etiqueta' });
    }
});

/* ==================== RUTAS DE ACOPIO PEDIDOS DE MATERIA PRIMA ==================== */
app.post('/registrar-pedido', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { productos } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get current pedidos to calculate next ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pedidos!A2:G' // Updated range to include all columns
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            Math.max(...rows.map(row => parseInt(row[0].split('-')[1]))) : 0;

        // Format current date (YYYY-MM-DD)
        const fecha = new Date().toLocaleDateString('es-ES');

        // Prepare new pedidos
        const newPedidos = productos.map((producto, index) => {
            const newId = `PAA-${(lastId + index + 1).toString().padStart(3, '0')}`;
            return [
                newId,                   // ID
                fecha,                   // FECHA
                producto.id,             // ID-PROD
                producto.nombre,         // PRODUCTO
                producto.cantidad,       // CANT-PED
                producto.observaciones,  // OBS-PEDIDO
                'Pendiente'             // ESTADO
            ];
        });

        // Add new pedidos
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Pedidos!A2:G',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: newPedidos
            }
        });

        res.json({
            success: true,
            message: 'Pedidos registrados correctamente',
            pedidos: newPedidos
        });
    } catch (error) {
        console.error('Error al registrar pedidos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar los pedidos'
        });
    }
});
app.get('/obtener-pedidos', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pedidos!A2:R' // A to O columns for all fields
        });

        const rows = response.data.values || [];
        const pedidos = rows.map(row => ({
            id: row[0] || '',
            fecha: row[1] || '',
            idProducto: row[2] || '',
            producto: row[3] || '',
            cantidadPedida: row[4] || '',
            observacionesPedido: row[5] || '',
            estado: row[6] || 'Pendiente',
            fechaEntrega: row[7] || '',
            cantidadEntregadaKg: row[8] || '',
            proovedor: row[9] || '',
            precio: row[10] || '',
            observacionesCompras: row[11] || '',
            cantidadEntregadaUnd: row[12] || '',
            transporteOtros: row[13] || '',
            estadoCompra: row[14] || '',
            fechaIngreso: row[15] || '',
            cantidadIngresada: row[16] || '',
            observacionesIngresado: row[17] || ''
        }));


        res.json({
            success: true,
            pedidos
        });

    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los pedidos'
        });
    }
});
app.delete('/eliminar-pedido/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get current pedidos
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pedidos!A2:A'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        // Get sheet ID
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const pedidosSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Pedidos'
        );

        if (!pedidosSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de Pedidos no encontrada'
            });
        }

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: pedidosSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 for header row
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Pedido eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el pedido'
        });
    }
});
app.put('/editar-pedido/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const {
            idProducto,
            productoPedido,
            cantidadPedida,
            observacionesPedido,
            estado,
            cantidadEntregadaKg,
            proovedor,
            precio,
            observacionesCompras,
            cantidadEntregadaUnd,
            transporteOtros,
            estadoCompra,
            cantidadIngresada,
            observacionesIngresado,
            motivo
        } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Get current pedidos
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pedidos!A2:R'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        const currentRow = rows[rowIndex];

        // Asegurarnos de que los valores nuevos tengan prioridad sobre los actuales
        const updatedRow = [
            id,                                         // ID
            currentRow[1],                             // FECHA
            idProducto,                             // ID-PROD
            productoPedido,                             // PRODUCTO
            cantidadPedida,     // CANT-PED
            observacionesPedido, // OBS-PEDIDO
            estado,     // ESTADO
            currentRow[7],                             // FECHA-ENTR
            cantidadEntregadaKg, // CANT-ENTR-KG
            proovedor,           // PROOVEDOR
            precio,              // PRECIO
            observacionesCompras,// OBS-COMPRAS
            cantidadEntregadaUnd,// CANT-ENTRG-UND
            transporteOtros,     // TRASP-OTROS
            estadoCompra,        // ESTADO-COMPRA
            currentRow[15],                        // FECHA-INGRESO
            cantidadIngresada,   // CANT-INGRE
            observacionesIngresado // OBS-INGRE
        ];

        // Actualizar en Google Sheets
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pedidos!A${rowIndex + 2}:R${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [updatedRow]
            }
        });
        res.json({
            success: true,
            message: 'Pedido actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el pedido'
        });
    }
});
app.put('/entregar-pedido/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const {
            cantidadKg,
            proovedor,
            precio,
            observaciones,
            cantidadUnidad,
            unidadMedida,
            transporteOtros,
            estadoCompra
        } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los pedidos
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pedidos!A2:R'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
        }

        const fecha = new Date().toLocaleString('es-ES', {
            timeZone: 'America/La_Paz' // Puedes cambiar esto según tu país o ciudad
        });
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pedidos!H${rowIndex + 2}:O${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[
                    fecha,                         // FECHA-COMPRA
                    cantidadKg,                    // CANT-ENTR-KG
                    proovedor,                     // PROOVEDOR
                    precio,                        // PRECIO
                    observaciones,                 // OBS-COMPRAS
                    `${cantidadUnidad} ${unidadMedida}`, // CANT-ENTRG-UND
                    transporteOtros,               // TRANSPORTE-OTROS
                    estadoCompra                   // ESTADO-COMPRA
                ]]
            }
        });

        // Actualizar estado a "Recibido"
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pedidos!G${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[estadoCompra === 'No llego' ? 'No llego' : 'Recibido']]
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error al entregar pedido:', error);
        res.status(500).json({ success: false, error: 'Error al entregar el pedido' });
    }
});
app.put('/rechazar-pedido/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { motivo } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los pedidos
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pedidos!A2:R'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
        }

        // Actualizar estado a "Rechazado"
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pedidos!G${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [['Rechazado']]
            }
        });
        res.json({ success: true });

    } catch (error) {
        console.error('Error al rechazar pedido:', error);
        res.status(500).json({ success: false, error: 'Error al rechazar el pedido' });
    }
});
app.put('/llego-pedido/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { motivo } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los pedidos
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pedidos!A2:Q'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
        }

        // Actualizar estado a "Rechazado"
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pedidos!G${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [['Recibido']]
            }
        });
        res.json({ success: true });

    } catch (error) {
        console.error('Error al rechazar pedido:', error);
        res.status(500).json({ success: false, error: 'Error al rechazar el pedido' });
    }
});

/* ==================== RUTAS DE ALMACEN ACOPIO ==================== */
app.post('/registrar-movimiento-acopio', requireAuth, async (req, res) => {
    const { spreadsheetId, nombre } = req.user;
    const { pedidoId, ...movimientoData } = req.body;



    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Movimientos alm-acopio!A2:A' // Assuming IDs are in column A
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            Math.max(...rows.map(row => parseInt(row[0].split('-')[1]))) : 0;
        const newId = `MAA-${(lastId + 1).toString().padStart(3, '0')}`;
        // 1. Registrar el movimiento
        const movimientoResponse = await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Movimientos alm-acopio!A:F',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[
                    newId,
                    movimientoData.fecha_hora,
                    movimientoData.tipo,
                    movimientoData.idProducto,
                    movimientoData.nombreProducto,
                    movimientoData.peso,
                    nombre,
                    movimientoData.nombreMovimiento,
                    movimientoData.caracteristicas || 'No tiene',
                    movimientoData.observaciones
                ]]
            }
        });

        // 2. Actualizar estado del pedido si existe
        if (pedidoId) {
            const pedidosResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'Pedidos!A2:R'
            });

            const pedidosRows = pedidosResponse.data.values || [];
            const pedidoIndex = pedidosRows.findIndex(row => row[0] === pedidoId);

            if (pedidoIndex !== -1) {
                const fechaActual = new Date().toLocaleDateString('es-ES');

                await sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId: spreadsheetId,
                    resource: {
                        data: [
                            {
                                range: `Pedidos!G${pedidoIndex + 2}`,
                                values: [['Ingresado']]
                            },
                            {
                                range: `Pedidos!P${pedidoIndex + 2}`,
                                values: [[fechaActual]]
                            },
                            {
                                range: `Pedidos!Q${pedidoIndex + 2}`,
                                values: [[movimientoData.peso]]
                            },
                            {
                                range: `Pedidos!R${pedidoIndex + 2}`,
                                values: [[movimientoData.observaciones]]
                            }
                        ],
                        valueInputOption: 'USER_ENTERED'
                    }
                });
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
});
app.get('/obtener-movimientos-acopio', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Movimientos alm-acopio!A2:J'  // A hasta J para todos los campos
        });

        const rows = response.data.values || [];
        const movimientos = rows.map(row => ({
            id: row[0] || '',                    // ID
            fecha: row[1] || '',                 // FECHA - HORA
            tipo: row[2] || '',                  // TIPO
            idProducto: row[3] || '',            // ID-PRODUCTO
            producto: row[4] || '',              // PRODUCTOS
            peso: row[5] || '',                  // PESO EN KG.
            operario: row[6] || '',              // OPERARIO
            nombreMovimiento: row[7] || '',      // NOMBRE DEL MOVIMIENTO
            caracteristicas: row[8] || '',       // CARACTERISTICAS
            observaciones: row[9] || ''          // OBSERVACIONES
        }));

        res.json({
            success: true,
            movimientos
        });

    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los movimientos'
        });
    }
});
app.delete('/eliminar-movimiento-acopio/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener información de la hoja
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const movimientosSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Movimientos alm-acopio'
        );

        if (!movimientosSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de movimientos no encontrada'
            });
        }

        // Obtener movimientos actuales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Movimientos alm-acopio!A2:J'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Movimiento no encontrado'
            });
        }

        // Eliminar la fila
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: movimientosSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 por el encabezado
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Movimiento eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar movimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el movimiento'
        });
    }
});
app.put('/anular-movimiento-acopio/:id', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { id } = req.params;
    const { motivo } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Obtener el registro a anular y la información de la hoja
        const movimientosResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Movimientos alm-acopio!A2:J'
        });

        const movimientos = movimientosResponse.data.values || [];
        const movimientoIndex = movimientos.findIndex(row => row[0] === id);

        if (movimientoIndex === -1) {
            throw new Error('Registro no encontrado');
        }

        const movimiento = movimientos[movimientoIndex];
        const tipo = movimiento[2];
        const idProducto = movimiento[3];
        const peso = parseFloat(movimiento[5]);

        // 2. Obtener y actualizar datos del almacén
        const almacenResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen acopio!A2:D'
        });

        const productos = almacenResponse.data.values || [];
        const productoIndex = productos.findIndex(row => row[0] === idProducto);

        if (productoIndex === -1) {
            throw new Error('Producto no encontrado en almacén');
        }

        // 3. Actualizar lotes según el tipo de movimiento
        const tipoPartes = tipo.toLowerCase().split(' ');
        const esIngreso = tipoPartes[0] === 'ingreso';
        const esBruto = tipoPartes[1] === 'bruto';

        const columnaLotes = esBruto ? 'C' : 'D';
        const lotesResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `Almacen acopio!${columnaLotes}${productoIndex + 2}`
        });

        let lotesActuales = lotesResponse.data.values?.[0]?.[0] || '';
        let lotesArray = lotesActuales.split(';').filter(Boolean);

        // Lógica de actualización de lotes
        if (esIngreso) {
            // Si es ingreso, quitar el último lote
            lotesArray.pop();
        } else {
            // Si es salida, devolver el peso al último lote
            if (lotesArray.length > 0) {
                const ultimoLoteIndex = lotesArray.length - 1;
                const [pesoActual, numeroLote] = lotesArray[ultimoLoteIndex].split('-');
                const nuevoLote = `${(parseFloat(pesoActual) + peso).toFixed(2)}-${numeroLote}`;
                lotesArray[ultimoLoteIndex] = nuevoLote;
            }
        }

        // 4. Actualizar el almacén
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Almacen acopio!${columnaLotes}${productoIndex + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[lotesArray.join(';')]]
            }
        });

        // 5. Actualizar el registro como anulado y agregar motivo
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Movimientos alm-acopio!C${movimientoIndex + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [['Anulado']]
            }
        });

        // Agregar el motivo en observaciones
        const observacionesActuales = movimiento[9] || '';
        const nuevasObservaciones = `${observacionesActuales} [ANULADO: ${motivo}]`;
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Movimientos alm-acopio!J${movimientoIndex + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[nuevasObservaciones]]
            }
        });

        res.json({
            success: true,
            message: 'Movimiento anulado correctamente'
        });

    } catch (error) {
        console.error('Error al anular movimiento:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al anular el movimiento'
        });
    }
});

/* ==================== RUTAS DE INGRESO Y SALIDAS DE ACOPIO  ==================== */
app.put('/actualizar-producto-acopio/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { tipoMateria, pesoKg, numeroLote } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener producto actual
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen acopio!A2:E'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);
        if (rowIndex === -1) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

        const currentRow = rows[rowIndex];
        const columnaActualizar = tipoMateria === 'bruto' ? 2 : 3; // 2 para BRUTO, 3 para PRIMA
        const valorActual = currentRow[columnaActualizar] || '0-1';
        const nuevoValor = valorActual === '0-1' ?
            `${pesoKg}-${numeroLote}` :
            `${valorActual};${pesoKg}-${numeroLote}`;

        // Actualizar solo la columna correspondiente
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Almacen acopio!${String.fromCharCode(65 + columnaActualizar)}${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[nuevoValor]] }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar el producto' });
    }
});
app.put('/actualizar-producto-acopio-salida/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { bruto, prima } = req.body;  // Recibimos directamente los valores actualizados
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener producto actual
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen acopio!A2:E'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);
        if (rowIndex === -1) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

        const currentRow = [...rows[rowIndex]];

        // Actualizar solo los campos que vienen en la petición
        if (bruto !== undefined) currentRow[2] = bruto;
        if (prima !== undefined) currentRow[3] = prima;

        // Actualizar la fila completa
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Almacen acopio!A${rowIndex + 2}:E${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [currentRow] }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar el producto' });
    }
});

/* ==================== RUTAS DE REGLAS DE PRODUCCION ==================== */
app.get('/obtener-reglas', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Reglas!A2:H'
        });

        const rows = response.data.values || [];

        const reglas = rows.map(row => ({
            id: row[0],
            producto: row[1],
            etiq: row[2],
            sell: row[3],
            envs: row[4],
            cern: row[5],
            grMin: row[6],
            grMax: row[7],
        }));

        res.json({ success: true, reglas });
    } catch (error) {
        console.error('Error las reglas:', error);
        res.status(500).json({
            success: false,
            error: 'Error las reglas'
        });
    }
});
app.get('/obtener-reglas-base', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Precios base!A2:C'
        });

        const rows = response.data.values || [];

        const reglasBase = rows.map(row => ({
            id: row[0],
            nombre: row[1],
            precio: row[2],
        }));

        res.json({ success: true, reglasBase });
    } catch (error) {
        console.error('Error las reglas:', error);
        res.status(500).json({
            success: false,
            error: 'Error las reglas'
        });
    }
});
app.post('/agregar-reglas-multiples', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { producto, reglas, gramajeMin, gramajeMax } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener el último ID para generar el nuevo
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Reglas!A2:A'
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            parseInt(rows[rows.length - 1][0].split('-')[1]) : 0;
        const nuevoId = `REG-${(lastId + 1).toString().padStart(3, '0')}`;

        // Formatear los valores y forzar el uso del punto decimal
        const newRow = [
            nuevoId,
            producto,
            reglas.etiquetado.toString().replace(',', '.') || '1',
            reglas.sellado.toString().replace(',', '.') || '1',
            reglas.envasado.toString().replace(',', '.') || '1',
            reglas.cernido.toString().replace(',', '.') || '1',
            gramajeMin || '',
            gramajeMax || ''
        ];

        // Insertar la nueva regla usando USER_ENTERED para respetar el formato
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Reglas!A2:H',
            valueInputOption: 'RAW', // Cambiado a RAW para mantener el formato exacto
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [newRow]
            }
        });

        res.json({
            success: true,
            id: nuevoId,
            message: 'Regla agregada correctamente'
        });

    } catch (error) {
        console.error('Error al agregar reglas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al agregar las reglas'
        });
    }
});
app.delete('/eliminar-regla/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener información de la hoja
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const movimientosSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Reglas'
        );

        if (!movimientosSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de reglas no encontrada'
            });
        }

        // Obtener movimientos actuales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Reglas!A2:H'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Regla no encontrada'
            });
        }

        // Eliminar la fila
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: movimientosSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 por el encabezado
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Regla eliminada correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar regla:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el regla'
        });
    }
});
app.put('/actualizar-precios-base', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { etiquetado, envasado, sellado, cernido } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los precios base
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Precios base!A2:C'
        });

        const rows = response.data.values || [];

        // Preparar las actualizaciones
        const updates = [];

        rows.forEach((row, index) => {
            const tipo = row[1];
            let newValue;

            if (tipo === 'Etiquetado') newValue = etiquetado;
            else if (tipo === 'Envasado') newValue = envasado;
            else if (tipo === 'Sellado') newValue = sellado;
            else if (tipo === 'Cernido') newValue = cernido;
            else return;

            updates.push({
                range: `Precios base!C${index + 2}`,
                values: [[newValue]]
            });
        });

        // Ejecutar todas las actualizaciones
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: {
                data: updates,
                valueInputOption: 'USER_ENTERED'
            }
        });

        res.json({
            success: true,
            message: 'Precios base actualizados correctamente',
            preciosActualizados: { etiquetado, envasado, sellado, cernido }
        });

    } catch (error) {
        console.error('Error al actualizar precios base:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar los precios base',
            detalles: error.message
        });
    }
});

/* ==================== RUTAS DE PAGOS ==================== */
app.post('/registrar-pago', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const {
            nombre_pago,
            beneficiario,
            pagado_por,
            justificativos_id,
            justificativos,
            subtotal,
            descuento,
            aumento,
            total,
            observaciones,
            registros,
            tipo

        } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener último ID para generar el nuevo
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pagos!A2:A'
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            parseInt(rows[rows.length - 1][0].split('-')[1]) : 0;
        const newId = `COMP-${(lastId + 1).toString().padStart(3, '0')}`;

        // Obtener fecha actual
        const fecha = new Date().toLocaleDateString('es-ES');

        // Insertar nuevo pago
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Pagos!A2:O',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[
                    newId,                      // ID
                    fecha,                      // FECHA
                    nombre_pago,                // NOMBRE DEL PAGO
                    req.body.id_beneficiario,   // ID-BENEF (email del usuario)
                    beneficiario,               // BENEFICIARIO
                    pagado_por,                 // PAGADO POR
                    justificativos_id,             // ID-JUST
                    req.body.justificativosDetallados || justificativos, // JUSTIFICATIVOS con procesos
                    subtotal,                   // SUBTOTAL
                    descuento,                  // DESCUENTO
                    aumento,                    // AUMENTO
                    total,                      // TOTAL
                    observaciones,               // OBSERVACIONES
                    'Pendiente',              // ESTADO (opcional, si se maneja)
                    tipo                        // TIPO (opcional, si se maneja)
                ]]
            }
        });

        res.json({
            success: true,
            message: 'Pago registrado correctamente',
            id: newId
        });

    } catch (error) {
        console.error('Error al registrar pago:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar el pago'
        });
    }
});
app.get('/obtener-pagos', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pagos!A2:O' // Columnas A hasta M para todos los campos
        });

        const rows = response.data.values || [];
        const pagos = rows.map(row => ({
            id: row[0] || '',                    // ID
            fecha: row[1] || '',                 // FECHA
            nombre_pago: row[2] || '',           // NOMBRE DEL PAGO
            id_beneficiario: row[3] || '',       // ID-BENEF
            beneficiario: row[4] || '',          // BENEFICIARIO
            pagado_por: row[5] || '',            // PAGADO POR
            justificativos_id: row[6] || '',     // ID-JUST
            justificativos: row[7] || '',        // JUSTIFICATIVOS
            subtotal: row[8] || '',              // SUBTOTAL
            descuento: row[9] || '',             // DESCUENTO
            aumento: row[10] || '',              // AUMENTO  
            total: row[11] || '',                // TOTAL
            observaciones: row[12] || '',        // OBSERVACIONES
            estado: row[13] || 'Pendiente', // ESTADO (opcional, si se maneja)
            tipo: row[14] || 'generico' // TIPO (opcional, si se maneja)
        }));

        res.json({
            success: true,
            pagos
        });

    } catch (error) {
        console.error('Error al obtener pagos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los pagos'
        });
    }
});
app.put('/anular-pago/:id', requireAuth, async (req, res) => {
    try {

        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { motivo } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener todos los pagos
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pagos!A2:N'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);
        const pago = rows[rowIndex];

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Pago no encontrado'
            });
        }

        // Actualizar el estado a "Anulado"
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pagos!N${rowIndex + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [['Anulado']]
            }
        });

        const observacionesActuales = pago[12] || '';
        const nuevasObservaciones = `${observacionesActuales} [ANULADO: ${motivo}]`;
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pagos!M${rowIndex + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[nuevasObservaciones]]
            }
        });

        res.json({
            success: true,
            message: 'Pago anulado correctamente'
        });

    } catch (error) {
        console.error('Error al anular pago:', error);
        res.status(500).json({
            success: false,
            error: 'Error al anular el pago'
        });
    }
});

/* ==================== RUTAS DE PAGOS PARCIALES ==================== */
app.get('/obtener-pagos-parciales/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Registros pagos!A2:G'
        });

        const rows = response.data.values || [];
        const pagosParciales = rows
            .filter(row => row[4] === id) // Filtrar por ID del pago principal
            .map(row => ({
                id: row[0],
                fecha: row[1],
                pagado_por: row[2],
                beneficiario: row[3],
                id_registro: row[4],
                cantidad_pagada: parseFloat(row[5]),
                observaciones: row[6]
            }));

        // Calcular total pagado
        const totalPagado = pagosParciales.reduce((sum, pago) => sum + pago.cantidad_pagada, 0);

        // Obtener el pago principal para verificar si está completo
        const pagoPrincipalResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pagos!A2:N'
        });

        const pagoPrincipal = pagoPrincipalResponse.data.values
            .find(row => row[0] === id);

        if (pagoPrincipal) {
            const totalAPagar = parseFloat(Number(pagoPrincipal[11].replace(',', '.')).toFixed(2));// Total del pago principal

            // Si el total pagado iguala o supera el total a pagar, actualizar estado
            if (totalPagado >= totalAPagar) {
                const rowIndex = pagoPrincipalResponse.data.values.findIndex(row => row[0] === id);
                if (rowIndex !== -1) {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `Pagos!N${rowIndex + 2}`,
                        valueInputOption: 'RAW',
                        resource: {
                            values: [['Pagado']]
                        }
                    });
                }
            }
        }


        res.json({
            success: true,
            pagosParciales,
            totalPagado,
            saldoPendiente: pagoPrincipal ? Math.max(0, parseFloat(Number(pagoPrincipal[11].replace(',', '.')).toFixed(2)) - totalPagado) : 0
        });


    } catch (error) {
        console.error('Error al obtener pagos parciales:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los pagos parciales'
        });
    }
});
app.post('/registrar-pago-parcial', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const {
            pago_id,
            pagado_por,
            beneficiario,
            cantidad_pagada,
            observaciones
        } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Verificar el saldo pendiente antes de registrar el nuevo pago
        const pagosResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Registros pagos!A2:G'
        });

        const pagosPrevios = pagosResponse.data.values || [];
        const totalPagadoPrevio = pagosPrevios
            .filter(row => row[4] === pago_id)
            .reduce((sum, row) => sum + parseFloat(row[5] || 0), 0);

        // Obtener el total a pagar del pago principal
        const pagoPrincipalResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pagos!A2:L'
        });

        const pagoPrincipal = pagoPrincipalResponse.data.values
            .find(row => row[0] === pago_id);

        if (!pagoPrincipal) {
            throw new Error('Pago principal no encontrado');
        }
        function redondearDecimalPersonalizado(valor) {
            const decimal = valor - Math.floor(valor);
            if (decimal < 0.5) {
                return Math.floor(valor).toFixed(2);
            } else {
                return Math.ceil(valor).toFixed(2);
            }
        }

        const totalAPagar = redondearDecimalPersonalizado(parseFloat(Number(pagoPrincipal[11].replace(',', '.')).toFixed(2))); // Total del pago principal
        const nuevoCantidadTotal = totalPagadoPrevio + parseFloat(cantidad_pagada);
        // Verificar que no se exceda el total a pagar
        if (nuevoCantidadTotal > totalAPagar) {
            return res.status(400).json({
                success: false,
                error: 'La cantidad excede el saldo pendiente'
            });
        }

        // Generar nuevo ID para el pago parcial
        const lastId = pagosPrevios.length > 0 ?
            Math.max(...pagosPrevios.map(row => parseInt(row[0].split('-')[1]))) : 0;
        const newId = `PAG-${(lastId + 1).toString().padStart(3, '0')}`;

        // Registrar el nuevo pago parcial
        const fecha = new Date().toLocaleDateString('es-ES');
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Registros pagos!A2:G',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[
                    newId,              // ID
                    fecha,              // FECHA
                    pagado_por,         // PAGADO POR
                    beneficiario,       // BENEFICIARIO
                    pago_id,           // ID-REGISTRO
                    cantidad_pagada,    // CANTIDAD PAGADA
                    observaciones       // OBSERVACIONES
                ]]
            }
        });

        // Si se completó el pago total, actualizar el estado
        if (nuevoCantidadTotal >= totalAPagar) {
            const pagoPrincipalIndex = pagoPrincipalResponse.data.values.findIndex(row => row[0] === pago_id);
            if (pagoPrincipalIndex !== -1) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `Pagos!N${pagoPrincipalIndex + 2}`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [['Pagado']]
                    }
                });
            }
        }

        res.json({
            success: true,
            message: 'Pago parcial registrado correctamente',
            id: newId
        });

    } catch (error) {
        console.error('Error al registrar pago parcial:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar el pago parcial'
        });
    }
});

/* ==================== RUTAS DE PERSONAL ==================== */
app.get('/obtener-personal', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Usuarios!A2:J' // Actualizado para incluir columna J
        });

        const rows = response.data.values || [];
        const personal = rows.map(row => ({
            id: row[0] || '',                     // ID
            nombre: row[1] || '',                 // NOMBRE - APELLIDO
            telefono: row[2] || '',               // TELEFONO
            estado: row[3] || '',                 // ESTADO
            rol: row[4] || '',                    // ROL
            foto: row[5] || '', // FOTO
            plugins: row[6] || '',                // PLUGINS
            email: row[7] || '',                  // EMAIL
            // No enviamos la contraseña por seguridad
            permisos: row[9] || '',               // PERMISOS
        }));

        res.json({
            success: true,
            personal
        });

    } catch (error) {
        console.error('Error al obtener personal:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el personal'
        });
    }
});
app.get('/obtener-nombres-usuarios', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Usuarios!A2:H' // Solo ID y NOMBRE
        });

        const rows = response.data.values || [];
        const nombres = rows.map(row => ({
            id: row[0] || '',
            nombre: row[1] || '',
            rol: row[4] || '',
            user: row[7] || ''
        }));

        res.json({
            success: true,
            nombres
        });

    } catch (error) {
        console.error('Error al obtener nombres:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los nombres'
        });
    }
});
app.put('/actualizar-usuario-admin/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { estado, rol, plugins, permisos } = req.body; // Agregado permisos
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener usuarios actuales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Usuarios!A2:J' // Actualizado para incluir columna J
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const usuario = rows[rowIndex];
        const actualizado = [
            usuario[0], // ID
            usuario[1], // NOMBRE
            usuario[2], // TELEFONO
            estado,     // ESTADO
            rol,       // ROL  
            usuario[5], // FOTO
            plugins,    // PLUGINS
            usuario[7], // EMAIL
            usuario[8], // PASSWORD
            permisos   // PERMISOS
        ];

        // Actualizar usuario
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Usuarios!A${rowIndex + 2}:J${rowIndex + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [actualizado]
            }
        });

        res.json({
            success: true,
            message: 'Usuario actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el usuario'
        });
    }
});

/* ==================== RUTAS DE CALCULAR MATERI PRIMA ==================== */
app.delete('/eliminar-calculo-mp/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { motivo } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get spreadsheet info
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const calculosSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Calcular mp'
        );

        if (!calculosSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de cálculos no encontrada'
            });
        }

        // Get current rows
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Calcular mp!A2:K'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: calculosSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1,
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Cálculo eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar cálculo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el cálculo'
        });
    }
});
app.post('/registrar-calculo-mp', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const {
            nombre_operador,
            responsable,
            peso_inicial,
            productos
        } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener último ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Calcular mp!A2:A'
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            Math.max(...rows.map(row => parseInt(row[0].split('-')[1]))) : 0;
        const newId = `RMP-${(lastId + 1).toString().padStart(3, '0')}`;

        // Fecha actual en formato dd/mm/yyyy
        const fecha = new Date().toLocaleDateString('es-ES');

        // Formatear productos y gramajes manteniendo los nombres completos
        const materia_prima = productos.map(p => p.nombre).join('-');
        const gramaje = productos.map(p => p.gramaje).join('-');

        // Crear nuevo registro
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Calcular mp!A2:K',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[
                    newId,           // ID
                    fecha,           // FECHA
                    nombre_operador, // NOMBRE
                    responsable,     // RESPONSABLE
                    materia_prima,   // MATERIA PRIMA (nombres completos)
                    gramaje,         // GRAMAJE (separado por guiones)
                    peso_inicial,    // PESO INICIAL
                    '',             // PESO FINAL (vacío)
                    '',             // CTD PRODUCIDA (vacío)
                    '',             // PESO MERMA (vacío)
                    ''              // OBSERVACIONES (vacío)
                ]]
            }
        });

        res.json({
            success: true,
            message: 'Cálculo registrado correctamente',
            id: newId,
        });

    } catch (error) {
        console.error('Error al registrar cálculo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar el cálculo'
        });
    }
});
app.get('/obtener-calculos-mp', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Calcular mp!A2:K'
        });

        const rows = response.data.values || [];
        const calculos = rows.map(row => ({
            id: row[0] || '',
            fecha: row[1] || '',
            nombre: row[2] || '',
            responsable: row[3] || '',
            materia_prima: row[4] || '',
            gramaje: row[5] || '',
            peso_inicial: row[6] || '',
            peso_final: row[7] || '',
            ctd_producida: row[8] || '',
            peso_merma: row[9] || '',
            observaciones: row[10] || ''
        }));

        res.json({
            success: true,
            calculos
        });

    } catch (error) {
        console.error('Error al obtener cálculos de MP:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los cálculos de materia prima'
        });
    }
});
app.put('/agregar-peso-final-mp/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { peso_final } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener el registro actual
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Calcular mp!A2:K'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        // Actualizar el peso final
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Calcular mp!H${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[peso_final]]
            }
        });

        res.json({
            success: true,
            message: 'Peso final actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al agregar peso final:', error);
        res.status(500).json({
            success: false,
            error: 'Error al agregar el peso final'
        });
    }
});
app.put('/editar-calculo-mp/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const {
            productos,
            peso_inicial,
            peso_final,
            peso_merma,
            observaciones,
            motivo
        } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Get current data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Calcular mp!A2:K'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Registro no encontrado'
            });
        }

        // Format products data
        const materia_prima = productos.map(p => p.producto).join('-');
        const gramaje = productos.map(p => p.gramaje).join('-');
        const ctd_producida = productos.map(p => p.cantidad).join('-');

        // Prepare updated row
        const updatedRow = [
            rows[rowIndex][0], // ID
            rows[rowIndex][1], // Fecha
            rows[rowIndex][2], // Nombre
            rows[rowIndex][3], // Responsable
            materia_prima,     // Materia Prima
            gramaje,          // Gramaje
            peso_inicial,     // Peso Inicial
            peso_final,       // Peso Final
            ctd_producida,    // Cantidad Producida
            peso_merma,       // Peso Merma
            observaciones     // Observaciones
        ];

        // Update the row
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Calcular mp!A${rowIndex + 2}:K${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [updatedRow]
            }
        });

        // Enviar respuesta de éxito con los datos actualizados
        res.json({
            success: true,
            message: 'Cálculo actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al editar cálculo:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error al editar el cálculo'
        });
    }
});

/* ==================== RUTAS DE TAREAS ACOPIO ==================== */
app.get('/obtener-tareas', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Tareas!A2:H' // Columnas A a G para todos los campos
        });

        const rows = response.data.values || [];
        const tareas = rows.map(row => ({
            id: row[0] || '',                    // ID
            fecha: row[1] || '',                 // FECHA
            producto: row[2] || '',              // PRODUCTO
            hora_inicio: row[3] || '',           // HORA-INICIO
            hora_fin: row[4] || '',              // HORA-FIN
            procedimientos: row[5] || '',        // PROCEDIMIENTOS
            operador: row[6] || '',              // OPERADOR
            observaciones: row[7] || ''          // OBSERVACIONES
        }));

        res.json({
            success: true,
            tareas
        });

    } catch (error) {
        console.error('Error al obtener tareas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las tareas'
        });
    }
});
app.get('/obtener-lista-tareas', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Lista tareas!A2:B' // Columnas A y B para ID y TAREA
        });

        const rows = response.data.values || [];
        const tareas = rows.map(row => ({
            id: row[0] || '',       // ID
            tarea: row[1] || ''     // TAREA
        }));

        res.json({
            success: true,
            tareas
        });

    } catch (error) {
        console.error('Error al obtener lista de tareas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener la lista de tareas'
        });
    }
});
app.put('/finalizar-tarea/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { hora_fin, procedimientos, observaciones } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener fecha actual
        const ahora = new Date();
        const hora_fin_actual = ahora.toLocaleTimeString('es-BO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/La_Paz'
        });

        // Obtener datos actuales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Tareas!A2:H'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada'
            });
        }

        // Preparar fila actualizada
        const updatedRow = [
            ...rows[rowIndex].slice(0, 4), // Mantener datos hasta hora_inicio
            hora_fin_actual,               // Agregar hora_fin actual
            procedimientos,                // Agregar procedimientos (lista de tareas)
            rows[rowIndex][6],            // Mantener operador
            observaciones || ''            // Agregar observaciones
        ];

        // Actualizar la fila
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Tareas!A${rowIndex + 2}:H${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [updatedRow]
            }
        });

        res.json({
            success: true,
            message: 'Tarea finalizada correctamente'
        });

    } catch (error) {
        console.error('Error al finalizar tarea:', error);
        res.status(500).json({
            success: false,
            error: 'Error al finalizar la tarea'
        });
    }
});
app.delete('/eliminar-tarea/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { motivo } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Get spreadsheet info
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const tareasSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Tareas'
        );

        if (!tareasSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de tareas no encontrada'
            });
        }

        // Get current rows
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Tareas!A2:H'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada'
            });
        }

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: tareasSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1,
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Tarea eliminada correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la tarea'
        });
    }
});
app.put('/editar-tarea/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { procedimientos, observaciones, motivo } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener datos actuales
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Tareas!A2:H'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada'
            });
        }

        // Preparar fila actualizada
        const updatedRow = [
            ...rows[rowIndex].slice(0, 5), // Mantener datos hasta procedimientos
            procedimientos,                // Actualizar procedimientos
            rows[rowIndex][6],            // Mantener operador
            observaciones || ''           // Actualizar observaciones
        ];

        // Actualizar la fila
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Tareas!A${rowIndex + 2}:H${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [updatedRow]
            }
        });

        res.json({
            success: true,
            message: 'Tarea actualizada correctamente'
        });

    } catch (error) {
        console.error('Error al editar tarea:', error);
        res.status(500).json({
            success: false,
            error: 'Error al editar la tarea'
        });
    }
});
app.post('/registrar-tarea', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { producto, hora_inicio, operador } = req.body;

        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener último ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Tareas!A2:A'
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            Math.max(...rows.map(row => parseInt(row[0].split('-')[1]))) : 0;
        const newId = `TA-${(lastId + 1).toString().padStart(3, '0')}`;

        // Fecha actual en formato dd/mm/yyyy
        const fecha = new Date().toLocaleDateString('es-ES');

        // Crear nuevo registro
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Tareas!A2:H',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[
                    newId,           // ID
                    fecha,           // FECHA
                    producto,        // PRODUCTO
                    hora_inicio,     // HORA-INICIO
                    '',             // HORA-FIN
                    '',             // PROCEDIMIENTOS
                    operador,        // OPERADOR
                    ''              // OBSERVACIONES
                ]]
            }
        });

        res.json({
            success: true,
            message: 'Tarea registrada correctamente'
        });

    } catch (error) {
        console.error('Error al registrar tarea:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar la tarea'
        });
    }
});
app.post('/agregar-tarea-lista', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { tarea } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get current tasks to calculate next ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Lista tareas!A2:B'
        });

        const rows = response.data.values || [];
        const lastId = rows.length > 0 ?
            Math.max(...rows.map(row => parseInt(row[0].split('-')[1]))) : 0;
        const newId = `TL-${(lastId + 1).toString().padStart(3, '0')}`;

        // Add new task
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Lista tareas!A2:B',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[newId, tarea]]
            }
        });

        res.json({
            success: true,
            message: 'Tarea agregada correctamente',
            id: newId
        });

    } catch (error) {
        console.error('Error al agregar tarea:', error);
        res.status(500).json({
            success: false,
            error: 'Error al agregar la tarea'
        });
    }
});
app.delete('/eliminar-tarea-lista/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get spreadsheet info
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const tareasSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Lista tareas'
        );

        if (!tareasSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de tareas no encontrada'
            });
        }

        // Get current rows
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Lista tareas!A2:B'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada'
            });
        }

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: tareasSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1,
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Tarea eliminada correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la tarea'
        });
    }
});

/* ==================== RUTAS DE CONFIGURACIONES DEL SISTEMA ==================== */
app.get('/obtener-configuraciones', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Configuraciones!A2:F'
        });

        const rows = response.data.values || [];

        // Obtener configuraciones de horario y estado
        const configuraciones = {
            horario: {
                nombre: rows[0][0] || '',
                horaInicio: rows[0][1] || '',
                horaFin: rows[0][2] || ''
            },
            sistema: {
                nombre: rows[0][4] || '',
                estado: rows[0][5] || ''
            }
        };

        res.json({
            success: true,
            configuraciones
        });

    } catch (error) {
        console.error('Error al obtener configuraciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las configuraciones'
        });
    }
});
app.put('/actualizar-configuraciones', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { horaInicio, horaFin, estado } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Actualizar configuraciones
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Configuraciones!B2:C2',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[horaInicio, horaFin]]
            }
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Configuraciones!F2',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[estado]]
            }
        });

        res.json({
            success: true,
            message: 'Configuraciones actualizadas correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar configuraciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar las configuraciones'
        });
    }
});

/* ==================== RUTAS DE PRECIOS Y ETIQUETAS WEB ==================== */
app.post('/guardar-precios-web', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { precios } = req.body; // [{ producto_id, precio }]
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        // Limpiar hoja antes de guardar
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Precio web!A2:C'
        });
        // Guardar nuevos precios
        const values = precios.map(p => [p.producto_id, '', p.precio]);
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Precio web!A2:C',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al guardar precios web' });
    }
});
app.post('/guardar-precio-web', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { precio } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Guardar el precio seleccionado en A1
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Precio web!A1',
            valueInputOption: 'RAW',
            resource: {
                values: [[precio]]
            }
        });

        res.json({ success: true, message: 'Precio web guardado correctamente' });
    } catch (error) {
        console.error('Error al guardar precio web:', error);
        res.status(500).json({ success: false, error: 'Error al guardar precio web' });
    }
});
app.get('/obtener-precio-web', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Precio web!A1'
        });

        const precio = response.data.values?.[0]?.[0] || '';
        res.json({ success: true, precio });
    } catch (error) {
        console.error('Error al obtener precio web:', error);
        res.status(500).json({ success: false, error: 'Error al obtener precio web' });
    }
});
app.post('/guardar-etiquetas-web', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { etiquetas } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Limpiar toda la columna A desde A1
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Etiquetas web!A:A'
        });

        // Guardar las etiquetas seleccionadas en la columna A
        if (etiquetas.length > 0) {
            const values = etiquetas.map(etiqueta => [etiqueta]);
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Etiquetas web!A1',
                valueInputOption: 'RAW',
                resource: {
                    values: values
                }
            });
        }

        res.json({ success: true, message: 'Etiquetas web guardadas correctamente' });
    } catch (error) {
        console.error('Error al guardar etiquetas web:', error);
        res.status(500).json({ success: false, error: 'Error al guardar etiquetas web' });
    }
});
app.get('/obtener-etiquetas-web', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Etiquetas web!A:A'
        });

        const etiquetas = response.data.values?.map(row => row[0]).filter(etiqueta => etiqueta) || [];
        res.json({ success: true, etiquetas });
    } catch (error) {
        console.error('Error al obtener etiquetas web:', error);
        res.status(500).json({ success: false, error: 'Error al obtener etiquetas web' });
    }
});

// ==================== RUTAS DE CATÁLOGO PDF ====================
app.post('/subir-catalogo', requireAuth, (req, res, next) => {
    const drive = google.drive({ version: 'v3', auth });
    const CATALOGO_FOLDER = process.env.CATALOGO_FOLDER;
    // Configurar timeout más largo para Vercel
    const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    if (isVercel) {
        req.setTimeout(30000); // 30 segundos para Vercel
        res.setTimeout(30000);
    }

    upload.single('catalogo')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('[Catalogo] Error de Multer:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: 'El archivo es demasiado grande. Máximo 10MB.'
                });
            }
            return res.status(400).json({
                success: false,
                error: 'Error al procesar el archivo'
            });
        } else if (err) {
            console.error('[Catalogo] Error de validación:', err);
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }
        next();
    });
}, async (req, res) => {


    try {
        if (!req.file) {

            return res.status(400).json({ success: false, error: 'No se envió ningún archivo' });
        }

        if (!CATALOGO_FOLDER) {

            return res.status(500).json({
                success: false,
                error: 'No está configurada la carpeta de catálogo. Contacta al administrador.'
            });
        }

        // Verificar que el archivo sea PDF
        if (req.file.mimetype !== 'application/pdf') {

            return res.status(400).json({
                success: false,
                error: 'Solo se permiten archivos PDF'
            });
        }


        // 1. Buscar y borrar el catálogo anterior
        try {
            const list = await drive.files.list({
                q: `'${CATALOGO_FOLDER}' in parents and name = 'catalogo-damabrava.pdf' and trashed = false`,
                fields: 'files(id)'
            });

            for (const file of list.data.files) {

                await drive.files.delete({ fileId: file.id });
            }
        } catch (driveError) {
            console.error('[Catalogo] Error al buscar/eliminar archivos anteriores:', driveError);
            // Continuar con la subida aunque falle la eliminación
        }


        // 2. Subir el nuevo catálogo
        const fileMetadata = {
            name: 'catalogo-damabrava.pdf',
            parents: [CATALOGO_FOLDER]
        };

        // Usar directamente el buffer sin crear archivo temporal (compatible con Vercel)


        try {
            let response;
            // Usar fs solo si no estamos en Vercel
            const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

            if (isVercel) {
                // En Vercel: usar stream desde buffer
                const { Readable } = await import('stream');
                const stream = Readable.from(req.file.buffer);

                response = await drive.files.create({
                    resource: fileMetadata,
                    media: { mimeType: 'application/pdf', body: stream },
                    fields: 'id'
                });

            } else {
                // En local: usar archivo temporal como antes
                const tmpPath = `./tmp-catalogo-${Date.now()}.pdf`;
                fs.writeFileSync(tmpPath, req.file.buffer);

                response = await drive.files.create({
                    resource: fileMetadata,
                    media: { mimeType: 'application/pdf', body: fs.createReadStream(tmpPath) },
                    fields: 'id'
                });


                // Limpiar archivo temporal
                fs.unlinkSync(tmpPath);
            }

            // 3. Hacer público el archivo

            try {
                await drive.permissions.create({
                    fileId: response.data.id,
                    requestBody: { role: 'reader', type: 'anyone' }
                });
            } catch (permissionError) {
                console.warn('[Catalogo] No se pudo hacer público el archivo:', permissionError);
                // Continuar aunque falle la configuración de permisos
            }

            // 4. Obtener la URL pública
            const url = `https://drive.google.com/file/d/${response.data.id}/preview`;

            res.json({ success: true, url });

        } catch (uploadError) {
            console.error('[Catalogo] Error durante la subida:', uploadError);
            throw uploadError;
        }

    } catch (error) {
        console.error('[Catalogo] Error al subir catálogo:', error);
        console.error('[Catalogo] Stack trace:', error.stack);

        // Mensajes de error más específicos
        let errorMessage = 'Error al subir el catálogo';

        if (error.code === 403) {
            errorMessage = 'No tienes permisos para subir archivos a Google Drive';
        } else if (error.code === 404) {
            errorMessage = 'La carpeta de catálogo no existe o no tienes acceso';
        } else if (error.message.includes('quota')) {
            errorMessage = 'Se ha excedido la cuota de Google Drive';
        } else if (error.message.includes('network')) {
            errorMessage = 'Error de conexión con Google Drive';
        } else if (error.message.includes('ENOENT') || error.message.includes('EACCES')) {
            errorMessage = 'Error de permisos del sistema (entorno serverless)';
        } else if (error.message.includes('stream')) {
            errorMessage = 'Error al procesar el archivo (formato no válido)';
        }

        res.status(500).json({ success: false, error: errorMessage });
    }
});
app.get('/obtener-catalogo', requireAuth, async (req, res) => {

    const drive = google.drive({ version: 'v3', auth });
    const CATALOGO_FOLDER = process.env.CATALOGO_FOLDER;
    try {
        if (!CATALOGO_FOLDER) {
            console.error('[Catalogo] No está configurada la carpeta de catálogo');
            return res.status(500).json({
                success: false,
                error: 'No está configurada la carpeta de catálogo. Contacta al administrador.'
            });
        }

        const list = await drive.files.list({
            q: `'${CATALOGO_FOLDER}' in parents and name = 'catalogo-damabrava.pdf' and trashed = false`,
            fields: 'files(id)'
        });

        if (!list.data.files.length) {

            return res.json({ success: true, url: null });
        }

        const fileId = list.data.files[0].id;
        const url = `https://drive.google.com/file/d/${fileId}/preview`;

        res.json({ success: true, url });

    } catch (error) {
        console.error('[Catalogo] Error al obtener catálogo:', error);
        console.error('[Catalogo] Stack trace:', error.stack);

        // Mensajes de error más específicos
        let errorMessage = 'Error al obtener el catálogo';

        if (error.code === 403) {
            errorMessage = 'No tienes permisos para acceder a Google Drive';
        } else if (error.code === 404) {
            errorMessage = 'La carpeta de catálogo no existe o no tienes acceso';
        } else if (error.message.includes('quota')) {
            errorMessage = 'Se ha excedido la cuota de Google Drive';
        } else if (error.message.includes('network')) {
            errorMessage = 'Error de conexión con Google Drive';
        }

        res.status(500).json({ success: false, error: errorMessage });
    }
});



/* ==================== INICIALIZACIÓN DEL SERVIDOR ==================== */

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running in port: ${port}`);
    });
}

export default app;