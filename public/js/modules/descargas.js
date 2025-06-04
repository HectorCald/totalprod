
let productos = [];
let precios = [];


const DEFAULT_IMAGE = '/img/Logotipo-damabrava-1x1.png';

async function obtenerDatos() {
    try {
        mostrarCarga()
        const [productosResponse, preciosResponse] = await Promise.all([
            fetch('/obtener-productos'),
            fetch('/obtener-precios')
        ]);

        const productosData = await productosResponse.json();
        const preciosData = await preciosResponse.json();

        if (productosData.success && preciosData.success) {
            productos = productosData.productos;
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
        <button class="btn especial btn-precio" style="color: var(--text); border: 1px solid red"data-precio="${precio.precio}">
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
        const imageCache = new Map();
        const preloadImages = async (productos) => {
            const uniqueUrls = new Set(productos.map(p => p.imagen).filter(Boolean));
            uniqueUrls.add(DEFAULT_IMAGE); // Asegurar que la imagen por defecto esté en caché

            const promises = Array.from(uniqueUrls).map(async url => {
                try {
                    const img = await loadImage(url);
                    imageCache.set(url, img);
                } catch (error) {
                    console.warn(`Failed to preload image: ${url}`, error);
                    // No rechazar la promesa completa si falla una imagen
                }
            });

            await Promise.allSettled(promises); // Usar allSettled en lugar de all
        };

        // Precargar todas las imágenes al inicio
        await Promise.all([
            preloadImages(normales),
            preloadImages(botes),
            preloadImages(items)
        ]);

        // Variables para control de páginas y productos
        const pageWidth = 297; // Ancho A4 landscape en mm
        const pageHeight = 210 - 20; // Alto A4 landscape en mm - 20mm de reducción

        const doc = new window.jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [pageWidth, pageHeight]
        });

        // Primera página (cabecera)
        try {
            const cabecera = await loadImage('/img/cabecera-catalogo-trans.webp');
            doc.addImage(cabecera, 'webp', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        } catch (error) {
            console.error('Error al cargar cabecera:', error);
        }

        const margin = 15;
        const productosPerPage = 6;
        const productoWidth = (pageWidth - (margin * 4)) / 3;
        const productoHeight = (pageHeight - (margin * 3)) / 2;

        // Función auxiliar para procesar producto individual
        const procesarProducto = async (producto, xPos, yPos) => {
            try {
                const imgSize = 60;
                const imageUrl = producto.imagen || DEFAULT_IMAGE;

                // Usar imagen del caché o cargarla si no existe
                let img = imageCache.get(imageUrl) || imageCache.get(DEFAULT_IMAGE);
                if (!img) {
                    try {
                        img = await loadImage(imageUrl);
                        imageCache.set(imageUrl, img);
                    } catch (error) {
                        console.warn(`Error loading image for ${producto.producto}:`, error);
                        img = await loadImage(DEFAULT_IMAGE);
                        imageCache.set(DEFAULT_IMAGE, img);
                    }
                }

                // En la función procesarProducto, modificar la parte de addImage:
                doc.addImage(
                    img,
                    'png',
                    xPos + (productoWidth - imgSize) / 2,
                    yPos,
                    imgSize,
                    imgSize,
                    undefined,
                    'FAST'  // Removido el parámetro 0 para mantener transparencia
                );

                // Nombre del producto (Lobster y naranja)
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
                    const textoGramaje = `Gramaje: ${producto.gramos} gr`;
                    const gramajeWidth = doc.getTextWidth(textoGramaje);
                    doc.text(
                        textoGramaje,
                        xPos + (productoWidth - gramajeWidth) / 2,
                        nombreY + 6
                    );

                    // Precio
                    const textoPrecio = `Precio: Bs./${precio}`;
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
                const fondo = await loadImage('/img/fondo-catalogo-trans.webp');
                doc.addImage(fondo, 'webp', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
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
                const fondo = await loadImage('/img/fondo-catalogo-trans.webp');
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
                        const fondo = await loadImage('/img/fondo-catalogo-trans.webp');
                        doc.addImage(fondo, 'webp', 0, 0, pageWidth, pageHeight);
                    } catch (error) {
                        console.error('Error al cargar fondo:', error);
                    }
                }

                const productosEnPagina = botes.slice(i, i + productosPerPage);
                for (let j = 0; j < productosEnPagina.length; j++) {
                    const row = Math.floor(j / 3);
                    const col = j % 3;
                    const xPos = margin + (col * (productoWidth + margin));
                    const yPos = (i === 0 ? margin + 5 : margin) + (row * (productoHeight + margin));
                    await procesarProducto(productosEnPagina[j], xPos, yPos);
                }
            }
        }

        // Sección de items
        if (items.length > 0) {
            doc.addPage([pageWidth, pageHeight]);
            try {
                const fondo = await loadImage('/img/fondo-catalogo-trans.webp');
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
                        const fondo = await loadImage('/img/fondo-catalogo-trans.webp');
                        doc.addImage(fondo, 'webp', 0, 0, pageWidth, pageHeight);
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
        img.crossOrigin = 'Anonymous';

        const timeout = setTimeout(() => {
            img.src = '';
            reject(new Error(`Timeout loading image: ${url}`));
        }, 5000);

        img.onload = () => {
            clearTimeout(timeout);
            if (img.complete && img.naturalWidth > 0) {
                resolve(img);
            } else {
                reject(new Error(`Invalid image: ${url}`));
            }
        };

        img.onerror = () => {
            clearTimeout(timeout);
            // Si falla cualquier imagen, usar logotipo por defecto
            if (url !== DEFAULT_IMAGE) {
                console.warn(`Error loading image: ${url}, using default`);
                const defaultImg = new Image();
                defaultImg.crossOrigin = 'Anonymous';
                defaultImg.onload = () => resolve(defaultImg);
                defaultImg.onerror = () => reject(new Error('Failed to load default image'));
                defaultImg.src = DEFAULT_IMAGE;
            } else {
                reject(new Error('Failed to load default image'));
            }
        };

        img.src = url || DEFAULT_IMAGE;
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