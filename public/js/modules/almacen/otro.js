if (tipoEvento === 'ingresos') {
    const botonFlotante = document.createElement('button');

    botonFlotante.className = 'btn-flotante-ingresos';
    botonFlotante.innerHTML = '<i class="fas fa-arrow-down"></i>';
    document.body.appendChild(botonFlotante);

    selectPrecios.addEventListener('change', () => {
        const ciudadSeleccionada = selectPrecios.options[selectPrecios.selectedIndex].text;

        // Actualizar TODOS los precios en el carrito
        carritoSalidas.forEach((item, id) => {
            const preciosProducto = item.precios.split(';');
            const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
            let precioBase = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;
            // Ajustar por modo tira
            item.subtotal = modoTiraGlobal ? precioBase * (item.cantidadxgrupo || 1) : precioBase;
        });

        // Actualizar precios mostrados en los items
        document.querySelectorAll('.registro-item').forEach(registro => {
            const id = registro.dataset.id;
            const producto = productos.find(p => p.id === id);
            if (producto) {
                const preciosProducto = producto.precios.split(';');
                const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
                let precio = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;
                // Ajustar por modo tira
                if (modoTiraGlobal) precio = precio * (producto.cantidadxgrupo || 1);
                const precioSpan = registro.querySelector('.precio');
                if (precioSpan) {
                    precioSpan.textContent = `Bs ${precio.toFixed(2)}`;
                }
            }
        });

        actualizarCarritoUI();
    });
    actualizarBotonFlotante();
    botonFlotante.addEventListener('click', mostrarCarritoIngresos);
    items.forEach(item => {
        item.addEventListener('click', () => agregarAlCarrito(item.dataset.id));
    });
    // Event listener para el switch global de tira
    const switchTiraGlobal = document.querySelector('.switch-tira-global');
    if (switchTiraGlobal) {
        switchTiraGlobal.addEventListener('change', (e) => {
            modoTiraGlobal = e.target.checked;

            // Actualizar estilos del switch
            const slider = e.target.nextElementSibling;
            const sliderThumb = slider && slider.querySelector('.slider-thumb');

            if (modoTiraGlobal) {
                if (slider) slider.style.backgroundColor = '#4CAF50';
                if (sliderThumb) sliderThumb.style.transform = 'translateX(20px)';
                mostrarNotificacion({
                    message: 'Cambiado a modo Tira',
                    type: 'success',
                    duration: 2000
                });
            } else {
                if (slider) slider.style.backgroundColor = '#9b9b9b';
                if (sliderThumb) sliderThumb.style.transform = 'translateX(0)';
                mostrarNotificacion({
                    message: 'Cambiado a modo Unidades',
                    type: 'info',
                    duration: 2000
                });
            }

            // Actualizar precios en el carrito
            carritoSalidas.forEach((item, id) => {
                // Obtener el precio base original del producto
                const producto = productos.find(p => p.id === id);
                if (producto) {
                    const selectPrecios = document.querySelector('.precios-select');
                    const ciudadSeleccionada = selectPrecios.options[selectPrecios.selectedIndex].text;
                    const preciosProducto = producto.precios.split(';');
                    const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
                    const precioBaseOriginal = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;

                    const cantidadxtira = producto.cantidadxgrupo || 1;
                    item.subtotal = modoTiraGlobal ? precioBaseOriginal * cantidadxtira : precioBaseOriginal;
                }
            });

            // Actualizar UI
            actualizarPreciosYStockVista();
            actualizarCarritoUI();
        });
    }

    function actualizarPreciosYStockVista() {
        document.querySelectorAll('.registro-item').forEach(registro => {
            actualizarItemVista(registro.dataset.id);
        });
    }

    function actualizarItemVista(productoId) {
        const registro = document.querySelector(`.registro-item[data-id="${productoId}"]`);
        if (!registro) return;

        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;

        const itemCarrito = carritoSalidas.get(productoId);
        const cantidadEnCarrito = itemCarrito ? itemCarrito.cantidad : 0;
        const cantidadxgrupo = producto.cantidadxgrupo || 1;

        const selectPrecios = document.querySelector('.precios-select');
        const ciudadSeleccionada = selectPrecios.options[selectPrecios.selectedIndex].text;

        // Actualizar precio
        const preciosProducto = producto.precios.split(';');
        const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
        let precio = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;
        const precioFinal = modoTiraGlobal ? precio * cantidadxgrupo : precio;
        const precioSpan = registro.querySelector('.precio');
        if (precioSpan) {
            precioSpan.textContent = `Bs. ${precioFinal.toFixed(2)}`;
        }

        // Actualizar stock
        const stockSpan = registro.querySelector('.stock');
        if (stockSpan) {
            if (modoTiraGlobal) {
                // Stock en tiras
                const stockDisponible = producto.stock - cantidadEnCarrito;
                stockSpan.textContent = `${stockDisponible} Tiras`;
            } else {
                // Stock en unidades
                const stockEnUnidades = (producto.stock * cantidadxgrupo) - cantidadEnCarrito;
                stockSpan.textContent = `${stockEnUnidades} Und.`;
            }
        }

        // Actualizar cantidad en carrito
        const cantidadSpan = registro.querySelector('.carrito-cantidad');
        if (cantidadSpan) {
            cantidadSpan.textContent = itemCarrito ? itemCarrito.cantidad : '';
        }
    }


    function agregarAlCarrito(productoId) {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;

        // Obtener el precio según la ciudad seleccionada actualmente
        const selectPrecios = document.querySelector('.precios-select');
        const ciudadSeleccionada = selectPrecios.options[selectPrecios.selectedIndex].text;
        const preciosProducto = producto.precios.split(';');
        const precioSeleccionado = preciosProducto.find(p => p.split(',')[0] === ciudadSeleccionada);
        const precioActual = precioSeleccionado ? parseFloat(precioSeleccionado.split(',')[1]) : 0;

        // Vibrar el dispositivo si es compatible
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        // Agregar efecto visual al item
        const item = document.querySelector(`.registro-item[data-id="${productoId}"]`);
        if (item) {
            item.classList.add('agregado-al-carrito');
            setTimeout(() => {
                item.classList.remove('agregado-al-carrito');
            }, 500);
        }

        // Aplicar modo tira si está activado
        const cantidadxtira = producto.cantidadxgrupo || 1;
        const precioFinal = modoTiraGlobal ? precioActual * cantidadxtira : precioActual;

        if (carritoSalidas.has(productoId)) {
            const itemCarrito = carritoSalidas.get(productoId);
            itemCarrito.cantidad += 1;
            itemCarrito.subtotal = precioFinal; // Usar el precio final
        } else {
            carritoSalidas.set(productoId, {
                ...producto,
                cantidad: 1,
                subtotal: precioFinal // Usar el precio final
            });
        }

        actualizarItemVista(productoId);
        actualizarCarritoLocalIngresos();
        actualizarBotonFlotante();
        actualizarCarritoUI();
        // Mostrar el carrito automáticamente si la pantalla es grande
        if (window.innerWidth >= 1024) {
            mostrarCarritoIngresos();
            setTimeout(() => {
                const inputCantidad = document.querySelector(`.carrito-item[data-id='${productoId}'] input[type='number']`);
                if (inputCantidad) inputCantidad.focus();
            }, 100);
        }
    }
    window.eliminarDelCarrito = (id) => {
        const itemToRemove = document.querySelector(`.carrito-item[data-id="${id}"]`);
        const item = carritoSalidas.get(id);

        carritoSalidas.delete(id);
        actualizarItemVista(id);

        if (itemToRemove) {
            itemToRemove.style.height = `${itemToRemove.offsetHeight}px`;
            itemToRemove.classList.add('eliminar-item');

            setTimeout(() => {
                itemToRemove.style.height = '0';
                itemToRemove.style.margin = '0';
                itemToRemove.style.padding = '0';

                setTimeout(() => {
                    carritoSalidas.delete(id);
                    actualizarCarritoLocalIngresos();
                    actualizarBotonFlotante();
                    itemToRemove.remove();

                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }

                    if (carritoSalidas.size === 0) {
                        ocultarAnuncioSecond();
                        mostrarNotificacion({
                            message: 'Carrito vacío',
                            type: 'info',
                            duration: 2000
                        });
                        return;
                    }

                    // Actualizar totales
                    const subtotal = Array.from(carritoSalidas.values())
                        .reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0);
                    const totalElement = document.querySelector('.total-final');
                    const subtotalElement = document.querySelector('.campo-vertical span:first-child');

                    if (subtotalElement && totalElement) {
                        subtotalElement.innerHTML = `<strong>Subtotal: </strong>Bs/.${subtotal.toFixed(2)}`;
                        totalElement.innerHTML = `<strong>Total Final: </strong>Bs/.${subtotal.toFixed(2)}`;

                        const descuentoInput = document.querySelector('.descuento');
                        const aumentoInput = document.querySelector('.aumento');
                        if (descuentoInput && aumentoInput) {
                            const descuentoValor = parseFloat(descuentoInput.value) || 0;
                            const aumentoValor = parseFloat(aumentoInput.value) || 0;
                            const totalCalculado = subtotal - descuentoValor + aumentoValor;
                            totalElement.innerHTML = `<strong>Total Final: </strong>Bs/.${totalCalculado.toFixed(2)}`;
                        }
                    }
                }, 300);
            }, 0);
        }
    };
    function actualizarBotonFlotante() {
        const botonFlotante = document.querySelector('.btn-flotante-ingresos');
        if (!botonFlotante) return;

        botonFlotante.style.display = carritoSalidas.size > 0 ? 'flex' : 'none';
        botonFlotante.innerHTML = `
            <i class="bx bx-cart"></i>
            <span class="cantidad">${carritoSalidas.size}</span>
        `;
    }
    function mostrarCarritoIngresos() {
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (!anuncioSecond) return;

        const subtotal = Array.from(carritoSalidas.values()).reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0);
        let descuento = 0;
        let aumento = 0;

        anuncioSecond.innerHTML = `
            <div class="encabezado">
            <h1 class="titulo">Carrito de Ingresos</h1>
            <button class="btn close" onclick="cerrarAnuncioManual('anuncioSecond')"><i class="fas fa-arrow-right"></i></button>
            <button class="btn filtros limpiar"><i class="fas fa-broom"></i></button>
        </div>
        <div class="relleno">
            <div class="carrito-items">
            ${Array.from(carritoSalidas.values()).map(item => `
                <div class="carrito-item" data-id="${item.id}">
                    <div class="item-info">
                        <h3>${item.producto} - ${item.gramos}gr</h3>
                        <div class="cantidad-control">
                            <button class="btn-cantidad" style="color:var(--error)" onclick="ajustarCantidad('${item.id}', -1)">-</button>
                            <input type="number" value="${item.cantidad}" min="1"
                                onfocus="this.select()"
                                onchange="actualizarCantidad('${item.id}', this.value)">
                            <button class="btn-cantidad"style="color:var(--success)" onclick="ajustarCantidad('${item.id}', 1)">+</button>
                        </div>
                    </div>
                    <div class="subtotal-delete">
                        <div class="info-valores">
                            <p class="stock-disponible">${parseInt(item.stock) + parseInt(item.cantidad)} Und.</p>
                            <p class="unitario">Bs. ${(item.subtotal).toFixed(2)}</p>
                            <p class="subtotal">Bs. ${(item.cantidad * item.subtotal).toFixed(2)}</p>
                        </div>
                        <button class="btn-eliminar" onclick="eliminarDelCarrito('${item.id}')">
                            <i class="bx bx-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
                    <div class="carrito-total">
                        <div class="leyenda">
                            <div class="item">
                                <span class="punto orange"></span>
                                <p>Stock actual</p>
                            </div>
                            <div class="item">
                                <span class="punto blue-light"></span>
                                <p>Precio unitario</p>
                            </div>
                            <div class="item">
                                <span class="punto verde"></span>
                                <p>Subtotal</p>
                            </div>
                        </div>
                        <div class="campo-vertical">
                            <span><strong>Subtotal: </strong>Bs. ${subtotal.toFixed(2)}</span>
                            <span class="total-final"><strong>Total Final: </strong>Bs. ${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-label'></i>
                            <div class="input">
                                <p class="detalle">Nombre del movimiento</p>
                                <input class="nombre-movimiento" type="text" autocomplete="off" placeholder=" " required>
                            </div>
                        </div>
                        <div class="campo-horizontal">
                            <div class="entrada">
                                <i class='bx bx-purchase-tag-alt'></i>
                                <div class="input">
                                    <p class="detalle">Descuento</p>
                                    <input class="descuento" type="number" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                            <div class="entrada">
                                <i class='bx bx-plus'></i>
                                <div class="input">
                                    <p class="detalle">Aumento</p>
                                    <input class="aumento" type="number" autocomplete="off" placeholder=" " required>
                                </div>
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-user'></i>
                            <div class="input">
                                <p class="detalle">Selecciona proovedor</p>
                                <select class="select-proovedor" required>
                                    <option value=""></option>
                                    ${proveedores.map(proovedor => `
                                        <option value="${proovedor.nombre}(${proovedor.id})">${proovedor.nombre}</option>
                                    `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones</p>
                            <input class="Observaciones" type="text" autocomplete="off" placeholder=" " required>
                        </div>
                    </div>

                </div>
                </div>
            </div>
            <div class="anuncio-botones">
                <button class="btn-procesar-salida btn green" onclick="registrarIngreso()"><i class='bx bx-import'></i> Procesar Ingresos</button>
            </div>
        `;
        anuncioSecond.style.paddingBottom = '70px'
        mostrarAnuncioSecond();

        const inputDescuento = anuncioSecond.querySelector('.descuento');
        const inputAumento = anuncioSecond.querySelector('.aumento');
        const totalFinal = anuncioSecond.querySelector('.total-final');

        function actualizarTotal() {
            const descuentoValor = parseFloat(inputDescuento.value) || 0;
            const aumentoValor = parseFloat(inputAumento.value) || 0;
            const totalCalculado = subtotal - descuentoValor + aumentoValor;

            totalFinal.innerHTML = `<strong>Total Final: </strong>Bs. ${totalCalculado.toFixed(2)}`;
        }

        inputDescuento.addEventListener('input', actualizarTotal);
        inputAumento.addEventListener('input', actualizarTotal);

        const botonLimpiar = anuncioSecond.querySelector('.btn.filtros.limpiar');
        botonLimpiar.addEventListener('click', () => {
            carritoSalidas.forEach((item, id) => {
                const headerItem = document.querySelector(`.registro-item[data-id="${id}"]`);
                if (headerItem) {
                    const cantidadSpan = headerItem.querySelector('.carrito-cantidad');
                    const stockSpan = headerItem.querySelector('.stock');
                    if (cantidadSpan) cantidadSpan.textContent = '';
                    if (stockSpan) stockSpan.textContent = `${item.stock} Und.`;
                }
            });

            carritoSalidas.clear();
            document.querySelector('.btn-flotante-ingresos').style.display = 'none';
            actualizarCarritoLocalIngresos();
            actualizarBotonFlotante();
            ocultarAnuncioSecond();
            mostrarNotificacion({
                message: 'Carrito limpiado exitosamente',
                type: 'success',
                duration: 2000
            });
        });
    }

    // Reemplaza las funciones existentes window.ajustarCantidad y window.actualizarCantidad

    window.ajustarCantidad = (id, delta) => {
        const item = carritoSalidas.get(id);
        if (!item) return;

        // CAMBIO: Obtener la cantidad actual del input en lugar del objeto
        const inputCantidad = document.querySelector(`.carrito-item[data-id="${id}"] input[type="number"]`);
        const cantidadActual = inputCantidad ? parseInt(inputCantidad.value) || 1 : item.cantidad;

        const nuevaCantidad = cantidadActual + delta;
        if (nuevaCantidad > 0) { // Removemos el límite superior ya que es un ingreso
            item.cantidad = nuevaCantidad;

            // Actualizar el input inmediatamente
            if (inputCantidad) {
                inputCantidad.value = nuevaCantidad;
            }

            actualizarItemVista(id);
            actualizarCarritoLocalIngresos();
            actualizarCarritoUI();
        }
    };

    window.actualizarCantidad = (id, valor) => {
        const item = carritoSalidas.get(id);
        if (!item) return;

        const cantidad = parseInt(valor) || 1; // CAMBIO: Si el valor es 0 o NaN, usar 1
        if (cantidad > 0) { // CAMBIO: Remover la limitación del stock ya que es ingreso
            item.cantidad = cantidad;

            actualizarItemVista(id);
            actualizarCarritoLocalIngresos();
            actualizarCarritoUI();
        }
    };
    function actualizarCarritoUI() {
        if (carritoSalidas.size === 0) {
            ocultarAnuncioSecond();
            document.querySelector('.btn-flotante-ingresos').style.display = 'none';
            return;
        }

        // Actualiza solo la lista de items del carrito si el modal está abierto
        const anuncioSecond = document.querySelector('.anuncio-second .contenido');
        if (anuncioSecond && anuncioSecond.querySelector('.carrito-items')) {
            const carritoItemsDiv = anuncioSecond.querySelector('.carrito-items');
            const carritoTotalDiv = anuncioSecond.querySelector('.carrito-total');
            // Recalcular subtotal y total
            const subtotal = Array.from(carritoSalidas.values()).reduce((sum, item) => sum + (item.cantidad * item.subtotal), 0);
            // Mantener los valores actuales de descuento y aumento y los selects/inputs
            let descuentoValor = 0, aumentoValor = 0, proveedorValor = '', nombreMovimientoValor = '', observacionesValor = '';
            if (carritoTotalDiv) {
                const descuentoInput = carritoTotalDiv.querySelector('.descuento');
                const aumentoInput = carritoTotalDiv.querySelector('.aumento');
                const proveedorSelect = carritoTotalDiv.querySelector('.select-proovedor');
                const nombreMovimientoInput = carritoTotalDiv.querySelector('.nombre-movimiento');
                const observacionesInput = carritoTotalDiv.querySelector('.Observaciones');
                descuentoValor = descuentoInput ? parseFloat(descuentoInput.value) || 0 : 0;
                aumentoValor = aumentoInput ? parseFloat(aumentoInput.value) || 0 : 0;
                proveedorValor = proveedorSelect ? proveedorSelect.value : '';
                nombreMovimientoValor = nombreMovimientoInput ? nombreMovimientoInput.value : '';
                observacionesValor = observacionesInput ? observacionesInput.value : '';
            }
            const totalCalculado = subtotal - descuentoValor + aumentoValor;
            // Renderizar solo los productos y los campos extra actualizados
            carritoItemsDiv.innerHTML = `
                ${Array.from(carritoSalidas.values()).map(item => {
                const cantidadxgrupo = item.cantidadxgrupo || 1;

                let stockActualizadoEnTiras = item.stock;
                if (modoTiraGlobal) {
                    stockActualizadoEnTiras += item.cantidad;
                } else {
                    stockActualizadoEnTiras += Math.floor(item.cantidad / cantidadxgrupo);
                }

                const stockDisplay = modoTiraGlobal ? `${stockActualizadoEnTiras} Tiras` : `${stockActualizadoEnTiras * cantidadxgrupo} Und.`;

                return `
                    <div class="carrito-item" data-id="${item.id}">
                        <div class="item-info">
                            <h3>${item.producto} - ${item.gramos}gr</h3>
                            <div class="cantidad-control">
                                <button class="btn-cantidad" style="color:var(--error)" onclick="ajustarCantidad('${item.id}', -1)">-</button>
                                <input type="number" value="${item.cantidad}" min="1"
                                    onfocus="this.select()"
                                    onchange="actualizarCantidad('${item.id}', this.value)">
                                <button class="btn-cantidad"style="color:var(--success)" onclick="ajustarCantidad('${item.id}', 1)">+</button>
                            </div>
                        </div>
                        <div class="subtotal-delete">
                            <div class="info-valores">
                                <p class="stock-disponible">${stockDisplay}</p>
                                <p class="unitario">Bs. ${(item.subtotal).toFixed(2)}</p>
                                <p class="subtotal">Bs. ${(item.cantidad * item.subtotal).toFixed(2)}</p>
                            </div>
                            <button class="btn-eliminar" onclick="eliminarDelCarrito('${item.id}')">
                                <i class="bx bx-trash"></i>
                            </button>
                        </div>
                    </div>
                `}).join('')}
                <div class="carrito-total">
                    <div class="leyenda">
                        <div class="item">
                            <span class="punto orange"></span>
                            <p>Stock actual</p>
                        </div>
                        <div class="item">
                            <span class="punto blue-light"></span>
                            <p>Precio unitario</p>
                        </div>
                        <div class="item">
                            <span class="punto verde"></span>
                            <p>Subtotal</p>
                        </div>
                    </div>
                    <div class="campo-vertical">
                        <span><strong>Subtotal: </strong>Bs. ${subtotal.toFixed(2)}</span>
                        <span class="total-final"><strong>Total Final: </strong>Bs. ${totalCalculado.toFixed(2)}</span>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-label'></i>
                        <div class="input">
                            <p class="detalle">Nombre del movimiento</p>
                            <input class="nombre-movimiento" type="text" autocomplete="off" placeholder=" " required value="${nombreMovimientoValor}">
                        </div>
                    </div>
                    <div class="campo-horizontal">
                        <div class="entrada">
                            <i class='bx bx-purchase-tag-alt'></i>
                            <div class="input">
                                <p class="detalle">Descuento</p>
                                <input class="descuento" type="number" autocomplete="off" placeholder=" " required value="${descuentoValor}">
                            </div>
                        </div>
                        <div class="entrada">
                            <i class='bx bx-plus'></i>
                            <div class="input">
                                <p class="detalle">Aumento</p>
                                <input class="aumento" type="number" autocomplete="off" placeholder=" " required value="${aumentoValor}">
                            </div>
                        </div>
                    </div>
                    <div class="entrada">
                        <i class='bx bx-user'></i>
                        <div class="input">
                            <p class="detalle">Selecciona proovedor</p>
                            <select class="select-proovedor" required>
                                <option value=""></option>
                                ${proovedores.map(proovedor => `
                                    <option value="${proovedor.nombre}(${proovedor.id})" ${proveedorValor === `${proovedor.nombre}(${proovedor.id})` ? 'selected' : ''}>${proovedor.nombre}</option>
                                `).join('')}
                                ${nombresUsuariosGlobal
                    .filter(proveedor => proveedor.rol === 'Producción')
                    .map(proveedor => `
                                      <option value="${proveedor.nombre}(${proveedor.id})" ${proveedorValor === `${proveedor.nombre}(${proveedor.id})` ? 'selected' : ''}>${proveedor.nombre}</option>
                                    `).join('')
                }
                            </select>
                        </div>
                    </div>
                    
                    <div class="entrada">
                        <i class='bx bx-comment-detail'></i>
                        <div class="input">
                            <p class="detalle">Observaciones</p>
                            <input class="Observaciones" type="text" autocomplete="off" placeholder=" " required value="${observacionesValor}">
                        </div>
                    </div>
                    
                </div>
            `;
            // Volver a enlazar eventos de descuento y aumento
            const inputDescuento = carritoItemsDiv.querySelector('.descuento');
            const inputAumento = carritoItemsDiv.querySelector('.aumento');
            const totalFinal = carritoItemsDiv.querySelector('.total-final');
            function actualizarTotal() {
                const descuentoValor = parseFloat(inputDescuento.value) || 0;
                const aumentoValor = parseFloat(inputAumento.value) || 0;
                const totalCalculado = subtotal - descuentoValor + aumentoValor;
                totalFinal.innerHTML = `<strong>Total Final: </strong>Bs. ${totalCalculado.toFixed(2)}`;
            }
            if (inputDescuento && inputAumento && totalFinal) {
                inputDescuento.addEventListener('input', actualizarTotal);
                inputAumento.addEventListener('input', actualizarTotal);
            }

            configuracionesEntrada && configuracionesEntrada();
        }
    }
    function actualizarCarritoLocalIngresos() {
        localStorage.setItem('damabrava_carrito_ingresos', JSON.stringify(Array.from(carritoSalidas.entries())));
    }


    
    window.registrarIngreso = registrarIngreso;

    actualizarPreciosYStockVista();
}