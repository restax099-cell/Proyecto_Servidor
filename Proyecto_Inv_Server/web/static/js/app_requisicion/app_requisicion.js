// 1. Importamos Alpine desde el CDN como módulo
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

// 2. Datos de prueba (MockData)
const mockData = [
    {
        id: 'RZ-0001',
        origin: 'Cocina',
        status: 'Pendiente',
        createdAt: '10:05 AM',
        waitTime: '15 min',
        isNew: true,
        items: [
            { id: 1, name: 'Carne de res (Corte grueso)', quantity: '5 kg', checked: false },
            { id: 2, name: 'Limones sin semilla', quantity: '2 kg', checked: false },
            { id: 3, name: 'Cebolla blanca', quantity: '1 kg', checked: false },
            { id: 4, name: 'Aceite vegetal', quantity: '2 Litros', checked: false }
        ]
    },
    {
        id: 'RZ-0002',
        origin: 'Cantina',
        status: 'En Proceso',
        createdAt: '09:45 AM',
        waitTime: '35 min',
        isNew: false,
        items: [
            { id: 5, name: 'Tequila Reposado', quantity: '3 Botellas', checked: true },
            { id: 6, name: 'Agua Mineral', quantity: '1 Caja', checked: false },
            { id: 7, name: 'Hielo en cubo', quantity: '5 Bolsas', checked: false }
        ]
    },
    {
        id: 'RZ-0003',
        origin: 'Mantenimiento',
        status: 'Pendiente',
        createdAt: '10:15 AM',
        waitTime: '5 min',
        isNew: true,
        items: [
            { id: 8, name: 'Focos LED 15W', quantity: '10 pzas', checked: false },
            { id: 9, name: 'Cinta aislar', quantity: '2 pzas', checked: false }
        ]
    },
    {
        id: 'RZ-0004',
        origin: 'Cocina',
        status: 'Finalizada',
        createdAt: '08:00 AM',
        waitTime: 'Surtida',
        isNew: false,
        items: [
            { id: 10, name: 'Sal fina', quantity: '2 kg', checked: true },
            { id: 11, name: 'Pimienta negra', quantity: '500 g', checked: true }
        ]
    }
];

// 3. Registro del componente AlmacenApp
// En modo módulo, registramos directamente sin esperar a 'alpine:init'
Alpine.data('almacenApp', () => ({
    requisitions: JSON.parse(JSON.stringify(mockData)), // Copia profunda para evitar mutaciones
    selectedId: null,
    searchQuery: '',
    statusFilter: 'Todos',
    originFilter: 'Todos',

    // --- GETTERS (Propiedades computadas) ---
    get filteredRequisitions() {
        return this.requisitions.filter(req => {
            const searchStr = this.searchQuery.toLowerCase();
            const matchesSearch = req.id.toLowerCase().includes(searchStr) || 
                                  req.items.some(item => item.name.toLowerCase().includes(searchStr));
            const matchesStatus = this.statusFilter === 'Todos' || req.status === this.statusFilter;
            const matchesOrigin = this.originFilter === 'Todos' || req.origin === this.originFilter;
            
            return matchesSearch && matchesStatus && matchesOrigin;
        });
    },

    get selectedReq() {
        return this.requisitions.find(r => r.id === this.selectedId) || null;
    },

    get totalItems() {
        return this.selectedReq ? this.selectedReq.items.length : 0;
    },

    get checkedItems() {
        return this.selectedReq ? this.selectedReq.items.filter(i => i.checked).length : 0;
    },

    get is100Percent() {
        return this.totalItems > 0 && this.totalItems === this.checkedItems;
    },

    get pendientesCount() {
        return this.requisitions.filter(r => r.status === 'Pendiente').length;
    },

    // --- MÉTODOS ---
    toggleItem(reqId, itemId) {
        const req = this.requisitions.find(r => r.id === reqId);
        if (!req) return;

        const item = req.items.find(i => i.id === itemId);
        if (item) {
            item.checked = !item.checked;
        }

        // Actualizar estado de la requisición según items marcados
        const checkedCount = req.items.filter(i => i.checked).length;
        
        if (req.status !== 'Finalizada') {
            if (checkedCount === 0) {
                req.status = 'Pendiente';
            } else {
                req.status = 'En Proceso';
                req.isNew = false;
            }
        }
    },

    markAsFinished(reqId) {
        const req = this.requisitions.find(r => r.id === reqId);
        if (req) {
            req.status = 'Finalizada';
            req.waitTime = 'Surtida';
        }
        // Opcional: cerrar el detalle después de un momento
        setTimeout(() => {
            this.selectedId = null;
        }, 800);
    }
}));

// 4. Inicialización de Alpine
window.Alpine = Alpine;
Alpine.start();

console.log("Sistema de Almacén Inicializado");