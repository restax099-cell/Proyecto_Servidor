import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

import { 
    fetchPlantillasConteo,
    fetchStores,
    fetchConteoDtls
} from './api_consulta_conteo.js'; 

Alpine.data('inventoryApp', () => ({
    vistaActual: 'vigentes',
    filtroFechaInicio: '',
    filtroFechaFin: '',
    listaHistorial: [],
    selectedHistorial: null,

    searchQuery: '',
    statusFilter: 'Todos',
    selectedPlantilla: null,
    selectedId: null,
    isLoading: true,

    plantillas: [],
    detalleConteo: [],
    cacheDetalles: {},
    users: [],
    item: [],
    openCategories: {},

    async init() {
        this.isLoading = true;
        
        await this.getPlantillasConteo();
        
        if (this.plantillas.length > 0) {
            await this.precargarTodosLosDetalles();
            this.selectCount(this.plantillas[0]);
        }
        
        this.isLoading = false;
    },

    getFechaHoyLocal() {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    //* GETS DE PLANTILLAS
    async getPlantillasConteo() {
        try {
            const response = await fetchPlantillasConteo();
            const fechaHoy = this.getFechaHoyLocal();
            
            this.plantillas = response.map(p => {
                const esDiaria = (p.frecuencia || '').toLowerCase().includes('diari');
                return {
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
                    vigencia: esDiaria ? fechaHoy : p.vigencia,
                    hora_apertura: p.hora_apertura,
                    hora_limite: p.hora_limite,
                    dia_limite: p.dia_limite,
                    bloquear_vencer_limite: p.bloquear_vencer_limite,
                    permitir_buscar_fuera_catalogo: p.permitir_buscar_fuera_catalogo,
                    mostrar_existencia_teorica: p.mostrar_existencia_teorica,
                    products: p.productos || []
                };
            });
        } catch (error) {
            console.error("Error al obtener las plantillas de conteo:", error);
        }
    },

    calcularFechaObjetivo(item) {
        const freqLower = (item.frecuencia || '').toLowerCase();
        const ahora = new Date();
        let fechaBaseConteo = new Date();

        if (freqLower.includes('diari')) {
            return this.getFechaHoyLocal();
            
        } else if (freqLower.includes('semanal') && item.dias_semana) {
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
            } else {
                fechaBaseConteo = new Date(item.vigencia || ahora);
            }
            
        } else if ((freqLower.includes('mensual') || freqLower.includes('trimestral')) && item.dia_mes) {
            fechaBaseConteo.setDate(parseInt(item.dia_mes, 10));
            
        } else {
            fechaBaseConteo = new Date(item.vigencia ? item.vigencia + 'T00:00:00' : ahora);
        }

        const offsetDias = parseInt(item.dia_limite, 10) || 0;
        fechaBaseConteo.setDate(fechaBaseConteo.getDate() + offsetDias);

        const year = fechaBaseConteo.getFullYear();
        const month = String(fechaBaseConteo.getMonth() + 1).padStart(2, '0');
        const day = String(fechaBaseConteo.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    },

    getFechaRegistro(plantilla) {
        if (!plantilla) return '';
        const detalles = this.cacheDetalles[plantilla.id] || [];
        
        if (detalles.length > 0 && detalles[0].fecha) {
            return this.formatDate(detalles[0].fecha);
        }
        
        return this.formatDate(this.calcularFechaObjetivo(plantilla));
    },

    //* PRECARGA MASIVA EN PARALELO
    async precargarTodosLosDetalles() {
        const promesas = this.plantillas.map(async (p) => {
            try {
                const fechaObjetivo = this.calcularFechaObjetivo(p);
                
                const response = await fetchConteoDtls(p.id, fechaObjetivo);
                const detalleCrudo = Array.isArray(response) ? response : (response?.data || []);

                this.cacheDetalles[p.id] = detalleCrudo.map(item => ({
                    id: item.id,
                    plantillaId: item.plantilla_id,
                    itemId: item.item_id,
                    conteo: Number(item.conteo) || 0,
                    fecha: item.fecha ? item.fecha.split('T')[0].split(' ')[0] : null,
                    sku: item.sku || '',
                    description: item.nombre || '',
                    categoria: item.categoria || 'GENERAL'
                }));
            } catch (error) {
                console.error(`Error al precargar detalles de la plantilla ID ${p.id}:`, error);
                this.cacheDetalles[p.id] = [];
            }
        });

        await Promise.all(promesas);
    },

    //* SELECCIÓN
    selectCount(plantilla) {
        this.selectedPlantilla = plantilla;
        this.selectedId = plantilla.id; 
        
        this.detalleConteo = this.cacheDetalles[plantilla.id] || [];

        //console.log(`📊 [Vista de Usuario] Productos listos para mostrarse en la plantilla "${plantilla.nombre}" (ID: ${plantilla.id}):`, this.detalleConteo);
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
        const limpia = dateStr.split('T')[0].split(' ')[0];
        const date = new Date(limpia + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
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

    //* MUESTREO DE PRODUCTOS
    getGroupedProducts() {
        const groups = {};
        
        this.detalleConteo.forEach(product => {
            const cat = product.categoria || 'GENERAL';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(product);
        });

        //console.log("📂 [Desglose por Categoría] Estructura visual para el usuario:", groups);
        
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

    //* CAMBIO DE PAGINA E HISTORIAL
    cambiarVista(tipo) {
        this.vistaActual = tipo;
        this.resetSelection();
        
        if (tipo === 'historial' && this.listaHistorial.length === 0) {
            const hoy = new Date();
            const anio = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            this.filtroFechaInicio = `${anio}-${mes}-01`;
            this.filtroFechaFin = this.getFechaHoyLocal();
            
            this.cargarHistorial();
        }
    },

    async cargarHistorial() {
        this.isLoading = true;
        try {
            const response = await fetch(`/api/conteo/get-historial-conteos/?inicio=${this.filtroFechaInicio}&fin=${this.filtroFechaFin}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.listaHistorial = data.data.map(h => ({
                    id: h.id,
                    plantillaId: h.plantilla_id,
                    nombre: h.nombre_plantilla,
                    codigo: h.codigo,
                    store: h.store,
                    fechaEjecucion: h.fecha_ejecucion,
                    status: this.statusFormat(h.status),
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

    async selectHistorial(item) {
        this.selectedHistorial = item;
        this.selectedPlantilla = item; 
        this.isLoading = true;

        try {
            const fechaLimpia = item.fechaEjecucion ? item.fechaEjecucion.split('T')[0].split(' ')[0] : '';
            const response = await fetchConteoDtls(item.plantillaId, fechaLimpia);
            const detalleCrudo = Array.isArray(response) ? response : (response?.data || []);

            this.detalleConteo = detalleCrudo.map(det => ({
                id: det.id,
                plantillaId: det.plantilla_id,
                itemId: det.item_id,
                conteo: Number(det.conteo) || 0,
                sku: det.sku || '',
                description: det.nombre || '',
                categoria: det.categoria || 'GENERAL'
            }));
        } catch (error) {
            console.error("Error al cargar detalles del historial:", error);
            this.detalleConteo = [];
        } finally {
            this.isLoading = false;
        }
    },

    get filteredHistorial() {
        return this.listaHistorial;
    },
}));

Alpine.start();