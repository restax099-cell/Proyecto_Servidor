import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';



Alpine.data('catalogApp', () => ({
    
    //? --- ESTADO ---
    searchQuery: '',
    selectedCategory: 'Todo',
    categories: ['Todo', 'Licores', 'Carnes', 'Abarrotes', 'Verduras'],
    

    showCreateModal: false,
    showCompleteModal: false,
    activeItem: {}, 
    

    items: [
        { id: '1', name: 'Tequila Don Julio 70', sku: 'T099', category: 'Licores', unit: 'Pz', isComplete: true },
        { id: '2', name: 'Filete de Res Ribeye', sku: 'CAR-003', category: 'Carnes', unit: 'Kg', isComplete: false },
        { id: '3', name: 'Arroz Blanco', sku: 'ABA-001', category: 'Abarrotes', unit: 'Kg', isComplete: true },
        { id: '4', name: 'Tomate Saladette', sku: 'VER-001', category: 'Verduras', unit: 'Kg', isComplete: false },
    ],

    //? --- INICIALIZACIÓN ---
    init() {

        this.$nextTick(() => {
            if (window.lucide) window.lucide.createIcons();
        });
        

    },

    //? --- PROPIEDADES COMPUTADAS (GETTERS) ---
    get filteredItems() {
        return this.items.filter(item => {
            const matchesCategory = this.selectedCategory === 'Todo' || item.category === this.selectedCategory;
            const searchTerm = this.searchQuery.toLowerCase();
            const matchesSearch = item.name.toLowerCase().includes(searchTerm) || 
                                  item.sku.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });
    },

    get incompleteCount() {
        return this.items.filter(item => !item.isComplete).length;
    },

    //? --- ACCIONES ---
    openCompleteModal(item) {
        this.activeItem = item;
        this.showCompleteModal = true;
    },

    marcarComoCompletado() {
        if(this.activeItem && this.activeItem.id) {
            const index = this.items.findIndex(i => i.id === this.activeItem.id);
            if(index !== -1) {
                this.items[index].isComplete = true;
            }
        }
        this.showCompleteModal = false;
        this.activeItem = {}; 
    },

    //? --- UTILIDADES ---
    getCategoryStyles(category) {
        const styles = {
            'Licores': { bar: 'bg-purple-600', chip: 'bg-purple-100 text-purple-700 border-purple-200' },
            'Carnes': { bar: 'bg-red-500', chip: 'bg-red-100 text-red-700 border-red-200' },
            'Abarrotes': { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700 border-amber-200' },
            'Verduras': { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
        };
        return styles[category] || { bar: 'bg-slate-500', chip: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
}));

window.Alpine = Alpine;
Alpine.start();