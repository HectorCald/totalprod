/* ==================== IMPORTACIONES==================== */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';


/* ==================== CONFIGURACIÓN INICIAL ==================== */
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = 'secret-totalprod-hcco';


/* ==================== CONFIGURACIÓN DE GOOGLE SHEETS ==================== */
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'damabrava@producciondb.iam.gserviceaccount.com',
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    },
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/spreadsheets"
    ]
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
                            { expiresIn: '744h' }
                        );

                        res.cookie('token', token, {
                            httpOnly: true,
                            secure: true,
                            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días en milisegundos
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
    const { nombre, telefono, email, password, empresa } = req.body;

    // Predefined list of companies and their spreadsheet IDs
    const companies = {
        '12345': process.env.SPREADSHEET_ID_1,
        '6789': process.env.SPREADSHEET_ID_2
    };

    // Validate if the company exists
    const spreadsheetId = companies[empresa];
    if (!spreadsheetId) {
        return res.json({
            success: false,
            error: 'El ID de la empresa es incorrecto o no existe'
        });
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Fetch all user IDs from all spreadsheets to ensure uniqueness
        const allSpreadsheetIds = Object.values(companies);
        let allUserIds = [];

        for (const id of allSpreadsheetIds) {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: id,
                range: 'Usuarios!A2:A'
            });
            const ids = response.data.values || [];
            allUserIds = allUserIds.concat(ids.map(row => row[0]));
        }

        // Generate a unique ID with the format USERTP-001
        let newId;
        let counter = 1;
        do {
            newId = `USERTP-${counter.toString().padStart(3, '0')}`;
            counter++;
        } while (allUserIds.includes(newId));

        // Prepare the new user data
        const nuevoUsuario = [
            newId,              // Unique ID
            `${nombre}`,        // Nombre - Apellido
            telefono,           // Teléfono
            'Pendiente',        // Estado
            'Sin rol',          // Rol
            './icons/default-user.png', // Foto
            '',                 // Plugins
            email,              // Email
            password            // Contraseña
        ];

        // Add the user to the spreadsheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId, // Use the ID based on the company
            range: 'Usuarios!A:I',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [nuevoUsuario]
            }
        });

        return res.json({ success: true, message: 'Solicitud realizada exitosamente' });
    } catch (error) {
        console.error('Error en el registro:', error);
        return res.status(500).json({ error: 'Error al registrar el usuario' });
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
        '12345': process.env.SPREADSHEET_ID_1,
        '6789': process.env.SPREADSHEET_ID_2
    };

    // Check if the company ID exists in the predefined list
    const exists = Object.keys(companies).includes(empresaId);

    return res.json({ exists });
});

/* ==================== RUTAS DE HISTORIAL ==================== */
app.post('/registrar-historial', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;
    const { origen, suceso, detalle } = req.body;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Get last ID to generate new one
        const lastIdResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Historial!A2:A'
        });

        const lastId = lastIdResponse.data.values ?
            Math.max(...lastIdResponse.data.values.map(row => parseInt(row[0].split('-')[1]) || 0)) : 0;
        const newId = `HI-${(lastId + 1).toString().padStart(3, '0')}`;

        const newRow = [
            newId,              // ID
            origen,            // ORIGEN
            suceso,            // SUCESO
            detalle            // DETALLE
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Historial!A:D',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [newRow]
            }
        });

        res.json({
            success: true,
            message: 'Historial registrado correctamente'
        });

    } catch (error) {
        console.error('Error al registrar historial:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar el historial'
        });
    }
});
app.get('/obtener-historial', requireAuth, async (req, res) => {
    const { spreadsheetId } = req.user;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Historial!A2:E' // Columns A through E
        });

        const rows = response.data.values || [];

        // Map the data to the specified format
        const historial = rows.map(row => ({
            id: row[0] || '',
            fecha: row[1] || '',
            destino: row[2] || '',
            suceso: row[3] || '',
            detalle: row[4] || ''
        }));

        res.json({
            success: true,
            historial
        });

    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el historial'
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
            range: 'Usuarios!A2:I'  // Make sure we're getting all columns including the photo
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
    const { producto, gramos, lote, proceso, microondas, envases_terminados, fecha_vencimiento, verificado, observaciones } = req.body;

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
            existingRow[2],
            producto,                       // PRODUCTO
            lote,                 // LOTE
            gramos,                         // GRAMOS
            proceso,                        // PROCESO
            microondas,                     // MICROONDAS
            envases_terminados,             // ENVASES TERMINADOS
            fecha_vencimiento,              // FECHA VENCIMIENTO
            existingRow[10],                 // NOMBRE
            existingRow[11],
            verificado,                // C_REAL
            existingRow[13],                // FECHA_VERIFICACION
            observaciones,                // OBSERVACIONES
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
            range: 'Almacen general!A2:M' // Ahora incluye la columna L para la imagen
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
            imagen: row[11] || './icons/default-product.png', // Valor por defecto si no hay imagen
            uSueltas: row[12] || ''
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
app.put('/actualizar-producto/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const {
            producto,
            gramos,
            stock,
            cantidadxgrupo,
            lista,
            codigo_barras,
            precios,
            etiquetas,
            alm_acopio_id, // Changed from acopio_id to match frontend
            alm_acopio_producto,
            imagen,
            uSueltas
        } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Get current products
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Almacen general!A2:M'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        }

        const updatedRow = [
            id,
            producto,
            gramos,
            stock,
            cantidadxgrupo,
            lista,
            codigo_barras || 'no definido',
            precios,
            etiquetas,
            alm_acopio_id || '',  // Ensure empty string if null/undefined
            alm_acopio_producto || '',
            imagen || '',
            uSueltas || ''
        ];

        // Remove console.log that was causing the error
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Almacen general!A${rowIndex + 2}:M${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [updatedRow] }
        });

        res.json({
            success: true,
            message: 'Producto actualizado correctamente',
            producto: updatedRow
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
        const fecha = new Date().toLocaleString('es-ES');
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
app.delete('/anular-movimiento/:id', requireAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.user;
        const { id } = req.params;
        const { motivo } = req.body;
        const sheets = google.sheets({ version: 'v4', auth });

        // Obtener el registro a anular
        const responseMovimiento = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Movimientos alm-gral!A2:F'
        });

        const movimientos = responseMovimiento.data.values || [];
        const movimientoIndex = movimientos.findIndex(row => row[0] === id);

        if (movimientoIndex === -1) {
            return res.status(404).json({ success: false, error: 'Movimiento no encontrado' });
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

        // Obtener el ID de la hoja
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const movimientosSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Movimientos alm-gral'
        );

        if (!movimientosSheet) {
            return res.status(404).json({
                success: false,
                error: 'Hoja de Movimientos no encontrada'
            });
        }

        // Eliminar la fila completa
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: movimientosSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: movimientoIndex + 1, // +1 por el encabezado
                            endIndex: movimientoIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error al anular movimiento:', error);
        res.status(500).json({ success: false, error: 'Error al anular el movimiento' });
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
            cliente: {
                id: newClient[0],
                nombre,
                telefono,
                direccion,
                zona
            }
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

        console.log(`Cliente ${id} actualizado con motivo: ${motivo}`);

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
            cliente: {
                id: newProv[0],
                nombre,
                telefono,
                direccion,
                zona
            }
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

        console.log(`Producto ${id} actualizado con motivo: ${motivo}`);

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
            range: 'Pedidos!A2:Q' // A to O columns for all fields
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
            cantidadEntregadaKg: row[7] || '',
            proovedor: row[8] || '',
            precio: row[9] || '',
            observacionesCompras: row[10] || '',
            cantidadEntregadaUnd: row[11] || '',
            transporteOtros: row[12] || '',
            estadoCompra: row[13] || '',
            fechaIngreso: row[14] || '',
            cantidadIngresada: row[15] || '',
            observacionesIngresado: row[16] || ''
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
            range: 'Pedidos!A2:Q'
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
            cantidadEntregadaKg, // CANT-ENTR-KG
            proovedor,           // PROOVEDOR
            precio,              // PRECIO
            observacionesCompras,// OBS-COMPRAS
            cantidadEntregadaUnd,// CANT-ENTRG-UND
            transporteOtros,     // TRASP-OTROS
            estadoCompra,        // ESTADO-COMPRA
            currentRow[14],                        // FECHA-INGRESO
            cantidadIngresada,   // CANT-INGRE
            observacionesIngresado // OBS-INGRE
        ];

        // Actualizar en Google Sheets
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pedidos!A${rowIndex + 2}:Q${rowIndex + 2}`,
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
            range: 'Pedidos!A2:P'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
        }

        // Actualizar las columnas H a N
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pedidos!H${rowIndex + 2}:N${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[
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

/* ==================== RUTAS DE ACOPIO INGRESO ALMACEN ACOPIO ==================== */
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
                range: 'Pedidos!A2:Q'
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
                                range: `Pedidos!O${pedidoIndex + 2}`,
                                values: [[fechaActual]]
                            },
                            {
                                range: `Pedidos!P${pedidoIndex + 2}`,
                                values: [[movimientoData.peso]]
                            },
                            {
                                range: `Pedidos!Q${pedidoIndex + 2}`,
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
        const [movimientosResponse, spreadsheet] = await Promise.all([
            sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'Movimientos alm-acopio!A2:K'
            }),
            sheets.spreadsheets.get({ spreadsheetId })
        ]);

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
            range: 'Almacen acopio!A2:J'
        });

        const productos = almacenResponse.data.values || [];
        const productoIndex = productos.findIndex(row => row[0] === idProducto);

        if (productoIndex === -1) {
            throw new Error('Producto no encontrado');
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

        if (esIngreso) {
            lotesArray.pop();
        } else {
            if (lotesArray.length > 0) {
                const [pesoActual, lote] = lotesArray[0].split('-');
                const nuevoPeso = (parseFloat(pesoActual) + peso).toFixed(2);
                lotesArray[0] = `${nuevoPeso}-${lote}`;
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

        // 5. Eliminar el registro
        const movimientosSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === 'Movimientos alm-acopio'
        );

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: movimientosSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: movimientoIndex + 1,
                            endIndex: movimientoIndex + 2
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'Movimiento anulado y eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al anular movimiento:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al anular el movimiento'
        });
    }
});


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
                    justificativos,             // ID-JUST
                    req.body.justificativosDetallados, // JUSTIFICATIVOS con procesos
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
            const totalAPagar = parseFloat(pagoPrincipal[11]); // Total del pago principal
            
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
            saldoPendiente: pagoPrincipal ? Math.max(0, parseFloat(pagoPrincipal[11]) - totalPagado) : 0
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

        const totalAPagar = parseFloat(pagoPrincipal[11]); // Total del pago principal
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


/* ==================== INICIALIZACIÓN DEL SERVIDOR ==================== */
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running in port: ${port}`);
    });
}

export default app;