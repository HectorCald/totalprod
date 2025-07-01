# Configuración de Catálogo PDF

## Problema
El error 500 al subir catálogos se debe a que falta la configuración de la variable de entorno `CATALOGO_FOLDER`.

## Solución

### 1. Configurar Variable de Entorno
Agrega la siguiente variable a tu archivo `.env`:

```env
CATALOGO_FOLDER=ID_DE_TU_CARPETA_GOOGLE_DRIVE
```

### 2. Obtener el ID de la Carpeta
1. Ve a [Google Drive](https://drive.google.com)
2. Crea una carpeta llamada "Catálogos" o similar
3. Abre la carpeta y copia el ID de la URL:
   - URL: `https://drive.google.com/drive/folders/1Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ID: `1Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Configurar Permisos
Asegúrate de que la cuenta de servicio tenga permisos en la carpeta:
1. Haz clic derecho en la carpeta
2. Selecciona "Compartir"
3. Agrega el email de la cuenta de servicio: `damabrava@producciondb.iam.gserviceaccount.com`
4. Dale permisos de "Editor"

### 4. Verificar Configuración
Al reiniciar el servidor, deberías ver en la consola:
```
[Catalogo] ✅ Carpeta de catálogo configurada: 1Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Variables de Entorno Completas
```env
# Google Drive - Catálogo
CATALOGO_FOLDER=1Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=damabrava@producciondb.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Firebase
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_PRIVATE_KEY_ID=tu_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=tu_client_email
FIREBASE_CLIENT_ID=tu_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=tu_cert_url
FIREBASE_UNIVERSE_DOMAIN=googleapis.com

# Servidor
PORT=3000
NODE_ENV=development

# Spreadsheets
SPREADSHEET_ID_1=tu_spreadsheet_id_1
SPREADSHEET_ID_2=tu_spreadsheet_id_2
```

## Mejoras Implementadas
- ✅ Mejor manejo de errores con mensajes específicos
- ✅ Validación de tipo de archivo (solo PDF)
- ✅ Límite de tamaño de archivo (10MB)
- ✅ Compatibilidad con entornos serverless (Vercel)
- ✅ Uso directo de buffer sin archivos temporales
- ✅ Timeouts extendidos para producción
- ✅ Verificación de configuración al iniciar
- ✅ Logs detallados para debugging

## Configuración para Vercel

### Variables de Entorno en Vercel
1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a "Settings" → "Environment Variables"
4. Agrega todas las variables necesarias, especialmente:
   ```env
   CATALOGO_FOLDER=tu_id_de_carpeta_google_drive
   GOOGLE_SERVICE_ACCOUNT_EMAIL=damabrava@producciondb.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

### Permisos de Google Drive
Asegúrate de que la cuenta de servicio tenga permisos de "Editor" en la carpeta de catálogo.

### Límites de Vercel
- Tamaño máximo de archivo: 10MB
- Timeout de función: 30 segundos
- Memoria: 1024MB 