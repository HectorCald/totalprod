
let productos = [];
let precios = [];


async function obtenerDatos() {
    try {
        mostrarCarga('.carga-obtener')
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
        ocultarCarga('.carga-obtener')
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
function ajustarBrillo(img, brillo = 0, saturacion = 1.5) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Aumentar todos los canales de color por igual
        data[i] = Math.min(255, data[i] * saturacion + brillo);     // Rojo
        data[i + 1] = Math.min(255, data[i + 1] * saturacion + brillo); // Verde
        data[i + 2] = Math.min(255, data[i + 2] * saturacion + brillo); // Azul
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}
export async function mostrarDescargaCatalogo() {
    mostrarOpcionesCatalogo();
}
async function mostrarOpcionesCatalogo() {
    await obtenerDatos();

    const contenido = document.querySelector('.anuncio .contenido');
    const botonesPrecios = precios.map(precio => `
        <button class="btn red btn-precio" style="max-width: 100% !important" data-precio="${precio.precio}">
            <i class='bx bxs-file-pdf' style="color:white !important;"></i> Catálogo ${precio.precio}
        </button>
    `).join('');

    contenido.innerHTML = `
        <div class="encabezado">
            <h1 class="titulo">Catálogos</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncio')"><i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="relleno">
            <p class="normal">Selecciona un catalogo para generar el PDF</p>
            <div class="progress-container" style="display: none;">
                <div class="progress-bar"></div>
                <p class="progress-text">Generando catálogo: <span>0%</span></p>
            </div>
            <div class="productos-container">
            ${botonesPrecios}
            </div>
            <div class="info-sistema">
                <i class='bx bx-info-circle'></i>
                <div class="detalle-info">
                    <p>Generar un catalogo podria tardar de 1 minuto a 2 minutos segun la conexion de internet, no salga de esta pantalla mientras el catalogo se esta generando.</p>
                </div>
            </div>
            
        </div>
    `;
    mostrarAnuncio();

    // Agregar eventos a los botones
    const botones = contenido.querySelectorAll('.btn-precio');
    botones.forEach(boton => {
        const progressContainer = document.querySelector('.progress-container');
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text span');
        progressBar.style.width = '1px';
        progressText.textContent = '0%';
        boton.addEventListener('click', () => generarCatalogo(boton.dataset.precio));
    });
}
async function generarCatalogo(tipoPrecio) {
    const botones = document.querySelectorAll('.btn-precio');
    botones.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.2';
        btn.style.cursor = 'not-allowed';
    });

    try {
        const progressContainer = document.querySelector('.progress-container');
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text span');
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';

        const updateProgress = (percent) => {
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;
        };

        const { normales, botes, items } = filtrarProductos();
        const totalProductos = normales.length + botes.length + items.length;
        let productosCompletados = 0;

        const imagenesCargadas = await precargarImagenes([...normales, ...botes, ...items]);

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
            doc.addImage(cabecera, 'WEBP', 0, 0, pageWidth, pageHeight);
            updateProgress(5); // Inicio del progreso
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
                const imageUrl = producto.imagen || '/img/logotipo-damabrava-1x1.png';
                const img = imagenesCargadas.get(imageUrl) || imagenesCargadas.get('/img/logotipo-damabrava-1x1.png');

                if (!img) {
                    throw new Error('Imagen no encontrada en caché');
                }

                // Ajustar brillo antes de agregar al PDF
                const imagenAclarada = ajustarBrillo(img, 0, 1.2);

                doc.addImage(
                    imagenAclarada,
                    'PNG',
                    xPos + (productoWidth - imgSize) / 2,
                    yPos,
                    imgSize,
                    imgSize,
                    undefined,
                    'FAST'
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
                    const textoGramaje = `Gramaje: ${producto.gramos} gr.`;
                    const gramajeWidth = doc.getTextWidth(textoGramaje);
                    doc.text(
                        textoGramaje,
                        xPos + (productoWidth - gramajeWidth) / 2,
                        nombreY + 6
                    );

                    // Precio
                    const textoPrecio = `Precio: Bs. ${Number(precio).toFixed(2)}`;
                    const precioWidth = doc.getTextWidth(textoPrecio);
                    doc.text(
                        textoPrecio,
                        xPos + (productoWidth - precioWidth) / 2,
                        nombreY + 12
                    );
                }

                // Actualizar progreso después de cada producto
                productosCompletados++;
                const porcentaje = Math.round((productosCompletados / totalProductos) * 100);
                updateProgress(porcentaje);

            } catch (error) {
                console.error('Error al procesar producto:', error);
            }
        };

        // Procesar productos normales
        for (let i = 0; i < normales.length; i += productosPerPage) {
            doc.addPage([pageWidth, pageHeight]);

            try {
                const fondo = await loadImage('/img/fondo-catalogo-trans.webp');
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
        // Reactivar los botones al terminar
        const botones = document.querySelectorAll('.btn-precio');
        botones.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    }
}
const loadImage = async (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Esto puede causar retrasos
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
async function precargarImagenes(productos) {
    const imagenesUnicas = new Set();
    const imagenesCargadas = new Map();

    // Recolectar todas las URLs únicas de imágenes
    productos.forEach(producto => {
        const imageUrl = producto.imagen || '/img/logotipo-damabrava-1x1.png';
        imagenesUnicas.add(imageUrl);
    });

    // También precargar imágenes del catálogo
    imagenesUnicas.add('/img/cabecera-catalogo-trans.webp');
    imagenesUnicas.add('/img/fondo-catalogo-trans.webp');

    // Cargar todas las imágenes en paralelo
    const promesasImagenes = Array.from(imagenesUnicas).map(async url => {
        try {
            const img = await loadImage(url);
            imagenesCargadas.set(url, img);
        } catch (error) {
            console.warn(`Error precargando imagen ${url}:`, error);
            // Si falla, intentar cargar la imagen por defecto
            try {
                const defaultImg = await loadImage('/img/logotipo-damabrava-1x1.png');
                imagenesCargadas.set(url, defaultImg);
            } catch (defaultError) {
                console.error('Error cargando imagen por defecto:', defaultError);
            }
        }
    });

    // Esperar a que todas las imágenes se carguen
    await Promise.allSettled(promesasImagenes);
    return imagenesCargadas;
}