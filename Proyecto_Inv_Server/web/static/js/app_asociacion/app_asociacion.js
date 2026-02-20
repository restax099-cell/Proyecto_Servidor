document.addEventListener('alpine:init', () => {
    Alpine.data('inventoryApp', () => ({
        // Datos simulados
        inventoryDb: [
            'Cebolla Blanca', 'Cebolla Morada', 'Tomate Huaje', 'Tomate Bola', 
            'Jugo de Naranja 1L', 'Jack Daniels 700ml', 'Tequila Don Julio 70'
        ],
        items: [
            { id: 'p1', xmlName: 'Cebolla granel (kg)', invoice: 'FAC-8892', price: 24.50, provider: 'Chedraui', associatedItem: '', status: 'pending' },
            { id: 'p2', xmlName: 'Jugo Jumex 1ltr (pza)', invoice: 'FAC-8892', price: 18.00, provider: 'Chedraui', associatedItem: 'Jugo de Naranja 1L', status: 'pending' },
            { id: 'p3', xmlName: 'Tomate Saladette 1kg', invoice: 'W-10293', price: 32.00, provider: 'Walmart', associatedItem: '', status: 'pending' },
            { id: 'p4', xmlName: 'Tequila D. Julio Blanco', invoice: 'W-10293', price: 750.00, provider: 'Walmart', associatedItem: '', status: 'pending' },
        ],
        
        // Estado interactivo
        filters: { provider: '', product: '', dateFrom: '', dateTo: '' },
        isModalOpen: false,
        activeItemId: null,
        modalSearch: '',

        // Función auxiliar para renderizar SVG dinámicamente sin romper Alpine
        renderIcon(iconName, classes = '') {
            if (!window.lucide) return '';
            const div = document.createElement('div');
            div.innerHTML = `<i data-lucide="${iconName}" class="${classes}"></i>`;
            window.lucide.createIcons({ root: div });
            return div.innerHTML;
        },

        // Propiedades computadas
        get pendingCount() {
            return this.items.filter(i => i.status === 'pending').length;
        },

        get groupedItems() {
            const provTerm = this.filters.provider.toLowerCase().trim();
            const prodTerm = this.filters.product.toLowerCase().trim();
            
            const filtered = this.items.filter(item => 
                item.provider.toLowerCase().includes(provTerm) && 
                item.xmlName.toLowerCase().includes(prodTerm)
            );

            const grouped = filtered.reduce((acc, item) => {
                if (!acc[item.provider]) acc[item.provider] = [];
                acc[item.provider].push(item);
                return acc;
            }, {});

            return Object.entries(grouped).map(([provider, items]) => ({ provider, items }));
        },

        get filteredDb() {
            const term = this.modalSearch.toLowerCase().trim();
            return this.inventoryDb.filter(item => item.toLowerCase().includes(term));
        },

        // Acciones
        openModal(itemId) {
            this.activeItemId = itemId;
            this.modalSearch = '';
            this.isModalOpen = true;
            // Auto-foco en el input después de abrir el modal
            this.$nextTick(() => { this.$refs.searchInput.focus(); });
        },

        closeModal() {
            this.isModalOpen = false;
            setTimeout(() => { this.activeItemId = null; }, 300);
        },

        selectInventoryItem(itemName) {
            const target = this.items.find(i => i.id === this.activeItemId);
            if (target) target.associatedItem = itemName;
            this.closeModal();
        },

        associateItem(itemId) {
            const target = this.items.find(i => i.id === itemId);
            if (target) target.status = 'associated';
        },

        // Helper para colores e iconos dinámicos según el proveedor (nombres en formato kebab-case)
        getTheme(provider) {
            const p = provider.toLowerCase();
            if (p === 'chedraui') return {
                header: 'bg-emerald-50/50 border-emerald-100',
                iconWrap: 'bg-emerald-100 text-emerald-600',
                title: 'text-emerald-900',
                icon: 'shopping-cart'
            };
            if (p === 'walmart') return {
                header: 'bg-blue-50/50 border-blue-100',
                iconWrap: 'bg-blue-100 text-blue-600',
                title: 'text-blue-900',
                icon: 'store'
            };
            return {
                header: 'bg-slate-50 border-slate-100',
                iconWrap: 'bg-slate-200 text-slate-600',
                title: 'text-slate-800',
                icon: 'file-text'
            };
        }
    }));
});