import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

import { 
    fetchConteoDetalle,
    fetchItems,
    fetchPlantillasConteo,
    fetchStores,
    fetchUsuarios,
    fetchConteoDtls
} from './api_consulta_conteo.js'; 


Alpine.data('inventoryApp', () => ({
    
    searchQuery: '',
    statusFilter: 'Todos',
    selectedPlantilla: null,

    plantillas: [],
    detalleConteo:[],
    users:[],
    item:[],
    
    async init() {
        await this.getPlantillasConteo();
        
    },

    //* GETS
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

            console.log("Plantillas normalizadas:", this.plantillas);
        } catch (error) {
            console.error("Error al obtener las plantillas de conteo:", error);
        }
    },

    async getConteoDtls(id) {
        try {
            const response = await fetchConteoDtls(id);
            const detalleCrudo = response || [];

            this.detalleConteo = detalleCrudo.map(item => ({
                id: item.id,
                plantillaId: item.plantilla_id,
                itemId: item.item_id,
                conteo: Number(item.conteo) || 0,
                sku: item.sku || '',
                description: item.nombre || '',
                categoria: item.categoria || 'GENERAL'
            }));
            
            const detallePuro = JSON.parse(JSON.stringify(this.detalleConteo));
            console.log("Datos limpios sin Proxy:", detallePuro);

        } catch (error) {
            console.error("Error al obtener los detalles del conteo:", error);
        }
    },
   

    //* AUX-GETS
   

    
    
    selectCount(plantilla) {
        
        this.selectedPlantilla = plantilla;
        
        this.selectedId = plantilla.id; 
        console.log(plantilla.id)
        this.getConteoDtls(plantilla.id);
    },

    statusFormat(status) {
        const statusTaser = {
            0: "Sin revisar",
            1: "Incompleto",
            2: "Completo",
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

    get filteredCounts() {

        return this.plantillas.filter(p => {
            const query = this.searchQuery.toLowerCase();
            const matchesQuery = query === '' ||
                p.nombre.toLowerCase().includes(query)
                p.codigo.toLowerCase().includes(query)
                p.status.toLowerCase().includes(query)

            const matchesStatus = this.statusFilter === 'Todos' || p.status === this.statusFilter;
            return matchesQuery && matchesStatus;
        });
    },

    resetSelection() {
        this.selectedPlantilla = null;
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


    openCategories: {},

    toggleCategory(categoryName) {
        this.openCategories[categoryName] = this.openCategories[categoryName] === undefined ? false : !this.openCategories[categoryName];
    },

    isCategoryOpen(categoryName) {
        return this.openCategories[categoryName] !== false; // Por defecto abiertas
    }
    

    

    
    /*

    

    

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
    },

        // Función para aplanar las filas de categorías y productos
    getFlattenedRows() {
        let rows = [];
        let grouped = this.getGroupedProducts(); // Asume que esta función ya agrupa por categoría
        
        for (let category in grouped) {
            // 1. Fila de la categoría
            rows.push({ 
                type: 'category', 
                name: category, 
                psCount: grouped[category].length 
            });
            
            // 2. Filas de los productos de esa categoría
            grouped[category].forEach(product => {
                rows.push({ 
                    type: 'product', 
                    category: category, 
                    data: product 
                });
            });
        }
        return rows;
    },*/

    // Estado y control para contraer/expandir categorías
    
}));

// ¡CRUCIAL! Esto enciende el motor de Alpine para archivos modulares (ESM)
Alpine.start();