import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

import { 
    fetchPlantillasConteo,
    fetchStores,
    fetchConteoDtls
} from './api_consulta_conteo.js'; 


Alpine.data('inventoryApp', () => ({
    
    vistaActual: 'vigentes', // 'vigentes' o 'historial'
    filtroFechaInicio: '',
    filtroFechaFin: '',
    listaHistorial: [], // Almacenará los registros pasados de auditoría
    selectedHistorial: null,


    searchQuery: '',
    statusFilter: 'Todos',
    selectedPlantilla: null,
    selectedId: null,
    isLoading: true, // Iniciamos en true para bloquear la interfaz mientras precarga todo

    plantillas: [],
    detalleConteo: [],
    cacheDetalles: {}, // Almacén en memoria para todas las plantillas
    users: [],
    item: [],
    openCategories: {},

    async init() {
        this.isLoading = true;
        
        // 1. Cargamos la lista de plantillas primero
        await this.getPlantillasConteo();
        
        // 2. Precargamos los detalles de TODAS las plantillas en paralelo
        if (this.plantillas.length > 0) {
            await this.precargarTodosLosDetalles();
            
            // Opcional: Seleccionar y mostrar la primera plantilla automáticamente al abrir
            this.selectCount(this.plantillas[0]);
        }
        
        this.isLoading = false;
    },

    //* GETS DE PLANTILLAS
    async getPlantillasConteo() {
        try {
            const response = await fetchPlantillasConteo();
            
            this.plantillas = response.map(p => ({
                id: p.id,
                codigo: p.codigo,
                nombre: p.nombre,
                store: p.store,
                user_id: p.user_id,
                username: p.username,
                status: this.statusFormat(p.status), 
                frecuencia: p.frecuencia,
                dias_semana: p.dias_semana,
                dia_mes: p.dia_mes || '', 
                vigencia: p.vigencia,
                hora_apertura: p.hora_apertura,
                hora_limite: p.hora_limite,
                dia_limite: p.dia_limite,
                bloquear_vencer_limite: p.bloquear_vencer_limite,
                permitir_buscar_fuera_catalogo: p.permitir_buscar_fuera_catalogo,
                mostrar_existencia_teorica: p.mostrar_existencia_teorica,
                products: p.productos || []
            }));
        } catch (error) {
            console.error("Error al obtener las plantillas de conteo:", error);
        }
    },

    //* PRECARGA MASIVA EN PARALELO
    async precargarTodosLosDetalles() {
        const promesas = this.plantillas.map(async (p) => {
            try {
                // Obtenemos la fecha de caducidad/vigencia calculada para esta plantilla específica
                const fechaObjetivo = this.calcularFechaObjetivo(p);

                // Llamamos a la API enviando tanto el ID como la fecha calculada
                const response = await fetchConteoDtls(p.id, fechaObjetivo);
                const detalleCrudo = response || [];

                // Mapear y guardar directamente en el caché por ID
                this.cacheDetalles[p.id] = detalleCrudo.map(item => ({
                    id: item.id,
                    plantillaId: item.plantilla_id,
                    itemId: item.item_id,
                    conteo: Number(item.conteo) || 0,
                    sku: item.sku || '',
                    description: item.nombre || '',
                    categoria: item.categoria || 'GENERAL'
                }));
            } catch (error) {
                console.error(`Error al precargar detalles de la plantilla ID ${p.id}:`, error);
                this.cacheDetalles[p.id] = [];
            }
        });

        // Esperamos a que todas las peticiones en paralelo terminen
        await Promise.all(promesas);
        console.log("¡Todas las plantillas y sus detalles por fecha han sido precargados en caché exitosamente!");
    },

    //* SELECCIÓN (Ahora carga instantánea desde caché)
    selectCount(plantilla) {
        this.selectedPlantilla = plantilla;
        this.selectedId = plantilla.id; 
        
        this.detalleConteo = this.cacheDetalles[plantilla.id] || [];
    },

    statusFormat(status) {
        const statusTaser = {
            1: "Sin revisar",
            2: "Incompleto",
            3: "Completo",
        };
        return statusTaser[status] || "Desconocido";
    },

    getStatusBadgeClass(status) {
        switch(status) {
            case 'Completo': return 'badge-soft-success';
            case 'Incompleto': return 'badge-soft-warning';
            default: return 'badge-soft-secondary';
        }
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    calcularFechaObjetivo(item) {
        const ahora = new Date();
        const offsetDias = parseInt(item.dia_limite, 10) || 0; 
        let fechaBaseConteo = new Date();

        const freqLower = (item.frecuencia || '').toLowerCase();

        // 1. Evaluar según la frecuencia y sus días/meses programados
        if (freqLower.includes('semanal') && item.dias_semana) {
            const mapaDias = { 'D': 0, 'L': 1, 'Ma': 2, 'Mi': 3, 'J': 4, 'V': 5, 'S': 6 };
            const diasProgramados = item.dias_semana.split(',').map(d => mapaDias[d.trim()]).filter(d => d !== undefined);
            
            if (diasProgramados.length > 0) {
                const diaHoy = ahora.getDay();
                let diferenciaDias = 0;
                if (!diasProgramados.includes(diaHoy)) {
                    const proximoDia = diasProgramados.find(d => d >= diaHoy) ?? diasProgramados[0];
                    diferenciaDias = (proximoDia - diaHoy + 7) % 7;
                }
                fechaBaseConteo.setDate(ahora.getDate() + diferenciaDias);
            }
        } else if ((freqLower.includes('mensual') || freqLower.includes('trimestral')) && item.dia_mes) {
            fechaBaseConteo.setDate(parseInt(item.dia_mes, 10));
        } else if (item.vigencia) {
            // Si la plantilla ya trae una vigencia base definida
            fechaBaseConteo = new Date(item.vigencia + 'T00:00:00');
        }

        // 2. Aplicar el desfase del límite de captura (offset)
        const fechaLimiteCalculada = new Date(fechaBaseConteo);
        fechaLimiteCalculada.setDate(fechaBaseConteo.getDate() + offsetDias);

        // 3. Formatear a string YYYY-MM-DD para la base de datos
        const year = fechaLimiteCalculada.getFullYear();
        const month = String(fechaLimiteCalculada.getMonth() + 1).padStart(2, '0');
        const day = String(fechaLimiteCalculada.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    },

    get filteredCounts() {
        return this.plantillas.filter(p => {
            const query = this.searchQuery.toLowerCase();
            const matchesQuery = query === '' ||
                p.nombre.toLowerCase().includes(query) ||
                p.codigo.toLowerCase().includes(query) ||
                p.status.toLowerCase().includes(query);

            const matchesStatus = this.statusFilter === 'Todos' || p.status === this.statusFilter;
            return matchesQuery && matchesStatus;
        });
    },

    resetSelection() {
        this.selectedPlantilla = null;
        this.selectedId = null;
        this.detalleConteo = [];
    },

    //* MUESTREO DE PRODUCTOS:
    getGroupedProducts() {
        const groups = {};
        
        this.detalleConteo.forEach(product => {
            const cat = product.categoria || 'GENERAL';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(product);
        });
        
        return groups;
    },

    calculateTotalValue() {
        if (!this.selectedPlantilla) return 0;
        return this.selectedPlantilla.products.reduce((acc, p) => acc + (p.qty * p.price), 0);
    },

    formatCurrency(val) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    },

    toggleCategory(categoryName) {
        this.openCategories[categoryName] = this.openCategories[categoryName] === undefined ? false : !this.openCategories[categoryName];
    },

    isCategoryOpen(categoryName) {
        return this.openCategories[categoryName] !== false; 
    },

    //* CAMBIO DE PAGINA


    cambiarVista(tipo) {
        this.vistaActual = tipo;
        this.resetSelection();
        
        if (tipo === 'historial' && this.listaHistorial.length === 0) {
            // Cargar por defecto el mes actual si está vacío
            const hoy = new Date();
            const anio = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            this.filtroFechaInicio = `${anio}-${mes}-01`;
            this.filtroFechaFin = hoy.toISOString().split('T')[0];
            
            this.cargarHistorial();
        }
    },

    async cargarHistorial() {
        this.isLoading = true;
        try {
            // Endpoint que apuntará a tu backend para traer ejecuciones pasadas por rango de fechas
            const response = await fetch(`/api/conteo/get-historial-conteos/?inicio=${this.filtroFechaInicio}&fin=${this.filtroFechaFin}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.listaHistorial = data.data.map(h => ({
                    id: h.id, // ID del registro histórico o ejecución
                    plantillaId: h.plantilla_id,
                    nombre: h.nombre_plantilla,
                    codigo: h.codigo,
                    store: h.store,
                    fechaEjecucion: h.fecha_ejecucion,
                    status: this.statusFormat(h.status), // Completo, Incompleto, etc.
                    usuario: h.username
                }));
            }
        } catch (error) {
            console.error("Error al cargar el historial:", error);
            this.listaHistorial = [];
        } finally {
            this.isLoading = false;
        }
    },

    // Selector específico para elementos del historial
    selectHistorial(item) {
        this.selectedHistorial = item;
        // Aquí puedes cargar los detalles específicos de esa ejecución histórica pasando su ID o fecha exacta
        this.getConteoDtls(item.plantillaId, item.fechaEjecucion);
    }
}));

Alpine.start();