import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
import { 
    fetchPlantillasConteo,
    fetchConteoDetalle,
    fetchItems,
    fetchStores,
    setCount
} from './api_conteo.js'; 

Alpine.data('detalleConteoApp', (plantillaId) => ({
    busqueda: '',
    filtro: 'Todos',
    isLoading: true,

    // --- 1. DATOS DEL ENCABEZADO ---
    encabezado: {
        nombre: 'Cargando...',
        almacen: 'Cargando...',
        limite: '',
        capturo: 'Cargando...', 
        fecha: ''
    },

    // --- 2. DATOS DE LA TABLA ---
    categorias: [], 

    async init() {
        this.isLoading = true;
        
        const hoy = new Date();
        this.encabezado.fecha = hoy.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

        try {
            await this.cargarDatosPlantilla();
            
            await this.cargarCantidadesGuardadas();
            
        } catch (error) {
            console.error("Error al inicializar el conteo:", error);
            this.encabezado.nombre = 'Error al cargar';
            this.encabezado.almacen = '---';
            this.encabezado.capturo = '---';
        } finally {
            this.isLoading = false;
        }
    },

    // Función dedicada exclusivamente a preparar la plantilla y el encabezado
    async cargarDatosPlantilla() {
        // Extraer ID robustamente
        const idReal = plantillaId || parseInt(window.location.pathname.split('/').filter(Boolean).pop());

        if (!idReal || isNaN(idReal)) {
            throw new Error("No se encontró el ID de la plantilla en la URL");
        }

        // Descargar plantillas y almacenes simultáneamente
        const [plantillas, almacenes] = await Promise.all([
            fetchPlantillasConteo(),
            fetchStores()
        ]);

        const plantillaActual = plantillas.find(p => p.id === idReal);

        if (!plantillaActual) {
            this.encabezado.nombre = 'Plantilla no encontrada';
            this.encabezado.almacen = '---';
            this.encabezado.capturo = '---';
            return;
        }

        // Poblar el encabezado
        this.encabezado.nombre = plantillaActual.nombre;
        this.encabezado.capturo = plantillaActual.username || 'Admin';

        if (plantillaActual.hora_limite) {
            this.encabezado.limite = `Límite hoy ${plantillaActual.hora_limite.substring(0,5)}`;
        }
        
        // ALMACEN
        const almacenData = almacenes.find(a => a.id == plantillaActual.store);

        this.encabezado.almacen = almacenData 
            ? almacenData.store 
            : `Almacén ID: ${plantillaActual.store}`;
        
        await this.cargarItems(plantillaActual);
    },

    async cargarItems(plantillaActual) {
        //console.log("Plantilla recibida para cargar items:", plantillaActual);

        let catalogos = plantillaActual.catalogos_json;
        if (typeof catalogos === 'string') {
            try {
                catalogos = JSON.parse(catalogos);
            } catch (e) {
                console.error("Error al leer el JSON de catálogos:", e);
                catalogos = [];
            }
        }

        if (!catalogos || !Array.isArray(catalogos) || catalogos.length === 0) {
            console.warn("Esta plantilla no tiene catálogos asignados.");
            this.categorias = [];
            return;
        }

        let categoriasCargadas = [];

        for (const cat of catalogos) {
            try {
                //console.log(`Descargando items para la categoría: ${cat.categoria}`);
                
                const resultado = await fetchItems({ 
                    categoryId: cat.id, 
                    limit: 2000 
                });

                // --- NUEVA SOLUCIÓN: Extractor Universal de Arreglos ---
                let listaItems = [];
                
                if (Array.isArray(resultado)) {
                    listaItems = resultado;
                } else if (resultado && typeof resultado === 'object') {
                    // 1. Busca en el primer nivel de la respuesta (ej. resultado.data, resultado.items)
                    for (let key in resultado) {
                        if (Array.isArray(resultado[key])) {
                            listaItems = resultado[key];
                            break;
                        }
                    }
                    // 2. Si no lo encuentra, profundiza al segundo nivel (ej. resultado.data.data, resultado.data.results)
                    if (listaItems.length === 0) {
                        for (let key in resultado) {
                            if (resultado[key] && typeof resultado[key] === 'object') {
                                for (let subKey in resultado[key]) {
                                    if (Array.isArray(resultado[key][subKey])) {
                                        listaItems = resultado[key][subKey];
                                        break;
                                    }
                                }
                            }
                            if (listaItems.length > 0) break;
                        }
                    }
                }

                if (listaItems.length === 0) {
                    console.error("La API no devolvió un arreglo válido para", cat.categoria, ". Revisa la pestaña 'Red' (Network) para ver qué devolvió el servidor:", resultado);
                    continue; 
                }
                // --------------------------------------------------------

                //console.log(`Se mapearán ${listaItems.length} items para ${cat.categoria}`);

                const itemsMapeados = listaItems.map(item => ({
                    id: item.id,
                    sku: item.sku || item.codigo || 'SIN-SKU',
                    descripcion: item.descripcion || item.nombre || 'Sin descripción',
                    codigoBarras: item.barcode || item.codigo_barras || '',
                    unidad: item.unit || item.unidad || 'Pz',
                    cantidad: null,
                    estado: 'Pendiente'
                }));

                categoriasCargadas.push({
                    nombre: cat.categoria,
                    codigo: cat.codigo,
                    items: itemsMapeados
                });

            } catch (error) {
                console.error(`Error de red al cargar la categoría ${cat.categoria}:`, error);
            }
        }

        this.categorias = categoriasCargadas;
    },


    //* INPUTS
    async guardarConteo(estado = 'Borrador') {
        let itemsCapturados = [];

        this.categorias.forEach(categoria => {
            categoria.items.forEach(item => {
                if (item.cantidad !== null && item.cantidad !== '') {
                    itemsCapturados.push({
                        item_id: item.id,
                        conteo: parseFloat(item.cantidad)
                    });
                }
            });
        });

        if (itemsCapturados.length === 0) {
            alert("No hay ningún ítem con cantidad capturada para guardar.");
            return;
        }

        const idReal = plantillaId || parseInt(window.location.pathname.split('/').filter(Boolean).pop());

        const payload = {
            conteo_plantilla_id: idReal,
            estado: estado,
            items: itemsCapturados
        };

        this.isLoading = true; 

        try {
            const data = await setCount(payload);

            if (data.status === 'success') {
                alert(`¡Éxito! ${data.message} (${data.registros_afectados} ítems guardados)`);
                
                if (estado === 'Cerrado') {
                }
            } else {
                console.error("Error del backend:", data.error);
                alert("Error al guardar: " + data.error);
            }
        } catch (error) {
            console.error("ERROR al intentar guardar el borrador:", error);
            alert("Ocurrió un error de conexión al intentar guardar.");
        } finally {
            this.isLoading = false;
        }
    },

    //* OUTPUTS
    async cargarCantidadesGuardadas() {
        // 1. Extraemos el ID directamente de la URL de forma segura para evitar ReferenceErrors
        const idReal = parseInt(window.location.pathname.split('/').filter(Boolean).pop());
        
        //console.log("1. ID detectado en la URL:", idReal);

        // 2. Llamamos a tu API
        const detalles = await fetchConteoDetalle(idReal);
        
        //console.log("2. Datos recibidos de la BD:", detalles);
        
        if (!detalles || detalles.length === 0) {
            //console.log("3. El historial está vacío. Se quedan en 0.");
            return; 
        }

        // 3. Mapeo de cantidades
        const mapaCantidades = {};
        detalles.forEach(detalle => {
            mapaCantidades[detalle.item_id] = detalle.conteo;
        });
        
        //console.log("4. Mapa de cantidades procesado:", mapaCantidades);

        // 4. Inyección en Alpine 
        let inyectados = 0;
        this.categorias.forEach(categoria => {
            categoria.items.forEach(item => {
                if (mapaCantidades[item.id] !== undefined) {
                    
                    item.cantidad = mapaCantidades[item.id];
                    
                    if (typeof this.actualizarEstado === 'function') {
                        this.actualizarEstado(item);
                    }
                    
                    inyectados++;
                }
            });
        });
        
        //console.log(`5. ¡Listo! Se inyectaron ${inyectados} cantidades y los estados fueron actualizados.`);
    },


    // --- PROPIEDADES COMPUTADAS Y MÉTODOS ---
    get totalItems() {
        return this.categorias.reduce((acc, cat) => acc + cat.items.length, 0);
    },
    
    get itemsContados() {
        return this.categorias.reduce((acc, cat) => {
            return acc + cat.items.filter(i => i.estado === 'Contado' || i.estado === 'Editando').length;
        }, 0);
    },
    
    get porcentajeAvance() {
        if (this.totalItems === 0) return 0;
        return (this.itemsContados / this.totalItems) * 100;
    },

    contadosPorCategoria(categoria) {
        return categoria.items.filter(i => i.estado === 'Contado' || i.estado === 'Editando').length;
    },

    claseEstado(item) {
        if (item.estado === 'Pendiente') return 'badge-danger';
        if (item.estado === 'Editando') return 'badge-brand';
        return 'badge-dark'; 
    },

    get categoriasFiltradas() {
        let search = this.busqueda.toLowerCase();
        
        return this.categorias.map(cat => {
            let filtrados = cat.items.filter(item => {
                let coincideTexto = item.sku.toLowerCase().includes(search) || 
                                    item.descripcion.toLowerCase().includes(search) || 
                                    item.codigoBarras.includes(search);
                
                let coincideEstado = true;
                if (this.filtro === 'Pendientes') {
                    coincideEstado = item.estado === 'Pendiente';
                } else if (this.filtro === 'Contados') {
                    coincideEstado = item.estado === 'Contado' || item.estado === 'Editando';
                }

                return coincideTexto && coincideEstado;
            });
            return { ...cat, itemsFiltrados: filtrados };
        });
    },

    incrementar(item) {
        let val = parseFloat(item.cantidad);
        if (isNaN(val)) val = 0;
        item.cantidad = val + 1;
        this.actualizarEstado(item);
    },

    decrementar(item) {
        let val = parseFloat(item.cantidad);
        if (isNaN(val) || val <= 0) {
            item.cantidad = 0;
        } else {
            item.cantidad = val - 1;
        }
        this.actualizarEstado(item);
    },

    actualizarEstado(item) {
        if (item.cantidad === '' || item.cantidad === null) {
            item.estado = 'Pendiente';
            return;
        }
        item.estado = 'Editando';
    }
}));

window.Alpine = Alpine;
Alpine.start();