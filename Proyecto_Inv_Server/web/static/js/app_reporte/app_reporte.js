import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
import { fetchDashboard, fetchItemDetails } from './api_reporte.js';

Alpine.data('auditDashboard', () => ({
    
    // --- ESTADO ---
    tableData: [],
    kpis: {
        importe_total_facturas: 0,
        cantidad_total_unidades: 0,
        item_mayor_variacion: '-',
        max_variacion_porcentaje: 0
    },
    filters: {
        search: '',
        suppliers: [],
        dateStart: '',
        dateEnd: ''
    },
    
    // Paginación
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    isLoading: false,
    abortController: null,

    // Drawer (Detalle)
    drawerOpen: false,
    selectedItemName: '',
    selectedItemDetails: null,
    isLoadingDetails: false,
    detailsAbortController: null,

    init() {
        this.loadDashboard(1);

        // Observamos los filtros para recargar automáticamente
        this.$watch('filters.search', () => this.loadDashboard(1));
        this.$watch('filters.suppliers', () => this.loadDashboard(1));
        this.$watch('filters.dateStart', () => this.loadDashboard(1));
        this.$watch('filters.dateEnd', () => this.loadDashboard(1));
    },

    // --- LLAMADAS A LA API ---
    async loadDashboard(page) {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();
        this.isLoading = true;

        try {
            const response = await fetchDashboard(page, this.filters, this.abortController.signal);
            
            if (response) {
                this.kpis = response.kpis || this.kpis;
                this.tableData = response.results || [];
                
                if (response.pagination) {
                    this.currentPage = response.pagination.current_page;
                    this.totalPages = response.pagination.total_pages;
                    this.totalItems = response.pagination.total_items;
                }
            }

            this.$nextTick(() => {
                if (window.lucide) window.lucide.createIcons();
            });

        } catch (error) {
            if (error.name !== 'AbortError') console.error("Error cargando dashboard:", error);
        } finally {
            this.isLoading = false;
        }
    },

    async openDetail(itemRow) {
        this.drawerOpen = true;
        this.selectedItemName = itemRow.item_name;
        this.selectedItemDetails = null; 
        this.isLoadingDetails = true;

        if (this.detailsAbortController) this.detailsAbortController.abort();
        this.detailsAbortController = new AbortController();

        try {
            const response = await fetchItemDetails(itemRow.item_name, this.detailsAbortController.signal);
            
            if (response && !response.error) {
                this.selectedItemDetails = response;
            }
        } catch (error) {
            if (error.name !== 'AbortError') console.error("Error cargando detalle:", error);
        } finally {
            this.isLoadingDetails = false;
        }
    },

    // --- UTILIDADES ---
    resetFilters() {
        this.filters.search = '';
        this.filters.suppliers = [];
        this.filters.dateStart = '';
        this.filters.dateEnd = '';
    },

    formatCurrency(val) {
        if (val === undefined || val === null || isNaN(val)) return '-';
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
    },
    
    formatDate(dateString) {
        if (!dateString) return '';
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return new Date(dateString + 'T12:00:00').toLocaleDateString('es-MX', options);
    }
}));

// ¡Esto es clave para inicializar Alpine como módulo!
window.Alpine = Alpine;
Alpine.start();