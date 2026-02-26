// 1. Importamos Alpine y su plugin de Collapse como módulos directamente
import collapse from 'https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/module.esm.js';
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

// 2. Importamos tus utilidades
import { renderIcon } from '../../utils/icons.js';
import { fetchInventorySync, fetchModalItems, saveAssociation, unregisterAssociation } from './api_asociacion.js';
import { getTheme } from './theme_asociacion.js';

Alpine.plugin(collapse);

Alpine.data('inventoryApp', () => ({
    
    // --- ESTADO ---
    inventoryDb: [],
    groupedItems: [], 
    filters: { status: 0, provider: '', product: '', dateFrom: '', dateTo: '' },
    totalItems: 0,
    isModalOpen: false,
    activeItemId: null,
    modalSearch: '',
    modalAbortController: null,
    isLoading: false, 
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 20, 
    abortController: null,
    

    renderIcon,
    getTheme,

    init() {
        this.loadFromApi(1);
        this.loadModalCatalog();
        this.$watch('filters.status', () => this.loadFromApi(1));
        this.$watch('filters.provider', () => this.loadFromApi(1));
        this.$watch('filters.product', () => this.loadFromApi(1));
        this.$watch('filters.dateFrom', () => this.loadFromApi(1));
        this.$watch('filters.dateTo', () => this.loadFromApi(1));        
        this.$watch('modalSearch', (value) => {
            this.loadModalCatalog(value);
        });
    },

    // --- CONEXIÓN CON LA API ---
    async loadFromApi(page) {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();
        this.isLoading = true;
        
        try {
            const responseData = await fetchInventorySync(page, this.filters, this.abortController.signal);

            if (responseData && responseData.results) {
                this.currentPage = responseData.current_page || 1;
                this.totalPages = responseData.total_pages || 1;
                this.totalItems = responseData.total_items || 0;

                const newGroupedItems = [];
                for (const [providerName, products] of Object.entries(responseData.results)) {
                    const mappedProducts = products.map((prod, index) => ({
                        id: `p${this.currentPage}-${providerName.replace(/\s+/g, '')}-${index}`,
                        id_concept: prod.id_concept, 
                        xmlName: prod.producto,
                        invoice: prod.fecha_producto ? prod.fecha_producto.split(' ')[0] : 'S/F',
                        price: parseFloat(prod.valor_unitario),
                        provider: providerName,

                        status: prod.status || 'pending', 
                        associatedItem: prod.associatedItem || '', 
                        associatedDbId: prod.associatedDbId || null
                    }));
                    newGroupedItems.push({ provider: providerName, items: mappedProducts });
                }
                this.groupedItems = newGroupedItems;
            } else {
                this.groupedItems = [];
            }

            console.log("¡Ahora sí! Datos con ID:", this.groupedItems);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error API:", error);
                this.groupedItems = [];
            }
        } finally {
            this.isLoading = false;
        }
    },

    async loadModalCatalog(term = '') {
        if (this.modalAbortController) {
            this.modalAbortController.abort();
        }
        this.modalAbortController = new AbortController();

        try {
            const data = await fetchModalItems(term, this.modalAbortController.signal);
            if (data) {
                this.inventoryDb = data;
            }
        } catch (error) {
            if (error.name !== 'AbortError') console.error("Error en modal:", error);
        }
    },

    // --- COMPUTADAS ---
    get pendingCount() {
        let count = 0;
        this.groupedItems.forEach(group => count += group.items.filter(i => i.status === 'pending').length);
        return count;
    },

    get filteredDb() {
        return this.inventoryDb;
    },

    get filteredItemsList() {
        return this.groupedItems.flatMap(group => group.items);
    },

    // --- ACCIONES ---
    nextPage() { if (this.currentPage < this.totalPages) this.loadFromApi(this.currentPage + 1); },
    prevPage() { if (this.currentPage > 1) this.loadFromApi(this.currentPage - 1); },
    goToPage(pageInput) {
        const p = parseInt(pageInput);
        if (!isNaN(p) && p >= 1 && p <= this.totalPages && p !== this.currentPage) this.loadFromApi(p);
    },
    
    openModal(itemId) {
        this.activeItemId = itemId;
        this.modalSearch = '';
        this.isModalOpen = true;
        this.$nextTick(() => { this.$refs.searchInput.focus(); });
    },
    
    closeModal() {
        this.isModalOpen = false;
        setTimeout(() => { this.activeItemId = null; }, 300);
    },

    selectInventoryItem(itemId, itemName) {
        for (const group of this.groupedItems) {
            const target = group.items.find(i => i.id === this.activeItemId);
            if (target) {
                target.associatedItem = itemName; 
                target.associatedDbId = itemId;   
                break;
            }
        }
        this.closeModal();
    },

    async associateItem(itemId) {
        let target = null;
        for (const group of this.groupedItems) {
            target = group.items.find(i => i.id === itemId);
            if (target) break;
        }

        if (!target) return;

        console.log("Datos del target encontrado:", target);

        if (!target.associatedDbId) {
            alert("Por favor, selecciona un insumo de tu catálogo antes de vincular.");
            return;
        }

        try {
            console.log("Enviando a la DB -> XML ID:", target.id_concept, " | Insumo ID:", target.associatedDbId);
            const response = await saveAssociation(target.id_concept, target.associatedDbId);
            
            target.status = 'associated';
            console.log("¡Éxito! XML ID enviado:", target.id_concept);

        } catch (error) {
            console.error("Fallo al vincular:", error);
            alert("No se pudo vincular: " + error.message);
        }
    },

    async unlinkItem(itemId) {
        let target = null;
        for (const group of this.groupedItems) {
            target = group.items.find(i => i.id === itemId);
            if (target) break;
        }

        if (!target) return;

        try {
            console.log("Desvinculando concepto ID:", target.id_concept);
            
            await unregisterAssociation(target.id_concept);

            target.status = 'pending';
            target.associatedItem = ''; 
            target.associatedDbId = null; 
            
            console.log("¡Éxito! El registro ahora tiene status 0 en MySQL.");

        } catch (error) {
            console.error("Fallo al desvincular:", error);
            alert("Error al desvincular: " + error.message);
        }
    }
}));

window.Alpine = Alpine;
Alpine.start();