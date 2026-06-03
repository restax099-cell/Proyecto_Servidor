import collapse from 'https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/module.esm.js';
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
import { fetchDraftList, fetchRequisitionPdf, saveItemsDelivery } from './api_requisicion.js';

Alpine.plugin(collapse);

Alpine.data('almacenApp', () => ({
    requisitions: [], 
    selectedId: null,
    searchQuery: '',
    statusFilter: 'Todos',
    originFilter: 'Todos',
    isLoading: false,
    abortController: null,

    init() {
        this.loadRequisitions();
        this.$watch('searchQuery', () => this.loadRequisitions());
        this.$watch('statusFilter', () => this.loadRequisitions());
        this.$watch('originFilter', () => this.loadRequisitions());
    },

    async loadRequisitions() {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();
        this.isLoading = true;

        try {
            const filters = { search: this.searchQuery, status: this.statusFilter, origin: this.originFilter };
            const data = await fetchDraftList(filters, this.abortController.signal);
            
            if (data) {
                const uniqueData = Array.from(new Map(data.map(req => [req.sku, req])).values());

                this.requisitions = uniqueData.map(req => {
                    
                    const allItemsCompleted = req.items.every(item => 
                        parseFloat(item.supplied_qty || 0) >= parseFloat(item.requested_qty)
                    );

                    const hasAnyDelivery = req.items.some(item => 
                        parseFloat(item.supplied_qty || 0) > 0
                    );

                    let currentStatus = 'Pendiente'; 
                    if (allItemsCompleted) {
                        currentStatus = 'Finalizada';
                    } else if (hasAnyDelivery) {
                        currentStatus = 'En Proceso';
                    }

                    return {
                        id: req.sku,          
                        db_id: req.id,      
                        origin: req.area_name || 'Almacén',
                        status: currentStatus, 
                        createdAt: req.created_at,
                        items: req.items.map(item => ({
                            dtl_id: item.dtl_id,        
                            name: item.nombre,         
                            
                            category: item.categoria || item.category || 'Sin Categoría', 
                            
                            requested_qty: parseFloat(item.requested_qty), 
                            delivered_qty: parseFloat(item.supplied_qty || 0),
                            session_qty: 0, 
                            unit: item.unit_name || 'pza'
                        }))
                    };
                });
                console.log("Datos en Alpine:", this.requisitions);
            }
        } catch (error) {
            if (error.name !== 'AbortError') console.error("Error API:", error);
        } finally {
            this.isLoading = false;
        }
    },

    get groupedItems() {
        if (!this.selectedReq || !this.selectedReq.items) return {};

        return this.selectedReq.items.reduce((acc, item) => {
            const cat = item.category;
            if (!acc[cat]) {
                acc[cat] = [];
            }
            acc[cat].push(item);
            return acc;
        }, {});
    },
    // -------------------------------------------------------------

    get filteredRequisitions() {
        return this.requisitions.filter(req => {
            const query = this.searchQuery.toLowerCase().trim();
            const matchSearch = query === '' || 
                                req.id.toLowerCase().includes(query) || 
                                req.items.some(item => item.name.toLowerCase().includes(query));

            const matchStatus = this.statusFilter === 'Todos' || req.status.includes(this.statusFilter.replace('s', '')); 

            const matchOrigin = this.originFilter === 'Todos' || req.origin === this.originFilter;

            return matchSearch && matchStatus && matchOrigin;
        });
    },

    get selectedReq() {
        return this.requisitions.find(r => r.id === this.selectedId) || null;
    },

    get orderStatus() {
        if (!this.selectedReq) return 'empty';
        const items = this.selectedReq.items;
        const hasSessionDelivery = items.some(i => i.session_qty > 0);
        const allCompleted = items.every(i => (i.delivered_qty + i.session_qty) >= i.requested_qty);

        if (allCompleted) return 'complete';
        if (hasSessionDelivery) return 'partial';
        return 'pending';
    },

    get pendientesCount() {
        return this.requisitions.filter(r => r.status === 'Pendiente').length;
    },

    updateQuantity(reqId, itemId, amount) {
        const req = this.requisitions.find(r => r.id === reqId);
        if (!req) return;

        const item = req.items.find(i => i.dtl_id === itemId);
        if (item) {
            let newSessionQty = item.session_qty + amount;
            const remaining = item.requested_qty - item.delivered_qty;
            if (newSessionQty < 0) newSessionQty = 0;
            if (newSessionQty > remaining) newSessionQty = remaining;
            
            item.session_qty = newSessionQty;
        }
    },

    fillAllItem(reqId, itemId) {
        const req = this.requisitions.find(r => r.id === reqId);
        if (!req) return;
        const item = req.items.find(i => i.dtl_id === itemId);
        if (item) {
            item.session_qty = item.requested_qty - item.delivered_qty;
        }
    },

    async markAsFinished(reqId) {
        const req = this.requisitions.find(r => r.id === reqId);
        if (!req) return;

        const itemsToSubmit = req.items
            .filter(i => i.session_qty > 0)
            .map(i => ({
                dtl_id: i.dtl_id,
                qty: i.session_qty,
                folio: req.id
            }));

        if (itemsToSubmit.length === 0) return;

        try {
            this.isLoading = true;
            await saveItemsDelivery(itemsToSubmit); 
            this.selectedId = null;
            await this.loadRequisitions();
        } catch (error) {
            alert("Error al guardar entrega: " + error.message);
        } finally {
            this.isLoading = false;
        }
    },

    async printRequisition(dbId) {
        if (!dbId) return;
        
        this.isLoading = true; 
        
        try {
            await fetchRequisitionPdf(dbId);
        } catch (error) {
            alert("No se pudo imprimir: " + error.message);
        } finally {
            this.isLoading = false;
        }
    }
}));

window.Alpine = Alpine;
Alpine.start();