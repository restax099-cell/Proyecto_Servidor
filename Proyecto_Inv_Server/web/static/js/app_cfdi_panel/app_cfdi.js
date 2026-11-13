import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
import { fetchCfdiConsultas } from './api_cfdi.js'; 
import { getPaginationState, inicializarPaginacion, resetPagination, updateTotalPages } from './panel_pagination.js';

Alpine.data('cfdiApp', () => ({
    allResults: [],     
    filteredResults: [],
    results: [],
    searchTerm: '',
    searchEmisor: '',
    searchReceptor: '',
    currentFilters: {},
    currentPage: 1,
    totalPages: 1,
    limit: 50,
    totalCount: 0,
    isLoading: false,
    abortController: null,
    ordering: '-fecha',

    filterForm: {
        filtroFechaTipo: '',
        fechaInicio: '',
        fechaFin: '',
        filtroImporteTipo: '',
        importeMinimo: '',
        importeMaximo: '',
        filtroTipoComprobante: '',
        filtroMetodoTipo: '',
        filtroFormaTipo: ''
    },

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const receptorUrl = urlParams.get('nombre_receptor');
        if (receptorUrl) this.searchReceptor = receptorUrl;
        
        const orderingUrl = urlParams.get('ordering');
        if (orderingUrl) this.ordering = orderingUrl;

        inicializarPaginacion(() => {
            const paginationState = getPaginationState();
            this.currentPage = paginationState.page;
            this.limit = paginationState.limit;
            this.updateLocalPagination(); 
        });

        await this.loadAllData();
    },

    async loadAllData() {
        this.isLoading = true;
        this.results = [];
        try {
            const responseData = await fetchCfdiConsultas({}, 90000, 0, this.ordering);
            if (responseData && responseData.results) {
                this.allResults = responseData.results;
                this.applyFiltersAndSearch(); 
            }
        } catch (error) {
            console.error("Error al cargar datos iniciales:", error);
        } finally {
            this.isLoading = false;
        }
    },

    //* SEARCH
    onSearchChange() {
        this.applyFiltersAndSearch();
    },

    onEmisorSearchChange() {
        this.applyFiltersAndSearch();
    },

    onReceptorSearchChange() {
        this.applyFiltersAndSearch();
    },

    clearEmisor() {
        this.searchEmisor = '';
        this.applyFiltersAndSearch();
    },

    clearReceptor() {
        this.searchReceptor = '';
        this.applyFiltersAndSearch();
    },

    applyFiltersAndSearch() {
        let temp = [...this.allResults];

        // 1. Búsqueda Principal (Folio, ID o Conceptos)
        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const term = this.searchTerm.toLowerCase().trim();
            temp = temp.filter(item => 
                (item.folio && item.folio.toLowerCase().includes(term)) ||
                (item.id && item.id.toString().toLowerCase().includes(term)) ||
                (item.conceptos_texto && item.conceptos_texto.toLowerCase().includes(term))
            );
        }

        // 2. Filtro Emisor
        if (this.searchEmisor && this.searchEmisor.trim() !== '') {
            const emisorTerm = this.searchEmisor.toLowerCase().trim();
            temp = temp.filter(item => 
                (item.emisor && item.emisor.toLowerCase().includes(emisorTerm)) ||
                (item.rfc_emisor && item.rfc_emisor.toLowerCase().includes(emisorTerm))
            );
        }

        // 3. Filtro Receptor
        if (this.searchReceptor && this.searchReceptor.trim() !== '') {
            const receptorTerm = this.searchReceptor.toLowerCase().trim();
            temp = temp.filter(item => 
                (item.receptor && item.receptor.toLowerCase().includes(receptorTerm)) ||
                (item.rfc_receptor && item.rfc_receptor.toLowerCase().includes(receptorTerm))
            );
        }

        // 4. Filtros del Offcanvas (Fechas, Importes, Pagos)
        if (this.currentFilters.fecha_desde) {
            temp = temp.filter(item => item.fecha && item.fecha.split('T')[0] >= this.currentFilters.fecha_desde);
        }
        if (this.currentFilters.fecha_hasta) {
            temp = temp.filter(item => item.fecha && item.fecha.split('T')[0] <= this.currentFilters.fecha_hasta);
        }
        if (this.currentFilters.importe_min) {
            temp = temp.filter(item => parseFloat(item.total || 0) >= parseFloat(this.currentFilters.importe_min));
        }
        if (this.currentFilters.importe_max) {
            temp = temp.filter(item => parseFloat(item.total || 0) <= parseFloat(this.currentFilters.importe_max));
        }
        if (this.currentFilters.tipo_comprobante) {
            temp = temp.filter(item => (item.tipo_comprobante || '').toLowerCase() === this.currentFilters.tipo_comprobante.toLowerCase());
        }
        if (this.currentFilters.metodo_pago) {
            temp = temp.filter(item => (item.metodo_pago || '').toLowerCase() === this.currentFilters.metodo_pago.toLowerCase());
        }
        if (this.currentFilters.forma_pago) {
            temp = temp.filter(item => (item.forma_pago || '').toString() === this.currentFilters.forma_pago.toString());
        }

        // 5. Ordenamiento local instantáneo
        const desc = this.ordering.startsWith('-');
        const key = desc ? this.ordering.slice(1) : this.ordering;
        temp.sort((a, b) => {
            let valA = a[key] ?? '';
            let valB = b[key] ?? '';
            if (key === 'total' || key === 'importe' || key === 'id') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }
            if (valA < valB) return desc ? 1 : -1;
            if (valA > valB) return desc ? -1 : 1;
            return 0;
        });

        this.filteredResults = temp;
        resetPagination();
        this.currentPage = 1;
        this.updateLocalPagination();
    },

    updateLocalPagination() {
        this.totalCount = this.filteredResults.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.limit));
        updateTotalPages(this.totalPages);

        const start = (this.currentPage - 1) * this.limit;
        const end = start + this.limit;
        this.results = this.filteredResults.slice(start, end);
    },

    searchAdminEmisor() {
        this.searchEmisor = 'DAMALIJE';
        
        if (this.searchReceptor && this.searchReceptor.trim().toUpperCase() === 'DAMALIJE') {
            this.searchReceptor = '';
        }
        
        this.applyFiltersAndSearch();
    },

    searchAdminReceptor() {
        this.searchReceptor = 'DAMALIJE';
        
        if (this.searchEmisor && this.searchEmisor.trim().toUpperCase() === 'DAMALIJE') {
            this.searchEmisor = '';
        }
        
        this.applyFiltersAndSearch();
    },

    //* FILTROS
    formatDateISO(date) {
        return date.toISOString().split('T')[0];
    },

    applyFilters() {
        const nuevosFiltros = {};
        const hoy = new Date();

        // 1. Fechas
        switch (this.filterForm.filtroFechaTipo) {
            case 'semana':
                const diaSemana = hoy.getDay(); 
                const primerDiaSemana = new Date(hoy);
                primerDiaSemana.setDate(hoy.getDate() - diaSemana);
                
                nuevosFiltros.fecha_desde = this.formatDateISO(primerDiaSemana);
                nuevosFiltros.fecha_hasta = this.formatDateISO(hoy);
                break;

            case 'mes':
                const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                nuevosFiltros.fecha_desde = this.formatDateISO(primerDiaMesActual);
                nuevosFiltros.fecha_hasta = this.formatDateISO(hoy);
                break;

            case 'anio':
                const primerDiaAnioActual = new Date(hoy.getFullYear(), 0, 1);
                nuevosFiltros.fecha_desde = this.formatDateISO(primerDiaAnioActual);
                nuevosFiltros.fecha_hasta = this.formatDateISO(hoy);
                break;

            case 'personalizado':
                if (this.filterForm.fechaInicio) nuevosFiltros.fecha_desde = this.filterForm.fechaInicio;
                if (this.filterForm.fechaFin) nuevosFiltros.fecha_hasta = this.filterForm.fechaFin;
                break;
        }

        // 2. Importes
        switch (this.filterForm.filtroImporteTipo) {
            case 'rango1':
                nuevosFiltros.importe_min = '0';
                nuevosFiltros.importe_max = '1000';
                break;
            case 'rango2':
                nuevosFiltros.importe_min = '1001';
                nuevosFiltros.importe_max = '5000';
                break;
            case 'rango3':
                nuevosFiltros.importe_min = '5001';
                nuevosFiltros.importe_max = '10000';
                break;
            case 'personalizado':
                if (this.filterForm.importeMinimo) nuevosFiltros.importe_min = this.filterForm.importeMinimo;
                if (this.filterForm.importeMaximo) nuevosFiltros.importe_max = this.filterForm.importeMaximo;
                break;
        }

        // 3. Detalles de pago
        if (this.filterForm.filtroTipoComprobante) nuevosFiltros.tipo_comprobante = this.filterForm.filtroTipoComprobante;
        if (this.filterForm.filtroMetodoTipo) nuevosFiltros.metodo_pago = this.filterForm.filtroMetodoTipo;
        if (this.filterForm.filtroFormaTipo) nuevosFiltros.forma_pago = this.filterForm.filtroFormaTipo;

        if (this.currentFilters.search_term) {
            nuevosFiltros.search_term = this.currentFilters.search_term;
        }

        this.currentFilters = nuevosFiltros;
        this.applyFiltersAndSearch();
        this.closeOffcanvas();
    },

    openOffcanvas() {
        const el = document.getElementById('offcanvasFiltros');
        if (el) {
            el.classList.add('show');
            el.style.visibility = 'visible';
            el.removeAttribute('aria-hidden');
            el.setAttribute('aria-modal', 'true');
            el.setAttribute('role', 'dialog');

            if (!document.querySelector('.offcanvas-backdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'offcanvas-backdrop fade show';
                backdrop.onclick = () => this.closeOffcanvas();
                document.body.appendChild(backdrop);
            }
            document.body.style.overflow = 'hidden';
        }
    },

    closeOffcanvas() {
        const el = document.getElementById('offcanvasFiltros');
        if (el) {
            el.classList.remove('show');
            el.style.visibility = 'hidden';
            el.setAttribute('aria-hidden', 'true');
            el.removeAttribute('aria-modal');
            el.removeAttribute('role');

            document.body.style.overflow = '';
            document.querySelectorAll('.offcanvas-backdrop').forEach(b => b.remove());
        }
    },

    resetFilters() {
        this.filterForm = {
            filtroFechaTipo: '', fechaInicio: '', fechaFin: '',
            filtroImporteTipo: '', importeMinimo: '', importeMaximo: '',
            filtroTipoComprobante: '', filtroMetodoTipo: '', filtroFormaTipo: ''
        };
        this.searchEmisor = '';
        this.searchReceptor = '';
        
        const busquedaGuardada = this.currentFilters.search_term;
        this.currentFilters = busquedaGuardada ? { search_term: busquedaGuardada } : {};
        
        this.applyFiltersAndSearch();
        this.closeOffcanvas();
    },

    //* Formateo de datos
    formatDate(fechaStr) {
        if (!fechaStr) return 'N/A';
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const fecha = new Date(fechaStr);
        if (isNaN(fecha)) return 'N/A';
        return `${fecha.getDate()}/${meses[fecha.getMonth()]}/${fecha.getFullYear()}`;
    },

    formatMoney(val) {
        if (val === null || val === undefined) return '$0.00';
        return `$${parseFloat(val).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    },

    formatTipo(tipo) {
        const t = (tipo || '').toLowerCase();
        if (t === 'i' || t === 'ingre' || t === 'ingreso') return 'Ingresos';
        if (t === 'e' || t === 'egre' || t === 'egreso') return 'Gastos';
        return tipo || 'N/A';
    },

    formatMetodo(metodo) {
        const m = (metodo || '').toLowerCase();
        if (m === 'pue') return 'PUE';
        if (m === 'ppd') return 'PPD';
        return 'No Identificado';
    },

    formatFormaPago(forma) {
        const f = (forma || '').toString().toLowerCase().trim();
        if (f === '03') return 'Transferencia';
        if (f === '99') return 'Por Definir';
        if (f === '01' || f === '1') return 'Efectivo';
        if (!f || f === 'no id') return 'No Identificado';
        return forma;
    },

    sortBy(columnKey) {
        if (this.ordering === columnKey) {
            this.ordering = `-${columnKey}`;
        } else {
            this.ordering = columnKey;
        }
        
        const url = new URL(window.location);
        url.searchParams.set('ordering', this.ordering);
        window.history.pushState({}, '', url);

        this.applyFiltersAndSearch();
    },

    getSortIcon(columnKey) {
        if (this.ordering === columnKey) return '▲';
        if (this.ordering === `-${columnKey}`) return '▼';
        return '';
    },

    goToDetail(uuid) {
        if (uuid) {
            window.open(`/recibidos-panel/conceptos/${uuid}/`, '_blank', 'noopener,noreferrer');
        }
    }
}));

window.Alpine = Alpine;
Alpine.start();