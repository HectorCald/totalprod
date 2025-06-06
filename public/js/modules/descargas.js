let productos = [];
let precios = [];
const DB_NAME = 'damabrava_db';
const STORE_NAME = 'imagenes_cache';

async function obtenerDatos() {
    try {
        mostrarCarga();
        const [productosResponse, preciosResponse] = await Promise.all([
            fetch('/obtener-productos'),
            fetch('/obtener-precios')
        ]);

        const productosData = await productosResponse.json();
        const preciosData = await preciosResponse.json();

        if (productosData.success && preciosData.success) {
            // Guardar los productos y ordenarlos
            productos = productosData.productos.sort((a, b) => {
                const idA = parseInt(a.id.split('-')[1]);
                const idB = parseInt(b.id.split('-')[1]);
                return idB - idA;
            });

            // Procesar y guardar todas las imágenes antes de continuar
            await Promise.all(productos.map(async producto => {
                if (producto.imagen && producto.imagen.includes('https://res.cloudinary.com')) {
                    const imagenCache = await obtenerImagenLocal(producto.id);
                    if (!imagenCache || necesitaActualizacion(imagenCache, producto.imagen)) {
                        await guardarImagenLocal(producto.id, producto.imagen);
                    }
                }
            }));

            precios = preciosData.precios;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error al obtener datos:', error);
        return false;
    } finally {
        ocultarCarga();
    }
}

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

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
async function guardarImagenLocal(id, imageUrl) {
    try {
        console.log(`⌛ Guardando imagen ${id}...`);
        const db = await initDB();

        // Primero verificar si existe
        const tx1 = db.transaction(STORE_NAME, 'readonly');
        const store1 = tx1.objectStore(STORE_NAME);

        const existente = await new Promise((resolve) => {
            const request = store1.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });

        if (existente &&
            existente.url === imageUrl &&
            Date.now() - existente.timestamp < 24 * 60 * 60 * 1000) {
            console.log(`📦 Imagen ya en caché: ${id}`);
            return existente;
        }

        // Si necesita actualizarse, procesar y guardar en una nueva transacción
        const blob = await urlToBlob(imageUrl);
        const base64 = await blobToBase64(blob);

        const imagenCache = {
            id,
            url: imageUrl,
            data: base64,
            timestamp: Date.now()
        };

        // Nueva transacción para guardar
        const tx2 = db.transaction(STORE_NAME, 'readwrite');
        const store2 = tx2.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store2.put(imagenCache);

            // Esperar a que complete la transacción
            tx2.oncomplete = () => {
                console.log(`✅ Imagen ${id} guardada exitosamente`);
                resolve(imagenCache);
            };

            tx2.onerror = () => {
                console.error(`Error en transacción para ${id}:`, tx2.error);
                reject(tx2.error);
            };

            tx2.onabort = () => {
                console.error(`Transacción abortada para ${id}`);
                reject(new Error('Transacción abortada'));
            };
        });

    } catch (error) {
        console.error(`❌ Error guardando imagen ${id}:`, error);
        return null;
    }
}
async function obtenerImagenLocal(id) {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error obteniendo imagen del cache:', error);
        return null;
    }
}
async function urlToBlob(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return blob;
}
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
function necesitaActualizacion(imagenCache, nuevaUrl) {
    if (!imagenCache) return true;
    if (imagenCache.url !== nuevaUrl) return true;

    // Opcional: verificar si el cache es muy antiguo (ej: más de 1 día)
    const unDia = 24 * 60 * 60 * 1000;
    if (Date.now() - imagenCache.timestamp > unDia) return true;

    return false;
}



function filtrarProductos() {
    // Función auxiliar para verificar etiquetas
    const tieneEtiqueta = (etiquetas, buscar) => {
        if (!etiquetas) return false;
        return etiquetas.split(';').some(etiqueta =>
            etiqueta.trim().toLowerCase() === buscar.toLowerCase()
        );
    };

    // Filtrar productos base
    const productosFiltrados = productos
        .filter(producto => {
            const tieneGramaje200 = tieneEtiqueta(producto.etiquetas, '200 gr');
            const tieneGramaje500 = tieneEtiqueta(producto.etiquetas, '500 gr');
            const tieneGramaje1000 = tieneEtiqueta(producto.etiquetas, '1000 gr');
            const esAmapolita = tieneEtiqueta(producto.etiquetas, 'amapolita');
            const esSC = tieneEtiqueta(producto.etiquetas, 'Santa Cruz');

            return !tieneGramaje200 && !tieneGramaje500 && !tieneGramaje1000 && !esAmapolita && !esSC;
        });

    // Separar en tres categorías y ordenar los normales alfabéticamente
    const productosNormales = productosFiltrados
        .filter(producto =>
            !tieneEtiqueta(producto.etiquetas, 'botes') &&
            !tieneEtiqueta(producto.etiquetas, 'Items')
        )
        .sort((a, b) => a.producto.localeCompare(b.producto, 'es')); // Ordenar A-Z en español

    const productosBotes = productosFiltrados.filter(producto =>
        tieneEtiqueta(producto.etiquetas, 'botes')
    );

    const productosItems = productosFiltrados.filter(producto =>
        tieneEtiqueta(producto.etiquetas, 'Items')
    );

    return {
        normales: productosNormales,
        botes: productosBotes,
        items: productosItems
    };
}


export async function mostrarDescargaCatalogo() {
    const contenido = document.querySelector('.anuncio .contenido');
    // Render initial interface
    contenido.innerHTML = `
        <div class="encabezado">
            <h1 class="titulo">Descargas</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <div class="btn-container">
                <button class="btn blue btn-catalogo">
                    <i class='bx bx-book-open' style="color: white !important;"></i>Catálogo
                </button>
            </div>
        </div>
    `;
    mostrarAnuncio();

    const btnCatalogo = contenido.querySelector('.btn-catalogo');
    btnCatalogo.addEventListener('click', mostrarOpcionesCatalogo);
}
async function mostrarOpcionesCatalogo() {
    await obtenerDatos();

    const contenido = document.querySelector('.anuncio-second .contenido');
    const botonesPrecios = precios.map(precio => `
        <button class="btn especial btn-precio" style="color: white; border: 1px solid red"data-precio="${precio.precio}">
            <i class='bx bxs-file-pdf' style="color:red !important;"></i> Catálogo ${precio.precio}
        </button>
    `).join('');

    contenido.innerHTML = `
        <div class="encabezado">
            <h1 class="titulo">Seleccionar Catálogo</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
                ${botonesPrecios}
        </div>
    `;
    mostrarAnuncioSecond();

    // Agregar eventos a los botones
    const botones = contenido.querySelectorAll('.btn-precio');
    botones.forEach(boton => {
        boton.addEventListener('click', () => generarCatalogo(boton.dataset.precio));
    });
}
async function generarCatalogo(tipoPrecio) {
    try {
        mostrarCarga();
        const { normales, botes, items } = filtrarProductos();

        const pageWidth = 297;
        const pageHeight = 210 - 20;

        const doc = new window.jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [pageWidth, pageHeight]
        });

        // Primera página (cabecera)
        const cabecera = '/img/cabecera-catalogo-trans.webp';
        doc.addImage(cabecera, 'PNG', 0, 0, pageWidth, pageHeight);

        const margin = 15;
        const productosPerPage = 6;
        const productoWidth = (pageWidth - (margin * 4)) / 3;
        const productoHeight = (pageHeight - (margin * 3)) / 2;

        // Función auxiliar para procesar producto individual
        const procesarProducto = async (producto, xPos, yPos) => {
            try {
                const imgSize = 60;
                let imagenData = '/img/logotipo-damabrava-1x1.png'; // imagen por defecto

                if (producto.imagen && producto.imagen.includes('https://res.cloudinary.com')) {
                    const imagenCache = await obtenerImagenLocal(producto.id);
                    if (imagenCache && !necesitaActualizacion(imagenCache, producto.imagen)) {
                        imagenData = imagenCache.data; // Usar directamente el base64 del caché
                    }
                }

                // Agregar al PDF
                doc.addImage(
                    imagenData,
                    'WEBP',
                    xPos + (productoWidth - imgSize) / 2,
                    yPos,
                    imgSize,
                    imgSize,
                    undefined,
                    'FAST'
                );


                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                doc.setTextColor('#f39c12');
                const nombreY = yPos + imgSize + 8;
                const textWidth = doc.getTextWidth(producto.producto);
                doc.text(
                    producto.producto,
                    xPos + (productoWidth - textWidth) / 2,
                    nombreY
                );

                // Gramaje y precio separados
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(15);
                doc.setTextColor('#FFFFFF');
                const precio = obtenerPrecio(producto.precios, tipoPrecio);
                if (precio) {
                    // Gramaje
                    const textoGramaje = `Gramaje: ${producto.gramos} gr.`;
                    const gramajeWidth = doc.getTextWidth(textoGramaje);
                    doc.text(
                        textoGramaje,
                        xPos + (productoWidth - gramajeWidth) / 2,
                        nombreY + 6
                    );

                    // Precio
                    const textoPrecio = `Precio: Bs/${precio}`;
                    const precioWidth = doc.getTextWidth(textoPrecio);
                    doc.text(
                        textoPrecio,
                        xPos + (productoWidth - precioWidth) / 2,
                        nombreY + 12
                    );
                }
            } catch (error) {
                console.error('Error al procesar producto:', error);
            }
        };

        // Procesar productos normales
        for (let i = 0; i < normales.length; i += productosPerPage) {
            doc.addPage([pageWidth, pageHeight]);

            try {
                const fondo = '/img/fondo-catalogo-trans.webp';
                doc.addImage(fondo, 'WEBP', 0, 0, pageWidth, pageHeight);
            } catch (error) {
                console.error('Error al cargar fondo:', error);
            }

            const productosEnPagina = normales.slice(i, i + productosPerPage);
            for (let j = 0; j < productosEnPagina.length; j++) {
                const row = Math.floor(j / 3);
                const col = j % 3;
                const xPos = margin + (col * (productoWidth + margin));
                const yPos = margin + (row * (productoHeight + margin));
                await procesarProducto(productosEnPagina[j], xPos, yPos);
            }
        }

        // Sección de botes
        if (botes.length > 0) {
            doc.addPage([pageWidth, pageHeight]);
            try {
                const fondo = '/img/fondo-catalogo-trans.webp';
                doc.addImage(fondo, 'WEBP', 0, 0, pageWidth, pageHeight);
            } catch (error) {
                console.error('Error al cargar fondo:', error);
            }

            // Título sección botes
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor('#FFFFFF');
            doc.text('BOTES', margin, margin);

            for (let i = 0; i < botes.length; i += productosPerPage) {
                if (i > 0) {
                    doc.addPage([pageWidth, pageHeight]);
                    try {
                        const fondo = '/img/fondo-catalogo-trans.webp';
                        doc.addImage(fondo, 'WEBP', 0, 0, pageWidth, pageHeight);
                    } catch (error) {
                        console.error('Error al cargar fondo:', error);
                    }
                }

                const productosEnPagina = botes.slice(i, i + productosPerPage);
                for (let j = 0; j < productosEnPagina.length; j++) {
                    const row = Math.floor(j / 3);
                    const col = j % 3;
                    const xPos = margin + (col * (productoWidth + margin));
                    const yPos = (i === 0 ? margin : margin) + (row * (productoHeight + margin));
                    await procesarProducto(productosEnPagina[j], xPos, yPos);
                }
            }
        }

        // Sección de items
        if (items.length > 0) {
            doc.addPage([pageWidth, pageHeight]);
            try {
                const fondo = '/img/fondo-catalogo-trans.webp';
                doc.addImage(fondo, 'WEBP', 0, 0, pageWidth, pageHeight);
            } catch (error) {
                console.error('Error al cargar fondo:', error);
            }

            // Título sección items
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor('#FFFFFF');
            doc.text('ARTICULOS ADICIONALES', margin, margin + 10);

            for (let i = 0; i < items.length; i += productosPerPage) {
                if (i > 0) {
                    doc.addPage([pageWidth, pageHeight]);
                    try {
                        const fondo = '/img/fondo-catalogo-trans.webp';
                        doc.addImage(fondo, 'WEBP', 0, 0, pageWidth, pageHeight);
                    } catch (error) {
                        console.error('Error al cargar fondo:', error);
                    }
                }

                const productosEnPagina = items.slice(i, i + productosPerPage);
                for (let j = 0; j < productosEnPagina.length; j++) {
                    const row = Math.floor(j / 3);
                    const col = j % 3;
                    const xPos = margin + (col * (productoWidth + margin));
                    const yPos = (i === 0 ? margin + 20 : margin) + (row * (productoHeight + margin));
                    await procesarProducto(productosEnPagina[j], xPos, yPos);
                }
            }
        }

        // Guardar PDF
        doc.save(`Catalogo_${tipoPrecio}_${new Date().toLocaleDateString()}.pdf`);

    } catch (error) {
        console.error('Error al generar catálogo:', error);
        mostrarNotificacion({
            message: 'Error al generar el catálogo',
            type: 'error',
            duration: 3500
        });
    } finally {
        ocultarCarga();
    }
}
const loadImage = async (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
};
function obtenerPrecio(preciosString, tipoPrecio) {
    const precios = preciosString.split(';');
    const precioEncontrado = precios.find(p => p.startsWith(tipoPrecio + ','));
    if (precioEncontrado) {
        const valor = precioEncontrado.split(',')[1];
        return valor !== '0' ? valor : null;
    }
    return null;
}


