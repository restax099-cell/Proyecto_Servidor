import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

Alpine.data('inventoryApp', () => ({
    
    searchQuery: '',
    statusFilter: 'Todos',
    selectedCount: null,
    
    init() {
        console.log("¡Alpine inicializado correctamente!");
        if (this.counts.length > 0) {
            this.selectedCount = this.counts[0];
        }
    },

    resetSelection() {
        this.selectedCount = null;
    },

    counts: [
        {
            id: 1,
            code: "PC-01",
            title: "Conteo Diario - Cocina Principal",
            date: "2026-10-01",
            status: "Completo",
            assignee: "Carlos Mendoza (Chef Exec)",
            products: [
                { sku: "CRN-101", description: "Ribeye High Choice Porcionado 350g", category: "Carnes Porcionadas", qty: 45, price: 18.50 },
                { sku: "CRN-104", description: "Pechuga de Pollo Orgánica 250g", category: "Carnes Porcionadas", qty: 32, price: 6.80 },
                { sku: "CRM-201", description: "Queso Mozzarella Fresco 1kg", category: "Cremería y Lácteos", qty: 18, price: 12.00 },
                { sku: "CRM-205", description: "Mantequilla Sin Sal 1kg", category: "Cremería y Lácteos", qty: 25, price: 8.50 },
                { sku: "VRD-302", description: "Aguacate Hass Calibre 1", category: "Frutas y Verduras", qty: 60, price: 2.80 },
                { sku: "VRD-310", description: "Jitomate Saladette Fresco", category: "Frutas y Verduras", qty: 85, price: 1.50 }
            ]
        },
        {
            id: 2,
            code: "PC-02",
            title: "Revisión Semanal - Cava y Bar",
            date: "2026-10-04",
            status: "Incompleto",
            assignee: null,
            products: [
                { sku: "BEB-401", description: "Vino Tinto Cabernet Sauvignon 750ml", category: "Bebidas y Cava", qty: 34, price: 24.00 },
                { sku: "BEB-415", description: "Tequila Reposado 100% Agave 750ml", category: "Bebidas y Cava", qty: 12, price: 42.00 },
                { sku: "BEB-450", description: "Cerveza Artesanal IPA 355ml", category: "Bebidas y Cava", qty: 96, price: 3.50 }
            ]
        },
        {
            id: 3,
            code: "PC-03",
            title: "Conteo Cíclico - Almacén Secos",
            date: "2026-10-05",
            status: "Sin revisar",
            assignee: "María Torres",
            products: [
                { sku: "ABR-501", description: "Aceite de Oliva Extra Virgen 5L", category: "Abarrotes y Secos", qty: 15, price: 48.00 },
                { sku: "ABR-512", description: "Harina de Trigo Extra Fina 10kg", category: "Abarrotes y Secos", qty: 20, price: 16.50 },
                { sku: "ABR-530", description: "Sal de Mar Gruesa 5kg", category: "Abarrotes y Secos", qty: 8, price: 6.00 }
            ]
        },
        {
            id: 4,
            code: "PC-04",
            title: "Cierre Turno Nocturno - Bar",
            date: "2026-10-06",
            status: "Completo",
            assignee: "Luis Hernández (Head Bartender)",
            products: [
                { sku: "BEB-401", description: "Vino Tinto Cabernet Sauvignon 750ml", category: "Bebidas y Cava", qty: 18, price: 24.00 },
                { sku: "BEB-415", description: "Tequila Reposado 100% Agave 750ml", category: "Bebidas y Cava", qty: 8, price: 42.00 }
            ]
        }
    ],

    get filteredCounts() {
        return this.counts.filter(c => {
            const query = this.searchQuery.toLowerCase();
            const matchesQuery = query === '' || 
                c.title.toLowerCase().includes(query) ||
                c.code.toLowerCase().includes(query) ||
                c.status.toLowerCase().includes(query);
                
            const matchesStatus = this.statusFilter === 'Todos' || c.status === this.statusFilter;
            
            return matchesQuery && matchesStatus;
        });
    },

    selectCount(count) {
        this.selectedCount = count;
        console.log("hola");
    },

    getGroupedProducts() {
        if (!this.selectedCount) return {};
        return this.selectedCount.products.reduce((acc, p) => {
            if (!acc[p.category]) acc[p.category] = [];
            acc[p.category].push(p);
            return acc;
        }, {});
    },

    calculateTotalValue() {
        if (!this.selectedCount) return 0;
        return this.selectedCount.products.reduce((acc, p) => acc + (p.qty * p.price), 0);
    },

    formatCurrency(val) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    getStatusBadgeClass(status) {
        switch(status) {
            case 'Completo': return 'badge-soft-success';
            case 'Incompleto': return 'badge-soft-warning';
            default: return 'badge-soft-secondary';
        }
    }
}));

// ¡CRUCIAL! Esto enciende el motor de Alpine para archivos modulares (ESM)
Alpine.start();